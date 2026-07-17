import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { words, wordTags, tags, wordLogs, wordGroups } from "@db/schema";
import { eq, and, like, or, desc, asc, sql, inArray } from "drizzle-orm";

export const wordRouter = createRouter({
  // 获取用户的单词列表（支持搜索、多分组、多标签、课本联合筛选）
  list: authedQuery
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
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(words.userId, ctx.user.id)];

      // Handle textbook filter: find all groups in the textbook
      let effectiveGroupIds = input?.groupIds
        ? input.groupIds
        : input?.groupId
          ? [input.groupId]
          : [];

      if (input?.textbookId) {
        const textbookGroups = await db
          .select({ id: wordGroups.id })
          .from(wordGroups)
          .where(
            and(
              eq(wordGroups.textbookId, input.textbookId),
              eq(wordGroups.userId, ctx.user.id)
            )
          );
        const textbookGroupIds = textbookGroups.map((g) => g.id);
        if (effectiveGroupIds.length > 0) {
          // Intersection: only keep groups that are in both the textbook and the requested groups
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
          learningStatus: words.learningStatus,
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
      const groupIdsForNames = [...new Set(wordList.map((w) => w.groupId).filter(Boolean))] as number[];

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
      if (groupIdsForNames.length > 0) {
        const groupRows = await db
          .select({ id: wordGroups.id, name: wordGroups.name })
          .from(wordGroups)
          .where(inArray(wordGroups.id, groupIdsForNames));
        for (const g of groupRows) {
          groupMap.set(g.id, g.name);
        }
      }

      // Assemble results
      let results = wordList.map((word) => ({
        ...word,
        tags: tagMap.get(word.id) ?? [],
        groupId: word.groupId,
        groupName: word.groupId ? (groupMap.get(word.groupId) ?? null) : null,
      }));

      // Filter by tag (single or multiple) in memory
      const effectiveTagIds = input?.tagIds
        ? input.tagIds
        : input?.tagId
          ? [input.tagId]
          : [];
      if (effectiveTagIds.length > 0) {
        results = results.filter((w) =>
          w.tags.some((t) => effectiveTagIds.includes(t.id))
        );
      }

      return results;
    }),

  // 检查单词是否已存在
  checkExists: authedQuery
    .input(z.object({ word: z.string().min(1) }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const wordLower = input.word.trim().toLowerCase();

      // Find existing word (case-insensitive)
      const existing = await db
        .select()
        .from(words)
        .where(
          and(
            eq(words.userId, ctx.user.id),
            eq(words.word, wordLower)
          )
        )
        .limit(1);

      if (existing.length === 0) {
        return { exists: false as const };
      }

      const word = existing[0];

      // Fetch tags
      const tagList = await db
        .select({ id: tags.id, name: tags.name })
        .from(wordTags)
        .innerJoin(tags, eq(wordTags.tagId, tags.id))
        .where(eq(wordTags.wordId, word.id));

      // Fetch group name
      let groupName = null;
      if (word.groupId) {
        const groupResult = await db
          .select({ name: wordGroups.name })
          .from(wordGroups)
          .where(eq(wordGroups.id, word.groupId))
          .limit(1);
        groupName = groupResult[0]?.name ?? null;
      }

      return {
        exists: true as const,
        word: {
          id: word.id,
          word: word.word,
          phonetic: word.phonetic,
          definition: word.definition,
          example: word.example,
          notes: word.notes,
          proficiency: word.proficiency,
          tags: tagList,
          groupId: word.groupId,
          groupName,
          createdAt: word.createdAt,
          updatedAt: word.updatedAt,
        },
      };
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
