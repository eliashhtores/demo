const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// Get all inventory
router.get('/', async (req, res) => {
    try {
        const client = await pool.query(`SELECT c.id, c.name, c.address, city, telephone, c.active, us.username AS created_by, c.created_at, ur.username AS updated_by, c.updated_at
                                FROM client c
                                JOIN user us ON (c.created_by = us.id)
                                LEFT JOIN user ur ON (c.updated_by = ur.id)
                                ORDER BY c.id ASC`)
        res.json(client[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get inventory by barcode
router.get('/:barcode', getInventoryByBarcode, async (req, res) => {
    res.json(res.inventory)
})

// Create inventory registers
router.post('/', async (req, res) => {
    const data = req.body
    const supplier_id = data.shift().supplier_id
    const created_by = data.shift().created_by
    const insert_data = data.reduce((a, i) => [...a, Object.values(i)], [])
    try {
        const newInventory = await pool.query('INSERT INTO inventory (sku_id, qty_received, expiration_date) VALUES ? ON DUPLICATE KEY UPDATE qty_received = qty_received + VALUES(qty_received) ', [
            insert_data,
        ])
        await createLedgerRecord(insert_data, supplier_id, created_by)
        res.status(201).json(newInventory)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function createLedgerRecord(insert_data, supplier_id, created_by) {
    folio = await getFolio()
    for (const element of insert_data) {
        element.unshift(folio, 2)
        element.pop()
        element.push(supplier_id, created_by)
    }
    try {
        await pool.query('INSERT INTO inventory_ledger (folio, reason_code_id, sku_id, qty, supplier_id, created_by) VALUES ?', [insert_data])
        setFolio()
    } catch (error) {
        console.error(error.message)
    }
}

async function getFolio() {
    try {
        const folio = await pool.query('SELECT current_folio + 1 AS folio FROM folio')
        if (folio[0].length === 0) return 'Folio not found'
        return folio[0][0].folio
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function setFolio() {
    try {
        const folio = await pool.query('UPDATE folio SET current_folio = current_folio + 1')
        if (folio[0].length === 0) return 'Folio not found'
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getInventoryByBarcode(req, res, next) {
    try {
        const { barcode } = req.params
        const inventory = await pool.query('SELECT * FROM inventory JOIN sku ON (sku.id = inventory.sku_id) WHERE barcode = ?', [barcode])
        if (inventory[0].length === 0) return res.status(404).json({ message: 'Inventory not found', status: 404 })

        res.inventory = inventory[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
