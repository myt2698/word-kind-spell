import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { textbooks, wordGroups, words } from "@db/schema";
import { eq, and, count, inArray } from "drizzle-orm";

export const textbookRouter = createRouter({
  getDefault: publicQuery.query(async () => {
    const db = getDb();
    const existing = await db.select().from(textbooks).where(eq(textbooks.isDefault, true)).limit(1);
    if (existing[0]) return existing[0];
    const result = await db.insert(textbooks).values({ name: "扩展词汇", description: "未归类到课本的单词", isDefault: true, sortOrder: -1 });
    const newTb = await db.select().from(textbooks).where(eq(textbooks.id, Number(result[0].insertId))).limit(1);
    return newTb[0]!;
  }),

  create: publicQuery
    .input(z.object({ name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const result = await db.insert(textbooks).values({ name: input.name, description: input.description || null });
      return { id: Number(result[0].insertId) };
    }),

  list: publicQuery.query(async () => {
    const db = getDb();
    const list = await db.select().from(textbooks).where(eq(textbooks.isDefault, false)).orderBy(textbooks.sortOrder);
    const groupCounts = await db.select({ textbookId: wordGroups.textbookId, count: count() }).from(wordGroups).groupBy(wordGroups.textbookId);
    const countMap = new Map(groupCounts.map((g) => [g.textbookId, g.count]));
    return list.map((t) => ({ ...t, groupCount: countMap.get(t.id) ?? 0 }));
  }),

  listWithDefault: publicQuery.query(async () => {
    const db = getDb();
    const list = await db.select().from(textbooks).orderBy(textbooks.sortOrder);
    const groupCounts = await db.select({ textbookId: wordGroups.textbookId, count: count() }).from(wordGroups).groupBy(wordGroups.textbookId);
    const countMap = new Map(groupCounts.map((g) => [g.textbookId, g.count]));
    return list.map((t) => ({ ...t, groupCount: countMap.get(t.id) ?? 0 }));
  }),

  update: publicQuery
    .input(z.object({ id: z.number(), name: z.string().min(1), description: z.string().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(textbooks).set({ name: input.name, description: input.description || null }).where(eq(textbooks.id, input.id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const groups = await db.select({ id: wordGroups.id }).from(wordGroups).where(eq(wordGroups.textbookId, input.id));
      const groupIds = groups.map((g) => g.id);
      if (groupIds.length > 0) {
        await db.update(words).set({ groupId: null }).where(inArray(words.groupId, groupIds));
      }
      await db.delete(wordGroups).where(eq(wordGroups.textbookId, input.id));
      await db.delete(textbooks).where(eq(textbooks.id, input.id));
      return { success: true };
    }),

  reorder: publicQuery
    .input(z.object({ orders: z.array(z.object({ id: z.number(), sortOrder: z.number() })) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      for (const o of input.orders) {
        await db.update(textbooks).set({ sortOrder: o.sortOrder }).where(eq(textbooks.id, o.id));
      }
      return { success: true };
    }),

  getWithGroups: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const textbook = await db.select().from(textbooks).where(eq(textbooks.id, input.id)).limit(1);
      if (!textbook[0]) return null;
      const groups = await db.select().from(wordGroups).where(eq(wordGroups.textbookId, input.id)).orderBy(wordGroups.sortOrder);
      const wordCounts = await db.select({ groupId: words.groupId, count: count() }).from(words).groupBy(words.groupId);
      const countMap = new Map(wordCounts.map((w) => [w.groupId, w.count]));
      return { ...textbook[0], groups: groups.map((g) => ({ ...g, wordCount: countMap.get(g.id) ?? 0 })) };
    }),
});
