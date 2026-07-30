import type { MiddlewareHandler } from "hono";

type RateLimitOptions = {
  windowMs: number;
  maxRequests: number;
  authMaxRequests: number;
};

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

function clientAddress(headers: Headers): string {
  return headers.get("x-forwarded-for")?.split(",")[0]?.trim()
    || headers.get("x-real-ip")
    || "unknown";
}

export function rateLimit(options: RateLimitOptions): MiddlewareHandler {
  let lastCleanup = Date.now();
  return async (c, next) => {
    const now = Date.now();
    if (now - lastCleanup > options.windowMs) {
      for (const [key, bucket] of buckets) {
        if (bucket.resetAt <= now) buckets.delete(key);
      }
      lastCleanup = now;
    }

    const isAuthRequest = /auth\.(login|register)/.test(c.req.url);
    const category = isAuthRequest ? "auth" : "api";
    const key = `${category}:${clientAddress(c.req.raw.headers)}`;
    const limit = isAuthRequest ? options.authMaxRequests : options.maxRequests;
    const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= now
      ? { count: 0, resetAt: now + options.windowMs }
      : existing;
    bucket.count += 1;
    buckets.set(key, bucket);

    c.header("RateLimit-Limit", String(limit));
    c.header("RateLimit-Remaining", String(Math.max(0, limit - bucket.count)));
    c.header("RateLimit-Reset", String(Math.ceil(bucket.resetAt / 1000)));
    if (bucket.count > limit) {
      c.header("Retry-After", String(Math.ceil((bucket.resetAt - now) / 1000)));
      return c.json({ error: "Too many requests. Please try again later." }, 429);
    }
    await next();
  };
}
