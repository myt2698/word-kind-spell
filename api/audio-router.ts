/**
 * Audio Router
 * - Download audio from Youdao API and store as base64
 * - Serve audio for playback
 * - Batch download missing audios
 */

import { z } from "zod";
import { createRouter, authedQuery, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wordAudios, words } from "@db/schema";
import { eq, and, sql, count, inArray } from "drizzle-orm";
import { getCatalogOwnerId } from "./catalog";

const YOUDAO_URL = "https://dict.youdao.com/dictvoice";

/** Download audio from Youdao and return base64 */
async function downloadAudioFromYoudao(wordText: string): Promise<string | null> {
  try {
    const url = `${YOUDAO_URL}?audio=${encodeURIComponent(wordText)}&type=2`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 100) return null; // too small, probably an error
    const base64 = Buffer.from(buffer).toString("base64");
    return base64;
  } catch {
    return null;
  }
}

export const audioRouter = createRouter({
  /** Get audio for a word by wordId. Returns base64 data if available. */
  getByWordId: publicQuery
    .input(z.object({ wordId: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const rows = await db
        .select({ audioData: wordAudios.audioData, format: wordAudios.format })
        .from(wordAudios)
        .where(eq(wordAudios.wordId, input.wordId))
        .limit(1);

      if (rows.length === 0) return { hasAudio: false, audioData: null, format: null };
      return { hasAudio: true, audioData: rows[0].audioData, format: rows[0].format };
    }),

  /** Get audio for several words in one request to avoid a preload request storm. */
  getByWordIds: publicQuery
    .input(z.object({
      wordIds: z.array(z.number().int().positive()).max(50),
    }))
    .query(async ({ input }) => {
      const uniqueIds = [...new Set(input.wordIds)];
      if (uniqueIds.length === 0) return [];

      return getDb()
        .select({
          wordId: words.id,
          word: words.word,
        })
        .from(words)
        .where(inArray(words.id, uniqueIds))
        .then((rows) => rows.map((row) => ({
          wordId: row.wordId,
          format: "mp3",
          audioUrl: `/media/audio/speech?text=${encodeURIComponent(row.word)}&locale=en-US`,
        })));
    }),

  /** Download and save audio for a word */
  download: authedQuery
    .input(z.object({ wordId: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();

      // Check if already exists
      const existing = await db
        .select({ id: wordAudios.id })
        .from(wordAudios)
        .where(eq(wordAudios.wordId, input.wordId))
        .limit(1);

      if (existing.length > 0) {
        return { success: true, message: "音频已存在" };
      }

      // Get the word text
      const wordRows = await db
        .select({ word: words.word })
        .from(words)
        .where(and(eq(words.id, input.wordId), eq(words.userId, catalogOwnerId)))
        .limit(1);

      if (wordRows.length === 0) {
        return { success: false, message: "单词不存在" };
      }

      const wordText = wordRows[0].word;
      const base64 = await downloadAudioFromYoudao(wordText);

      if (!base64) {
        return { success: false, message: "下载音频失败" };
      }

      await db.insert(wordAudios).values({
        wordId: input.wordId,
        audioData: base64,
        format: "mp3",
        source: "youdao",
      });

      return { success: true, message: "音频下载成功" };
    }),

  /** Batch download audio for all words that don't have audio yet */
  batchDownload: authedQuery.mutation(async () => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();

    // Find all words without audio for this user
    const wordRows = await db
      .select({ id: words.id, word: words.word })
      .from(words)
      .where(eq(words.userId, catalogOwnerId))
      .orderBy(words.id);

    // Get existing audio wordIds
    const existingAudios = await db
      .select({ wordId: wordAudios.wordId })
      .from(wordAudios);

    const existingIds = new Set(existingAudios.map((a) => a.wordId));
    const missingWords = wordRows.filter((w) => !existingIds.has(w.id));

    let success = 0;
    let failed = 0;

    for (const w of missingWords) {
      const base64 = await downloadAudioFromYoudao(w.word);
      if (base64) {
        await db.insert(wordAudios).values({
          wordId: w.id,
          audioData: base64,
          format: "mp3",
          source: "youdao",
        });
        success++;
      } else {
        failed++;
      }
    }

    return { success, failed, total: missingWords.length };
  }),

  /** Get stats: how many words have audio vs total */
  getStats: authedQuery.query(async () => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();

    const totalWords = await db
      .select({ count: count() })
      .from(words)
      .where(eq(words.userId, catalogOwnerId));

    const totalAudios = await db
      .select({ count: count() })
      .from(wordAudios)
      .where(
        sql`${wordAudios.wordId} IN (
          SELECT ${words.id} FROM ${words} WHERE ${words.userId} = ${catalogOwnerId}
        )`
      );

    return {
      totalWords: totalWords[0]?.count ?? 0,
      totalAudios: totalAudios[0]?.count ?? 0,
    };
  }),
});
