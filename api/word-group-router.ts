import { z } from "zod";
import { createRouter, authedQuery, adminQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wordGroups, wordGroupLinks, users, words } from "@db/schema";
import { eq, and, asc, sql, inArray } from "drizzle-orm";
import { getCatalogOwnerId } from "./catalog";

export const wordGroupRouter = createRouter({
  list: authedQuery
    .input(z.object({ textbookId: z.number().optional() }).optional())
    .query(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      const conditions = [eq(wordGroups.userId, catalogOwnerId)];
      if (input?.textbookId) {
        conditions.push(eq(wordGroups.textbookId, input.textbookId));
      }

      const groups = await db
        .select()
        .from(wordGroups)
        .where(and(...conditions))
        .orderBy(asc(wordGroups.sortOrder));

      if (groups.length === 0) return [];
      const counts = await db
        .select({
          groupId: wordGroupLinks.groupId,
          count: sql<number>`count(*)`,
        })
        .from(wordGroupLinks)
        .innerJoin(words, eq(wordGroupLinks.wordId, words.id))
        .where(and(
          inArray(wordGroupLinks.groupId, groups.map((group) => group.id)),
          eq(words.userId, catalogOwnerId),
        ))
        .groupBy(wordGroupLinks.groupId);
      const countMap = new Map(counts.map((row) => [row.groupId, row.count]));
      return groups.map((group) => ({
        ...group,
        wordCount: countMap.get(group.id) ?? 0,
      }));
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      const result = await db
        .select()
        .from(wordGroups)
        .where(
          and(
            eq(wordGroups.id, input.id),
            eq(wordGroups.userId, catalogOwnerId)
          )
        )
        .limit(1);
      return result[0] ?? null;
    }),

  create: adminQuery
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        textbookId: z.number().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const existing = await db
          .select({ maxOrder: wordGroups.sortOrder })
          .from(wordGroups)
          .where(eq(wordGroups.userId, catalogOwnerId))
          .orderBy(wordGroups.sortOrder);
        sortOrder = existing.length > 0
          ? Math.max(...existing.map((g) => g.maxOrder)) + 1
          : 0;
      }

      const result = await db.insert(wordGroups).values({
        userId: catalogOwnerId,
        name: input.name,
        description: input.description,
        textbookId: input.textbookId || null,
        sortOrder,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: adminQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        textbookId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      const { id, ...data } = input;
      await db
        .update(wordGroups)
        .set(data)
        .where(
          and(eq(wordGroups.id, id), eq(wordGroups.userId, catalogOwnerId))
        );
      return { success: true };
    }),

  delete: adminQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();

      // 1. Set groupId to NULL for all words in this group
      await db
        .update(words)
        .set({ groupId: null })
        .where(and(eq(words.groupId, input.id), eq(words.userId, catalogOwnerId)));

      // 2. Clear defaultGroupId if it's this group
      await db
        .update(users)
        .set({ defaultGroupId: null })
        .where(eq(users.defaultGroupId, input.id));

      // 3. Delete the group
      await db
        .delete(wordGroups)
        .where(
          and(
            eq(wordGroups.id, input.id),
            eq(wordGroups.userId, catalogOwnerId)
          )
        );
      return { success: true };
    }),

  reorder: adminQuery
    .input(
      z.object({
        orders: z.array(
          z.object({ id: z.number(), sortOrder: z.number() })
        ),
      })
    )
    .mutation(async ({ input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      for (const item of input.orders) {
        await db
          .update(wordGroups)
          .set({ sortOrder: item.sortOrder })
          .where(
            and(
              eq(wordGroups.id, item.id),
              eq(wordGroups.userId, catalogOwnerId)
            )
          );
      }
      return { success: true };
    }),

  setDefault: authedQuery
    .input(z.object({ groupId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();

      if (input.groupId !== null) {
        const group = await db
          .select()
          .from(wordGroups)
          .where(
            and(
              eq(wordGroups.id, input.groupId),
              eq(wordGroups.userId, catalogOwnerId)
            )
          )
          .limit(1);
        if (group.length === 0) {
          return { success: false, message: "分组不存在" };
        }
      }

      await db
        .update(users)
        .set({ defaultGroupId: input.groupId })
        .where(eq(users.id, ctx.user.id));

      return { success: true };
    }),

  getSettings: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const result = await db
      .select({ defaultGroupId: users.defaultGroupId })
      .from(users)
      .where(eq(users.id, ctx.user.id))
      .limit(1);
    return result[0] ?? { defaultGroupId: null };
  }),
});
