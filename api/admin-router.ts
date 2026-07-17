import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { words, tags, textbooks, wordGroups, wordSpellings } from "@db/schema";
import { eq, and, count, desc } from "drizzle-orm";

// Simple admin password (set via env or default)
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

// In-memory session for admin
const adminSessions = new Map<string, number>(); // token -> timestamp

function generateToken(): string {
  return Math.random().toString(36).substring(2) + Date.now().toString(36);
}

function isValidToken(token: string): boolean {
  const ts = adminSessions.get(token);
  if (!ts) return false;
  // Expire after 24 hours
  if (Date.now() - ts > 24 * 60 * 60 * 1000) {
    adminSessions.delete(token);
    return false;
  }
  return true;
}

export const adminRouter = createRouter({
  // Login
  login: publicQuery
    .input(z.object({ password: z.string() }))
    .mutation(async ({ input }) => {
      if (input.password !== ADMIN_PASSWORD) {
        return { success: false, token: null };
      }
      const token = generateToken();
      adminSessions.set(token, Date.now());
      return { success: true, token };
    }),

  // Check session
  check: publicQuery
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      return { valid: isValidToken(input.token) };
    }),

  // Stats dashboard
  stats: publicQuery.query(async () => {
    const db = getDb();
    const wordCount = await db.select({ count: count() }).from(words);
    const tagCount = await db.select({ count: count() }).from(tags);
    const textbookCount = await db.select({ count: count() }).from(textbooks);
    const groupCount = await db.select({ count: count() }).from(wordGroups);
    const spellingCount = await db.select({ count: count() }).from(wordSpellings);
    return {
      words: wordCount[0].count,
      tags: tagCount[0].count,
      textbooks: textbookCount[0].count,
      groups: groupCount[0].count,
      spellings: spellingCount[0].count,
    };
  }),
});
