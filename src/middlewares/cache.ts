import { Request, Response, NextFunction } from "express";

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

export class MemoryCache {
  private cache = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }
    return entry.data;
  }

  set<T>(key: string, data: T, ttlMs: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + ttlMs,
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

export const globalCache = new MemoryCache();

/**
 * Cache GET requests by their full URL (including query params).
 * @param ttlSeconds TTL in seconds
 */
export function cacheMiddleware(ttlSeconds: number) {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Only cache GET requests
    if (req.method !== "GET") {
      return next();
    }

    // Do not cache authenticated user-specific requests
    if (req.headers["authorization"] || req.url.includes("@me")) {
      return next();
    }

    const key = req.originalUrl || req.url;
    const cachedData = globalCache.get(key);

    if (cachedData) {
      console.log(`[Cache Hit] ${key}`);
      res.json(cachedData);
      return;
    }

    // Intercept res.json to store in cache before sending
    const originalJson = res.json.bind(res);
    res.json = (body: any) => {
      if (res.statusCode === 200) {
        globalCache.set(key, body, ttlSeconds * 1000);
      }
      return originalJson(body);
    };

    next();
  };
}
