const express = require("express")
const router = express.Router()
const app = express()
const pool = require("../database/db")

app.use(express.json())

// Get all skus
router.get("/", async (req, res) => {
    try {
        const skus =
            await pool.query(`SELECT s.id, s.barcode, s.description, s.price, s.cost, s.rack, mt.name AS department, s.requires_exp_date, s.minimum_inventory, us.username AS created_by, s.created_at, ur.username AS updated_by, s.updated_at, s.active 
                                FROM sku s
                                JOIN user us ON (s.created_by = us.id)
                                LEFT JOIN user ur ON (s.updated_by = ur.id)
                                LEFT JOIN department mt ON (s.department_id = mt.id)
                                ORDER BY s.id ASC`)
        res.json(skus[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get sku by barcode
router.get("/validateBarcode/:barcode", validateSkuByBarcode, async (req, res) => {
    res.json(res.sku)
})

// Check duplicated barcode
router.get("/checkDuplicated/:barcode", getSkuByBarcode, async (req, res) => {
    res.json(res.barcode)
})

// Check duplicated barcode by using id and barcode
router.get("/validateSKUData/:sku_id/:barcode", validateSKUData, async (req, res) => {
    res.json(res.barcode)
})

// Get one sku by id
router.get("/:id", getSkuByID, async (req, res) => {
    res.json(res.sku)
})

// Update sku
router.put("/:id", getSkuByID, async (req, res) => {
    const { id } = req.params
    const {
        barcode,
        description,
        requires_exp_date,
        price,
        cost,
        rack,
        department_id,
        uom,
        wholesale,
        uses_inventory,
        minimum_inventory,
        updated_by,
    } = req.body
    try {
        const updatedSku = await pool.query(
            `
            UPDATE sku SET barcode = ?, description = ?, requires_exp_date = ?, price = ?, cost = ?, rack = ?, department_id = ?,  uom = ?, wholesale = ?, uses_inventory = ?, minimum_inventory = ?, updated_by = ? 
            WHERE id = ?
            `,
            [
                barcode,
                description,
                requires_exp_date,
                price,
                cost,
                rack,
                department_id,
                uom,
                wholesale,
                uses_inventory,
                minimum_inventory,
                updated_by,
                id,
            ]
        )
        res.json(updatedSku)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Toggle sku status
router.patch("/toggle/:id", getSkuByID, async (req, res) => {
    try {
        const { id } = req.params
        const { updated_by } = req.body
        const sku = await pool.query("UPDATE sku SET active = !active, updated_by = ? WHERE id = ?", [updated_by, id])
        res.status(200).json({ message: "SKU status toggled", status: 200, sku: sku })
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create sku
router.post("/", async (req, res) => {
    try {
        const reason_code_id = 6
        const {
            barcode,
            cost,
            department,
            description,
            minimum_inventory,
            price,
            uom,
            uses_inventory,
            wholesale,
            created_by,
        } = req.body

        const newSku = await pool.query(
            "INSERT INTO sku (barcode, cost, department_id, description, minimum_inventory, price, uom, uses_inventory, wholesale, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [
                barcode,
                cost,
                department,
                description,
                minimum_inventory,
                price,
                uom,
                uses_inventory,
                wholesale,
                created_by,
            ]
        )
        // if (newSku[0].affectedRows != 0 && typeof uses_inventory !== "undefined") {
        //     await createInventoryLedgerRecord(reason_code_id, newSku[0].insertId, initial_qty, created_by)
        //     await createInventoryRecord(newSku[0].insertId, initial_qty)
        // }
        res.status(201).json({ message: "SKU created", status: 201, sku: newSku })
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function getSkuByID(req, res, next) {
    try {
        const { id } = req.params
        const sku = await pool.query("SELECT * FROM sku WHERE id = ?", [id])
        if (sku[0].length === 0) return res.status(404).json({ message: "SKU not found", status: 404 })

        res.sku = sku[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getSkuByBarcode(req, res) {
    try {
        const { barcode } = req.params
        const sku = await pool.query("SELECT * FROM sku WHERE barcode = ?", [barcode])
        if (sku[0].length !== 0) return res.status(400).json({ message: "Duplicated barcode", status: 400 })

        return res.status(200).json({})
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function validateSKUData(req, res) {
    try {
        const { sku_id, barcode } = req.params
        const sku = await pool.query("SELECT * FROM sku WHERE id != ? AND barcode = ? AND active", [sku_id, barcode])
        if (sku[0].length !== 0) return res.status(400).json({ message: "Wrong SKU", status: 400 })

        return res.status(200).json({ message: "SKU update OK", status: 200 })
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function validateSkuByBarcode(req, res) {
    try {
        const { barcode } = req.params
        const sku = await pool.query(
            `
                SELECT * FROM sku 
                WHERE barcode = ?
                    AND active
            `,
            [barcode]
        )
        if (sku[0].length !== 0) return res.status(200).json({ message: "Valid sku", status: 200, sku: sku[0][0] })

        return res.status(404).json({ message: "Sku not found", status: 404 })
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

// async function createInventoryLedgerRecord(reason_code_id, sku_id, qty, created_by) {
//     folio = await getFolio()
//     try {
//         await pool.query(
//             "INSERT INTO inventory_ledger (folio, reason_code_id, sku_id, qty, created_by) VALUES (?, ?, ?, ?, ?)",
//             [folio, reason_code_id, sku_id, qty, created_by]
//         )
//         setFolio()
//     } catch (error) {
//         console.error(error.message)
//     }
// }

// async function createInventoryRecord(sku_id, qty) {
//     try {
//         await pool.query("INSERT INTO inventory (sku_id, initial_qty) VALUES (?, ?)", [sku_id, qty])
//     } catch (error) {
//         console.error(error.message)
//     }
// }

// async function getFolio() {
//     try {
//         const folio = await pool.query("SELECT current_folio + 1 AS folio FROM folio")
//         if (folio[0].length === 0) return "Folio not found"
//         return folio[0][0].folio
//     } catch (error) {
//         res.status(500).json({ message: error.message, status: 500 })
//         console.error(error.message)
//     }
// }

// async function setFolio() {
//     try {
//         const folio = await pool.query("UPDATE folio SET current_folio = current_folio + 1")
//         if (folio[0].length === 0) return "Folio not found"
//     } catch (error) {
//         res.status(500).json({ message: error.message, status: 500 })
//         console.error(error.message)
//     }
// }

module.exports = router
