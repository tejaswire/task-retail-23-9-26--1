const express = require("express");

const app = express();
const PORT = process.env.PORT || 8081;
const VERSION = process.env.APP_VERSION || "4.2.0";
const ENVIRONMENT = process.env.ENVIRONMENT || "UAT";

app.use(express.json());

app.get("/", (req, res) => {
    res.json({
        application: "Retail Platform",
        version: VERSION,
        environment: ENVIRONMENT,
        paymentStatus: "PAYMENT_PROCESSING"
    });
});

app.get("/health", (req, res) => {
    res.status(500).json({
        status: "DOWN",
        version: VERSION
    });
});

app.get("/payment", (req, res) => {
    res.json({
        paymentStatus: "PAYMENT_SUCCESS",
        version: VERSION
    });
});

app.get("/products", (req, res) => {
    res.json({
        products: ["Laptop", "Phone", "Headphones"],
        version: VERSION
    });
});

app.get("/orders", (req, res) => {
    res.json({
        orders: ["ORD1001", "ORD1002"],
        version: VERSION
    });
});

app.listen(PORT, () => {
    console.log(`Retail Platform ${VERSION} running on port ${PORT}`);
});