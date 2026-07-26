import { TRPCError } from "@trpc/server";
import { desc, eq, sql } from "drizzle-orm";
import { tags, textbooks, users, wordGroups, words } from "@db/schema";
import { getDb } from "./queries/connection";
import { env } from "./lib/env";

let catalogOwnerIdPromise: Promise<number> | null = null;

async function resolveCatalogOwnerId(): Promise<number> {
  const db = getDb();
  const configuredId = Number(env.catalogOwnerUserId);

  if (Number.isInteger(configuredId) && configuredId > 0) {
    const configuredOwner = await db
      .select({ id: users.id, role: users.role })
      .from(users)
      .where(eq(users.id, configuredId))
      .limit(1);

    if (configuredOwner[0]?.role === "admin") return configuredOwner[0].id;

    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "共享词库管理员配置无效",
    });
  }

  // Backward-compatible fallback for deployments that have not added the
  // explicit catalog owner setting yet. Prefer the admin that already owns the
  // largest catalog.
  const admins = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.role, "admin"))
    .orderBy(desc(users.id));

  if (admins.length === 0) {
    throw new TRPCError({
      code: "PRECONDITION_FAILED",
      message: "尚未配置共享词库管理员",
    });
  }

  const candidates = await Promise.all(
    admins.map(async ({ id }) => {
      const [textbookCount, groupCount, wordCount, tagCount] = await Promise.all([
        db.select({ count: sql<number>`count(*)` }).from(textbooks).where(eq(textbooks.userId, id)),
        db.select({ count: sql<number>`count(*)` }).from(wordGroups).where(eq(wordGroups.userId, id)),
        db.select({ count: sql<number>`count(*)` }).from(words).where(eq(words.userId, id)),
        db.select({ count: sql<number>`count(*)` }).from(tags).where(eq(tags.userId, id)),
      ]);

      return {
        id,
        score:
          Number(textbookCount[0]?.count ?? 0) +
          Number(groupCount[0]?.count ?? 0) +
          Number(wordCount[0]?.count ?? 0) +
          Number(tagCount[0]?.count ?? 0),
      };
    }),
  );

  candidates.sort((a, b) => b.score - a.score || b.id - a.id);
  return candidates[0].id;
}

export function getCatalogOwnerId(): Promise<number> {
  catalogOwnerIdPromise ??= resolveCatalogOwnerId();
  return catalogOwnerIdPromise;
}
