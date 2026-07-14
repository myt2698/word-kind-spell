import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { tags, wordTags } from "@db/schema";
import { eq, and, sql } from "drizzle-orm";

export const tagRouter = createRouter({
  // 获取用户的所有标签
  list: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    return db
      .select()
      .from(tags)
      .where(eq(tags.userId, ctx.user.id));
  }),

  // 获取带单词数量的标签列表
  listWithCount: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const userTags = await db
      .select()
      .from(tags)
      .where(eq(tags.userId, ctx.user.id));

    const result = await Promise.all(
      userTags.map(async (tag) => {
        const countResult = await db
          .select({ count: sql<number>`count(*)` })
          .from(wordTags)
          .where(eq(wordTags.tagId, tag.id));
        return {
          ...tag,
          wordCount: countResult[0]?.count ?? 0,
        };
      })
    );

    return result;
  }),

  // 创建标签
  create: authedQuery
    .input(
      z.object({
        name: z.string().min(1).max(50),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // 检查同名标签是否已存在
      const existing = await db
        .select()
        .from(tags)
        .where(
          and(eq(tags.userId, ctx.user.id), eq(tags.name, input.name))
        )
        .limit(1);

      if (existing.length > 0) {
        return { id: existing[0].id, created: false };
      }

      const result = await db.insert(tags).values({
        userId: ctx.user.id,
        name: input.name,
        color: input.color ?? "#10b981",
      });
      return { id: Number(result[0].insertId), created: true };
    }),

  // 更新标签
  update: authedQuery
    .input(
      z.object({
        id: z.number(),
        name: z.string().min(1).max(50).optional(),
        color: z.string().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const { id, ...data } = input;
      await db
        .update(tags)
        .set(data)
        .where(and(eq(tags.id, id), eq(tags.userId, ctx.user.id)));
      return { success: true };
    }),

  // 删除标签
  delete: authedQuery
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // 先删除关联
      await db.delete(wordTags).where(eq(wordTags.tagId, input.id));
      // 再删除标签
      await db
        .delete(tags)
        .where(and(eq(tags.id, input.id), eq(tags.userId, ctx.user.id)));
      return { success: true };
    }),
});
