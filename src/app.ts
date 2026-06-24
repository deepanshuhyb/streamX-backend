import express from "express";
import cors, { type CorsOptions } from "cors";
import apiRouter from "./routes/data.route.ts";
import malRouter from "./routes/mal.route.ts";
import { cacheMiddleware } from "./middlewares/cache.ts";
const app = express();

const allowedOrigins = [
  "http://localhost:5000",
  "http://streamx-frontend.netlify.app",
  "https://stream-x-frontend.vercel.app",
  "https://streamxtv.tech",
  "https://www.streamxtv.tech",
  "https://streamxtv.hybrows.workers.dev",
  "https://anime.streamxtv.hybrows.workers.dev",
  "https://www.anime.streamxtv.hybrows.workers.dev",
  "https://anime.streamxtv.tech",
  "https://www.anime.streamxtv.tech",
  "https://animextv.tech",
  "https://www.animextv.tech",
  "http://animextv.tech",
  "http://www.animextv.tech",
  "http://localhost:5001",
  "https://d686fea1-streamxtv.hybrows.workers.dev",
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

    // Match animextv.tech and all variants (including subdomains and workers.dev environments)
    // const animextvPattern = /^https?:\/\/([a-z0-9-]+\.)*animextv\.(tech|hybrows\.workers\.dev)$/i;

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

import axios from "axios";

app.use("/api", apiRouter);
app.use("/api/mal", malRouter);

// Jikan Proxy Route (for schedules and browse pages)
app.use("/api/jikan", cacheMiddleware(600), async (req, res) => {
  try {
    const relativeUrl = req.url.startsWith("/") ? req.url.slice(1) : req.url;
    const jikanUrl = `https://api.jikan.moe/v4/${relativeUrl}`;

    console.log(`[Jikan Proxy] Forwarding to: ${jikanUrl}`);
    const { data } = await axios.get(jikanUrl);
    return res.json(data);
  } catch (err: any) {
    console.error("[Jikan Proxy] Error:", err?.response?.data ?? err.message);
    return res.status(err?.response?.status ?? 500).json({
      error: err?.response?.data?.message ?? "Jikan API error",
    });
  }
});



export default app;
