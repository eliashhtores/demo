const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// Get all users
router.get('/', async (req, res) => {
    try {
        const users =
            await pool.query(`SELECT um.id, um.username, um.name, description AS user_type, um.active, w.name AS warehouse, us.username AS created_by, um.created_at, utr.username AS updated_by, um.updated_at 
                                FROM user um 
                                JOIN user us ON (um.created_by = us.id)
                                LEFT JOIN user utr ON (um.updated_by = utr.id)
                                JOIN user_type ut ON (ut.id = um.user_type_id)
                                JOIN warehouse w ON (w.id = um.warehouse_id)
                                ORDER BY um.id ASC`)
        res.json(users[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get one user by id
router.get('/:id', getUserByID, async (req, res) => {
    res.json(res.user)
})

// Check duplicated user
router.get('/checkDuplicated/:username', getUserByUsername, async (req, res) => {
    res.json(res.user)
})

// Update user
router.patch('/:id', getUserByID, async (req, res) => {
    const { id } = req.params
    const { username, name, user_type_id, warehouse_id, updated_by } = req.body
    try {
        const updatedUser = await pool.query('UPDATE user SET name = ?, user_type_id = ?, warehouse_id = ?, updated_by = ? WHERE id = ?', [
            username,
            name,
            user_type_id,
            warehouse_id,
            updated_by,
            id,
        ])
        res.json(updatedUser)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Toggle user status
router.post('/toggle/:id', getUserByID, async (req, res) => {
    try {
        const { id } = req.params
        const { updated_by } = req.body
        const user = await pool.query('UPDATE user SET active = !active, updated_by = ? WHERE id = ?', [updated_by, id])
        res.json(user[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create user
router.post('/', async (req, res) => {
    try {
        const { username } = req.body
        const { name } = req.body
        const { password } = req.body
        const { user_type_id } = req.body
        const { warehouse_id } = req.body
        const { created_by } = req.body

        const newUser = await pool.query('INSERT INTO user (username, name, password, user_type_id, warehouse_id, created_by) VALUES (?, ?, PASSWORD(?), ?, ?, ?)', [
            username,
            name,
            password,
            user_type_id,
            warehouse_id,
            created_by,
        ])
        res.status(201).json(newUser)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Validate user
router.post('/validate', async (req, res) => {
    try {
        const { username } = req.body
        const { password } = req.body
        const user = await pool.query('SELECT id, user_type_id, username, name, warehouse_id FROM user WHERE username = ? AND password = PASSWORD(?) AND active', [username, password])

        if (user[0].length == 0) {
            res.status(404).json(user[0])
            return
        }

        res.json(user[0][0])
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
})

// Middleware functions
async function getUserByID(req, res, next) {
    try {
        const { id } = req.params
        const user = await pool.query('SELECT * FROM user WHERE id = ?', [id])
        if (user[0].length === 0) return res.status(404).json({ message: 'User not found', status: 404 })

        res.user = user[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getUserByUsername(req, res, next) {
    try {
        const { username } = req.params
        const user = await pool.query('SELECT * FROM user WHERE username = ?', [username])
        if (user[0].length !== 0) return res.status(400).json({ message: 'Duplicated user', status: 400 })

        res.user = user[0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
