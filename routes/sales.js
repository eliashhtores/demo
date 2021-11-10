const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// Get sales years 
router.get('/years', async (req, res) => {
    try {
        const years = await pool.query(`SELECT DISTINCT YEAR(created_at) AS years FROM inventory_ledger`)
        res.json(years[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})
module.exports = router
