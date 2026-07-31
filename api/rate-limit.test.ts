import { describe, expect, it } from "vitest";
import { Hono } from "hono";
import { rateLimit } from "./lib/rate-limit";

function createApp() {
  const app = new Hono();
  app.use("/api/*", rateLimit({
    windowMs: 60_000,
    maxRequests: 3,
    authMaxRequests: 2,
  }));
  app.post("/api/trpc/:procedure", (c) => c.json({ ok: true }));
  return app;
}

describe("rateLimit", () => {
  it("limits authentication attempts more aggressively", async () => {
    const app = createApp();
    const request = () => app.request("/api/trpc/auth.login", {
      method: "POST",
      headers: { "x-forwarded-for": "192.0.2.1" },
    });

    expect((await request()).status).toBe(200);
    expect((await request()).status).toBe(200);
    const blocked = await request();
    expect(blocked.status).toBe(429);
    expect(blocked.headers.get("retry-after")).toBeTruthy();
    expect(await blocked.json()).toEqual({
      error: {
        json: {
          message: "请求过于频繁，请稍后再试",
          code: -32029,
          data: { code: "TOO_MANY_REQUESTS", httpStatus: 429 },
        },
      },
    });
  });

  it("keeps independent buckets for different clients", async () => {
    const app = createApp();
    const request = (address: string) => app.request("/api/trpc/ping", {
      method: "POST",
      headers: { "x-forwarded-for": address },
    });

    for (let index = 0; index < 3; index += 1) {
      expect((await request("192.0.2.2")).status).toBe(200);
    }
    expect((await request("192.0.2.2")).status).toBe(429);
    expect((await request("192.0.2.3")).status).toBe(200);
  });

  it("does not let one failing procedure block another procedure", async () => {
    const app = createApp();
    const request = (procedure: string) => app.request(`/api/trpc/${procedure}`, {
      method: "POST",
      headers: { "x-forwarded-for": "192.0.2.4" },
    });

    for (let index = 0; index < 3; index += 1) {
      expect((await request("audio.getByWordId")).status).toBe(200);
    }
    expect((await request("audio.getByWordId")).status).toBe(429);
    expect((await request("auth.me")).status).toBe(200);
  });
});
