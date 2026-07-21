/**
 * Spelling Practice Router
 * - Learning queue (manual user-controlled)
 * - Ebbinghaus review queue (auto-scheduled)
 * - Practice result recording
 * - Error book
 * - Statistics
 */

import { z } from "zod";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import { words, wordSpellings, spellingErrors, spellingSessions } from "@db/schema";
import { eq, and, gte, lte, desc, count, inArray } from "drizzle-orm";

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
  // ========== Learning Queue (Manual) ==========

  // Add a word to the learning queue
  addToLearning: authedQuery
    .input(z.object({ wordId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // 1. Mark word as active
      await db
        .update(words)
        .set({ learningStatus: "active" })
        .where(and(eq(words.id, input.wordId), eq(words.userId, ctx.user.id)));

      // 2. Create or update wordSpellings record with source=manual
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

      if (existing.length > 0) {
        // Update to manual source and reset to level 1 for immediate review
        await db
          .update(wordSpellings)
          .set({
            source: "manual",
            level: 1,
            nextReviewAt: new Date(), // Start immediately
            streak: 0,
          })
          .where(eq(wordSpellings.id, existing[0].id));
      } else {
        await db.insert(wordSpellings).values({
          wordId: input.wordId,
          userId: ctx.user.id,
          level: 1,
          nextReviewAt: new Date(), // Start immediately
          streak: 0,
          errorCount: 0,
          totalAttempts: 0,
          totalCorrect: 0,
          source: "manual",
        });
      }

      return { success: true };
    }),

  // Remove a word from the learning queue
  removeFromLearning: authedQuery
    .input(z.object({ wordId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      // Mark word as idle
      await db
        .update(words)
        .set({ learningStatus: "idle" })
        .where(and(eq(words.id, input.wordId), eq(words.userId, ctx.user.id)));

      // Change source back to auto
      await db
        .update(wordSpellings)
        .set({ source: "auto" })
        .where(
          and(
            eq(wordSpellings.wordId, input.wordId),
            eq(wordSpellings.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Pause a word (keep in queue but temporarily skip)
  pauseLearning: authedQuery
    .input(z.object({ wordId: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

      await db
        .update(words)
        .set({ learningStatus: "paused" })
        .where(and(eq(words.id, input.wordId), eq(words.userId, ctx.user.id)));

      // Push next review to tomorrow
      const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
      await db
        .update(wordSpellings)
        .set({ nextReviewAt: tomorrow })
        .where(
          and(
            eq(wordSpellings.wordId, input.wordId),
            eq(wordSpellings.userId, ctx.user.id)
          )
        );

      return { success: true };
    }),

  // Get learning status for a word
  getStatus: authedQuery
    .input(z.object({ wordId: z.number() }))
    .query(async ({ ctx, input }) => {
      const db = getDb();

      const wordRows = await db
        .select({ learningStatus: words.learningStatus })
        .from(words)
        .where(and(eq(words.id, input.wordId), eq(words.userId, ctx.user.id)))
        .limit(1);

      const spellingRows = await db
        .select({ source: wordSpellings.source })
        .from(wordSpellings)
        .where(
          and(
            eq(wordSpellings.wordId, input.wordId),
            eq(wordSpellings.userId, ctx.user.id)
          )
        )
        .limit(1);

      return {
        learningStatus: wordRows[0]?.learningStatus || "idle",
        isInQueue: spellingRows.length > 0,
        source: spellingRows[0]?.source || null,
      };
    }),

  // Get words currently in learning (active status)
  getLearningQueue: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    const activeWords = await db
      .select()
      .from(words)
      .where(
        and(
          eq(words.userId, ctx.user.id),
          eq(words.learningStatus, "active")
        )
      )
      .orderBy(desc(words.createdAt));

    const wordIds = activeWords.map((w) => w.id);
    if (wordIds.length === 0) return [];

    const spellingRecords = await db
      .select()
      .from(wordSpellings)
      .where(
        and(
          eq(wordSpellings.userId, ctx.user.id),
          inArray(wordSpellings.wordId, wordIds)
        )
      );

    const spMap = new Map(spellingRecords.map((r) => [r.wordId, r]));

    return activeWords.map((w) => {
      const sp = spMap.get(w.id);
      return {
        id: w.id,
        word: w.word,
        phonetic: w.phonetic,
        definition: w.definition,
        example: w.example,
        groupId: w.groupId,
        level: (sp?.level ?? 1) as 1 | 2 | 3,
        nextReviewAt: sp?.nextReviewAt || new Date(),
        streak: sp?.streak ?? 0,
        source: sp?.source || "auto",
      };
    });
  }),

  // ========== Review Queue ==========

  // Get review queue - only words with learningStatus="active"
  getReviewQueue: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const now = new Date();

    // First get active words
    const activeWords = await db
      .select({ id: words.id })
      .from(words)
      .where(
        and(
          eq(words.userId, ctx.user.id),
          eq(words.learningStatus, "active")
        )
      );

    const activeWordIds = activeWords.map((w) => w.id);
    if (activeWordIds.length === 0) return [];

    // Get due wordSpellings for active words only
    const dueRecords = await db
      .select()
      .from(wordSpellings)
      .where(
        and(
          eq(wordSpellings.userId, ctx.user.id),
          lte(wordSpellings.nextReviewAt, now),
          inArray(wordSpellings.wordId, activeWordIds)
        )
      )
      .orderBy(wordSpellings.source, wordSpellings.level);

    if (dueRecords.length === 0) return [];

    // Fetch word details
    const wordIds = dueRecords.map((r) => r.wordId);
    const wordList = await db
      .select({
        id: words.id,
        word: words.word,
        phonetic: words.phonetic,
        definition: words.definition,
        example: words.example,
        groupId: words.groupId,
        learningStatus: words.learningStatus,
      })
      .from(words)
      .where(inArray(words.id, wordIds));

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
        source: record.source,
        learningStatus: word?.learningStatus || "idle",
        spellingId: record.id,
      };
    });
  }),

  // ========== Practice Result ==========

  submitResult: authedQuery
    .input(
      z.object({
        wordId: z.number(),
        isCorrect: z.boolean(),
        userInput: z.string().optional(),
        practiceMode: z.enum(["blocks", "fillblank", "flash"]),
        duration: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();

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
          source: "auto",
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
          source: "auto",
          createdAt: new Date(),
          updatedAt: new Date(),
        };
      }

      let newLevel = record.level;
      let newStreak = record.streak;

      if (input.isCorrect) {
        newStreak = record.streak + 1;
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

  // ========== Error Book ==========

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
      .where(inArray(words.id, wordIds));

    const wordMap = new Map(wordList.map((w) => [w.id, w]));

    return errors.map((e) => ({
      ...e,
      word: wordMap.get(e.wordId)?.word || "",
      phonetic: wordMap.get(e.wordId)?.phonetic || null,
      definition: wordMap.get(e.wordId)?.definition || "",
    }));
  }),

  // ========== Statistics ==========

  getStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    // Total words
    const totalWords = await db
      .select({ count: count() })
      .from(words)
      .where(eq(words.userId, ctx.user.id));

    // Active learning words
    const learningWords = await db
      .select({ count: count() })
      .from(words)
      .where(
        and(
          eq(words.userId, ctx.user.id),
          eq(words.learningStatus, "active")
        )
      );

    // Paused words
    const pausedWords = await db
      .select({ count: count() })
      .from(words)
      .where(
        and(
          eq(words.userId, ctx.user.id),
          eq(words.learningStatus, "paused")
        )
      );

    // Get active word IDs for due review and byLevel
    const now = new Date();
    const activeWordIdsResult = await db
      .select({ id: words.id })
      .from(words)
      .where(
        and(
          eq(words.userId, ctx.user.id),
          eq(words.learningStatus, "active")
        )
      );
    const activeIds = activeWordIdsResult.map((w) => w.id);

    // By level - only for active words
    let byLevel: any[] = [];
    if (activeIds.length > 0) {
      byLevel = await db
        .select({
          level: wordSpellings.level,
          count: count(),
        })
        .from(wordSpellings)
        .where(
          and(
            eq(wordSpellings.userId, ctx.user.id),
            inArray(wordSpellings.wordId, activeIds)
          )
        )
        .groupBy(wordSpellings.level);
    }

    // Due for review - only count words with learningStatus="active"

    let dueCount: any = [{ count: 0 }];
    let manualDue: any = [{ count: 0 }];

    if (activeIds.length > 0) {
      dueCount = await db
        .select({ count: count() })
        .from(wordSpellings)
        .where(
          and(
            eq(wordSpellings.userId, ctx.user.id),
            lte(wordSpellings.nextReviewAt, now),
            inArray(wordSpellings.wordId, activeIds)
          )
        );

      // Newly learned = manual source + never practiced (totalAttempts=0)
      manualDue = await db
        .select({ count: count() })
        .from(wordSpellings)
        .where(
          and(
            eq(wordSpellings.userId, ctx.user.id),
            eq(wordSpellings.source, "manual"),
            eq(wordSpellings.totalAttempts, 0),
            inArray(wordSpellings.wordId, activeIds)
          )
        );
    }

    // Total distinct words with errors
    const totalErrors = await db
      .selectDistinct({ wordId: spellingErrors.wordId })
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
      learningWords: learningWords[0]?.count ?? 0,
      pausedWords: pausedWords[0]?.count ?? 0,
      byLevel: byLevel.map((b) => ({ level: b.level, count: b.count })),
      dueForReview: dueCount[0]?.count ?? 0,
      manualDue: manualDue[0]?.count ?? 0,
      totalErrors: totalErrors.length,
      todaySessions: todaySessions[0]?.count ?? 0,
    };
  }),

  // ========== Error Words ==========

  getErrorWords: authedQuery.query(async ({ ctx }) => {
    const db = getDb();

    // Get distinct wordIds from spellingErrors
    const errorRows = await db
      .selectDistinct({ wordId: spellingErrors.wordId })
      .from(spellingErrors)
      .where(eq(spellingErrors.userId, ctx.user.id));

    const wordIds = errorRows.map((r) => r.wordId);
    if (wordIds.length === 0) return [];

    const wordList = await db
      .select({
        id: words.id,
        word: words.word,
        phonetic: words.phonetic,
        definition: words.definition,
        example: words.example,
      })
      .from(words)
      .where(
        and(
          eq(words.userId, ctx.user.id),
          inArray(words.id, wordIds)
        )
      )
      .orderBy(desc(words.createdAt));

    // Get error counts per word
    const errorCounts = await db
      .select({
        wordId: spellingErrors.wordId,
        count: count(),
      })
      .from(spellingErrors)
      .where(eq(spellingErrors.userId, ctx.user.id))
      .groupBy(spellingErrors.wordId);

    const countMap = new Map(errorCounts.map((c) => [c.wordId, c.count]));

    return wordList.map((w) => ({
      ...w,
      errorCount: countMap.get(w.id) ?? 0,
    }));
  }),

  // ========== Practice Words ==========

  getPracticeWords: authedQuery
    .input(
      z.object({
        limit: z.number().min(1).max(50).default(10),
        groupId: z.number().optional(),
        source: z.enum(["manual", "auto", "all"]).default("all"),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();

      // Build conditions
      const conditions: any[] = [eq(words.userId, ctx.user.id)];

      if (input?.groupId) {
        conditions.push(eq(words.groupId, input.groupId));
      }

      // If source is manual, only get active learning words
      if (input?.source === "manual") {
        conditions.push(eq(words.learningStatus, "active"));
      }

      const wordList = await db
        .select({
          id: words.id,
          word: words.word,
          phonetic: words.phonetic,
          definition: words.definition,
          example: words.example,
          groupId: words.groupId,
          learningStatus: words.learningStatus,
        })
        .from(words)
        .where(and(...conditions))
        .orderBy(desc(words.createdAt))
        .limit(input?.limit ?? 10);

      // Get spelling status
      const wordIds = wordList.map((w) => w.id);
      let spellingMap = new Map<number, typeof wordSpellings.$inferSelect>();

      if (wordIds.length > 0) {
        const spellingRecords = await db
          .select()
          .from(wordSpellings)
          .where(
            and(
              eq(wordSpellings.userId, ctx.user.id),
              inArray(wordSpellings.wordId, wordIds)
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
          source: sp?.source || "auto",
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
