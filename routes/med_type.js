const express = require("express")
const router = express.Router()
const app = express()
const pool = require("../database/db")

app.use(express.json())

// Get all med types
router.get("/", async (req, res) => {
    try {
        const medTypes =
            await pool.query(`SELECT mt.id, mt.description, mt.active, us.username AS created_by, mt.created_at, utr.username AS updated_by, mt.updated_at 
                                FROM department mt 
                                JOIN user us ON (mt.created_by = us.id)
                                LEFT JOIN user utr ON (mt.updated_by = utr.id)
                                ORDER BY mt.id ASC`)
        res.json(medTypes[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get one med type by id
router.get("/:id", getMedTypeByID, async (req, res) => {
    res.json(res.medType)
})

// Check duplicated med type
router.get("/checkDuplicated/:description", getMedType, async (req, res) => {
    res.json(res.department)
})

// Update med type
router.patch("/:id", getMedTypeByID, async (req, res) => {
    const { id } = req.params
    const { description, updated_by } = req.body
    try {
        const updatedMedType = await pool.query("UPDATE department SET description = ?, updated_by = ? WHERE id = ?", [
            description,
            updated_by,
            id,
        ])
        res.json(updatedMedType)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Toggle med type status
router.post("/toggle/:id", getMedTypeByID, async (req, res) => {
    try {
        const { id } = req.params
        const { updated_by } = req.body
        const department = await pool.query("UPDATE department SET active = !active, updated_by = ? WHERE id = ?", [
            updated_by,
            id,
        ])
        res.json(department[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create med type
router.post("/", async (req, res) => {
    try {
        const { description, created_by } = req.body

        const newMedType = await pool.query("INSERT INTO department (description, created_by) VALUES (?, ?)", [
            description,
            created_by,
        ])
        res.status(201).json(newMedType)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function getMedTypeByID(req, res, next) {
    try {
        const { id } = req.params
        const department = await pool.query("SELECT * FROM department WHERE id = ?", [id])
        if (department[0].length === 0) return res.status(404).json({ message: "Med type not found", status: 404 })

        res.department = department[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getMedType(req, res) {
    try {
        const { description } = req.params
        const department = await pool.query("SELECT * FROM department WHERE description = ?", [description])
        if (department[0].length !== 0) return res.status(400).json({ message: "Duplicated Med Type", status: 400 })

        return res.status(200).json({})
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
