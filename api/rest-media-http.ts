import { createReadStream, createWriteStream } from "node:fs";
import { mkdir, rename, stat, unlink } from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { Readable, Transform } from "node:stream";
import { pipeline } from "node:stream/promises";
import { Hono } from "hono";
import type { Context } from "hono";
import { getRequestUser } from "./context";
import { env } from "./lib/env";

type MediaKind = "cover" | "video";

const mediaTypes: Record<MediaKind, Record<string, string>> = {
  cover: {
    "image/jpeg": ".jpg",
    "image/png": ".png",
    "image/webp": ".webp",
    "image/gif": ".gif",
  },
  video: {
    "video/mp4": ".mp4",
    "video/webm": ".webm",
    "video/ogg": ".ogv",
    "video/quicktime": ".mov",
  },
};

const mimeByExtension = new Map(
  Object.entries(mediaTypes).flatMap(([kind, types]) =>
    Object.entries(types).map(([mime, extension]) => [extension, { kind, mime }]),
  ),
);

const maximumBytes: Record<MediaKind, number> = {
  cover: 10 * 1024 * 1024,
  video: 1024 * 1024 * 1024,
};

const publicPrefix = "/media/rest/files/";
const storedNamePattern = /^[0-9a-f-]{36}\.(?:jpg|png|webp|gif|mp4|webm|ogv|mov)$/;

function mediaDirectory() {
  return path.resolve(env.restMediaDir);
}

function storedFilePath(filename: string) {
  if (!storedNamePattern.test(filename)) return null;
  return path.join(mediaDirectory(), filename);
}

function uploadType(kind: MediaKind, contentType: string, originalName: string) {
  const normalized = contentType.split(";", 1)[0].trim().toLowerCase();
  const directExtension = mediaTypes[kind][normalized];
  if (directExtension) return { extension: directExtension, contentType: normalized };

  if (!normalized || normalized === "application/octet-stream") {
    const extension = path.extname(originalName).toLowerCase();
    const inferred = mimeByExtension.get(extension);
    if (inferred?.kind === kind) return { extension, contentType: inferred.mime };
  }
  return null;
}

async function isAdmin(req: Request) {
  const user = await getRequestUser(req);
  return user?.role === "admin";
}

export async function deleteRestMediaByUrl(value: string | null | undefined) {
  if (!value?.startsWith(publicPrefix)) return;
  const filename = value.slice(publicPrefix.length);
  const filePath = storedFilePath(filename);
  if (!filePath) return;
  await unlink(filePath).catch((error: NodeJS.ErrnoException) => {
    if (error.code !== "ENOENT") {
      console.warn("[rest-media] Could not remove unused file:", error.message);
    }
  });
}

export const restMediaHttp = new Hono();

restMediaHttp.post("/upload", async (c) => {
  if (!(await isAdmin(c.req.raw))) {
    return c.json({ error: "仅管理员可以上传短片" }, 403);
  }

  const kind = c.req.query("kind") as MediaKind;
  if (kind !== "cover" && kind !== "video") {
    return c.json({ error: "无效的文件类型" }, 400);
  }

  const originalName = c.req.query("filename") ?? "";
  const selectedType = uploadType(
    kind,
    c.req.header("content-type") ?? "",
    originalName,
  );
  if (!selectedType) {
    return c.json({
      error: kind === "cover"
        ? "封面仅支持 JPG、PNG、WebP 或 GIF"
        : "视频仅支持 MP4、WebM、Ogg 或 MOV，建议使用 MP4（H.264）",
    }, 415);
  }

  const declaredLength = Number(c.req.header("content-length") ?? 0);
  if (declaredLength > maximumBytes[kind]) {
    return c.json({ error: kind === "cover" ? "封面不能超过 10MB" : "视频不能超过 1GB" }, 413);
  }
  if (!c.req.raw.body) return c.json({ error: "没有收到文件内容" }, 400);

  const directory = mediaDirectory();
  await mkdir(directory, { recursive: true });
  const filename = `${randomUUID()}${selectedType.extension}`;
  const finalPath = path.join(directory, filename);
  const temporaryPath = `${finalPath}.uploading`;
  let receivedBytes = 0;

  const limiter = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      receivedBytes += chunk.length;
      if (receivedBytes > maximumBytes[kind]) {
        callback(new Error("UPLOAD_TOO_LARGE"));
      } else {
        callback(null, chunk);
      }
    },
  });

  try {
    await pipeline(
      Readable.fromWeb(c.req.raw.body as Parameters<typeof Readable.fromWeb>[0]),
      limiter,
      createWriteStream(temporaryPath, { flags: "wx" }),
    );
    if (receivedBytes === 0) throw new Error("UPLOAD_EMPTY");
    await rename(temporaryPath, finalPath);
  } catch (error) {
    await unlink(temporaryPath).catch(() => undefined);
    const message = error instanceof Error ? error.message : "";
    if (message === "UPLOAD_TOO_LARGE") {
      return c.json({ error: kind === "cover" ? "封面不能超过 10MB" : "视频不能超过 1GB" }, 413);
    }
    if (message === "UPLOAD_EMPTY") return c.json({ error: "上传的文件为空" }, 400);
    console.error("[rest-media] Upload failed:", error);
    return c.json({ error: "文件上传失败，请重试" }, 500);
  }

  return c.json({
    url: `${publicPrefix}${filename}`,
    size: receivedBytes,
    contentType: selectedType.contentType,
  });
});

async function serveStoredFile(c: Context) {
  const filename = c.req.param("filename");
  if (!filename) return c.json({ error: "文件不存在" }, 404);
  const filePath = storedFilePath(filename);
  if (!filePath) return c.json({ error: "文件不存在" }, 404);

  let details;
  try {
    details = await stat(filePath);
  } catch {
    return c.json({ error: "文件不存在" }, 404);
  }
  if (!details.isFile()) return c.json({ error: "文件不存在" }, 404);

  const extension = path.extname(filename).toLowerCase();
  const media = mimeByExtension.get(extension);
  if (!media) return c.json({ error: "文件类型无效" }, 415);

  const headers = new Headers({
    "Accept-Ranges": "bytes",
    "Cache-Control": "public, max-age=86400, immutable",
    "Content-Type": media.mime,
    "X-Content-Type-Options": "nosniff",
  });
  const range = c.req.header("range");
  let start = 0;
  let end = details.size - 1;
  let statusCode = 200;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range.trim());
    if (!match) {
      headers.set("Content-Range", `bytes */${details.size}`);
      return new Response(null, { status: 416, headers });
    }
    if (!match[1] && match[2]) {
      const suffixLength = Number(match[2]);
      start = Math.max(0, details.size - suffixLength);
    } else {
      start = Number(match[1] || 0);
      if (match[2]) end = Math.min(Number(match[2]), details.size - 1);
    }
    if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end) || start < 0 || start > end || start >= details.size) {
      headers.set("Content-Range", `bytes */${details.size}`);
      return new Response(null, { status: 416, headers });
    }
    statusCode = 206;
    headers.set("Content-Range", `bytes ${start}-${end}/${details.size}`);
  }

  headers.set("Content-Length", String(end - start + 1));
  if (c.req.method === "HEAD") return new Response(null, { status: statusCode, headers });

  const stream = Readable.toWeb(createReadStream(filePath, { start, end }));
  return new Response(stream as ReadableStream, { status: statusCode, headers });
}

restMediaHttp.on(["GET", "HEAD"], ["/files/:filename"], serveStoredFile);

restMediaHttp.delete("/files/:filename", async (c) => {
  if (!(await isAdmin(c.req.raw))) {
    return c.json({ error: "仅管理员可以删除短片文件" }, 403);
  }
  const filePath = storedFilePath(c.req.param("filename"));
  if (!filePath) return c.json({ error: "文件不存在" }, 404);
  try {
    await unlink(filePath);
    return c.body(null, 204);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return c.json({ error: "文件不存在" }, 404);
    }
    console.error("[rest-media] Delete failed:", error);
    return c.json({ error: "文件删除失败" }, 500);
  }
});
