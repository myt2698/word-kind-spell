import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wordGroups, users, words } from "@db/schema";
import { eq, and, asc, sql } from "drizzle-orm";

export const wordGroupRouter = createRouter({
  list: authedQuery
    .input(z.object({ textbookId: z.number().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const conditions = [eq(wordGroups.userId, ctx.user.id)];
      if (input?.textbookId) {
        conditions.push(eq(wordGroups.textbookId, input.textbookId));
      }

      const groups = await db
        .select()
        .from(wordGroups)
        .where(and(...conditions))
        .orderBy(asc(wordGroups.sortOrder));

      // Get word count for each group
      const groupsWithCount = await Promise.all(
        groups.map(async (group) => {
          const countResult = await db
            .select({ count: sql<number>`count(*)` })
            .from(words)
            .where(
              and(
                eq(words.groupId, group.id),
                eq(words.userId, ctx.user.id)
              )
            );
          return {
            ...group,
            wordCount: countResult[0]?.count ?? 0,
          };
        })
      );

      return groupsWithCount;
    }),

  getById: authedQuery
    .input(z.object({ id: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db
        .select()
        .from(wordGroups)
        .where(
          and(
            eq(wordGroups.id, input.id),
            eq(wordGroups.userId, ctx.user.id)
          )
        )
        .limit(1);
      return result[0] ?? null;
    }),

  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        textbookId: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      let sortOrder = input.sortOrder;
      if (sortOrder === undefined) {
        const existing = await db
          .select({ maxOrder: wordGroups.sortOrder })
          .from(wordGroups)
          .where(eq(wordGroups.userId, ctx.user.id))
          .orderBy(wordGroups.sortOrder);
        sortOrder = existing.length > 0
          ? Math.max(...existing.map((g) => g.maxOrder)) + 1
          : 0;
      }

      const result = await db.insert(wordGroups).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        textbookId: input.textbookId || null,
        sortOrder,
      });
      return { id: Number(result[0].insertId) };
    }),

  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        sortOrder: z.number().optional(),
        textbookId: z.number().nullable().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(wordGroups)
        .set(data)
        .where(
          and(eq(wordGroups.id, id), eq(wordGroups.userId, ctx.user.id))
        );
      return { success: true };
    }),

  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db
        .delete(wordGroups)
        .where(
          and(
            eq(wordGroups.id, input.id),
            eq(wordGroups.userId, ctx.user.id)
          )
        );
      await db
        .update(users)
        .set({ defaultGroupId: null })
        .where(
          and(
            eq(users.id, ctx.user.id),
            eq(users.defaultGroupId, input.id)
          )
        );
      return { success: true };
    }),

  reorder: authedQuery
    .input(
      z.object({
        orders: z.array(
          z.object({ id: z.number(), sortOrder: z.number() })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      for (const item of input.orders) {
        await db
          .update(wordGroups)
          .set({ sortOrder: item.sortOrder })
          .where(
            and(
              eq(wordGroups.id, item.id),
              eq(wordGroups.userId, ctx.user.id)
            )
          );
      }
      return { success: true };
    }),

  setDefault: authedQuery
    .input(z.object({ groupId: z.number().nullable() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      if (input.groupId !== null) {
        const group = await db
          .select()
          .from(wordGroups)
          .where(
            and(
              eq(wordGroups.id, input.groupId),
              eq(wordGroups.userId, ctx.user.id)
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
