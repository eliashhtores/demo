const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// Get reason codes
router.get('/', async (req, res) => {
    try {
        const reason_codes = await pool.query(`SELECT * FROM reason_code WHERE admin_adj`)
        res.json(reason_codes[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})
module.exports = router
