require('dotenv').config()

const express = require('express')
const app = express()
const cors = require('cors')
const userRouter = require('./routes/user')

app.use(cors())
app.use(express.json())
app.use('/user', userRouter)

app.listen(process.env.PORT || 3001, () => {
    console.log(`Server running on port ${process.env.PORT}...`)
})
