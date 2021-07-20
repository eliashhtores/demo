const express = require('express')
const app = express()
const cors = require('cors')
const indexRouter = require('./routes/index')

app.use(cors())
app.use(express.json())

app.use('/', indexRouter)

app.listen(process.env.PORT || 3000, () => {
    console.log('Server running...')
})