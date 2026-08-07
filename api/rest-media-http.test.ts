import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { Hono } from "hono";
import { restMediaHttp } from "./rest-media-http";

const mediaRoot = path.resolve("tmp/rest-media-http-test");
const filename = "01234567-89ab-cdef-0123-456789abcdef.mp4";
const contents = Buffer.from("0123456789");

process.env.REST_MEDIA_DIR = mediaRoot;

const app = new Hono();
app.route("/media/rest", restMediaHttp);

beforeAll(async () => {
  await mkdir(mediaRoot, { recursive: true });
  await writeFile(path.join(mediaRoot, filename), contents);
});

afterAll(async () => {
  await rm(mediaRoot, { recursive: true, force: true });
});

describe("rest media HTTP routes", () => {
  it("serves a stored video with byte-range support", async () => {
    const response = await app.request(`/media/rest/files/${filename}`, {
      headers: { Range: "bytes=2-5" },
    });

    expect(response.status).toBe(206);
    expect(response.headers.get("content-range")).toBe("bytes 2-5/10");
    expect(response.headers.get("accept-ranges")).toBe("bytes");
    expect(response.headers.get("content-type")).toContain("video/mp4");
    expect(await response.text()).toBe("2345");
  });

  it("rejects upload requests without an admin session", async () => {
    const response = await app.request(
      "/media/rest/upload?kind=video&filename=episode.mp4",
      {
        method: "POST",
        headers: { "Content-Type": "video/mp4" },
        body: "video",
      },
    );

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: "仅管理员可以上传短片" });
  });

  it("does not allow arbitrary filesystem paths", async () => {
    const response = await app.request("/media/rest/files/package.json");
    expect(response.status).toBe(404);
  });
});
