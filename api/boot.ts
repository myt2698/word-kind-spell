import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { secureHeaders } from "hono/secure-headers";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";
import { rateLimit } from "./lib/rate-limit";

console.log("[BOOT] ========== Starting 词音岛 ==========");
console.log("[BOOT] NODE_ENV:", process.env.NODE_ENV);

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(secureHeaders());
app.use("/api/*", rateLimit({ windowMs: 60_000, maxRequests: 120, authMaxRequests: 10 }));
app.use("/api/*", async (c, next) => {
  const isAudioRequest = c.req.url.includes("audio.");
  return bodyLimit({
    maxSize: isAudioRequest ? 50 * 1024 * 1024 : 2 * 1024 * 1024,
    onError: (context) => context.json({ error: "Request body is too large" }, 413),
  })(c, next);
});

// tRPC API handler
app.use("/api/trpc/*", async (c) => {
  return fetchRequestHandler({
    endpoint: "/api/trpc",
    req: c.req.raw,
    router: appRouter,
    createContext,
  });
});

app.all("/api/*", (c) => c.json({ error: "Not Found" }, 404));

export default app;

if (env.isProduction) {
  // Validate env vars after debug logging
  env.validate();

  const { serve } = await import("@hono/node-server");
  const { serveStaticFiles } = await import("./lib/vite");
  serveStaticFiles(app);

  const port = parseInt(process.env.PORT || "3000");
  serve({ fetch: app.fetch, port }, () => {
    console.log(`[BOOT] Server running on http://localhost:${port}/`);
  });
}
