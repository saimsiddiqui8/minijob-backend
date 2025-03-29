import express from "express"
import cors from "cors"
import os from "os";

const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.static("public"))
app.use(express.json());
app.set('trust proxy', true)

//routes import
import jobRouter from './routes/jobs.routes.js'
import emailSubscriptionRouter from "./routes/email-subscription.routes.js"

app.get("/", (req, res) => {
    const serverIp = Object.values(os.networkInterfaces())
        .flat()
        .find((iface) => iface.family === "IPv4" && !iface.internal)?.address || "Unknown IP";

    res.send({
        message: "Server is running",
        serverIp,
        port: process.env.PORT,
        uptime: `${process.uptime().toFixed(2)} seconds`,
        timestamp: new Date().toISOString(),
        hostname: os.hostname(),
    });
});

app.get("/test", (req, res) => {
    res.send("MiniJob Germany!");
});

app.use("/api/v1/job", jobRouter)
app.use("/api/v1/email-subscribe", emailSubscriptionRouter)


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

export { app };