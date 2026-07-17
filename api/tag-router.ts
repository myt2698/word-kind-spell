import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { tags, wordTags, words, wordGroups } from "@db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

export const tagRouter = createRouter({
  list: publicQuery.query(async () => {
    const db = getDb();
    return db.select().from(tags).orderBy(tags.name);
  }),

  listWithCount: publicQuery.query(async () => {
    const db = getDb();
    const allTags = await db.select().from(tags).orderBy(tags.name);
    const counts = await db.select({ tagId: wordTags.tagId, count: sql<number>`count(*)` }).from(wordTags).groupBy(wordTags.tagId);
    const countMap = new Map(counts.map((c) => [c.tagId, c.count]));
    return allTags.map((t) => ({ ...t, wordCount: countMap.get(t.id) ?? 0 }));
  }),

  create: publicQuery
    .input(z.object({ name: z.string().min(1).max(50), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const existing = await db.select().from(tags).where(eq(tags.name, input.name)).limit(1);
      if (existing.length > 0) {
        return { id: existing[0].id, created: false };
      }
      const result = await db.insert(tags).values({ name: input.name, description: input.description || null });
      return { id: Number(result[0].insertId), created: true };
    }),

  update: publicQuery
    .input(z.object({ id: z.number(), name: z.string().min(1).max(50), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(tags).set({ name: input.name, description: input.description || null }).where(eq(tags.id, input.id));
      return { success: true };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const tagResult = await db.select().from(tags).where(eq(tags.id, input.id)).limit(1);
      if (tagResult.length === 0) return null;
      const tag = tagResult[0];

      const wordTagRows = await db.select({ wordId: wordTags.wordId }).from(wordTags).where(eq(wordTags.tagId, input.id));
      const wordIds = wordTagRows.map((r) => r.wordId);

      if (wordIds.length === 0) return { tag, words: [] };

      const wordList = await db.select({
        id: words.id, word: words.word, phonetic: words.phonetic,
        definition: words.definition, example: words.example, notes: words.notes,
        proficiency: words.proficiency, learningStatus: words.learningStatus,
        groupId: words.groupId, createdAt: words.createdAt, updatedAt: words.updatedAt,
      }).from(words).where(inArray(words.id, wordIds)).orderBy(desc(words.createdAt));

      const groupIds = [...new Set(wordList.map((w) => w.groupId).filter(Boolean))] as number[];
      const groupMap = new Map<number, string>();
      if (groupIds.length > 0) {
        const groupRows = await db.select({ id: wordGroups.id, name: wordGroups.name }).from(wordGroups).where(inArray(wordGroups.id, groupIds));
        for (const g of groupRows) groupMap.set(g.id, g.name);
      }

      const allWordIds = wordList.map((w) => w.id);
      const allTagRows = await db.select({ wordId: wordTags.wordId, tagId: tags.id, tagName: tags.name }).from(wordTags).innerJoin(tags, eq(wordTags.tagId, tags.id)).where(inArray(wordTags.wordId, allWordIds));

      const tagMap = new Map<number, { id: number; name: string }[]>();
      for (const row of allTagRows) {
        const existing = tagMap.get(row.wordId) ?? [];
        existing.push({ id: row.tagId, name: row.tagName });
        tagMap.set(row.wordId, existing);
      }

      const enrichedWords = wordList.map((w) => ({
        ...w, groupName: w.groupId ? (groupMap.get(w.groupId) ?? null) : null,
        tags: tagMap.get(w.id) ?? [],
      }));

      return { tag, words: enrichedWords };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(wordTags).where(eq(wordTags.tagId, input.id));
      await db.delete(tags).where(eq(tags.id, input.id));
      return { success: true };
    }),
});
