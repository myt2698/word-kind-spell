import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { textbooks, wordGroups, words } from "@db/schema";
import { eq, and, count, inArray, isNull } from "drizzle-orm";

export const textbookRouter = createRouter({
  // Get or create the default "扩展词汇" textbook (hidden from management list)
  getDefault: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    // Try to find existing default textbook
    const existing = await db
      .select()
      .from(textbooks)
      .where(and(eq(textbooks.userId, ctx.user.id), eq(textbooks.isDefault, true)))
      .limit(1);

    if (existing[0]) return existing[0];

    // Create default "扩展词汇" textbook if not exists
    const result = await db.insert(textbooks).values({
      userId: ctx.user.id,
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

  // Create textbook
  create: authedQuery
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(textbooks).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description || null,
      });
      return { id: Number(result[0].insertId) };
    }),

  // List textbooks with group count (excludes default "扩展词汇" textbook)
  // Used by management page
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const list = await db
      .select()
      .from(textbooks)
      .where(and(eq(textbooks.userId, ctx.user.id), eq(textbooks.isDefault, false)))
      .orderBy(textbooks.sortOrder);

    // Get group counts
    const groupCounts = await db
      .select({ textbookId: wordGroups.textbookId, count: count() })
      .from(wordGroups)
      .where(eq(wordGroups.userId, ctx.user.id))
      .groupBy(wordGroups.textbookId);

    const countMap = new Map(groupCounts.map((g) => [g.textbookId, g.count]));

    return list.map((t) => ({
      ...t,
      groupCount: countMap.get(t.id) ?? 0,
    }));
  }),

  // List all textbooks including default "扩展词汇"
  // Used by WordForm dropdown
  listWithDefault: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const list = await db
      .select()
      .from(textbooks)
      .where(eq(textbooks.userId, ctx.user.id))
      .orderBy(textbooks.sortOrder);

    // Get group counts
    const groupCounts = await db
      .select({ textbookId: wordGroups.textbookId, count: count() })
      .from(wordGroups)
      .where(eq(wordGroups.userId, ctx.user.id))
      .groupBy(wordGroups.textbookId);

    const countMap = new Map(groupCounts.map((g) => [g.textbookId, g.count]));

    return list.map((t) => ({
      ...t,
      groupCount: countMap.get(t.id) ?? 0,
    }));
  }),

  // Update textbook
  update: authedQuery
    .input(z.object({ id: z.number(), name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .update(textbooks)
        .set({ name: input.name, description: input.description || null })
        .where(and(eq(textbooks.id, input.id), eq(textbooks.userId, ctx.user.id)));
      return { success: true };
    }),

  // Delete textbook: disassociate words, delete groups, then delete textbook
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // 1. Get all group IDs under this textbook
      const groups = await db
        .select({ id: wordGroups.id })
        .from(wordGroups)
        .where(and(eq(wordGroups.textbookId, input.id), eq(wordGroups.userId, ctx.user.id)));
      const groupIds = groups.map((g) => g.id);

      // 2. Set groupId to NULL for all words in these groups
      if (groupIds.length > 0) {
        await db
          .update(words)
          .set({ groupId: null })
          .where(and(eq(words.userId, ctx.user.id), inArray(words.groupId, groupIds)));
      }

      // 3. Delete the groups
      await db
        .delete(wordGroups)
        .where(and(eq(wordGroups.textbookId, input.id), eq(wordGroups.userId, ctx.user.id)));

      // 4. Delete the textbook
      await db
        .delete(textbooks)
        .where(and(eq(textbooks.id, input.id), eq(textbooks.userId, ctx.user.id)));

      return { success: true };
    }),

  // Reorder textbooks
  reorder: authedQuery
    .input(z.object({ orders: z.array(z.object({ id: z.number(), sortOrder: z.number() })) }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      for (const o of input.orders) {
        await db
          .update(textbooks)
          .set({ sortOrder: o.sortOrder })
          .where(and(eq(textbooks.id, o.id), eq(textbooks.userId, ctx.user.id)));
      }
      return { success: true };
    }),

  // Get single textbook with groups
  getWithGroups: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const textbook = await db
        .select()
        .from(textbooks)
        .where(and(eq(textbooks.id, input.id), eq(textbooks.userId, ctx.user.id)))
        .limit(1);

      if (!textbook[0]) return null;

      const groups = await db
        .select()
        .from(wordGroups)
        .where(and(eq(wordGroups.textbookId, input.id), eq(wordGroups.userId, ctx.user.id)))
        .orderBy(wordGroups.sortOrder);

      // Get word counts per group
      const wordCounts = await db
        .select({ groupId: words.groupId, count: count() })
        .from(words)
        .where(eq(words.userId, ctx.user.id))
        .groupBy(words.groupId);

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
