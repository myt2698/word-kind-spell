import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { wordGroups } from "@db/schema";
import { eq, and, asc } from "drizzle-orm";

export const wordGroupRouter = createRouter({
  // 获取用户的所有分组
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(wordGroups)
      .where(eq(wordGroups.userId, ctx.user.id))
      .orderBy(asc(wordGroups.sortOrder));
  }),

  // 获取单个分组
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

  // 创建分组
  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const result = await db.insert(wordGroups).values({
        userId: ctx.user.id,
        name: input.name,
        description: input.description,
        color: input.color ?? "#3b82f6",
        sortOrder: input.sortOrder ?? 0,
      });
      return { id: Number(result[0].insertId) };
    }),

  // 更新分组
  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().optional(),
        color: z.string().optional(),
        sortOrder: z.number().optional(),
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

  // 删除分组
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
      return { success: true };
    }),
});
