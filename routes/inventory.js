const express = require("express")
const router = express.Router()
const app = express()
const pool = require("../database/db")

app.use(express.json())

// Get all inventory
router.get("/", async (req, res) => {
    try {
        const inventory = await pool.query(`
            SELECT barcode, description, cost, price, (initial_qty + qty_received - qty_shipped + qty_adjusted) AS qty_available, minimum_inventory
                FROM inventory inv 
                JOIN sku ON (sku.id = inv.sku_id)
                WHERE (initial_qty + qty_received - qty_shipped + qty_adjusted) >= 0
            `)
        res.status(200).json(inventory[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get inventory by department
router.get("/department/:department_id", getInventoryByDepartment, async (req, res) => {
    res.status(200).json(res.inventory)
})

// Get inventory by barcode
router.get("/:barcode", getInventoryByBarcode, async (req, res) => {
    res.status(200).json(res.inventory)
})

// Get inventory by records by sku_id and expiration_date
router.post("/checkExpirationDate", checkExpirationDate, async (req, res) => {
    res.status(200).json(res.inventory)
})

// Get inventory ledgers
router.post("/ledger", getInventoryLedgerBySku, async (req, res) => {
    res.status(200).json(res.inventory_ledger)
})

// Get inventory ledger records by sku_id and expiration_date
router.post("/ledger/sku/", getInventoryLedgerBySku, async (req, res) => {
    res.status(200).json(res.inventory_ledger)
})

// Get inventory summary
router.get("/sku/summary", getInventorySummary, async (req, res) => {
    res.status(200).json(res.inventory_ledger)
})

// Get skus that require inventory
router.get("/reports/get_minimum", async (req, res) => {
    try {
        const inventory = await pool.query(`
            SELECT sku.barcode AS barcode, description, SUM(initial_qty + qty_received - qty_shipped + qty_adjusted) AS inv_qty, minimum_inventory, price, cost, dpt.name AS department
                FROM inventory inv
                JOIN sku ON (sku.id = inv.sku_id)
                JOIN department dpt ON (dpt.id = sku.department_id)
                WHERE (initial_qty + qty_received - qty_shipped + qty_adjusted) <= minimum_inventory
                    AND sku.uses_inventory 
                    AND sku.active
        `)
        res.json(inventory[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get movements by day
router.get("/reports/by_day/:date/:reasonCode", async (req, res) => {
    const { date } = req.params
    const { reasonCode } = req.params
    let and = reasonCode === "ALL" ? "" : `AND rc.code = '${reasonCode}'`

    try {
        const inventory = await pool.query(`
            SELECT TIME_FORMAT(il.created_at, '%H:%i') AS created_at, sku.description AS description, previous_qty, rc.description AS movement_type, us.name, qty, (previous_qty + qty) AS current_qty, dpt.name AS department, sku_id
                FROM inventory_ledger il
                JOIN reason_code rc ON (rc.id = il.reason_code_id)
                JOIN user us ON (us.id = il.created_by)
                JOIN sku ON (sku.id = il.sku_id)
                JOIN department dpt ON (dpt.id = sku.department_id) 
                WHERE DATE(il.created_at) = '${date}'
                ${and}
                ORDER BY il.id DESC
        `)
        if (inventory[0].length === 0) return res.status(404).json({ message: "No registers found", status: 404 })

        return res.status(200).json({ status: 200, inventory: inventory[0] })
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get movements by reason code
router.get("/reports/by_reason_code/:reason_code", async (req, res) => {
    const { reason_code } = req.params
    try {
        const inventory = await pool.query(`
            SELECT TIME_FORMAT(il.created_at, '%H:%i') AS created_at, sku.description AS description, previous_qty, rc.description AS movement_type, us.name, qty, (previous_qty + qty) AS current_qty, dpt.name AS department, sku_id
                FROM inventory_ledger il
                JOIN reason_code rc ON (rc.id = il.reason_code_id)
                JOIN user us ON (us.id = il.created_by)
                JOIN sku ON (sku.id = il.sku_id)
                JOIN department dpt ON (dpt.id = sku.department_id) 
                WHERE rc.code = '${reason_code}'
                ORDER BY il.created_at DESC
        `)
        if (inventory[0].length === 0) return res.status(404).json({ message: "No registers found", status: 404 })
        return res.status(200).json({ status: 200, inventory: inventory[0] })
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Get sales
router.get("/reports/sales", async (req, res) => {
    code = "SA"
    try {
        const inventory = await pool.query(
            `SELECT folio, sku.description AS description, barcode, qty, us.name, il.created_at, cl.name AS client, sku.id
                                                FROM inventory_ledger il
                                                JOIN reason_code rc ON (rc.id = il.reason_code_id)
                                                JOIN user us ON (us.id = il.created_by)
                                                JOIN sku ON (sku.id = il.sku_id)
                                                JOIN client cl ON (cl.id = il.client_id)
                                                WHERE code = ?
                                                AND qty > 0
                                                ORDER BY il.created_at DESC`,
            [code]
        )
        res.json(inventory[0])
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create inventory receipt
router.post("/", async (req, res) => {
    const reason_code_id = 2
    const { sku_id, qty, created_by } = req.body

    try {
        const folio = await getFolio()
        const newInventory = await pool.query(
            "INSERT INTO inventory (sku_id, qty_received) VALUES (?, ?) ON DUPLICATE KEY UPDATE qty_received = qty_received + VALUES(qty_received)",
            [sku_id, qty]
        )
        await createLedgerRecord(folio, reason_code_id, sku_id, qty, created_by)
        setFolio()
        res.status(201).json({ message: "Inventory created", status: 201, inventory: newInventory })
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
    // const reason_code_id = 2
    // const data = req.body
    // const created_by = data[0]
    // data.shift().created_by
    // const insert_data = data.reduce((a, i) => [...a, Object.values(i)], [])
    // try {
    //     const folio = await getFolio()
    //     const newInventory = await pool.query(
    //         "INSERT INTO inventory (sku_id, qty_received, expiration_date) VALUES ? ON DUPLICATE KEY UPDATE qty_received = qty_received + VALUES(qty_received) ",
    //         [insert_data]
    //     )
    //     await createLedgerRecord(folio, insert_data, reason_code_id, created_by)
    //     setFolio()
    //     res.status(201).json(newInventory)
    // } catch (error) {
    //     res.status(500).json({ message: error.message })
    //     console.error(error.message)
    // }
})

// Create sale
router.patch("/", async (req, res) => {
    const reason_code_id = 5
    const data = req.body
    const created_by = data.shift().created_by

    try {
        // @TODO Move to createLedgerRecord()
        const folio = await getFolio()
        for (const element of data) {
            const updatedInventory = await pool.query(
                "UPDATE inventory SET qty_shipped = qty_shipped + ? WHERE sku_id = ?",
                [element.qty_shipped, element.sku_id]
            )
            await createLedgerRecord(folio, reason_code_id, element.sku_id, element.qty_shipped * -1, created_by)
        }
        // @TODO Move to createLedgerRecord()
        setFolio()
        res.status(200).json({ Message: "Update successfully", status: 200 })
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Create inventory adjustment
router.patch("/adjustment/:sku_id", async (req, res) => {
    const reason_code_id = 3
    const { sku_id } = req.params
    const qty_adjusted = req.body.quantity
    const { created_by } = req.body

    try {
        // @TODO Move to createLedgerRecord()
        const folio = await getFolio()
        const updatedInventory = await pool.query(
            "UPDATE inventory SET qty_adjusted = qty_adjusted + ? WHERE sku_id = ?",
            [qty_adjusted, sku_id]
        )
        if (updatedInventory[0].affectedRows != 0) {
            await createLedgerRecord(folio, reason_code_id, sku_id, qty_adjusted, created_by)
            // @TODO Move to createLedgerRecord()
            setFolio()
            res.status(200).json({ Message: "Update successfully", status: 200, updatedInventory: updatedInventory })
            return
        }
        res.status(400).json({ status: 400, Message: "Not updated" })
    } catch (error) {
        res.status(500).json({ message: error.message })
        console.error(error.message)
    }
})

// Middleware functions
async function createLedgerRecord(folio, reason_code_id, sku_id, qty, created_by) {
    try {
        await pool.query(
            `
            INSERT INTO inventory_ledger (folio, reason_code_id, sku_id, previous_qty, qty, created_by)
            SELECT ? AS folio,
                ? AS reason_code_id,
                ? AS sku_id,
                COALESCE((SELECT (previous_qty + qty) AS available_qty FROM inventory_ledger WHERE sku_id = ? ORDER BY id DESC LIMIT 1), 0) AS previous_qty,
                ? AS qty,
                ? AS created_by
            `,
            [folio, reason_code_id, sku_id, sku_id, qty, created_by]
        )
    } catch (error) {
        console.error(error.message)
    }

    // for (const element of insert_data) {
    //     element.unshift(folio, reason_code_id)
    //     element.push(created_by)
    // }
    // try {
    //     await pool.query(
    //         "INSERT INTO inventory_ledger (folio, reason_code_id, sku_id, qty, expiration_date, created_by) VALUES ?",
    //         [insert_data]
    //     )
    // } catch (error) {
    //     console.error(error.message)
    // }
}

async function createSaleLedgerRecord(qty_shipped, sku_id, expiration_date, reason_code_id, created_by) {
    try {
        await pool.query(
            "INSERT INTO inventory_ledger (folio, reason_code_id, sku_id, qty, expiration_date, created_by) VALUES (?, ?, ?, ?, ?, ?)",
            [folio, reason_code_id, sku_id, qty_shipped, expiration_date, created_by]
        )
    } catch (error) {
        console.error(error.message)
    }
}

// async function createAdjustmentLedgerRecord(qty_adjusted, sku_id, created_by) {
//     console.log("Inside the adjustment ledger function")
//     folio = await getFolio()
//     const reason_code_id = 3
//     try {
//         await pool.query(
//             "INSERT INTO inventory_ledger (folio, reason_code_id, sku_id, qty, previous_qty, created_by) VALUES (?, ?, ?, ?, ?, previous_qty)",
//             [folio, reason_code_id, sku_id, qty_adjusted, created_by]
//         )
//         setFolio()
//     } catch (error) {
//         console.error(error.message)
//     }
// }

// SELECT (previous_qty + qty) FROM inventory_ledger WHERE sku_id = ? ORDER BY id DESC LIMIT 1

async function getFolio() {
    try {
        const folio = await pool.query("SELECT current_folio + 1 AS folio FROM folio")
        if (folio[0].length === 0) return "Folio not found"
        return folio[0][0].folio
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function setFolio() {
    try {
        const folio = await pool.query("UPDATE folio SET current_folio = current_folio + 1")
        if (folio[0].length === 0) return "Folio not found"
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getInventoryByDepartment(req, res) {
    try {
        const { department_id } = req.params
        let and = ""
        if (department_id !== "all") {
            and = `AND department_id = ${department_id}`
        }
        const data = await pool.query(
            `
                SELECT sku.*, (initial_qty + qty_received - qty_shipped + qty_adjusted) AS qty_available
                FROM inventory inv JOIN sku ON (sku.id = inv.sku_id) 
                WHERE active
                    AND uses_inventory
                    ${and}
            `
        )
        if (data[0].length === 0) return res.status(404).json({ message: "No SKUs found", status: 404 })
        return res.status(200).json({ message: "OK", status: 200, data: data[0] })
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getInventoryByBarcode(req, res, next) {
    try {
        const { barcode } = req.params
        const sku = await pool.query(
            `
                SELECT sku.*, (initial_qty + qty_received - qty_shipped + qty_adjusted) AS qty_available
                FROM inventory inv JOIN sku ON (sku.id = inv.sku_id) 
                WHERE barcode = ?
                    AND active
                    AND uses_inventory
            `,
            [barcode]
        )
        if (sku[0].length === 0) return res.status(404).json({ message: "SKU and inventory not found", status: 404 })
        return res.status(200).json({ message: "Valid sku", status: 200, sku: sku[0][0] })
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function checkExpirationDate(req, res, next) {
    try {
        const sku_id = req.body.sku_id
        const expiration_date = req.body.expiration_date
        const inventory = await pool.query(
            `SELECT COUNT(*) AS count
                FROM inventory
                WHERE sku_id = ? 
                    AND expiration_date = ?
            `,
            [sku_id, expiration_date]
        )

        if (inventory[0][0].count === 0) return res.status(404).json({ message: "Inventory not found", status: 404 })
        res.inventory = inventory[0][0].count
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getInventorySummary(req, res, next) {
    try {
        let department = "",
            and = ""
        and != undefined ? (department = `AND department_id = '${req.body.department}'`) : 1

        const inventory_summary = await pool.query(
            `SELECT SUM(price) AS total_price, SUM((initial_qty+ qty_received - qty_shipped + qty_adjusted)) AS total_qty
                FROM inventory inv
                JOIN sku ON (sku.id = inv.sku_id)
                WHERE active
                ${and}
            `
        )
        if (inventory_summary[0].length === 0)
            return res.status(404).json({ message: "Inventory summary not found", status: 404 })
        res.json(inventory_summary[0][0])
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

async function getInventoryLedgerBySku(req, res, next) {
    try {
        let barcode = "",
            where = ""
        req.body.barcode != undefined ? (barcode = `AND barcode = '${req.body.barcode}'`) : ""

        if (req.body.start_date && req.body.end_date) {
            where = `WHERE DATE(il.created_at) BETWEEN '${req.body.start_date}' AND '${req.body.end_date}' ${barcode}`
        } else if (req.body.start_date) {
            where = `WHERE DATE(il.created_at) = '${req.body.start_date}' ${barcode}`
        } else if (req.body.barcode) {
            where = `WHERE barcode = '${req.body.barcode}'`
        } else if (req.body.hasOwnProperty("sku_id")) {
            where = `WHERE sku_id = ${req.body.sku_id}`
            if (req.body.hasOwnProperty("expiration_date")) {
                where += ` AND expiration_date = '${req.body.expiration_date}'`
            }
        }
        const inventory_ledger = await pool.query(
            `SELECT folio, rc.description AS movement_type, sku.description AS sku_description, barcode, qty, COALESCE(su.name, '') AS supplier, COALESCE(cl.name, '') AS client, COALESCE(il.description, '') AS description, us.name, il.created_at
                FROM inventory_ledger il
                JOIN reason_code rc ON (rc.id = il.reason_code_id)
                JOIN user us ON (us.id = il.created_by)
                JOIN sku ON (sku.id = il.sku_id)
                LEFT JOIN supplier su ON (su.id = il.supplier_id)
                LEFT JOIN client cl ON (cl.id = il.client_id)
                ${where}
                    AND qty > 0
                ORDER BY il.created_at DESC`
        )
        if (inventory_ledger[0].length === 0)
            return res.status(404).json({ message: "Inventory ledger not found", status: 404 })
        res.inventory_ledger = inventory_ledger[0]
        next()
    } catch (error) {
        res.status(500).json({ message: error.message, status: 500 })
        console.error(error.message)
    }
}

module.exports = router
