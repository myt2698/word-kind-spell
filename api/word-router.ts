import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { words, wordTags, tags, wordLogs, wordGroups } from "@db/schema";
import { eq, and, like, or, desc, asc, sql, inArray } from "drizzle-orm";

export const wordRouter = createRouter({
  // 获取用户的单词列表（支持搜索和分组筛选）
  list: authedQuery
    .input(
      z.object({
        groupId: z.number().optional(),
        tagId: z.number().optional(),
        search: z.string().optional(),
        sortBy: z.enum(["newest", "oldest", "alphabetical"]).default("newest"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(words.userId, ctx.user.id)];

      if (input?.groupId) {
        conditions.push(eq(words.groupId, input.groupId));
      }

      if (input?.search) {
        const searchTerm = `%${input.search}%`;
        conditions.push(
          or(
            like(words.word, searchTerm),
            like(words.definition, searchTerm),
            like(words.notes, searchTerm)
          )!
        );
      }

      // Determine sort order
      const orderColumn =
        input?.sortBy === "oldest"
          ? words.createdAt
          : input?.sortBy === "alphabetical"
            ? words.word
            : words.createdAt;
      const orderFn = input?.sortBy === "oldest" ? asc : desc;

      // Query 1: Get word list
      const wordList = await db
        .select({
          id: words.id,
          userId: words.userId,
          groupId: words.groupId,
          word: words.word,
          phonetic: words.phonetic,
          definition: words.definition,
          example: words.example,
          notes: words.notes,
          proficiency: words.proficiency,
          createdAt: words.createdAt,
          updatedAt: words.updatedAt,
        })
        .from(words)
        .where(and(...conditions))
        .orderBy(orderFn(orderColumn));

      if (wordList.length === 0) {
        return [];
      }

      const wordIds = wordList.map((w) => w.id);
      const groupIds = [...new Set(wordList.map((w) => w.groupId).filter(Boolean))] as number[];

      // Query 2: Batch fetch all tags for these words
      const allTagRows = wordIds.length > 0
        ? await db
            .select({
              wordId: wordTags.wordId,
              tagId: tags.id,
              tagName: tags.name,
            })
            .from(wordTags)
            .innerJoin(tags, eq(wordTags.tagId, tags.id))
            .where(inArray(wordTags.wordId, wordIds))
        : [];

      // Build wordId -> tags[] map
      const tagMap = new Map<number, { id: number; name: string }[]>();
      for (const row of allTagRows) {
        const existing = tagMap.get(row.wordId) ?? [];
        existing.push({ id: row.tagId, name: row.tagName });
        tagMap.set(row.wordId, existing);
      }

      // Query 3: Batch fetch all group names
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

      // Assemble results
      const results = wordList.map((word) => ({
        ...word,
        tags: tagMap.get(word.id) ?? [],
        groupId: word.groupId,
        groupName: word.groupId ? (groupMap.get(word.groupId) ?? null) : null,
      }));

      // Filter by tagId if needed
      if (input?.tagId) {
        return results.filter((w) =>
          w.tags.some((t) => t.id === input.tagId)
        );
      }

      return results;
    }),

  // 获取单个单词详情
  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(words)
        .where(
          and(eq(words.id, input.id), eq(words.userId, ctx.user.id))
        )
        .limit(1);

      if (result.length === 0) return null;

      const word = result[0];

      const tagList = await db
        .select({
          id: tags.id,
          name: tags.name,
        })
        .from(wordTags)
        .innerJoin(tags, eq(wordTags.tagId, tags.id))
        .where(eq(wordTags.wordId, word.id));

      // 获取学习统计
      const reviewCount = await db
        .select({ count: sql<number>`count(*)` })
        .from(wordLogs)
        .where(
          and(
            eq(wordLogs.wordId, word.id),
            eq(wordLogs.action, "review")
          )
        );

      return {
        ...word,
        tags: tagList,
        reviewCount: reviewCount[0]?.count ?? 0,
      };
    }),

  // 创建单词
  create: authedQuery
    .input(
      z.object({
        word: z.string().min(1).max(255),
        phonetic: z.string().max(255).optional(),
        definition: z.string().min(1),
        example: z.string().optional(),
        notes: z.string().optional(),
        groupId: z.number().optional(),
        tagIds: z.array(z.number()).optional(),
        proficiency: z.enum(["new", "learning", "familiar", "mastered"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { tagIds, ...wordData } = input;

      const result = await db.insert(words).values({
        userId: ctx.user.id,
        ...wordData,
        proficiency: wordData.proficiency ?? "new",
      });

      const wordId = Number(result[0].insertId);

      // 关联标签
      if (tagIds && tagIds.length > 0) {
        await db.insert(wordTags).values(
          tagIds.map((tagId) => ({
            wordId,
            tagId,
          }))
        );
      }

      // 记录创建日志
      await db.insert(wordLogs).values({
        wordId,
        userId: ctx.user.id,
        action: "create",
      });

      return { id: wordId };
    }),

  // 更新单词
  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        word: z.string().min(1).max(255).optional(),
        phonetic: z.string().max(255).optional(),
        definition: z.string().min(1).optional(),
        example: z.string().optional(),
        notes: z.string().optional(),
        groupId: z.number().nullable().optional(),
        tagIds: z.array(z.number()).optional(),
        proficiency: z.enum(["new", "learning", "familiar", "mastered"]).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, tagIds, ...wordData } = input;

      // 清理 undefined 值
      const updateData = Object.fromEntries(
        Object.entries(wordData).filter(([, v]) => v !== undefined)
      );

      await db
        .update(words)
        .set(updateData)
        .where(and(eq(words.id, id), eq(words.userId, ctx.user.id)));

      // 更新标签关联
      if (tagIds !== undefined) {
        // 删除旧关联
        await db.delete(wordTags).where(eq(wordTags.wordId, id));
        // 添加新关联
        if (tagIds.length > 0) {
          await db.insert(wordTags).values(
            tagIds.map((tagId) => ({
              wordId: id,
              tagId,
            }))
          );
        }
      }

      // 记录编辑日志
      await db.insert(wordLogs).values({
        wordId: id,
        userId: ctx.user.id,
        action: "edit",
      });

      return { success: true };
    }),

  // 删除单词
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(words)
        .where(and(eq(words.id, input.id), eq(words.userId, ctx.user.id)));
      return { success: true };
    }),

  // 获取统计数据
  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    const totalWords = await db
      .select({ count: sql<number>`count(*)` })
      .from(words)
      .where(eq(words.userId, ctx.user.id));

    const byProficiency = await db
      .select({
        proficiency: words.proficiency,
        count: sql<number>`count(*)`,
      })
      .from(words)
      .where(eq(words.userId, ctx.user.id))
      .groupBy(words.proficiency);

    const todayLearned = await db
      .select({ count: sql<number>`count(*)` })
      .from(wordLogs)
      .where(
        and(
          eq(wordLogs.userId, ctx.user.id),
          eq(wordLogs.action, "create"),
          sql`DATE(${wordLogs.createdAt}) = CURDATE()`
        )
      );

    return {
      total: totalWords[0]?.count ?? 0,
      byProficiency,
      todayLearned: todayLearned[0]?.count ?? 0,
    };
  }),
});
