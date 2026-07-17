import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wordGroups, words } from "@db/schema";
import { eq, and, asc, sql } from "drizzle-orm";

export const wordGroupRouter = createRouter({
  list: publicQuery
    .input(z.object({ textbookId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const conditions = [];
      if (input?.textbookId) conditions.push(eq(wordGroups.textbookId, input.textbookId));
      const groups = await db.select().from(wordGroups).where(conditions.length > 0 ? and(...conditions) : undefined).orderBy(asc(wordGroups.sortOrder));
      const groupsWithCount = await Promise.all(groups.map(async (group) => {
        const countResult = await db.select({ count: sql<number>`count(*)` }).from(words).where(eq(words.groupId, group.id));
        return { ...group, wordCount: countResult[0]?.count ?? 0 };
      }));
      return groupsWithCount;
    }),

  getById: publicQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const result = await db.select().from(wordGroups).where(eq(wordGroups.id, input.id)).limit(1);
      return result[0] ?? null;
    }),

  create: publicQuery
    .input(z.object({ name: z.string().min(1).max(100), description: z.string().optional(), sortOrder: z.number().optional(), textbookId: z.number().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const existing = await db.select({ maxOrder: wordGroups.sortOrder }).from(wordGroups).orderBy(wordGroups.sortOrder);
        sortOrder = existing.length > 0 ? Math.max(...existing.map((g) => g.maxOrder)) + 1 : 0;
      }
      const result = await db.insert(wordGroups).values({ name: input.name, description: input.description, textbookId: input.textbookId || null, sortOrder });
      return { id: Number(result[0].insertId) };
    }),

  update: publicQuery
    .input(z.object({ id: z.number(), name: z.string().min(1).max(100).optional(), description: z.string().optional(), sortOrder: z.number().optional(), textbookId: z.number().nullable().optional() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db.update(wordGroups).set(data).where(eq(wordGroups.id, id));
      return { success: true };
    }),

  delete: publicQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      await db.update(words).set({ groupId: null }).where(eq(words.groupId, input.id));
      await db.delete(wordGroups).where(eq(wordGroups.id, input.id));
      return { success: true };
    }),

  reorder: publicQuery
    .input(z.object({ orders: z.array(z.object({ id: z.number(), sortOrder: z.number() })) }))
    .mutation(async ({ input }) => {
      const db = getDb();
      for (const item of input.orders) {
        await db.update(wordGroups).set({ sortOrder: item.sortOrder }).where(eq(wordGroups.id, item.id));
      }
      return { success: true };
    }),
});
