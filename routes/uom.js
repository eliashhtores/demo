const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// Get all UOMs
router.get('/', async (req, res) => {
    try {
        const uoms = await pool.query(`SELECT uom.id, uom.description, uom.active, us.username AS created_by, uom.created_at, utr.username AS updated_by, uom.updated_at 
                                FROM unit_of_measurement uom 
                                JOIN user us ON (uom.created_by = us.id)
                                LEFT JOIN user utr ON (uom.updated_by = utr.id)
                                ORDER BY uom.id ASC`)
        res.json(uoms[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get one uom by id
router.get('/:id', getUOMByID, async (req, res) => {
    res.json(res.uom)
})

// Check duplicated uom
router.get('/checkDuplicated/:description', getUOM, async (req, res) => {
    res.json(res.uom)
})

// Update uom
router.patch('/:id', getUOMByID, async (req, res) => {
    const { id } = req.params
    const { description, updated_by } = req.body
    try {
        const updatedUOM = await pool.query('UPDATE unit_of_measurement SET description = ?, updated_by = ? WHERE id = ?', [description, updated_by, id])
        res.json(updatedUOM)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Toggle uom status
router.post('/toggle/:id', getUOMByID, async (req, res) => {
    try {
        const { id } = req.params
        const { updated_by } = req.body
        const uom = await pool.query('UPDATE unit_of_measurement SET active = !active, updated_by = ? WHERE id = ?', [updated_by, id])
        res.json(uom[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create uom
router.post('/', async (req, res) => {
    try {
        const { description, created_by } = req.body

        const newUOM = await pool.query('INSERT INTO unit_of_measurement (description, created_by) VALUES (?, ?)', [description, created_by])
        res.status(201).json(newUOM)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function getUOMByID(req, res, next) {
    try {
        const { id } = req.params
        const uom = await pool.query('SELECT * FROM unit_of_measurement WHERE id = ?', [id])
        if (uom[0].length === 0) return res.status(404).json({ message: 'UOM not found', status: 404 })

        res.uom = uom[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getUOM(req, res) {
    try {
        const { description } = req.params
        const uom = await pool.query('SELECT * FROM unit_of_measurement WHERE description = ?', [description])
        if (uom[0].length !== 0) return res.status(400).json({ message: 'Duplicated UOM', status: 400 })

        return res.status(200).json({})
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
