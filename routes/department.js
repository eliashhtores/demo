const express = require("express")
const router = express.Router()
const app = express()
const pool = require("../database/db")

app.use(express.json())

// Get all departments
router.get("/", async (req, res) => {
    try {
        const department = await pool.query(`SELECT id, name, active
                                FROM department
                                ORDER BY name ASC`)
        res.json(department[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get one department by id
router.get("/:id", getDepartmentByID, async (req, res) => {
    res.json(res.department)
})

// Check duplicated name
router.get("/checkDuplicated/:name", getDepartmentByName, async (req, res) => {
    res.json(res.name)
})

// Update department
router.patch("/:id", getDepartmentByID, async (req, res) => {
    const { id } = req.params
    const { name, updated_by } = req.body
    try {
        const updatedDepartment = await pool.query("UPDATE department SET name = ?, updated_by = ? WHERE id = ?", [
            name,
            updated_by,
            id,
        ])
        res.json(updatedDepartment)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Toggle department status
router.patch("/toggle/:id", getDepartmentByID, async (req, res) => {
    try {
        const { id } = req.params
        const { updated_by } = req.body
        await pool.query("UPDATE department SET active = !active, updated_by = ? WHERE id = ?", [updated_by, id])
        res.status(200).json({ status: 200, message: "Department updated" })
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create department
router.post("/", async (req, res) => {
    try {
        const { name, created_by } = req.body
        const newDepartment = await pool.query("INSERT INTO department (name, created_by) VALUES (?, ?)", [
            name,
            created_by,
        ])
        res.status(201).json(newDepartment)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function getDepartmentByID(req, res, next) {
    try {
        const { id } = req.params
        const department = await pool.query("SELECT * FROM department WHERE id = ?", [id])
        if (department[0].length === 0) return res.status(404).json({ message: "Department not found", status: 404 })

        res.department = department[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getDepartmentByName(req, res) {
    try {
        const { name } = req.params
        const sku = await pool.query("SELECT * FROM department WHERE name = ?", [name])
        if (sku[0].length !== 0) return res.status(400).json({ message: "Duplicated department", status: 400 })

        return res.status(200).json({})
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
