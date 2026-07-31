import { Hono } from "hono";
import { eq } from "drizzle-orm";
import { wordAudios } from "@db/schema";
import { getDb } from "./queries/connection";

export const audioHttp = new Hono();

audioHttp.get("/:wordId", async (c) => {
  const wordId = Number(c.req.param("wordId"));
  if (!Number.isInteger(wordId) || wordId <= 0) {
    return c.json({ error: "无效的单词编号" }, 400);
  }

  const rows = await getDb()
    .select({
      audioData: wordAudios.audioData,
      format: wordAudios.format,
    })
    .from(wordAudios)
    .where(eq(wordAudios.wordId, wordId))
    .limit(1);
  const audio = rows[0];
  if (!audio?.audioData) return c.json({ error: "音频不存在" }, 404);

  const bytes = Buffer.from(audio.audioData, "base64");
  c.header("Content-Type", audio.format === "wav" ? "audio/wav" : "audio/mpeg");
  c.header("Content-Length", String(bytes.byteLength));
  c.header("Cache-Control", "public, max-age=86400, immutable");
  return c.body(bytes);
});
