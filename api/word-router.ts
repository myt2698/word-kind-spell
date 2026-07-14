import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { words, wordTags, tags, wordLogs, wordGroups } from "@db/schema";
import { eq, and, like, or, desc, asc, sql } from "drizzle-orm";

export const wordRouter = createRouter({
  // 获取用户的单词列表（支持搜索和分组筛选）
  list: authedQuery
    .input(
      z.object({
        groupId: z.number().optional(),
        tagId: z.number().optional(),
        search: z.string().optional(),
        proficiency: z.enum(["new", "learning", "familiar", "mastered"]).optional(),
        sortBy: z.enum(["newest", "oldest", "alphabetical"]).default("newest"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(words.userId, ctx.user.id)];

      if (input?.groupId) {
        conditions.push(eq(words.groupId, input.groupId));
      }

      if (input?.proficiency) {
        conditions.push(eq(words.proficiency, input.proficiency));
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

      // 确定排序方式
      const orderColumn =
        input?.sortBy === "oldest"
          ? words.createdAt
          : input?.sortBy === "alphabetical"
            ? words.word
            : words.createdAt;
      const orderFn = input?.sortBy === "oldest" ? asc : desc;

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

      // 获取每个单词的标签
      const wordsWithTags = await Promise.all(
        wordList.map(async (word) => {
          const tagList = await db
            .select({
              id: tags.id,
              name: tags.name,
            })
            .from(wordTags)
            .innerJoin(tags, eq(wordTags.tagId, tags.id))
            .where(eq(wordTags.wordId, word.id));

          // 获取分组信息
          let groupName = null;
          if (word.groupId) {
            const groupResult = await db
              .select()
              .from(wordGroups)
              .where(eq(wordGroups.id, word.groupId))
              .limit(1);
            if (groupResult.length > 0) {
              groupName = groupResult[0].name;
            }
          }

          return {
            ...word,
            tags: tagList,
            groupName,
          };
        })
      );

      // 如果有 tagId 筛选，在前端过滤
      if (input?.tagId) {
        return wordsWithTags.filter((w) =>
          w.tags.some((t) => t.id === input.tagId)
        );
      }

      return wordsWithTags;
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

  // 更新熟练度
  updateProficiency: authedQuery
    .input(
      z.object({
        id: z.number(),
        proficiency: z.enum(["new", "learning", "familiar", "mastered"]),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(words)
        .set({ proficiency: input.proficiency })
        .where(
          and(eq(words.id, input.id), eq(words.userId, ctx.user.id))
        );

      // 记录复习日志
      await db.insert(wordLogs).values({
        wordId: input.id,
        userId: ctx.user.id,
        action: "review",
      });

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
