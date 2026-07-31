import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  tags,
  wordTags,
  words,
  wordGroups,
  wordGroupLinks,
  textbooks,
  wordSpellings,
} from "@db/schema";
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
    return db
      .select({
        id: tags.id,
        userId: tags.userId,
        name: tags.name,
        description: tags.description,
        createdAt: tags.createdAt,
        wordCount: sql<number>`count(${wordTags.wordId})`,
      })
      .from(tags)
      .leftJoin(wordTags, eq(wordTags.tagId, tags.id))
      .where(eq(tags.userId, catalogOwnerId))
      .groupBy(tags.id);
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

      // 4. 获取完整的课本/单元关联。words.groupId 仅是兼容旧客户端的主单元，
      // 实际关联以 word_group_links 为准。
      const allWordIds = wordList.map((w) => w.id);
      const groupRows = await db
        .select({
          wordId: wordGroupLinks.wordId,
          groupId: wordGroups.id,
          groupName: wordGroups.name,
          textbookId: textbooks.id,
          textbookName: textbooks.name,
        })
        .from(wordGroupLinks)
        .innerJoin(wordGroups, eq(wordGroupLinks.groupId, wordGroups.id))
        .innerJoin(textbooks, eq(wordGroups.textbookId, textbooks.id))
        .where(inArray(wordGroupLinks.wordId, allWordIds));
      const groupsByWord = new Map<number, Array<{
        groupId: number;
        groupName: string;
        textbookId: number;
        textbookName: string;
      }>>();
      for (const group of groupRows) {
        const existing = groupsByWord.get(group.wordId) ?? [];
        existing.push({
          groupId: group.groupId,
          groupName: group.groupName,
          textbookId: group.textbookId,
          textbookName: group.textbookName,
        });
        groupsByWord.set(group.wordId, existing);
      }

      // 5. 获取这些单词的所有标签（用于展示和编辑）
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
        const memberships = groupsByWord.get(w.id) ?? [];
        const primaryGroup =
          memberships.find((group) => group.groupId === w.groupId) ??
          memberships[0] ??
          null;
        return {
          ...w,
          groups: memberships,
          groupIds: memberships.map((group) => group.groupId),
          groupId: primaryGroup?.groupId ?? w.groupId,
          groupName: primaryGroup?.groupName ?? null,
          textbookId: primaryGroup?.textbookId ?? null,
          textbookName: primaryGroup?.textbookName ?? "扩展词汇",
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
