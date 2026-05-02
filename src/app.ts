import express from "express";
import cors, { type CorsOptions } from "cors";
import apiRouter from "./routes/data.route.ts";
const app = express();

const allowedOrigins = [
  "http://localhost:5000",
  "http://streamx-frontend.netlify.app",
  "https://stream-x-frontend.vercel.app",
  "https://streamxtv.tech",
  "https://www.streamxtv.tech",
  "https://streamxtv.hybrows.workers.dev",
];

app.use((req, _res, next) => {
  const separator = "----------------------------------------";
  console.log(separator);
  console.log(`[request] ${req.method} ${req.url}`);
  console.log(`origin: ${req.headers.origin ?? "undefined"}`);
  console.log(`host: ${req.headers.host ?? "undefined"}`);
  console.log(`referer: ${req.headers.referer ?? "undefined"}`);
  console.log(`ip: ${req.ip}`);
  console.log(separator);
  next();
});

const corsOptions: CorsOptions = {
  origin(origin, callback) {
    console.log(`[cors] CORS check for: ${origin ?? "undefined"}`);

    if (!origin) {
      console.log("[cors] Allowed by CORS");
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      console.log("[cors] Allowed by CORS");
      return callback(null, true);
    }

    console.log("[cors] Blocked by CORS");
    return callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/debug-origin", (req, res) => {
  res.status(200).json({
    origin: req.headers.origin ?? null,
    referer: req.headers.referer ?? null,
    host: req.headers.host ?? null,
    ip: req.ip,
    userAgent: req.headers["user-agent"] ?? null,
  });
});

app.use("/api", apiRouter);
export default app;
