import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { textbooks, wordGroups, words } from "@db/schema";
import { eq, and, desc, count } from "drizzle-orm";

export const textbookRouter = createRouter({
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

  // List textbooks with group count
  list: authedQuery.query(async ({ ctx }) => {
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

  // Delete textbook (groups will have textbookId set to NULL)
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
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
