import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { tags, wordTags, words, wordGroups, textbooks, wordSpellings } from "@db/schema";
import { eq, and, sql, desc, inArray } from "drizzle-orm";
import { getCatalogOwnerId } from "./catalog";

export const tagRouter = createRouter({
  list: authedQuery.query(async () => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();
    return db
      .select()
      .from(tags)
      .where(eq(tags.userId, catalogOwnerId));
  }),

  listWithCount: authedQuery.query(async () => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();
    const userTags = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, catalogOwnerId));

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

  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1).max(50),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      const existing = await db
        .select()
        .from(tags)
        .where(
          and(eq(tags.userId, catalogOwnerId), eq(tags.name, input.name))
        )
        .limit(1);

      if (existing.length > 0) {
        return { id: existing[0].id, created: false };
      }

      const result = await db.insert(tags).values({
        userId: catalogOwnerId,
        name: input.name,
        description: input.description,
      });
      return { id: Number(result[0].insertId), created: true };
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(50).optional(),
        description: z.string().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      const { id, ...data } = input;
      await db
        .update(tags)
        .set(data)
        .where(and(eq(tags.id, id), eq(tags.userId, catalogOwnerId)));
      return { success: true };
    }),

  // 获取标签详情及该标签下的所有单词
  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();

      // 1. 获取标签详情
      const tagResult = await db
        .select()
        .from(tags)
        .where(and(eq(tags.id, input.id), eq(tags.userId, catalogOwnerId)))
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
        .where(and(eq(words.userId, catalogOwnerId), inArray(words.id, wordIds)))
        .orderBy(desc(words.createdAt));

      // 4. 获取单元名称 + 课本名称
      const groupIds = [...new Set(wordList.map((w) => w.groupId).filter(Boolean))] as number[];
      const groupMap = new Map<number, { groupName: string; textbookName: string }>();
      if (groupIds.length > 0) {
        const groupRows = await db
          .select({
            id: wordGroups.id,
            groupName: wordGroups.name,
            textbookName: textbooks.name,
          })
          .from(wordGroups)
          .innerJoin(textbooks, eq(wordGroups.textbookId, textbooks.id))
          .where(inArray(wordGroups.id, groupIds));
        for (const g of groupRows) {
          groupMap.set(g.id, { groupName: g.groupName, textbookName: g.textbookName });
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

      const learningRows = await db
        .select({
          wordId: wordSpellings.wordId,
          learningStatus: wordSpellings.learningStatus,
        })
        .from(wordSpellings)
        .where(
          and(
            eq(wordSpellings.userId, ctx.user.id),
            inArray(wordSpellings.wordId, allWordIds)
          )
        );
      const learningMap = new Map(
        learningRows.map((row) => [row.wordId, row.learningStatus]),
      );

      const enrichedWords = wordList.map((w) => {
        const info = w.groupId ? groupMap.get(w.groupId) : null;
        return {
          ...w,
          groupName: info?.groupName ?? null,
          textbookName: info?.textbookName ?? "扩展词汇",
          tags: tagMap.get(w.id) ?? [],
          learningStatus: learningMap.get(w.id) ?? "idle",
        };
      });

      return {
        tag,
        words: enrichedWords,
      };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      await db.delete(wordTags).where(eq(wordTags.tagId, input.id));
      await db
        .delete(tags)
        .where(and(eq(tags.id, input.id), eq(tags.userId, catalogOwnerId)));
      return { success: true };
    }),
});
