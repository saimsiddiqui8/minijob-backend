import express from "express";
import cors from "cors";
import os from "os";
import morgan from "morgan";

const app = express();
app.set("trust proxy", true);


// ✅ Manual CORS fallback (because vercel sometimes skips cors middleware)
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", req.headers.origin || "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.setHeader("Access-Control-Allow-Credentials", "true");
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});

// If still using cors() as well
app.use(cors({
  origin: [
    "https://jobs-berlin.vercel.app",
    "https://www.jobs-berlin.vercel.app",
    "https://minijobgermany.de",
    "http://localhost:3000"
  ],
  credentials: true,
}));

app.use(express.static("public"));
app.use(express.json());
app.use(morgan("combined"));

//routes import
import jobRouter from "./routes/jobs.routes.js";
import emailSubscriptionRouter from "./routes/email-subscription.routes.js";
// import { fetchJobs } from "./controllers/jobs.controllers.js";
import contactRouter from "./routes/contact.routes.js";

app.listen(8000, () => {
  console.log('Server is running', 8000);
});

app.get("/", async (req, res) => {
  const serverIp =
    Object.values(os.networkInterfaces())
      .flat()
      .find((iface) => iface.family === "IPv4" && !iface.internal)?.address ||
    "Unknown IP";
  // await fetchJobs();
  res.send({
    message: "Server is running",
    serverIp,
    port: process.env.PORT,
    uptime: `${process.uptime().toFixed(2)} seconds`,
    timestamp: new Date().toISOString(),
    hostname: os.hostname(),
    env: process.env.NODE_ENV || "not set",
    memory: {
      total: `${(os.totalmem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
      free: `${(os.freemem() / 1024 / 1024 / 1024).toFixed(2)} GB`,
    },
    cpuModel: os.cpus()[0].model,
  });
});

app.get("/test", (req, res) => {
  res.send("MiniJob Germany!");
});

app.use("/api/v1/job", jobRouter);
app.use("/api/v1/contact", contactRouter);
app.use("/api/v1/email-subscribe", emailSubscriptionRouter);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  console.log(err);
  res.status(500).send("Something broke!");
});

export { app };
