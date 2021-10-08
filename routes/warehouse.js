const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// Get all warehouses
router.get('/', async (req, res) => {
    try {
        const warehouses = await pool.query(`SELECT w.id, w.name, w.active, us.username AS created_by, w.created_at, utr.username AS updated_by, w.updated_at 
                                                FROM warehouse w 
                                                JOIN user us ON (w.created_by = us.id)
                                                LEFT JOIN user utr ON (w.updated_by = utr.id)
                                                ORDER BY w.id ASC`)
        res.json(warehouses[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get one warehouse by id
router.get('/:id', getWarehouseByID, async (req, res) => {
    res.json(res.warehouse)
})

// Check duplicated warehouse
router.get('/checkDuplicated/:name', getWarehouseByName, async (req, res) => {
    res.json(res.warehouse)
})

// Update warehouse
router.patch('/:id', getWarehouseByID, async (req, res) => {
    const { id } = req.params
    const { name, updated_by } = req.body
    try {
        const updatedWarehouse = await pool.query('UPDATE warehouse SET name = ?, updated_by = ? WHERE id = ?', [name, updated_by, id])
        res.json(updatedWarehouse)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Toggle warehouse status
router.post('/toggle/:id', getWarehouseByID, async (req, res) => {
    try {
        const { id } = req.params
        const { updated_by } = req.body
        const warehouse = await pool.query('UPDATE warehouse SET active = !active, updated_by = ? WHERE id = ?', [updated_by, id])
        res.json(warehouse[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create warehouse
router.post('/', async (req, res) => {
    try {
        const { name, created_by } = req.body

        const newWarehouse = await pool.query('INSERT INTO warehouse (name, created_by) VALUES (?, ?)', [name, created_by])
        res.status(201).json(newWarehouse)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function getWarehouseByID(req, res, next) {
    try {
        const { id } = req.params
        const warehouse = await pool.query('SELECT * FROM warehouse WHERE id = ?', [id])
        if (warehouse[0].length === 0) return res.status(404).json({ message: 'Warehouse not found', status: 404 })

        res.warehouse = warehouse[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getWarehouseByName(req, res) {
    try {
        const { description } = req.params
        const warehouse = await pool.query('SELECT * FROM warehouse WHERE name = ?', [description])
        if (warehouse[0].length !== 0) return res.status(400).json({ message: 'Duplicated warehouse', status: 400 })

        return res.status(200).json({})
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
