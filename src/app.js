import express from "express"
import cors from "cors"

const app = express()
app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))
app.use(express.static("public"))
app.use(express.json());


//routes import
import jobRouter from './routes/jobs.routes.js'

app.get("/test", (req, res) => {
    res.send("MiniJob Germany!");
});

app.use("/api/v1/job", jobRouter)


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

export { app };