import express from "express";
import cors from "cors";
import apiRouter from "./routes/data.route.ts";
const app = express();

app.use(express.json());
app.use(cors());
// mount API routes
app.use("/api", apiRouter);
export default app;
