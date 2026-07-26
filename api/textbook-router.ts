import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { textbooks, wordGroups, words, wordGroupLinks } from "@db/schema";
import { eq, and, count, inArray } from "drizzle-orm";
import { getCatalogOwnerId } from "./catalog";

export const textbookRouter = createRouter({
  // Get or create the default "扩展词汇" textbook (hidden from management list)
  getDefault: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();
    // Try to find existing default textbook
    const existing = await db
      .select()
      .from(textbooks)
      .where(and(eq(textbooks.userId, catalogOwnerId), eq(textbooks.isDefault, true)))
      .limit(1);

    if (existing[0]) return existing[0];

    if (ctx.user.role !== "admin") {
      throw new TRPCError({
        code: "PRECONDITION_FAILED",
        message: "共享词库尚未初始化",
      });
    }

    // Create default "扩展词汇" textbook if not exists
    const result = await db.insert(textbooks).values({
      userId: catalogOwnerId,
      name: "扩展词汇",
      description: "未归类到课本的单词",
      isDefault: true,
      sortOrder: -1,
    });

    const newTb = await db
      .select()
      .from(textbooks)
      .where(eq(textbooks.id, Number(result[0].insertId)))
      .limit(1);

    return newTb[0]!;
  }),

  // Create textbook + auto-create Unit 1~6
  create: adminQuery
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      const result = await db.insert(textbooks).values({
        userId: catalogOwnerId,
        name: input.name,
        description: input.description || null,
      });
      const textbookId = Number(result[0].insertId);

      // Auto-create Unit 1 ~ Unit 6
      for (let i = 1; i <= 6; i++) {
        await db.insert(wordGroups).values({
          userId: catalogOwnerId,
          textbookId,
          name: `Unit ${i}`,
          sortOrder: i,
        });
      }

      return { id: textbookId };
    }),

  // List textbooks with group count (excludes default "扩展词汇" textbook)
  // Used by management page
  list: authedQuery.query(async () => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();
    const list = await db
      .select()
      .from(textbooks)
      .where(and(eq(textbooks.userId, catalogOwnerId), eq(textbooks.isDefault, false)))
      .orderBy(textbooks.sortOrder);

    const groups = await db
      .select()
      .from(wordGroups)
      .where(eq(wordGroups.userId, catalogOwnerId))
      .orderBy(wordGroups.sortOrder);

    const wordCounts = await db
      .select({ groupId: wordGroupLinks.groupId, count: count() })
      .from(wordGroupLinks)
      .innerJoin(words, eq(wordGroupLinks.wordId, words.id))
      .where(eq(words.userId, catalogOwnerId))
      .groupBy(wordGroupLinks.groupId);

    const countMap = new Map(wordCounts.map((w) => [w.groupId, w.count]));
    const groupsByTextbook = new Map<number, Array<(typeof groups)[number] & { wordCount: number }>>();
    for (const group of groups) {
      if (group.textbookId === null) continue;
      const existing = groupsByTextbook.get(group.textbookId) ?? [];
      existing.push({ ...group, wordCount: countMap.get(group.id) ?? 0 });
      groupsByTextbook.set(group.textbookId, existing);
    }

    return list.map((t) => ({
      ...t,
      groups: groupsByTextbook.get(t.id) ?? [],
      groupCount: groupsByTextbook.get(t.id)?.length ?? 0,
    }));
  }),

  // List all textbooks including default "扩展词汇"
  // Used by WordForm dropdown
  listWithDefault: authedQuery.query(async () => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();
    const list = await db
      .select()
      .from(textbooks)
      .where(eq(textbooks.userId, catalogOwnerId))
      .orderBy(textbooks.sortOrder);

    // Get group counts
    const groupCounts = await db
      .select({ textbookId: wordGroups.textbookId, count: count() })
      .from(wordGroups)
      .where(eq(wordGroups.userId, catalogOwnerId))
      .groupBy(wordGroups.textbookId);

    const countMap = new Map(groupCounts.map((g) => [g.textbookId, g.count]));

    return list.map((t) => ({
      ...t,
      groupCount: countMap.get(t.id) ?? 0,
    }));
  }),

  // Update textbook
  update: adminQuery
    .input(z.object({ id: z.number(), name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      await db
        .update(textbooks)
        .set({ name: input.name, description: input.description || null })
        .where(and(eq(textbooks.id, input.id), eq(textbooks.userId, catalogOwnerId)));
      return { success: true };
    }),

  // Delete textbook: disassociate words, delete groups, then delete textbook
  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();

      // 1. Get all group IDs under this textbook
      const groups = await db
        .select({ id: wordGroups.id })
        .from(wordGroups)
        .where(and(eq(wordGroups.textbookId, input.id), eq(wordGroups.userId, catalogOwnerId)));
      const groupIds = groups.map((g) => g.id);

      // 2. Set groupId to NULL for all words in these groups
      if (groupIds.length > 0) {
        await db
          .update(words)
          .set({ groupId: null })
          .where(and(eq(words.userId, catalogOwnerId), inArray(words.groupId, groupIds)));
      }

      // 3. Delete the groups
      await db
        .delete(wordGroups)
        .where(and(eq(wordGroups.textbookId, input.id), eq(wordGroups.userId, catalogOwnerId)));

      // 4. Delete the textbook
      await db
        .delete(textbooks)
        .where(and(eq(textbooks.id, input.id), eq(textbooks.userId, catalogOwnerId)));

      return { success: true };
    }),

  // Reorder textbooks
  reorder: adminQuery
    .input(z.object({ orders: z.array(z.object({ id: z.number(), sortOrder: z.number() })) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      for (const o of input.orders) {
        await db
          .update(textbooks)
          .set({ sortOrder: o.sortOrder })
          .where(and(eq(textbooks.id, o.id), eq(textbooks.userId, catalogOwnerId)));
      }
      return { success: true };
    }),

  // Get single textbook with groups
  getWithGroups: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      const textbook = await db
        .select()
        .from(textbooks)
        .where(and(eq(textbooks.id, input.id), eq(textbooks.userId, catalogOwnerId)))
        .limit(1);

      if (!textbook[0]) return null;

      const groups = await db
        .select()
        .from(wordGroups)
        .where(and(eq(wordGroups.textbookId, input.id), eq(wordGroups.userId, catalogOwnerId)))
        .orderBy(wordGroups.sortOrder);

      // Get word counts per group
      const wordCounts = await db
        .select({ groupId: wordGroupLinks.groupId, count: count() })
        .from(wordGroupLinks)
        .innerJoin(words, eq(wordGroupLinks.wordId, words.id))
        .where(eq(words.userId, catalogOwnerId))
        .groupBy(wordGroupLinks.groupId);

      const countMap = new Map(wordCounts.map((w) => [w.groupId, w.count]));

      return {
        ...textbook[0],
        groups: groups.map((g) => ({
          ...g,
          wordCount: countMap.get(g.id) ?? 0,
        })),
      };
    }),
});
