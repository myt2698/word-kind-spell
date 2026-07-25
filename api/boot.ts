import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import type { HttpBindings } from "@hono/node-server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import { appRouter } from "./router";
import { createContext } from "./context";
import { env } from "./lib/env";

// DEBUG: Print env info BEFORE any validation
console.log("[BOOT] ========== Starting WordMind ==========");
console.log("[BOOT] NODE_ENV:", process.env.NODE_ENV);
console.log("[BOOT] Env var count:", Object.keys(process.env).length);
console.log("[BOOT] Env keys:", Object.keys(process.env).sort().filter(k => !k.includes("SECRET") && !k.includes("PASS") && !k.includes("KEY")).join(", "));

const app = new Hono<{ Bindings: HttpBindings }>();

app.use(bodyLimit({ maxSize: 50 * 1024 * 1024 }));

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
