import express from "express";
import cors from "cors";
import apiRouter from "./routes/data.route.ts";
const app = express();

const allowedOrigins = [
  "http://localhost:5000",
  "http://streamx-frontend.netlify.app",
  "https://stream-x-frontend.vercel.app",
  "https://www.streamxtv.tech"
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    } else {
      return callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true
}));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use("/api", apiRouter);
export default app;
