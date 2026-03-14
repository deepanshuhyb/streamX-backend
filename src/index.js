import dotenv from "dotenv";
import { connectDB } from "./configs/database.ts";
import app from "./app.ts";
import https from "https";
import http from "http";

dotenv.config({
  path: "./.env",
});

const startServer = async () => {
  try {
    // await connectDB();
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      console.log(`Server is running on port ${port}`);
      startKeepAlive(port);
    });
  } catch (error) {
    console.error("Failed to start the server:", error);
    process.exit(1);
  }
};

// ── Render keep-alive self-ping ───────────────────────────────────────────────
// Render free-tier spins down after 15 min of inactivity.
// We ping our own /health route every 14 min to stay warm.
const PING_INTERVAL_MS = 14 * 60 * 1000; // 14 minutes

function startKeepAlive(port) {
  // Prefer the public Render URL if available, otherwise use localhost
  const baseUrl =
    process.env.RENDER_EXTERNAL_URL || `http://localhost:${port}`;
  const pingUrl = `${baseUrl}/health`;

  setInterval(() => {
    const client = pingUrl.startsWith("https") ? https : http;
    const req = client.get(pingUrl, (res) => {
      console.log(`[keep-alive] Pinged ${pingUrl} → ${res.statusCode}`);
      // Ensure the response body is fully consumed so the socket can be released.
      res.resume();
    });
    req.on("error", (err) => {
      console.error("[keep-alive] Ping failed:", err.message);
    });
  }, PING_INTERVAL_MS);

  console.log(`[keep-alive] Self-ping scheduled every 14 min → ${pingUrl}`);
}

startServer();



