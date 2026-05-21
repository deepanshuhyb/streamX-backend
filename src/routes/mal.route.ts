/**
 * mal.route.ts — MyAnimeList proxy routes
 * Mounted at /api/mal in app.ts
 *
 * Auth routes  (no user token needed — uses client secret):
 *   POST  /api/mal/auth/token    Exchange code+verifier for tokens
 *   POST  /api/mal/auth/refresh  Refresh access token
 *
 * Proxy routes (require Authorization: Bearer <user_token>):
 *   GET    /api/mal/* → GET    api.myanimelist.net/v2/*
 *   PATCH  /api/mal/* → PATCH  api.myanimelist.net/v2/*
 *   DELETE /api/mal/* → DELETE api.myanimelist.net/v2/*
 */

import { Router } from "express";
import mal from "../controllers/malController.ts";
import { cacheMiddleware } from "../middlewares/cache.ts";

const router = Router();

// ── Auth (public — no user token needed) ─────────────────────────────────────
router.post("/auth/token", mal.exchangeToken);
router.post("/auth/refresh", mal.refreshToken);

// ── Transparent proxy for all other MAL API paths ────────────────────────────
// router.use() catches everything without a specific path match above.
// The controller reads req.url (relative to /api/mal) and dispatches by method.
router.use(cacheMiddleware(300), mal.proxyAll);

export default router;
