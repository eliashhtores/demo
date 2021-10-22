const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// Get all inventory
router.get('/', async (req, res) => {
    try {
        const inventory = await pool.query(`SELECT sku.id, barcode, description, (qty_received - qty_shipped) AS qty_available, qty_received, qty_shipped, qty_adjusted, 
                                            CASE
                                            WHEN expiration_date != 0000-00-00 THEN expiration_date
                                            ELSE ''
                                            END AS expiration_date
                                            FROM inventory inv 
                                            JOIN sku ON (sku.id = inv.sku_id)
                                            WHERE (qty_received - qty_shipped) >= 0
                                            ORDER BY sku.id ASC`)
        res.status(200).json(inventory[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get inventory by barcode
router.get('/:barcode', getInventoryByBarcode, async (req, res) => {
    res.status(200).json(res.inventory)
})

// Get inventory ledger by barcode
router.get('/ledger/barcode/:barcode', getInventoryLedgerBySku, async (req, res) => {
    res.status(200).json(res.inventory_ledger)
})

// Get inventory ledger records by sku_id
router.get('/ledger/sku/:sku_id', getInventoryLedgerBySku, async (req, res) => {
    res.status(200).json(res.inventory_ledger)
})

// Get skus that require inventory
router.get('/reports/get_minimum', async (req, res) => {
    try {
        const inventory = await pool.query(`SELECT sku.barcode AS barcode, description, (qty_received - qty_shipped + qty_adjusted) AS inv_qty, minimum_inventory
                                                FROM inventory inv
                                                JOIN sku ON (sku.id = inv.sku_id)
                                                WHERE (qty_received - qty_shipped + qty_adjusted) <= minimum_inventory`)
        res.json(inventory[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get latest movements
router.get('/reports/get_latest', async (req, res) => {
    try {
        const inventory = await pool.query(`SELECT folio, rc.description AS movement_type, sku.description AS description, barcode, qty, sku_id
                                                FROM inventory_ledger il
                                                JOIN reason_code rc ON (rc.id = il.reason_code_id)
                                                JOIN user us ON (us.id = il.created_by)
                                                JOIN sku ON (sku.id = il.sku_id)
                                                ORDER BY il.created_at DESC
                                                LIMIT 10`)
        res.json(inventory[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create inventory receipt
router.post('/', async (req, res) => {
    reason_code_id = 2
    const data = req.body
    const supplier_id = data.shift().supplier_id
    const created_by = data.shift().created_by
    const insert_data = data.reduce((a, i) => [...a, Object.values(i)], [])
    try {
        const newInventory = await pool.query('INSERT INTO inventory (sku_id, qty_received, expiration_date) VALUES ? ON DUPLICATE KEY UPDATE qty_received = qty_received + VALUES(qty_received) ', [
            insert_data,
        ])
        await createReceiptLedgerRecord(insert_data, reason_code_id, supplier_id, created_by)
        res.status(201).json(newInventory)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create sale
router.patch('/', async (req, res) => {
    const reason_code_id = 5
    const data = req.body
    const client_id = data.shift().client_id
    const created_by = data.shift().created_by
    let updatedInventory
    try {
        for (const element of data) {
            updatedInventory += await pool.query('UPDATE inventory SET qty_shipped = qty_shipped + ? WHERE sku_id = ?', [element.qty_shipped, element.sku_id])
            await createSaleLedgerRecord(element.qty_shipped, element.sku_id, reason_code_id, client_id, created_by)
        }
        res.status(201).json(updatedInventory)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create inventory adjustment
router.post('/adjustment', async (req, res) => {
    const data = req.body

    try {
        const updatedInventory = await pool.query('UPDATE inventory SET qty_adjusted = qty_adjusted + ? WHERE sku_id = ?', [data.qty_adjusted, data.sku_id])
        if (updatedInventory[0].affectedRows != 0) {
            await createAdjustmentLedgerRecord(data)
            res.status(201).json(updatedInventory)
            return
        }
        res.status(404).json({ status: 404, Message: 'Not updated' })
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function createReceiptLedgerRecord(insert_data, reason_code_id, supplier_id, created_by) {
    folio = await getFolio()
    for (const element of insert_data) {
        element.unshift(folio, reason_code_id)
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

async function createSaleLedgerRecord(qty_shipped, sku_id, reason_code_id, client, created_by) {
    folio = await getFolio()
    try {
        await pool.query('INSERT INTO inventory_ledger (folio, reason_code_id, sku_id, qty, client_id, created_by) VALUES (?, ?, ?, ?, ?, ?)', [
            folio,
            reason_code_id,
            sku_id,
            qty_shipped,
            client,
            created_by,
        ])
        setFolio()
    } catch (error) {
        console.error(error.message)
    }
}

async function createAdjustmentLedgerRecord(data) {
    folio = await getFolio()
    try {
        await pool.query('INSERT INTO inventory_ledger (folio, reason_code_id, sku_id, qty, description, created_by) VALUES (?, ?, ?, ?, ?, ?)', [
            folio,
            data.reason_code_id,
            data.sku_id,
            data.qty_adjusted,
            data.description,
            data.created_by,
        ])
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
        const inventory = await pool.query('SELECT sku.*,  SUM(qty_received - qty_shipped + qty_adjusted) AS qty_available FROM inventory JOIN sku ON (sku.id = inventory.sku_id) WHERE barcode = ?', [
            barcode,
        ])
        if (inventory[0].length === 0) return res.status(404).json({ message: 'Inventory not found', status: 404 })

        res.inventory = inventory[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getInventoryLedgerBySku(req, res, next) {
    try {
        let data = req.params.barcode
        let where = 'barcode'

        if (req.params.hasOwnProperty('sku_id')) {
            data = req.params.sku_id
            where = 'sku_id'
        }
        const inventory_ledger = await pool.query(
            `SELECT folio, rc.description AS movement_type, sku.description AS sku_description, barcode, qty, COALESCE(su.name, '') AS supplier, COALESCE(cl.name, '') AS client, COALESCE(il.description, '') AS description, us.name, il.created_at
                                                    FROM inventory_ledger il
                                                    JOIN reason_code rc ON (rc.id = il.reason_code_id)
                                                    JOIN user us ON (us.id = il.created_by)
                                                    JOIN sku ON (sku.id = il.sku_id)
                                                    LEFT JOIN supplier su ON (su.id = il.supplier_id)
                                                    LEFT JOIN client cl ON (cl.id = il.client_id)
                                                    WHERE ${where} = ?
                                                    ORDER BY il.created_at DESC`,
            data
        )
        if (inventory_ledger[0].length === 0) return res.status(404).json({ message: 'Inventory ledger not found', status: 404 })
        res.inventory_ledger = inventory_ledger[0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
