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
    res.status(200).json({
        status: "UP",
        version: VERSION
    });
});

app.get("/payment", (req, res) => {
    res.json({
        paymentStatus: "PAYMENT_PROCESSING",
        version: VERSION
    });
});

app.listen(PORT, () => {
    console.log(`Retail Platform ${VERSION} running on port ${PORT}`);
});