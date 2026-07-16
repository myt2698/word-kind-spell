/**
 * Spelling Practice Router
 * - Ebbinghaus review queue
 * - Practice result recording
 * - Error book
 * - Statistics
 */

import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { words, wordSpellings, spellingErrors, spellingSessions } from "@db/schema";
import { eq, and, gte, lte, desc, sql, count } from "drizzle-orm";

// Review intervals in minutes for each level
const REVIEW_INTERVALS: Record<number, number[]> = {
  1: [5, 30, 12 * 60, 24 * 60],
  2: [24 * 60, 2 * 24 * 60, 4 * 24 * 60, 7 * 24 * 60],
  3: [7 * 24 * 60, 15 * 24 * 60, 30 * 24 * 60],
};

function calculateNextReview(level: number, streak: number): Date {
  const intervals = REVIEW_INTERVALS[level] || REVIEW_INTERVALS[1];
  const idx = Math.min(streak, intervals.length - 1);
  return new Date(Date.now() + intervals[idx] * 60 * 1000);
}

export const spellingRouter = createRouter({
  // Initialize spelling record for a word
  init: authedQuery
    .input(z.object({ wordId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      // Check if already exists
      const existing = await db
        .select()
        .from(wordSpellings)
        .where(
          and(
            eq(wordSpellings.wordId, input.wordId),
            eq(wordSpellings.userId, ctx.user.id)
          )
        )
        .limit(1);

      if (existing.length > 0) return { id: existing[0].id, created: false };

      const result = await db.insert(wordSpellings).values({
        wordId: input.wordId,
        userId: ctx.user.id,
        level: 1,
        nextReviewAt: new Date(),
        streak: 0,
        errorCount: 0,
        totalAttempts: 0,
        totalCorrect: 0,
      });
      return { id: Number(result[0].insertId), created: true };
    }),

  // Get review queue (words due for review)
  getReviewQueue: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const now = new Date();

    // Get all due wordSpellings with word details
    const dueRecords = await db
      .select()
      .from(wordSpellings)
      .where(
        and(
          eq(wordSpellings.userId, ctx.user.id),
          lte(wordSpellings.nextReviewAt, now)
        )
      )
      .orderBy(wordSpellings.level);

    if (dueRecords.length === 0) {
      // If no due words, return 5 newest words that haven't been practiced
      const unpracticed = await db
        .select({
          id: words.id,
          word: words.word,
          phonetic: words.phonetic,
          definition: words.definition,
          example: words.example,
          groupId: words.groupId,
        })
        .from(words)
        .where(eq(words.userId, ctx.user.id))
        .orderBy(desc(words.createdAt))
        .limit(5);

      return unpracticed.map((w) => ({
        ...w,
        level: 1 as const,
        streak: 0,
        errorCount: 0,
        totalAttempts: 0,
        isNew: true as const,
      }));
    }

    // Fetch word details for due records
    const wordIds = dueRecords.map((r) => r.wordId);
    const wordList = await db
      .select({
        id: words.id,
        word: words.word,
        phonetic: words.phonetic,
        definition: words.definition,
        example: words.example,
        groupId: words.groupId,
      })
      .from(words)
      .where(sql`${words.id} IN (${sql.join(wordIds)})`);

    const wordMap = new Map(wordList.map((w) => [w.id, w]));

    return dueRecords.map((record) => {
      const word = wordMap.get(record.wordId);
      return {
        id: record.wordId,
        word: word?.word || "",
        phonetic: word?.phonetic || null,
        definition: word?.definition || "",
        example: word?.example || null,
        groupId: word?.groupId || null,
        level: record.level as 1 | 2 | 3,
        streak: record.streak,
        errorCount: record.errorCount,
        totalAttempts: record.totalAttempts,
        isNew: false as const,
        spellingId: record.id,
      };
    });
  }),

  // Submit practice result
  submitResult: authedQuery
    .input(
      z.object({
        wordId: z.number(),
        isCorrect: z.boolean(),
        userInput: z.string().optional(),
        practiceMode: z.enum(["blocks", "fillblank", "flash"]),
        duration: z.number().optional(), // seconds
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Get current spelling record
      const records = await db
        .select()
        .from(wordSpellings)
        .where(
          and(
            eq(wordSpellings.wordId, input.wordId),
            eq(wordSpellings.userId, ctx.user.id)
          )
        )
        .limit(1);

      let record = records[0];

      // Auto-init if not exists
      if (!record) {
        const result = await db.insert(wordSpellings).values({
          wordId: input.wordId,
          userId: ctx.user.id,
          level: 1,
          nextReviewAt: new Date(),
          streak: 0,
          errorCount: 0,
          totalAttempts: 0,
          totalCorrect: 0,
        });
        record = {
          id: Number(result[0].insertId),
          wordId: input.wordId,
          userId: ctx.user.id,
          level: 1,
          nextReviewAt: new Date(),
          lastReviewAt: null,
          streak: 0,
          errorCount: 0,
          totalAttempts: 0,
          totalCorrect: 0,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      // Update based on correctness
      let newLevel = record.level;
      let newStreak = record.streak;

      if (input.isCorrect) {
        newStreak = record.streak + 1;
        // Level up after 2 consecutive correct at same level
        if (newStreak >= 2 && newLevel < 3) {
          newLevel = newLevel + 1;
          newStreak = 0;
        }
      } else {
        newLevel = 1;
        newStreak = 0;
      }

      const nextReview = calculateNextReview(newLevel, newStreak);

      await db
        .update(wordSpellings)
        .set({
          level: newLevel,
          streak: newStreak,
          nextReviewAt: nextReview,
          lastReviewAt: new Date(),
          totalAttempts: record.totalAttempts + 1,
          totalCorrect: record.totalCorrect + (input.isCorrect ? 1 : 0),
          errorCount: record.errorCount + (input.isCorrect ? 0 : 1),
        })
        .where(eq(wordSpellings.id, record.id));

      // Record error if wrong
      if (!input.isCorrect && input.userInput) {
        await db.insert(spellingErrors).values({
          wordId: input.wordId,
          userId: ctx.user.id,
          userInput: input.userInput,
          errorType: "wrong_letter",
          practiceMode: input.practiceMode,
        });
      }

      return {
        isCorrect: input.isCorrect,
        newLevel,
        newStreak,
        nextReviewAt: nextReview,
      };
    }),

  // Get error book
  getErrorBook: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const errors = await db
      .select()
      .from(spellingErrors)
      .where(eq(spellingErrors.userId, ctx.user.id))
      .orderBy(desc(spellingErrors.createdAt))
      .limit(50);

    const wordIds = [...new Set(errors.map((e) => e.wordId))];
    if (wordIds.length === 0) return [];

    const wordList = await db
      .select({ id: words.id, word: words.word, phonetic: words.phonetic, definition: words.definition })
      .from(words)
      .where(sql`${words.id} IN (${sql.join(wordIds)})`);

    const wordMap = new Map(wordList.map((w) => [w.id, w]));

    return errors.map((e) => ({
      ...e,
      word: wordMap.get(e.wordId)?.word || "",
      phonetic: wordMap.get(e.wordId)?.phonetic || null,
      definition: wordMap.get(e.wordId)?.definition || "",
    }));
  }),

  // Get statistics
  getStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    // Total words
    const totalWords = await db
      .select({ count: count() })
      .from(words)
      .where(eq(words.userId, ctx.user.id));

    // Words with spelling records
    const practicedWords = await db
      .select({ count: count() })
      .from(wordSpellings)
      .where(eq(wordSpellings.userId, ctx.user.id));

    // By level
    const byLevel = await db
      .select({
        level: wordSpellings.level,
        count: count(),
      })
      .from(wordSpellings)
      .where(eq(wordSpellings.userId, ctx.user.id))
      .groupBy(wordSpellings.level);

    // Due for review
    const now = new Date();
    const dueCount = await db
      .select({ count: count() })
      .from(wordSpellings)
      .where(
        and(
          eq(wordSpellings.userId, ctx.user.id),
          lte(wordSpellings.nextReviewAt, now)
        )
      );

    // Total errors
    const totalErrors = await db
      .select({ count: count() })
      .from(spellingErrors)
      .where(eq(spellingErrors.userId, ctx.user.id));

    // Today's practice count
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todaySessions = await db
      .select({ count: count() })
      .from(spellingSessions)
      .where(
        and(
          eq(spellingSessions.userId, ctx.user.id),
          gte(spellingSessions.createdAt, todayStart)
        )
      );

    return {
      totalWords: totalWords[0]?.count ?? 0,
      practicedWords: practicedWords[0]?.count ?? 0,
      byLevel: byLevel.map((b) => ({ level: b.level, count: b.count })),
      dueForReview: dueCount[0]?.count ?? 0,
      totalErrors: totalErrors[0]?.count ?? 0,
      todaySessions: todaySessions[0]?.count ?? 0,
    };
  }),

  // Get all words eligible for practice
  getPracticeWords: authedQuery
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        groupId: z.number().optional(),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();

      // Get user's words
      const conditions = [eq(words.userId, ctx.user.id)];
      if (input?.groupId) {
        conditions.push(eq(words.groupId, input.groupId));
      }

      const wordList = await db
        .select({
          id: words.id,
          word: words.word,
          phonetic: words.phonetic,
          definition: words.definition,
          example: words.example,
          groupId: words.groupId,
        })
        .from(words)
        .where(and(...conditions))
        .orderBy(sql`RAND()`)
        .limit(input?.limit ?? 10);

      // Get spelling status for these words
      const wordIds = wordList.map((w) => w.id);
      let spellingMap = new Map<number, typeof wordSpellings.$inferSelect>();

      if (wordIds.length > 0) {
        const spellingRecords = await db
          .select()
          .from(wordSpellings)
          .where(
            and(
              eq(wordSpellings.userId, ctx.user.id),
              sql`${wordSpellings.wordId} IN (${sql.join(wordIds)})`
            )
          );
        spellingMap = new Map(spellingRecords.map((r) => [r.wordId, r]));
      }

      return wordList.map((w) => {
        const sp = spellingMap.get(w.id);
        return {
          ...w,
          level: (sp?.level ?? 1) as 1 | 2 | 3,
          streak: sp?.streak ?? 0,
          errorCount: sp?.errorCount ?? 0,
          totalAttempts: sp?.totalAttempts ?? 0,
        };
      });
    }),

  // Record a practice session
  recordSession: authedQuery
    .input(
      z.object({
        mode: z.enum(["blocks", "fillblank", "flash"]),
        wordCount: z.number(),
        correctCount: z.number(),
        duration: z.number().optional(),
        wordIds: z.array(z.number()).optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      await db.insert(spellingSessions).values({
        userId: ctx.user.id,
        mode: input.mode,
        wordCount: input.wordCount,
        correctCount: input.correctCount,
        duration: input.duration ?? null,
        wordIds: input.wordIds ? JSON.stringify(input.wordIds) : null,
      });
      return { success: true };
    }),
});
