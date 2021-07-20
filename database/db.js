const mysql = require('mysql2/promise')
require('dotenv').config()

try {
    const pool = mysql.createPool({
        user: process.env.DATABASE_USER,
        password: process.env.DATABASE_PASSWORD,
        host: process.env.DATABASE_HOST,
        database: process.env.DATABASE_NAME,
    })
    console.log('Connected to DB...')
    module.exports = pool
} catch (error) {
    console.error(error)
}
