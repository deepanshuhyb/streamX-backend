import express from "express";
import cors from "cors";
import apiRouter from "./routes/data.route.ts";
const app = express();

app.use(cors()); // Place CORS at the very top
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", apiRouter);
export default app;
