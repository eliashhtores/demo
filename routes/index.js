const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())
const cors = require('cors')

router.get('/', (req, res) => {
    res.send('Hello World')
})

router.post('/user', async (req, res) => {
    try {
        const { username } = req.body
        const { name } = req.body
        const { password } = req.body
        const { user_type_id } = req.body
        const { warehouse_id } = req.body
        const { created_by } = req.body

        const newUser = await pool.query("INSERT INTO user (username, name, password, user_type_id, warehouse_id, created_by) VALUES (?, ?, PASSWORD(?), ?, ?, ?)", [username, name, password, user_type_id, warehouse_id, created_by])
        res.json(newUser)
    } catch (error) {
        console.error(error.message)
    }
})

module.exports = router