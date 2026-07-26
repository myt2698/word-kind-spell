import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { words, wordTags, tags, wordLogs, wordGroups, textbooks, wordAudios, wordSpellings } from "@db/schema";
import { eq, and, like, or, desc, asc, sql, inArray, ne } from "drizzle-orm";
import { getCatalogOwnerId } from "./catalog";

const YOUDAO_URL = "https://dict.youdao.com/dictvoice";

async function downloadAudioFromYoudao(wordText: string): Promise<string | null> {
  try {
    const url = `${YOUDAO_URL}?audio=${encodeURIComponent(wordText)}&type=2`;
    const response = await fetch(url);
    if (!response.ok) return null;
    const buffer = await response.arrayBuffer();
    if (buffer.byteLength < 100) return null;
    return Buffer.from(buffer).toString("base64");
  } catch {
    return null;
  }
}

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
      const catalogOwnerId = await getCatalogOwnerId();
      const conditions = [eq(words.userId, catalogOwnerId)];

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
              eq(wordGroups.userId, catalogOwnerId)
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

      let exactMatchFirst = false;
      if (input?.search) {
        const searchTerm = `%${input.search}%`;
        conditions.push(
          or(
            like(words.word, searchTerm),
            like(words.definition, searchTerm),
            like(words.notes, searchTerm)
          )!
        );
        exactMatchFirst = true;
      }

      // Determine sort order
      const orderColumn =
        input?.sortBy === "alphabetical"
          ? words.word
          : words.updatedAt;
      const orderFn = input?.sortBy === "oldest" ? asc : desc;

      // Query 1: Get word list
      // When searching, sort by match quality: exact match > prefix match > definition match
      const searchLower = input?.search?.toLowerCase();
      const orderByClause = exactMatchFirst && searchLower
        ? [
            desc(sql`CASE WHEN LOWER(${words.word}) = ${searchLower} THEN 3 WHEN LOWER(${words.word}) LIKE ${searchLower + '%'} THEN 2 ELSE 1 END`),
            desc(words.updatedAt)
          ]
        : [orderFn(orderColumn)];

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
        .orderBy(...orderByClause);

      if (wordList.length === 0) {
        return [];
      }

      const wordIds = wordList.map((w) => w.id);
      const groupIdsForNames = [...new Set(wordList.map((w) => w.groupId).filter(Boolean))] as number[];

      const learningRows = await db
        .select({
          wordId: wordSpellings.wordId,
          learningStatus: wordSpellings.learningStatus,
        })
        .from(wordSpellings)
        .where(
          and(
            eq(wordSpellings.userId, ctx.user.id),
            inArray(wordSpellings.wordId, wordIds)
          )
        );
      const learningMap = new Map(
        learningRows.map((row) => [row.wordId, row.learningStatus]),
      );

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

      // Query 3: Batch fetch all group names + textbook names + textbookId
      const groupMap = new Map<number, { groupName: string; textbookName: string; textbookId: number }>();
      if (groupIdsForNames.length > 0) {
        const groupRows = await db
          .select({
            id: wordGroups.id,
            groupName: wordGroups.name,
            textbookName: textbooks.name,
            textbookId: textbooks.id,
          })
          .from(wordGroups)
          .innerJoin(textbooks, eq(wordGroups.textbookId, textbooks.id))
          .where(inArray(wordGroups.id, groupIdsForNames));
        for (const g of groupRows) {
          groupMap.set(g.id, { groupName: g.groupName, textbookName: g.textbookName, textbookId: g.textbookId });
        }
      }

      // Assemble results
      let results = wordList.map((word) => {
        const groupInfo = word.groupId ? groupMap.get(word.groupId) : null;
        return {
          ...word,
          learningStatus: learningMap.get(word.id) ?? "idle",
          tags: tagMap.get(word.id) ?? [],
          groupId: word.groupId,
          groupName: groupInfo?.groupName ?? null,
          textbookId: groupInfo?.textbookId ?? null,
          textbookName: groupInfo?.textbookName ?? "扩展词汇",
        };
      });

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
    .query(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      const wordLower = input.word.trim().toLowerCase();

      // Find existing word (case-insensitive)
      const existing = await db
        .select()
        .from(words)
        .where(
          and(
            eq(words.userId, catalogOwnerId),
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
      const catalogOwnerId = await getCatalogOwnerId();
      const result = await db
        .select()
        .from(words)
        .where(
          and(eq(words.id, input.id), eq(words.userId, catalogOwnerId))
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

      const learningRows = await db
        .select({ learningStatus: wordSpellings.learningStatus })
        .from(wordSpellings)
        .where(
          and(
            eq(wordSpellings.wordId, word.id),
            eq(wordSpellings.userId, ctx.user.id)
          )
        )
        .limit(1);

      return {
        ...word,
        learningStatus: learningRows[0]?.learningStatus ?? "idle",
        tags: tagList,
        reviewCount: reviewCount[0]?.count ?? 0,
      };
    }),

  // 创建单词
  create: adminQuery
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
      const catalogOwnerId = await getCatalogOwnerId();
      const { tagIds, ...wordData } = input;
      const normalizedWord = wordData.word.trim();

      if (!normalizedWord) {
        throw new TRPCError({ code: "BAD_REQUEST", message: "请输入单词" });
      }

      const duplicate = await db
        .select({ id: words.id })
        .from(words)
        .where(and(eq(words.userId, catalogOwnerId), eq(words.word, normalizedWord)))
        .limit(1);
      if (duplicate[0]) {
        throw new TRPCError({ code: "CONFLICT", message: `单词 “${normalizedWord}” 已存在` });
      }

      const result = await db.insert(words).values({
        userId: catalogOwnerId,
        ...wordData,
        word: normalizedWord,
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

      // 自动下载发音音频（异步，不阻塞返回）
      const audioBase64 = await downloadAudioFromYoudao(normalizedWord);
      if (audioBase64) {
        await db.insert(wordAudios).values({
          wordId,
          audioData: audioBase64,
          format: "mp3",
          source: "youdao",
        }).catch(() => { /* ignore duplicate */ });
      }

      return { id: wordId };
    }),

  // 更新单词
  update: adminQuery
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
      const catalogOwnerId = await getCatalogOwnerId();
      const { id, tagIds, ...wordData } = input;

      if (wordData.word !== undefined) {
        const normalizedWord = wordData.word.trim();
        if (!normalizedWord) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "请输入单词" });
        }
        const duplicate = await db
          .select({ id: words.id })
          .from(words)
          .where(
            and(
              eq(words.userId, catalogOwnerId),
              eq(words.word, normalizedWord),
              ne(words.id, id),
            ),
          )
          .limit(1);
        if (duplicate[0]) {
          throw new TRPCError({ code: "CONFLICT", message: `单词 “${normalizedWord}” 已存在` });
        }
        wordData.word = normalizedWord;
      }

      // 清理 undefined 值，并自动更新 updatedAt
      const updateData = {
        ...Object.fromEntries(
          Object.entries(wordData).filter(([, v]) => v !== undefined),
        ),
        updatedAt: new Date(),
      } as Partial<typeof words.$inferInsert>;

      await db
        .update(words)
        .set(updateData)
        .where(and(eq(words.id, id), eq(words.userId, catalogOwnerId)));

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
  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      await db
        .delete(words)
        .where(and(eq(words.id, input.id), eq(words.userId, catalogOwnerId)));
      return { success: true };
    }),

  // 获取统计数据
  stats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();

    const totalWords = await db
      .select({ count: sql<number>`count(*)` })
      .from(words)
      .where(eq(words.userId, catalogOwnerId));

    const byProficiency = await db
      .select({
        proficiency: words.proficiency,
        count: sql<number>`count(*)`,
      })
      .from(words)
      .where(eq(words.userId, catalogOwnerId))
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
