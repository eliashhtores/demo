require('dotenv').config()

const express = require('express')
const app = express()
const cors = require('cors')
const userRouter = require('./routes/user')
const skuRouter = require('./routes/sku')
const uomRouter = require('./routes/uom')
const warehouseRouter = require('./routes/warehouse')
const medTypeRouter = require('./routes/med_type')
const clientRouter = require('./routes/client')

app.use(cors())
app.use(express.json())
app.use('/user', userRouter)
app.use('/sku', skuRouter)
app.use('/uom', uomRouter)
app.use('/warehouse', warehouseRouter)
app.use('/med_type', medTypeRouter)
app.use('/client', clientRouter)

app.listen(process.env.PORT || 3001, () => {
    console.log(`Server running on port ${process.env.PORT}...`)
})
