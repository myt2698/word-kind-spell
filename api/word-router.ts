import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { words, wordTags, tags, wordLogs, wordGroups } from "@db/schema";
import { eq, and, like, or, desc, asc, sql, inArray } from "drizzle-orm";

export const wordRouter = createRouter({
  list: publicQuery
    .input(
      z.object({
        groupId: z.number().optional(),
        groupIds: z.array(z.number()).optional(),
        tagId: z.number().optional(),
        tagIds: z.array(z.number()).optional(),
        textbookId: z.number().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["newest", "oldest", "alphabetical"]).default("newest"),
      }).optional()
    )
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];

      let effectiveGroupIds = input?.groupIds ? input.groupIds : input?.groupId ? [input.groupId] : [];

      if (input?.textbookId) {
        const textbookGroups = await db.select({ id: wordGroups.id }).from(wordGroups).where(eq(wordGroups.textbookId, input.textbookId));
        const textbookGroupIds = textbookGroups.map((g) => g.id);
        if (effectiveGroupIds.length > 0) {
          effectiveGroupIds = effectiveGroupIds.filter((id) => textbookGroupIds.includes(id));
        } else {
          effectiveGroupIds = textbookGroupIds;
        }
      }

      if (effectiveGroupIds.length > 0) {
        conditions.push(inArray(words.groupId, effectiveGroupIds));
      }

      if (input?.search) {
        const searchTerm = `%${input.search}%`;
        conditions.push(or(like(words.word, searchTerm), like(words.definition, searchTerm), like(words.notes, searchTerm))!);
      }

      const orderColumn = input?.sortBy === "oldest" ? words.createdAt : input?.sortBy === "alphabetical" ? words.word : words.createdAt;
      const orderFn = input?.sortBy === "oldest" ? asc : desc;

      const wordList = await db.select({
        id: words.id, groupId: words.groupId, word: words.word,
        phonetic: words.phonetic, definition: words.definition,
        example: words.example, notes: words.notes,
        proficiency: words.proficiency, learningStatus: words.learningStatus,
        createdAt: words.createdAt, updatedAt: words.updatedAt,
      }).from(words).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(orderFn(orderColumn));

      if (wordList.length === 0) return [];

      const wordIds = wordList.map((w) => w.id);
      const groupIdsForNames = [...new Set(wordList.map((w) => w.groupId).filter(Boolean))] as number[];

      const allTagRows = wordIds.length > 0 ? await db.select({
        wordId: wordTags.wordId, tagId: tags.id, tagName: tags.name,
      }).from(wordTags).innerJoin(tags, eq(wordTags.tagId, tags.id)).where(inArray(wordTags.wordId, wordIds)) : [];

      const tagMap = new Map<number, { id: number; name: string }[]>();
      for (const row of allTagRows) {
        const existing = tagMap.get(row.wordId) ?? [];
        existing.push({ id: row.tagId, name: row.tagName });
        tagMap.set(row.wordId, existing);
      }

      const groupMap = new Map<number, string>();
      if (groupIdsForNames.length > 0) {
        const groupRows = await db.select({ id: wordGroups.id, name: wordGroups.name }).from(wordGroups).where(inArray(wordGroups.id, groupIdsForNames));
        for (const g of groupRows) groupMap.set(g.id, g.name);
      }

      let results = wordList.map((word) => ({
        ...word, tags: tagMap.get(word.id) ?? [],
        groupName: word.groupId ? (groupMap.get(word.groupId) ?? null) : null,
      }));

      const effectiveTagIds = input?.tagIds ? input.tagIds : input?.tagId ? [input.tagId] : [];
      if (effectiveTagIds.length > 0) {
        results = results.filter((w) => w.tags.some((t) => effectiveTagIds.includes(t.id)));
      }

      return results;
    }),

  checkExists: publicQuery
    .input(z.object({ word: z.string().min(1) }))
    .query(async ({ input }) => {
      const db = getDb();
      const wordLower = input.word.trim().toLowerCase();
      const existing = await db.select().from(words).where(eq(words.word, wordLower)).limit(1);
      if (existing.length === 0) return { exists: false as const };
      const word = existing[0];
      const tagList = await db.select({ id: tags.id, name: tags.name }).from(wordTags).innerJoin(tags, eq(wordTags.tagId, tags.id)).where(eq(wordTags.wordId, word.id));
      let groupName = null;
      if (word.groupId) {
        const groupResult = await db.select({ name: wordGroups.name }).from(wordGroups).where(eq(wordGroups.id, word.groupId)).limit(1);
        groupName = groupResult[0]?.name ?? null;
      }
      return { exists: true as const, word: { id: word.id, word: word.word, phonetic: word.phonetic, definition: word.definition, example: word.example, notes: word.notes, proficiency: word.proficiency, tags: tagList, groupId: word.groupId, groupName, createdAt: word.createdAt, updatedAt: word.updatedAt } };
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(words).where(eq(words.id, input.id)).limit(1);
      if (result.length === 0) return null;
      const word = result[0];
      const tagList = await db.select({ id: tags.id, name: tags.name }).from(wordTags).innerJoin(tags, eq(wordTags.tagId, tags.id)).where(eq(wordTags.wordId, word.id));
      const reviewCount = await db.select({ count: sql<number>`count(*)` }).from(wordLogs).where(and(eq(wordLogs.wordId, word.id), eq(wordLogs.action, "review")));
      return { ...word, tags: tagList, reviewCount: reviewCount[0]?.count ?? 0 };
    }),

  create: publicQuery
    .input(z.object({
      word: z.string().min(1).max(255), phonetic: z.string().max(255).optional(),
      definition: z.string().min(1), example: z.string().optional(),
      notes: z.string().optional(), groupId: z.number().optional(),
      tagIds: z.array(z.number()).optional(),
      proficiency: z.enum(["new", "learning", "familiar", "mastered"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { tagIds, ...wordData } = input;
      const result = await db.insert(words).values({ ...wordData, proficiency: wordData.proficiency ?? "new" });
      const wordId = Number(result[0].insertId);
      if (tagIds && tagIds.length > 0) {
        await db.insert(wordTags).values(tagIds.map((tagId) => ({ wordId, tagId })));
      }
      await db.insert(wordLogs).values({ wordId, action: "create" });
      return { id: wordId };
    }),

  update: publicQuery
    .input(z.object({
      id: z.number(), word: z.string().min(1).max(255).optional(),
      phonetic: z.string().max(255).optional(), definition: z.string().min(1).optional(),
      example: z.string().optional(), notes: z.string().optional(),
      groupId: z.number().nullable().optional(),
      tagIds: z.array(z.number()).optional(),
      proficiency: z.enum(["new", "learning", "familiar", "mastered"]).optional(),
    }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, tagIds, ...wordData } = input;
      const updateData = Object.fromEntries(Object.entries(wordData).filter(([, v]) => v !== undefined));
      await db.update(words).set(updateData).where(eq(words.id, id));
      if (tagIds !== undefined) {
        await db.delete(wordTags).where(eq(wordTags.wordId, id));
        if (tagIds.length > 0) {
          await db.insert(wordTags).values(tagIds.map((tagId) => ({ wordId: id, tagId })));
        }
      }
      await db.insert(wordLogs).values({ wordId: id, action: "edit" });
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.delete(words).where(eq(words.id, input.id));
      return { success: true };
    }),

  stats: publicQuery.query(async () => {
    const db = getDb();
    const totalWords = await db.select({ count: sql<number>`count(*)` }).from(words);
    const byProficiency = await db.select({ proficiency: words.proficiency, count: sql<number>`count(*)` }).from(words).groupBy(words.proficiency);
    const todayLearned = await db.select({ count: sql<number>`count(*)` }).from(wordLogs).where(and(eq(wordLogs.action, "create"), sql`DATE(${wordLogs.createdAt}) = CURDATE()`));
    return { total: totalWords[0]?.count ?? 0, byProficiency, todayLearned: todayLearned[0]?.count ?? 0 };
  }),
});
