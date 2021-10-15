const express = require('express')
const router = express.Router()
const app = express()
const pool = require('../database/db')

app.use(express.json())

// // Get all inventory
// router.get('/', async (req, res) => {
//     try {
//         const client = await pool.query(`SELECT c.id, c.name, c.address, city, telephone, c.active, us.username AS created_by, c.created_at, ur.username AS updated_by, c.updated_at
//                                 FROM client c
//                                 JOIN user us ON (c.created_by = us.id)
//                                 LEFT JOIN user ur ON (c.updated_by = ur.id)
//                                 ORDER BY c.id ASC`)
//         res.json(client[0])
//     } catch (error) {
//         res.status(500).json({ message: error.message })
//         console.error(error.message)
//     }
// })

// // Get one client by id
// router.get('/:id', getClientByID, async (req, res) => {
//     res.json(res.client)
// })

// // Check duplicated name
// router.get('/checkDuplicated/:name', getClientByName, async (req, res) => {
//     res.json(res.name)
// })

// // Update client
// router.patch('/:id', getClientByID, async (req, res) => {
//     const { id } = req.params
//     const { name, address, city, telephone, updated_by } = req.body
//     try {
//         const updatedClient = await pool.query('UPDATE client SET name = ?, address = ?, city = ?, telephone = ?, updated_by = ? WHERE id = ?', [name, address, city, telephone, updated_by, id])
//         res.json(updatedClient)
//     } catch (error) {
//         res.status(500).json({ message: error.message })
//         console.error(error.message)
//     }
// })

// // Toggle client status
// router.post('/toggle/:id', getClientByID, async (req, res) => {
//     try {
//         const { id } = req.params
//         const { updated_by } = req.body
//         const client = await pool.query('UPDATE client SET active = !active, updated_by = ? WHERE id = ?', [updated_by, id])
//         res.json(client[0])
//     } catch (error) {
//         res.status(500).json({ message: error.message })
//         console.error(error.message)
//     }
// })

// Create inventory registers
router.post('/', async (req, res) => {
    const data = req.body
    const supplier_id = req.body.shift().supplier_id
    const insert_data = data.reduce((a, i) => [...a, Object.values(i)], [])
    try {
        const newInventory = await pool.query('INSERT INTO inventory (sku_id, qty_received, expiration_date) VALUES ?', [insert_data])
        res.status(201).json(newInventory)
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function getClientByID(req, res, next) {
    try {
        const { id } = req.params
        const client = await pool.query('SELECT * FROM client WHERE id = ?', [id])
        if (client[0].length === 0) return res.status(404).json({ message: 'Client not found', status: 404 })

        res.client = client[0][0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

// async function getClientByName(req, res) {
//     try {
//         const { name } = req.params
//         const sku = await pool.query('SELECT * FROM client WHERE name = ?', [name])
//         if (sku[0].length !== 0) return res.status(400).json({ message: 'Duplicated client', status: 400 })

//         return res.status(200).json({})
//     } catch (error) {
//         res.status(500).json({ message: error.message, status: 500 })
//         console.error(error.message)
//     }
// }

module.exports = router
