if (process.env.ENV !== "prod") {
    require("dotenv").config()
}

const express = require("express")
const app = express()
const cors = require("cors")
const userRouter = require("./routes/user")
const skuRouter = require("./routes/sku")
const departmentRouter = require("./routes/department")
const promoRouter = require("./routes/promo")
const supplierRouter = require("./routes/supplier")
const clientRouter = require("./routes/client")
const inventoryRouter = require("./routes/inventory")
const reasonCodeRouter = require("./routes/reasonCode")
const salesRouter = require("./routes/sales")

app.use(cors())
app.use(express.json())
app.use("/user", userRouter)
app.use("/sku", skuRouter)
app.use("/department", departmentRouter)
app.use("/promo", promoRouter)
app.use("/supplier", supplierRouter)
app.use("/client", clientRouter)
app.use("/inventory", inventoryRouter)
app.use("/reason_code", reasonCodeRouter)
app.use("/sales", salesRouter)

app.listen(process.env.PORT || 3001, () => {
    console.log(`Server running on port ${process.env.PORT}...`)
})
