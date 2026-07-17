import type { Hono } from "hono";
import type { HttpBindings } from "@hono/node-server";
import fs from "fs";
import path from "path";
import { Readable } from "stream";

type App = Hono<{ Bindings: HttpBindings }>;

// MIME type map
const mimeTypes: Record<string, string> = {
  ".html": "text/html",
  ".js": "application/javascript",
  ".css": "text/css",
  ".json": "application/json",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
  ".woff2": "font/woff2",
  ".woff": "font/woff",
  ".ttf": "font/ttf",
};

function getMimeType(filePath: string): string {
  const ext = path.extname(filePath).toLowerCase();
  return mimeTypes[ext] || "application/octet-stream";
}

export function serveStaticFiles(app: App) {
  // Resolve public directory - boot.js is at dist/boot.js, public is at dist/public/
  const publicPath = (() => {
    // Try multiple possible locations
    const candidates = [
      path.resolve(import.meta.dirname, "./public"),
      path.resolve(import.meta.dirname, "../public"),
      path.resolve(process.cwd(), "dist/public"),
      path.resolve(process.cwd(), "public"),
    ];
    for (const candidate of candidates) {
      if (fs.existsSync(path.join(candidate, "index.html"))) {
        return candidate;
      }
    }
    // Fallback to most likely path
    return path.resolve(import.meta.dirname, "./public");
  })();

  // Serve static files manually
  app.use("*", async (c, next) => {
    const urlPath = new URL(c.req.url).pathname;
    // Skip API routes
    if (urlPath.startsWith("/api/")) return next();

    const filePath = path.resolve(publicPath, "." + urlPath);

    // Security: prevent directory traversal
    if (!filePath.startsWith(publicPath)) return next();

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      const mime = getMimeType(filePath);
      const stream = fs.createReadStream(filePath);
      return new Response(Readable.toWeb(stream) as any, {
        headers: { "Content-Type": mime },
      });
    }

    return next();
  });

  // Fallback to index.html for SPA routes
  app.notFound((c) => {
    const accept = c.req.header("accept") ?? "";
    if (!accept.includes("text/html")) {
      return c.json({ error: "Not Found" }, 404);
    }
    const indexPath = path.resolve(publicPath, "index.html");
    if (!fs.existsSync(indexPath)) {
      return c.json({ error: "index.html not found, publicPath=" + publicPath }, 500);
    }
    const content = fs.readFileSync(indexPath, "utf-8");
    return c.html(content);
  });
}
