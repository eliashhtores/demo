const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// Get all supplier
router.get('/', async (req, res) => {
    try {
        const supplier = await pool.query(`SELECT s.id, s.name, attention, address, city, s.active, us.username AS created_by, s.created_at, ur.username AS updated_by, s.updated_at
                                            FROM supplier s
                                            JOIN user us ON (s.created_by = us.id)
                                            LEFT JOIN user ur ON (s.updated_by = ur.id)
                                            ORDER BY s.id ASC`)
        res.json(supplier[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get one supplier by id
router.get('/:id', getSupplierByID, async (req, res) => {
    res.json(res.supplier)
})

// Check duplicated name
router.get('/checkDuplicated/:name', getSupplierByName, async (req, res) => {
    res.json(res.name)
})

// Update supplier
router.patch('/:id', getSupplierByID, async (req, res) => {
    const { id } = req.params
    const { name, attention, address, city, updated_by } = req.body
    try {
        const updatedSupplier = await pool.query('UPDATE supplier SET name = ?, attention = ?, address = ?, city = ?, updated_by = ? WHERE id = ?', [name, attention, address, city, updated_by, id])
        res.json(updatedSupplier)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Toggle supplier status
router.post('/toggle/:id', getSupplierByID, async (req, res) => {
    try {
        const { id } = req.params
        const { updated_by } = req.body
        const supplier = await pool.query('UPDATE supplier SET active = !active, updated_by = ? WHERE id = ?', [updated_by, id])
        res.json(supplier[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create supplier
router.post('/', async (req, res) => {
    try {
        const { name, attention, address, city, created_by } = req.body
        const newSupplier = await pool.query('INSERT INTO supplier (name, attention, address, city, created_by) VALUES (?, ?, ?, ?, ?)', [name, attention, address, city, created_by])
        res.status(201).json(newSupplier)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function getSupplierByID(req, res, next) {
    try {
        const { id } = req.params
        const supplier = await pool.query('SELECT * FROM supplier WHERE id = ?', [id])
        if (supplier[0].length === 0) return res.status(404).json({ message: 'Supplier not found', status: 404 })

        res.supplier = supplier[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getSupplierByName(req, res) {
    try {
        const { name } = req.params
        const sku = await pool.query('SELECT * FROM supplier WHERE name = ?', [name])
        if (sku[0].length !== 0) return res.status(400).json({ message: 'Duplicated supplier', status: 400 })

        return res.status(200).json({})
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
