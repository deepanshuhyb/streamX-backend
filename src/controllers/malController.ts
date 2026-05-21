/**
 * malController.ts — MyAnimeList proxy controller for streamX-backend
 * All requests are forwarded to the MAL API with the user's Bearer token.
 * Token exchange (auth) uses the server-side client secret.
 */

import { Request, Response } from "express";
import axios from "axios";

const MAL_API = "https://api.myanimelist.net/v2";
const MAL_TOKEN_URL = "https://myanimelist.net/v1/oauth2/token";

const CLIENT_IDS = (
  process.env.MAL_CLIENT_ID || "b353ec9d4bd49dbe2c54b4587c331a2b"
).split(",");
const CLIENT_SECRETS = (
  process.env.MAL_CLIENT_SECRET ||
  "045c1ea3ad58b469d493ac3220a1767bf38723623a1c07e9845f6f2f3b77cb2b"
).split(",");

function getClientSecret(clientId: string): string {
  const index = CLIENT_IDS.indexOf(clientId);
  if (index !== -1 && CLIENT_SECRETS[index]) {
    return CLIENT_SECRETS[index];
  }
  // Fallback to the first secret if no match found
  return CLIENT_SECRETS[0];
}

// ─── Auth ─────────────────────────────────────────────────────────────────────

/** POST /api/mal/auth/token — Exchange authorization code for tokens */
export async function exchangeToken(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { code, code_verifier, redirect_uri, client_id } = req.body;
    if (!code || !code_verifier || !redirect_uri) {
      return res
        .status(400)
        .json({ error: "Missing code, code_verifier, or redirect_uri" });
    }

    const requestedClientId = client_id || CLIENT_IDS[0];
    const clientSecret = getClientSecret(requestedClientId);

    const params = new URLSearchParams({
      client_id: requestedClientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      code_verifier,
      redirect_uri,
    });

    const { data } = await axios.post(MAL_TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return res.json(data);
  } catch (err: any) {
    console.error(
      "[MAL] Token exchange error:",
      err?.response?.data ?? err.message,
    );
    return res.status(err?.response?.status ?? 500).json({
      error: err?.response?.data?.error ?? "Token exchange failed",
    });
  }
}

/** POST /api/mal/auth/refresh — Refresh an expired access token */
export async function refreshToken(
  req: Request,
  res: Response,
): Promise<Response> {
  try {
    const { refresh_token, client_id } = req.body;
    if (!refresh_token) {
      return res.status(400).json({ error: "Missing refresh_token" });
    }

    const requestedClientId = client_id || CLIENT_IDS[0];
    const clientSecret = getClientSecret(requestedClientId);

    const params = new URLSearchParams({
      client_id: requestedClientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token,
    });

    const { data } = await axios.post(MAL_TOKEN_URL, params.toString(), {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });

    return res.json(data);
  } catch (err: any) {
    console.error(
      "[MAL] Token refresh error:",
      err?.response?.data ?? err.message,
    );
    return res.status(err?.response?.status ?? 500).json({
      error: err?.response?.data?.error ?? "Token refresh failed",
    });
  }
}

// ─── Generic MAL proxy ────────────────────────────────────────────────────────

/** Extract Bearer token from Authorization header */
function getBearerToken(req: Request): string | null {
  const header = (req.headers["authorization"] as string) ?? "";
  return header.startsWith("Bearer ") ? header.slice(7) : null;
}

/**
 * Single catch-all proxy handler for GET / PATCH / DELETE.
 * req.url inside the router is relative to /api/mal — e.g. /users/@me/animelist?fields=...
 */
export async function proxyAll(
  req: Request,
  res: Response,
): Promise<Response | void> {
  const token = getBearerToken(req);
  const method = req.method.toUpperCase();

  // Strip leading slash, keep query string
  const relativeUrl = req.url.startsWith("/") ? req.url.slice(1) : req.url;
  const [rawPath, ...qParts] = relativeUrl.split("?");
  const query = qParts.length ? `?${qParts.join("?")}` : "";
  const malUrl = `${MAL_API}/${rawPath}${query}`;

  try {
    if (method === "GET") {
      const headers: Record<string, string> = {};
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      } else {
        if (rawPath.includes("@me")) {
          return res.status(401).json({ error: "No authorization token" });
        }
        headers["X-MAL-CLIENT-ID"] = CLIENT_IDS[0];
      }

      const { data } = await axios.get(malUrl, { headers });
      return res.json(data);
    }

    if (!token)
      return res.status(401).json({ error: "No authorization token" });

    if (method === "PATCH") {
      const body = req.body ?? {};
      const params = new URLSearchParams();
      for (const [k, v] of Object.entries(body)) {
        if (v !== undefined && v !== null) params.set(k, String(v));
      }
      const { data } = await axios.patch(malUrl, params.toString(), {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/x-www-form-urlencoded",
        },
      });
      return res.json(data);
    }

    if (method === "DELETE") {
      await axios.delete(malUrl, {
        headers: { Authorization: `Bearer ${token}` },
      });
      return res.status(204).send();
    }

    return res.status(405).json({ error: `Method ${method} not supported` });
  } catch (err: any) {
    console.error(
      `[MAL] ${method} ${malUrl} error:`,
      err?.response?.data ?? err.message,
    );
    return res.status(err?.response?.status ?? 500).json({
      error: err?.response?.data?.message ?? "MAL API error",
    });
  }
}

export default { exchangeToken, refreshToken, proxyAll };
