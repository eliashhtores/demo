const express = require("express")
const router = express.Router()
const app = express()
const pool = require("../database/db")

app.use(express.json())

// Get all promos
router.get("/", async (req, res) => {
    try {
        const promo = await pool.query(`
        SELECT pr.*, barcode, price, cost
            FROM promo pr
            JOIN sku sku ON (pr.sku_id = sku.id)
            ORDER BY pr.active,  pr.name ASC
        `)
        res.json(promo[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get one promo by id
router.get("/:id", getPromoByID, async (req, res) => {
    res.json(res.promo)
})

// Check duplicated name
router.get("/checkDuplicated/:name", getPromoByName, async (req, res) => {
    res.json(res.name)
})

// Update promo
router.patch("/:id", getPromoByID, async (req, res) => {
    const { id } = req.params
    const { name, sku_id, end_date, end_price, promo_price, start_date, start_price, updated_by } = req.body
    try {
        const updatedPromo = await pool.query(
            `
                UPDATE promo SET name = ?, sku_id = ?, end_date = ?, end_price = ?, promo_price = ?, start_date = ?, start_price = ?, updated_by = ? 
                WHERE id = ?
            `,
            [name, sku_id, end_date, end_price, promo_price, start_date, start_price, updated_by, id]
        )
        res.json(updatedPromo)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Toggle promo status
router.patch("/toggle/:id", getPromoByID, async (req, res) => {
    try {
        const { id } = req.params
        const { updated_by } = req.body
        await pool.query("UPDATE promo SET active = !active, updated_by = ? WHERE id = ?", [updated_by, id])
        res.status(200).json({ status: 200, message: "Promo updated" })
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create promo
router.post("/", async (req, res) => {
    try {
        // const { name, sku_id, start_price, end_price, promo_price, start_date, end_date, created_by } = req.body
        const { name, start_price, end_price, promo_price, start_date, end_date, created_by } = req.body
        const sku_id = 1
        const newPromo = await pool.query(
            "INSERT INTO promo (name, sku_id, start_price, end_price, promo_price, start_date, end_date, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
            [name, sku_id, start_price, end_price, promo_price, start_date, end_date, created_by]
        )
        res.status(201).json(newPromo)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function getPromoByID(req, res, next) {
    try {
        const { id } = req.params
        const promo = await pool.query(
            `
            SELECT pr.*, barcode, price, cost
                FROM promo pr
                JOIN sku ON (pr.sku_id = sku.id)
                WHERE pr.id = ?
                ORDER BY pr.active,  pr.name ASC`,
            [id]
        )
        if (promo[0].length === 0) return res.status(404).json({ message: "Promo not found", status: 404 })

        res.promo = promo[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getPromoByName(req, res) {
    try {
        const { name } = req.params
        const sku = await pool.query("SELECT * FROM promo WHERE name = ?", [name])
        if (sku[0].length !== 0) return res.status(400).json({ message: "Duplicated promo", status: 400 })

        return res.status(200).json({})
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
