const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// Get all users
router.get('/', async (req, res) => {
    try {
        const users = await pool.query('SELECT * FROM user')
        res.json(users[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get one user
router.get('/:id', getUser, async (req, res) => {
    res.json(res.user)
})

// Update user
router.patch('/:id', getUser, async (req, res) => {
    const { id } = req.params
    const { username, name, user_type_id, warehouse_id } = req.body
    try {
        const updatedUser = await pool.query('UPDATE user SET username = ?, name = ?, user_type_id = ?, warehouse_id = ? WHERE id = ?', [username, name, user_type_id, warehouse_id, id])
        res.json(updatedUser)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Toggle user status
router.delete('/:id', getUser, async (req, res) => {
    try {
        const { id } = req.params
        const user = await pool.query('UPDATE user SET active = !active WHERE id = ?', [id])
        res.json(user)
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
        res.json(newUser)
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

        res.json(user[0])
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
})

// Middleware functions
async function getUser(req, res, next) {
    try {
        const { id } = req.params
        const user = await pool.query('SELECT * FROM user WHERE id = ?', [id])
        if (user[0].length === 0) return res.status(404).json({ message: 'User not found', status: 404 })

        res.user = user[0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
