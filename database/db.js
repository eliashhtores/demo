const mysql = require('mysql2/promise')

const pool = mysql.createPool({
    user: "demo",
    password: "hXh2MGbZo7J(JYec",
    host: "localhost",
    database: "demo"
})

module.exports = pool