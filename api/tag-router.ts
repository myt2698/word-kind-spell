import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { tags, wordTags, words, wordGroups } from "@db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";

export const tagRouter = createRouter({
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(tags)
      .where(eq(tags.userId, ctx.user.id));
  }),

  listWithCount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userTags = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, ctx.user.id));

    const result = await Promise.all(
      userTags.map(async (tag) => {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(wordTags)
          .where(eq(wordTags.tagId, tag.id));
        return {
          ...tag,
          wordCount: countResult[0]?.count ?? 0,
        };
      })
    );

    return result;
  }),

  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(50),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const existing = await db
        .select()
        .from(tags)
        .where(
          and(eq(tags.userId, ctx.user.id), eq(tags.name, input.name))
        )
        .limit(1);

      if (existing.length > 0) {
        return { id: existing[0].id, created: false };
      }

      const result = await db.insert(tags).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
      });
      return { id: Number(result[0].insertId), created: true };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(50).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(tags)
        .set(data)
        .where(and(eq(tags.id, id), eq(tags.userId, ctx.user.id)));
      return { success: true };
    }),

  // 获取标签详情及该标签下的所有单词
  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();

      // 1. 获取标签详情
      const tagResult = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, input.id), eq(tags.userId, ctx.user.id)))
        .limit(1);

      if (tagResult.length === 0) return null;

      const tag = tagResult[0];

      // 2. 获取该标签下的所有单词ID
      const wordTagRows = await db
        .select({ wordId: wordTags.wordId })
        .from(wordTags)
        .where(eq(wordTags.tagId, input.id));

      const wordIds = wordTagRows.map((r) => r.wordId);

      if (wordIds.length === 0) {
        return {
          tag,
          words: [],
        };
      }

      // 3. 批量获取单词详情
      const wordList = await db
        .select({
          id: words.id,
          word: words.word,
          phonetic: words.phonetic,
          definition: words.definition,
          example: words.example,
          notes: words.notes,
          proficiency: words.proficiency,
          learningStatus: words.learningStatus,
          groupId: words.groupId,
          createdAt: words.createdAt,
          updatedAt: words.updatedAt,
        })
        .from(words)
        .where(and(eq(words.userId, ctx.user.id), inArray(words.id, wordIds)))
        .orderBy(desc(words.createdAt));

      // 4. 获取单元名称
      const groupIds = [...new Set(wordList.map((w) => w.groupId).filter(Boolean))] as number[];
      const groupMap = new Map<number, string>();
      if (groupIds.length > 0) {
        const groupRows = await db
          .select({ id: wordGroups.id, name: wordGroups.name })
          .from(wordGroups)
          .where(inArray(wordGroups.id, groupIds));
        for (const g of groupRows) {
          groupMap.set(g.id, g.name);
        }
      }

      // 5. 获取这些单词的所有标签（用于展示）
      const allWordIds = wordList.map((w) => w.id);
      const allTagRows = await db
        .select({
          wordId: wordTags.wordId,
          tagId: tags.id,
          tagName: tags.name,
        })
        .from(wordTags)
        .innerJoin(tags, eq(wordTags.tagId, tags.id))
        .where(inArray(wordTags.wordId, allWordIds));

      const tagMap = new Map<number, { id: number; name: string }[]>();
      for (const row of allTagRows) {
        const existing = tagMap.get(row.wordId) ?? [];
        existing.push({ id: row.tagId, name: row.tagName });
        tagMap.set(row.wordId, existing);
      }

      const enrichedWords = wordList.map((w) => ({
        ...w,
        groupName: w.groupId ? (groupMap.get(w.groupId) ?? null) : null,
        tags: tagMap.get(w.id) ?? [],
      }));

      return {
        tag,
        words: enrichedWords,
      };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.delete(wordTags).where(eq(wordTags.tagId, input.id));
      await db
        .delete(tags)
        .where(and(eq(tags.id, input.id), eq(tags.userId, ctx.user.id)));
      return { success: true };
    }),
});
