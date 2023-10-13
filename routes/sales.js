const express = require("express")
const router = express.Router()
const app = express()
const pool = require("../database/db")

app.use(express.json())

// Get sales by date
router.get("/:date", getSalesByDate, async (req, res) => {
    res.json(res.sales)
})

// Middleware functions
async function getSalesByDate(req, res, next) {
    try {
        const { date } = req.params
        const code = "SA"
        const sales = await pool.query(
            `SELECT barcode, sku.description, qty, price, dep.name AS department FROM inventory_ledger il
                JOIN reason_code rc ON (rc.id = il.reason_code_id)
                JOIN sku ON (sku.id = il.sku_id)
                JOIN department dep ON (sku.department_id = dep.id) 
                WHERE rc.code = '${code}'
                    AND DATE(il.created_at) = '${date}'
            `,
            [date]
        )
        if (sales[0].length === 0) return res.status(404).json({ message: "No sales found", status: 404 })

        res.sales = sales[0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
