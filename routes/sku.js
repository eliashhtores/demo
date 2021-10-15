const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// Get all skus
router.get('/', async (req, res) => {
    try {
        const skus =
            await pool.query(`SELECT s.id, s.barcode, s.description, uom.description AS unit_of_measurement, s.price, s.cost, s.rack, mt.description AS med_type, s.requires_exp_date, s.minimum_inventory, us.username AS created_by, s.created_at, ur.username AS updated_by, s.updated_at, s.active 
                                FROM sku s
                                JOIN unit_of_measurement uom ON (uom.id = s.unit_of_measurement_id)
                                JOIN user us ON (s.created_by = us.id)
                                LEFT JOIN user ur ON (s.updated_by = ur.id)
                                LEFT JOIN med_type mt ON (s.med_type_id = mt.id)
                                ORDER BY s.id ASC`)
        res.json(skus[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get one sku by id
router.get('/:id', getSkuByID, async (req, res) => {
    res.json(res.sku)
})

// Get sku by barcode
router.get('/validateBarcode/:barcode', validateSkuByBarcode, async (req, res) => {
    res.json(res.sku)
})

// Check duplicated barcode
router.get('/checkDuplicated/:barcode', getSkuByBarcode, async (req, res) => {
    res.json(res.barcode)
})

// Update sku
router.patch('/:id', getSkuByID, async (req, res) => {
    const { id } = req.params
    const { barcode, description, unit_of_measurement_id, requires_exp_date, price, cost, rack, med_type_id, minimum_inventory, updated_by } = req.body
    try {
        const updatedSku = await pool.query(
            'UPDATE sku SET barcode = ?, description = ?, unit_of_measurement_id = ?, requires_exp_date = ?, price = ?, cost = ?, rack = ?, med_type_id = ?, minimum_inventory = ?, updated_by = ? WHERE id = ?',
            [barcode, description, unit_of_measurement_id, requires_exp_date, price, cost, rack, med_type_id, minimum_inventory, updated_by, id]
        )
        res.json(updatedSku)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Toggle sku status
router.post('/toggle/:id', getSkuByID, async (req, res) => {
    try {
        const { id } = req.params
        const { updated_by } = req.body
        const sku = await pool.query('UPDATE sku SET active = !active, updated_by = ? WHERE id = ?', [updated_by, id])
        res.json(sku[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create sku
router.post('/', async (req, res) => {
    try {
        const { barcode, cost, rack, med_type_id, description, minimum_inventory, requires_exp_date, price, unit_of_measurement_id, created_by } = req.body

        const newSku = await pool.query(
            'INSERT INTO sku (barcode, cost, rack, med_type_id, description, minimum_inventory, requires_exp_date, price, unit_of_measurement_id, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
            [barcode, cost, rack, med_type_id, description, minimum_inventory, requires_exp_date, price, unit_of_measurement_id, created_by]
        )
        res.status(201).json(newSku)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function getSkuByID(req, res, next) {
    try {
        const { id } = req.params
        const sku = await pool.query('SELECT * FROM sku WHERE id = ?', [id])
        if (sku[0].length === 0) return res.status(404).json({ message: 'Sku not found', status: 404 })

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
        const sku = await pool.query('SELECT * FROM sku WHERE barcode = ?', [barcode])
        if (sku[0].length !== 0) return res.status(400).json({ message: 'Duplicated barcode', status: 400 })

        return res.status(200).json({})
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function validateSkuByBarcode(req, res) {
    try {
        const { barcode } = req.params
        const sku = await pool.query('SELECT * FROM sku WHERE barcode = ?', [barcode])
        if (sku[0].length !== 0) return res.status(200).json({ message: 'Valid sku', status: 200, sku: sku[0][0] })

        return res.status(404).json({ message: 'Sku not found', status: 404 })
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
