require('dotenv').config()

const express = require('express')
const app = express()
const cors = require('cors')
const userRouter = require('./routes/user')
const skuRouter = require('./routes/sku')
const uomRouter = require('./routes/uom')
const supplierRouter = require('./routes/supplier')
const medTypeRouter = require('./routes/med_type')
const clientRouter = require('./routes/client')

app.use(cors())
app.use(express.json())
app.use('/user', userRouter)
app.use('/sku', skuRouter)
app.use('/uom', uomRouter)
app.use('/supplier', supplierRouter)
app.use('/med_type', medTypeRouter)
app.use('/client', clientRouter)

app.listen(process.env.PORT || 3001, () => {
    console.log(`Server running on port ${process.env.PORT}...`)
})
