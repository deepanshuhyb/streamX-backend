import express from "express";
import cors from "cors";
import apiRouter from "./routes/data.route.ts";
const app = express();

app.use(cors()); // Place CORS at the very top
app.use(express.json());
// mount API routes
app.use("/api", apiRouter);
export default app;
