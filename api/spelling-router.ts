/**
 * Spelling Practice Router
 * - Learning queue (manual user-controlled)
 * - Ebbinghaus review queue (auto-scheduled)
 * - Practice result recording
 * - Error book
 * - Statistics
 */

import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createRouter, authedQuery } from "./middleware";
import { getDb } from "./queries/connection";
import {
  words,
  wordLogs,
  wordSpellings,
  spellingErrors,
  spellingSessions,
  todayWordSelections,
  wordGroupLinks,
  wordGroups,
  textbooks,
  wordTags,
  tags,
} from "@db/schema";
import { eq, and, gte, lte, desc, count, inArray, sql } from "drizzle-orm";
import { getCatalogOwnerId } from "./catalog";
import { analyzeWordForStudy } from "../src/utils/phonics";
import {
  calculatePracticePoints,
  calculateErrorBookStreak,
  ERROR_BOOK_CLEAR_STREAK,
  type SpellingAttemptAction,
} from "./spelling-progress";
import { generateDailyReading } from "./reading-generator";

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
  addToLearning: authedQuery.input(z.object({ wordId: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();
    const catalogWord = await db
      .select({ id: words.id })
      .from(words)
      .where(and(eq(words.id, input.wordId), eq(words.userId, catalogOwnerId)))
      .limit(1);
    if (!catalogWord[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "单词不存在" });
    }

    // 2. Create or update wordSpellings record with source=manual
    const existing = await db
      .select()
      .from(wordSpellings)
      .where(and(eq(wordSpellings.wordId, input.wordId), eq(wordSpellings.userId, ctx.user.id)))
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
          learningStatus: "active",
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
        learningStatus: "active",
      });
    }

    return { success: true };
  }),

  // Add multiple catalog words to the learning queue in one request.
  addManyToLearning: authedQuery
    .input(
      z.object({
        wordIds: z.array(z.number().int().positive()).min(1).max(1000),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      const wordIds = [...new Set(input.wordIds)];

      const catalogWords = await db
        .select({ id: words.id })
        .from(words)
        .where(and(eq(words.userId, catalogOwnerId), inArray(words.id, wordIds)));
      if (catalogWords.length !== wordIds.length) {
        throw new TRPCError({ code: "NOT_FOUND", message: "部分单词不存在" });
      }

      const existing = await db
        .select({
          id: wordSpellings.id,
          wordId: wordSpellings.wordId,
          learningStatus: wordSpellings.learningStatus,
        })
        .from(wordSpellings)
        .where(and(eq(wordSpellings.userId, ctx.user.id), inArray(wordSpellings.wordId, wordIds)));

      const existingWordIds = new Set(existing.map((record) => record.wordId));
      const recordsToActivate = existing.filter((record) => record.learningStatus !== "active");
      const activatedWordIds = new Set(recordsToActivate.map((record) => record.wordId));
      const missingWordIds = wordIds.filter((wordId) => !existingWordIds.has(wordId));
      const now = new Date();

      await db.transaction(async (tx) => {
        if (recordsToActivate.length > 0) {
          await tx
            .update(wordSpellings)
            .set({
              source: "manual",
              level: 1,
              nextReviewAt: now,
              streak: 0,
              learningStatus: "active",
            })
            .where(
              inArray(
                wordSpellings.id,
                recordsToActivate.map((record) => record.id),
              ),
            );
        }

        if (missingWordIds.length > 0) {
          await tx.insert(wordSpellings).values(
            missingWordIds.map((wordId) => ({
              wordId,
              userId: ctx.user.id,
              level: 1,
              nextReviewAt: now,
              streak: 0,
              errorCount: 0,
              totalAttempts: 0,
              totalCorrect: 0,
              source: "manual" as const,
              learningStatus: "active" as const,
            })),
          );
        }
      });

      return {
        success: true,
        addedCount: activatedWordIds.size + missingWordIds.length,
        unchangedCount: wordIds.length - activatedWordIds.size - missingWordIds.length,
      };
    }),

  // Remove a word from the learning queue
  removeFromLearning: authedQuery.input(z.object({ wordId: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();

    // Change source back to auto
    await db
      .update(wordSpellings)
      .set({ source: "auto", learningStatus: "idle" })
      .where(and(eq(wordSpellings.wordId, input.wordId), eq(wordSpellings.userId, ctx.user.id)));

    return { success: true };
  }),

  // Pause a word (keep in queue but temporarily skip)
  pauseLearning: authedQuery.input(z.object({ wordId: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();

    // Push next review to tomorrow
    const tomorrow = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db
      .update(wordSpellings)
      .set({ nextReviewAt: tomorrow, learningStatus: "paused" })
      .where(and(eq(wordSpellings.wordId, input.wordId), eq(wordSpellings.userId, ctx.user.id)));

    return { success: true };
  }),

  // Get learning status for a word
  getStatus: authedQuery.input(z.object({ wordId: z.number() })).query(async ({ ctx, input }) => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();

    const wordRows = await db
      .select({ id: words.id })
      .from(words)
      .where(and(eq(words.id, input.wordId), eq(words.userId, catalogOwnerId)))
      .limit(1);

    const spellingRows = await db
      .select({
        source: wordSpellings.source,
        learningStatus: wordSpellings.learningStatus,
      })
      .from(wordSpellings)
      .where(and(eq(wordSpellings.wordId, input.wordId), eq(wordSpellings.userId, ctx.user.id)))
      .limit(1);

    return {
      learningStatus: wordRows[0] ? spellingRows[0]?.learningStatus || "idle" : "idle",
      isInQueue: Boolean(spellingRows[0] && spellingRows[0].learningStatus !== "idle"),
      source: spellingRows[0]?.source || null,
    };
  }),

  // Get words currently in learning (active status)
  getLearningQueue: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();
    const spellingRecords = await db
      .select()
      .from(wordSpellings)
      .where(and(eq(wordSpellings.userId, ctx.user.id), eq(wordSpellings.learningStatus, "active")));

    const wordIds = spellingRecords.map((record) => record.wordId);
    if (wordIds.length === 0) return [];

    const activeWords = await db
      .select()
      .from(words)
      .where(and(eq(words.userId, catalogOwnerId), inArray(words.id, wordIds)))
      .orderBy(desc(words.createdAt));

    const spMap = new Map(spellingRecords.map((r) => [r.wordId, r]));
    const tagRows = await db
      .select({
        wordId: wordTags.wordId,
        id: tags.id,
        name: tags.name,
        description: tags.description,
      })
      .from(wordTags)
      .innerJoin(tags, eq(wordTags.tagId, tags.id))
      .where(inArray(wordTags.wordId, wordIds));
    const tagsByWord = new Map<
      number,
      Array<{
        id: number;
        name: string;
        description: string | null;
      }>
    >();
    for (const tag of tagRows) {
      const current = tagsByWord.get(tag.wordId) ?? [];
      current.push({
        id: tag.id,
        name: tag.name,
        description: tag.description,
      });
      tagsByWord.set(tag.wordId, current);
    }

    const groupRows = await db
      .select({
        wordId: wordGroupLinks.wordId,
        groupId: wordGroups.id,
        groupName: wordGroups.name,
        textbookId: textbooks.id,
        textbookName: textbooks.name,
      })
      .from(wordGroupLinks)
      .innerJoin(wordGroups, eq(wordGroupLinks.groupId, wordGroups.id))
      .innerJoin(textbooks, eq(wordGroups.textbookId, textbooks.id))
      .where(inArray(wordGroupLinks.wordId, wordIds));
    const groupsByWord = new Map<
      number,
      Array<{
        groupId: number;
        groupName: string;
        textbookId: number;
        textbookName: string;
      }>
    >();
    for (const group of groupRows) {
      const current = groupsByWord.get(group.wordId) ?? [];
      current.push({
        groupId: group.groupId,
        groupName: group.groupName,
        textbookId: group.textbookId,
        textbookName: group.textbookName,
      });
      groupsByWord.set(group.wordId, current);
    }

    return activeWords.map((w) => {
      const sp = spMap.get(w.id);
      const memberships = groupsByWord.get(w.id) ?? [];
      return {
        id: w.id,
        word: w.word,
        phonetic: w.phonetic,
        definition: w.definition,
        example: w.example,
        notes: w.notes,
        groupId: w.groupId,
        level: (sp?.level ?? 1) as 1 | 2 | 3,
        nextReviewAt: sp?.nextReviewAt || new Date(),
        streak: sp?.streak ?? 0,
        errorCount: sp?.errorCount ?? 0,
        totalAttempts: sp?.totalAttempts ?? 0,
        totalCorrect: sp?.totalCorrect ?? 0,
        source: sp?.source || "auto",
        tags: tagsByWord.get(w.id) ?? [],
        groups: memberships,
        groupIds: memberships.map((group) => group.groupId),
        phonics: analyzeWordForStudy(w.word),
      };
    });
  }),

  // ========== Review Queue ==========

  // Get review queue - only words with learningStatus="active"
  getReviewQueue: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();
    const now = new Date();

    // Get due wordSpellings for active words only
    const dueRecords = await db
      .select()
      .from(wordSpellings)
      .where(
        and(
          eq(wordSpellings.userId, ctx.user.id),
          lte(wordSpellings.nextReviewAt, now),
          eq(wordSpellings.learningStatus, "active"),
        ),
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
      })
      .from(words)
      .where(and(eq(words.userId, catalogOwnerId), inArray(words.id, wordIds)));

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
        learningStatus: record.learningStatus,
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
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();
      const catalogWord = await db
        .select({ id: words.id })
        .from(words)
        .where(and(eq(words.id, input.wordId), eq(words.userId, catalogOwnerId)))
        .limit(1);
      if (!catalogWord[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "单词不存在" });
      }

      const records = await db
        .select()
        .from(wordSpellings)
        .where(and(eq(wordSpellings.wordId, input.wordId), eq(wordSpellings.userId, ctx.user.id)))
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
          learningStatus: "active",
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
          learningStatus: "active",
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
      const recentAttempts = await db
        .select({ action: wordLogs.action })
        .from(wordLogs)
        .where(
          and(
            eq(wordLogs.wordId, input.wordId),
            eq(wordLogs.userId, ctx.user.id),
            inArray(wordLogs.action, ["test_pass", "test_fail"]),
          ),
        )
        .orderBy(desc(wordLogs.id))
        .limit(ERROR_BOOK_CLEAR_STREAK - 1);
      const errorCorrectStreak = calculateErrorBookStreak(
        input.isCorrect,
        recentAttempts.map(
          ({ action }) => action as SpellingAttemptAction,
        ),
      );
      const removedFromErrorBook =
        record.errorCount > 0 &&
        input.isCorrect &&
        errorCorrectStreak >= ERROR_BOOK_CLEAR_STREAK;
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const rewardedCorrectAttempts = input.isCorrect
        ? await db
            .select({ count: count() })
            .from(wordLogs)
            .where(
              and(
                eq(wordLogs.wordId, input.wordId),
                eq(wordLogs.userId, ctx.user.id),
                eq(wordLogs.action, "test_pass"),
                gte(wordLogs.createdAt, todayStart),
              ),
            )
        : [{ count: 0 }];
      const pointResult = calculatePracticePoints({
        isCorrect: input.isCorrect,
        consecutiveCorrect: errorCorrectStreak,
        previousLevel: record.level,
        newLevel,
        removedFromErrorBook,
        rewardedCorrectAttemptsToday: Number(
          rewardedCorrectAttempts[0]?.count ?? 0,
        ),
      });

      await db.transaction(async (tx) => {
        await tx
          .update(wordSpellings)
          .set({
            level: newLevel,
            streak: newStreak,
            nextReviewAt: nextReview,
            lastReviewAt: new Date(),
            totalAttempts: record.totalAttempts + 1,
            totalCorrect: record.totalCorrect + (input.isCorrect ? 1 : 0),
            errorCount: removedFromErrorBook
              ? 0
              : record.errorCount + (input.isCorrect ? 0 : 1),
          })
          .where(eq(wordSpellings.id, record.id));

        await tx.insert(wordLogs).values({
          wordId: input.wordId,
          userId: ctx.user.id,
          action: input.isCorrect ? "test_pass" : "test_fail",
          notes: JSON.stringify({
            practiceMode: input.practiceMode,
            duration: input.duration ?? null,
            pointsEarned: pointResult.pointsEarned,
            pointReasons: pointResult.reasons,
          }),
        });

        if (!input.isCorrect) {
          await tx.insert(spellingErrors).values({
            wordId: input.wordId,
            userId: ctx.user.id,
            userInput: input.userInput ?? "",
            errorType: "wrong_letter",
            practiceMode: input.practiceMode,
          });
        } else if (removedFromErrorBook) {
          await tx
            .delete(spellingErrors)
            .where(
              and(
                eq(spellingErrors.wordId, input.wordId),
                eq(spellingErrors.userId, ctx.user.id),
              ),
            );
        }
      });

      return {
        isCorrect: input.isCorrect,
        newLevel,
        newStreak,
        nextReviewAt: nextReview,
        errorCorrectStreak,
        removedFromErrorBook,
        pointsEarned: pointResult.pointsEarned,
        rewardCapped: pointResult.rewardCapped,
        pointReasons: pointResult.reasons,
      };
    }),

  // ========== Error Book ==========

  getErrorBook: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();
    const errors = await db
      .select()
      .from(spellingErrors)
      .where(eq(spellingErrors.userId, ctx.user.id))
      .orderBy(desc(spellingErrors.createdAt))
      .limit(50);

    const wordIds = [...new Set(errors.map((e) => e.wordId))];
    if (wordIds.length === 0) return [];

    const wordList = await db
      .select({
        id: words.id,
        word: words.word,
        phonetic: words.phonetic,
        definition: words.definition,
      })
      .from(words)
      .where(and(eq(words.userId, catalogOwnerId), inArray(words.id, wordIds)));

    const wordMap = new Map(wordList.map((w) => [w.id, w]));
    const spellingLevels = await db
      .select({
        wordId: wordSpellings.wordId,
        level: wordSpellings.level,
      })
      .from(wordSpellings)
      .where(
        and(
          eq(wordSpellings.userId, ctx.user.id),
          inArray(wordSpellings.wordId, wordIds),
        ),
      );
    const levelMap = new Map(
      spellingLevels.map((spelling) => [
        spelling.wordId,
        spelling.level as 1 | 2 | 3,
      ]),
    );

    return errors.map((e) => ({
      ...e,
      word: wordMap.get(e.wordId)?.word || "",
      phonetic: wordMap.get(e.wordId)?.phonetic || null,
      definition: wordMap.get(e.wordId)?.definition || "",
      level: levelMap.get(e.wordId) ?? 1,
    }));
  }),

  // ========== Statistics ==========

  getStats: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();

    // Total words
    const totalWords = await db.select({ count: count() }).from(words).where(eq(words.userId, catalogOwnerId));

    // Active learning words
    const learningWords = await db
      .select({ count: count() })
      .from(wordSpellings)
      .where(and(eq(wordSpellings.userId, ctx.user.id), eq(wordSpellings.learningStatus, "active")));

    // Paused words
    const pausedWords = await db
      .select({ count: count() })
      .from(wordSpellings)
      .where(and(eq(wordSpellings.userId, ctx.user.id), eq(wordSpellings.learningStatus, "paused")));

    // Get active word IDs for due review and byLevel
    const now = new Date();
    const activeWordIdsResult = await db
      .select({ id: wordSpellings.wordId })
      .from(wordSpellings)
      .where(and(eq(wordSpellings.userId, ctx.user.id), eq(wordSpellings.learningStatus, "active")));
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
        .where(and(eq(wordSpellings.userId, ctx.user.id), inArray(wordSpellings.wordId, activeIds)))
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
            inArray(wordSpellings.wordId, activeIds),
          ),
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
            inArray(wordSpellings.wordId, activeIds),
          ),
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
      .where(and(eq(spellingSessions.userId, ctx.user.id), gte(spellingSessions.createdAt, todayStart)));
    const pointTotals = await db
      .select({
        totalPoints: sql<number>`COALESCE(SUM(
          CASE WHEN JSON_VALID(${wordLogs.notes})
            THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(${wordLogs.notes}, '$.pointsEarned')) AS UNSIGNED)
            ELSE 0
          END
        ), 0)`,
        todayPoints: sql<number>`COALESCE(SUM(
          CASE WHEN ${wordLogs.createdAt} >= ${todayStart} AND JSON_VALID(${wordLogs.notes})
            THEN CAST(JSON_UNQUOTE(JSON_EXTRACT(${wordLogs.notes}, '$.pointsEarned')) AS UNSIGNED)
            ELSE 0
          END
        ), 0)`,
      })
      .from(wordLogs)
      .where(
        and(
          eq(wordLogs.userId, ctx.user.id),
          inArray(wordLogs.action, ["test_pass", "review"]),
        ),
      );
    const totalPoints = Number(pointTotals[0]?.totalPoints ?? 0);
    const todayPoints = Number(pointTotals[0]?.todayPoints ?? 0);

    return {
      totalWords: totalWords[0]?.count ?? 0,
      learningWords: learningWords[0]?.count ?? 0,
      pausedWords: pausedWords[0]?.count ?? 0,
      byLevel: byLevel.map((b) => ({ level: b.level, count: b.count })),
      dueForReview: dueCount[0]?.count ?? 0,
      manualDue: manualDue[0]?.count ?? 0,
      totalErrors: totalErrors.length,
      todaySessions: todaySessions[0]?.count ?? 0,
      totalPoints,
      todayPoints,
    };
  }),

  /**
   * Clear every learning/practice record owned by the current account.
   * Shared catalog data and other accounts are never touched.
   */
  clearLearningRecords: authedQuery.mutation(async ({ ctx }) => {
    const db = getDb();
    const userId = ctx.user.id;

    await db.transaction(async (tx) => {
      await tx.delete(spellingErrors).where(eq(spellingErrors.userId, userId));
      await tx.delete(spellingSessions).where(eq(spellingSessions.userId, userId));
      await tx.delete(todayWordSelections).where(eq(todayWordSelections.userId, userId));
      await tx
        .delete(wordLogs)
        .where(and(eq(wordLogs.userId, userId), inArray(wordLogs.action, ["review", "test_pass", "test_fail"])));
      await tx.delete(wordSpellings).where(eq(wordSpellings.userId, userId));
    });

    return { success: true, message: "学习记录已清空" };
  }),

  // ========== Error Words ==========

  getErrorWords: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();

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
      .where(and(eq(words.userId, catalogOwnerId), inArray(words.id, wordIds)))
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

  /** Clear all error records for a word (mark as mastered) */
  clearErrors: authedQuery.input(z.object({ wordId: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const catalogOwnerId = await getCatalogOwnerId();

    // Verify the word belongs to the user
    const wordCheck = await db
      .select({ id: words.id })
      .from(words)
      .where(and(eq(words.id, input.wordId), eq(words.userId, catalogOwnerId)))
      .limit(1);

    if (wordCheck.length === 0) {
      return { success: false, message: "单词不存在" };
    }

    // Delete all error records for this word
    const result = await db
      .delete(spellingErrors)
      .where(and(eq(spellingErrors.wordId, input.wordId), eq(spellingErrors.userId, ctx.user.id)));

    // Also reset errorCount in wordSpellings
    await db
      .update(wordSpellings)
      .set({ errorCount: 0 })
      .where(and(eq(wordSpellings.wordId, input.wordId), eq(wordSpellings.userId, ctx.user.id)));

    return { success: true, deletedCount: result.length };
  }),

  // ========== Practice Words ==========

  getPracticeWords: authedQuery
    .input(
      z
        .object({
          limit: z.number().min(1).max(50).default(10),
          groupId: z.number().optional(),
          source: z.enum(["manual", "auto", "all"]).default("all"),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const db = getDb();
      const catalogOwnerId = await getCatalogOwnerId();

      // Build conditions
      const conditions: any[] = [eq(words.userId, catalogOwnerId)];

      if (input?.groupId) {
        const linkedRows = await db
          .select({ wordId: wordGroupLinks.wordId })
          .from(wordGroupLinks)
          .where(eq(wordGroupLinks.groupId, input.groupId));
        const linkedWordIds = linkedRows.map((row) => row.wordId);
        if (linkedWordIds.length === 0) return [];
        conditions.push(inArray(words.id, linkedWordIds));
      }

      // If source is manual, only get active learning words
      if (input?.source === "manual") {
        const manualRows = await db
          .select({ wordId: wordSpellings.wordId })
          .from(wordSpellings)
          .where(
            and(
              eq(wordSpellings.userId, ctx.user.id),
              eq(wordSpellings.source, "manual"),
              eq(wordSpellings.learningStatus, "active"),
            ),
          );
        const manualWordIds = manualRows.map((row) => row.wordId);
        if (manualWordIds.length === 0) return [];
        conditions.push(inArray(words.id, manualWordIds));
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
        .orderBy(desc(words.createdAt))
        .limit(input?.limit ?? 10);

      // Get spelling status
      const wordIds = wordList.map((w) => w.id);
      let spellingMap = new Map<number, typeof wordSpellings.$inferSelect>();

      if (wordIds.length > 0) {
        const spellingRecords = await db
          .select()
          .from(wordSpellings)
          .where(and(eq(wordSpellings.userId, ctx.user.id), inArray(wordSpellings.wordId, wordIds)));
        spellingMap = new Map(spellingRecords.map((r) => [r.wordId, r]));
      }

      return wordList.map((w) => {
        const sp = spellingMap.get(w.id);
        return {
          ...w,
          groupId: input?.groupId ?? w.groupId,
          learningStatus: sp?.learningStatus ?? "idle",
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
      }),
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

  // ========== Today Word Selections (cross-device sync) ==========

  /** Get today's selected word IDs */
  getTodaySelections: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const rows = await db
      .select({ wordId: todayWordSelections.wordId })
      .from(todayWordSelections)
      .where(and(eq(todayWordSelections.userId, ctx.user.id), eq(todayWordSelections.date, today)));
    return rows.map((r) => r.wordId);
  }),

  /** Generate three daily reading stories from today's selected words. */
  getDailyReading: authedQuery.query(async ({ ctx }) => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];
    const selected = await db
      .select({ id: words.id, word: words.word, definition: words.definition })
      .from(todayWordSelections)
      .innerJoin(words, eq(todayWordSelections.wordId, words.id))
      .where(
        and(
          eq(todayWordSelections.userId, ctx.user.id),
          eq(todayWordSelections.date, today),
        ),
      )
      .orderBy(todayWordSelections.id);
    const reading = generateDailyReading(today, selected);
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const logs = await db
      .select({ id: wordLogs.id, notes: wordLogs.notes })
      .from(wordLogs)
      .where(
        and(
          eq(wordLogs.userId, ctx.user.id),
          eq(wordLogs.action, "review"),
          gte(wordLogs.createdAt, todayStart),
        ),
      )
      .orderBy(desc(wordLogs.id));
    const answered = new Map<
      string,
      {
        storyIndex: number;
        questionIndex: number;
        selectedIndex: number;
        correctIndex: number;
        isCorrect: boolean;
      }
    >();
    let savedProgress:
      | { storyIndex: number; stage: "story" | "questions"; paragraphIndex: number }
      | undefined;
    for (const log of logs) {
      if (!log.notes) continue;
      try {
        const parsed = JSON.parse(log.notes);
        if (parsed?.date !== today) continue;
        if (
          parsed.type === "daily_reading" &&
          Number.isInteger(parsed.storyIndex) &&
          Number.isInteger(parsed.questionIndex)
        ) {
          const key = `${parsed.storyIndex}-${parsed.questionIndex}`;
          if (!answered.has(key)) answered.set(key, parsed);
        } else if (
          !savedProgress &&
          parsed.type === "daily_reading_progress" &&
          Number.isInteger(parsed.storyIndex)
        ) {
          savedProgress = {
            storyIndex: parsed.storyIndex,
            stage: parsed.stage === "questions" ? "questions" : "story",
            paragraphIndex: Number.isInteger(parsed.paragraphIndex)
              ? Math.max(0, parsed.paragraphIndex)
              : 0,
          };
        }
      } catch {
        // Ignore unrelated legacy review notes.
      }
    }
    const completedStories = reading.stories
      .map((_, storyIndex) => storyIndex)
      .filter((storyIndex) =>
        [0, 1, 2, 3, 4].every((questionIndex) =>
          answered.has(`${storyIndex}-${questionIndex}`),
        ),
      );
    const currentStoryIndex =
      [0, 1, 2].find((storyIndex) => !completedStories.includes(storyIndex)) ??
      3;
    const currentAnsweredCount =
      currentStoryIndex < 3
        ? [...answered.values()].filter(
            (attempt) => attempt.storyIndex === currentStoryIndex,
          ).length
        : 0;
    const matchingSavedProgress =
      savedProgress?.storyIndex === currentStoryIndex
        ? savedProgress
        : undefined;
    const stage =
      currentStoryIndex >= 3
        ? ("complete" as const)
        : currentAnsweredCount > 0
          ? ("questions" as const)
          : matchingSavedProgress?.stage ?? ("story" as const);

    return {
      ...reading,
      progress: {
        currentStoryIndex,
        stage,
        paragraphIndex: matchingSavedProgress?.paragraphIndex ?? 0,
        completedStories,
        answered: [...answered.values()],
      },
    };
  }),

  /** Persist the latest reading checkpoint without creating duplicate rows. */
  saveReadingProgress: authedQuery
    .input(
      z.object({
        storyIndex: z.number().int().min(0).max(2),
        stage: z.enum(["story", "questions"]),
        paragraphIndex: z.number().int().min(0).max(20).default(0),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const today = new Date().toISOString().split("T")[0];
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const selected = await db
        .select({ id: words.id })
        .from(todayWordSelections)
        .innerJoin(words, eq(todayWordSelections.wordId, words.id))
        .where(
          and(
            eq(todayWordSelections.userId, ctx.user.id),
            eq(todayWordSelections.date, today),
          ),
        )
        .orderBy(todayWordSelections.id)
        .limit(1);
      if (!selected[0]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "请先选择今日练习单词",
        });
      }
      const logs = await db
        .select({ id: wordLogs.id, notes: wordLogs.notes })
        .from(wordLogs)
        .where(
          and(
            eq(wordLogs.userId, ctx.user.id),
            eq(wordLogs.action, "review"),
            gte(wordLogs.createdAt, todayStart),
          ),
        )
        .orderBy(desc(wordLogs.id));
      const existing = logs.find((log) => {
        if (!log.notes) return false;
        try {
          const parsed = JSON.parse(log.notes);
          return parsed?.type === "daily_reading_progress" && parsed.date === today;
        } catch {
          return false;
        }
      });
      if (existing?.notes) {
        try {
          const saved = JSON.parse(existing.notes) as {
            storyIndex?: number;
            stage?: "story" | "questions";
            paragraphIndex?: number;
          };
          const savedStory = saved.storyIndex ?? 0;
          const savedStage = saved.stage === "questions" ? 1 : 0;
          const incomingStage = input.stage === "questions" ? 1 : 0;
          const isBehind =
            input.storyIndex < savedStory ||
            (input.storyIndex === savedStory && incomingStage < savedStage) ||
            (input.storyIndex === savedStory &&
              incomingStage === savedStage &&
              input.paragraphIndex < (saved.paragraphIndex ?? 0));
          if (isBehind) return { success: true, ignoredAsStale: true };
        } catch {
          // A malformed legacy checkpoint can safely be replaced.
        }
      }
      const notes = JSON.stringify({
        type: "daily_reading_progress",
        date: today,
        ...input,
      });
      if (existing) {
        await db
          .update(wordLogs)
          .set({ wordId: selected[0].id, notes })
          .where(eq(wordLogs.id, existing.id));
      } else {
        await db.insert(wordLogs).values({
          wordId: selected[0].id,
          userId: ctx.user.id,
          action: "review",
          notes,
        });
      }
      return { success: true, ignoredAsStale: false };
    }),

  /** Score one daily-reading answer and award points only on its first submission. */
  submitReadingAnswer: authedQuery
    .input(
      z.object({
        storyIndex: z.number().int().min(0).max(2),
        questionIndex: z.number().int().min(0).max(4),
        selectedIndex: z.number().int().min(0).max(2),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const db = getDb();
      const today = new Date().toISOString().split("T")[0];
      const selected = await db
        .select({
          id: words.id,
          word: words.word,
          definition: words.definition,
        })
        .from(todayWordSelections)
        .innerJoin(words, eq(todayWordSelections.wordId, words.id))
        .where(
          and(
            eq(todayWordSelections.userId, ctx.user.id),
            eq(todayWordSelections.date, today),
          ),
        )
        .orderBy(todayWordSelections.id);
      const reading = generateDailyReading(today, selected);
      const question =
        reading.stories[input.storyIndex]?.questions[input.questionIndex];
      if (!question || !selected[0]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "今日阅读题目不存在，请刷新后重试",
        });
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      const readingLogs = await db
        .select({ notes: wordLogs.notes })
        .from(wordLogs)
        .where(
          and(
            eq(wordLogs.userId, ctx.user.id),
            eq(wordLogs.action, "review"),
            gte(wordLogs.createdAt, todayStart),
          ),
        );
      const attempts = new Map<
        string,
        { storyIndex: number; questionIndex: number; isCorrect: boolean }
      >();
      for (const log of readingLogs) {
        if (!log.notes) continue;
        try {
          const parsed = JSON.parse(log.notes);
          if (
            parsed?.type === "daily_reading" &&
            parsed.date === today &&
            Number.isInteger(parsed.storyIndex) &&
            Number.isInteger(parsed.questionIndex)
          ) {
            attempts.set(`${parsed.storyIndex}-${parsed.questionIndex}`, parsed);
          }
        } catch {
          // Ignore unrelated legacy review notes.
        }
      }

      const attemptKey = `${input.storyIndex}-${input.questionIndex}`;
      if (attempts.has(attemptKey)) {
        const storyAttemptCount = [...attempts.values()].filter(
          (attempt) => attempt.storyIndex === input.storyIndex,
        ).length;
        return {
          isCorrect: input.selectedIndex === question.correctIndex,
          pointsEarned: 0,
          storyBonus: 0,
          alreadyRewarded: true,
          dailyCapped: false,
          storyCompleted: storyAttemptCount >= 5,
          allCompleted:
            [0, 1, 2].every(
              (storyIndex) =>
                [...attempts.values()].filter(
                  (attempt) => attempt.storyIndex === storyIndex,
                ).length >= 5,
            ),
        };
      }

      const isCorrect = input.selectedIndex === question.correctIndex;
      let pointsEarned = isCorrect ? 2 : 0;
      let storyBonus = 0;
      const previousStoryAttempts = [...attempts.values()].filter(
        (attempt) => attempt.storyIndex === input.storyIndex,
      );
      if (
        isCorrect &&
        previousStoryAttempts.length === 4 &&
        previousStoryAttempts.every((attempt) => attempt.isCorrect)
      ) {
        storyBonus = 5;
        pointsEarned += storyBonus;
      }

      await db.insert(wordLogs).values({
        wordId: selected[0].id,
        userId: ctx.user.id,
        action: "review",
        notes: JSON.stringify({
          type: "daily_reading",
          date: today,
          storyIndex: input.storyIndex,
          questionIndex: input.questionIndex,
          selectedIndex: input.selectedIndex,
          correctIndex: question.correctIndex,
          isCorrect,
          pointsEarned,
          storyBonus,
        }),
      });

      const storyCompleted = previousStoryAttempts.length + 1 >= 5;
      const completedBefore = [0, 1, 2].filter(
        (storyIndex) =>
          [...attempts.values()].filter(
            (attempt) => attempt.storyIndex === storyIndex,
          ).length >= 5,
      );
      const allCompleted =
        storyCompleted &&
        new Set([...completedBefore, input.storyIndex]).size >= 3;

      return {
        isCorrect,
        pointsEarned,
        storyBonus,
        alreadyRewarded: false,
        dailyCapped: false,
        storyCompleted,
        allCompleted,
      };
    }),

  /** Replace today's selections */
  setTodaySelections: authedQuery.input(z.object({ wordIds: z.array(z.number()) })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    // Delete existing selections for today
    await db
      .delete(todayWordSelections)
      .where(and(eq(todayWordSelections.userId, ctx.user.id), eq(todayWordSelections.date, today)));

    // Insert new selections
    if (input.wordIds.length > 0) {
      await db.insert(todayWordSelections).values(
        input.wordIds.map((wordId) => ({
          userId: ctx.user.id,
          wordId,
          date: today,
        })),
      );
    }

    return { success: true };
  }),

  /** Toggle a single word in today's selections */
  toggleTodaySelection: authedQuery.input(z.object({ wordId: z.number() })).mutation(async ({ ctx, input }) => {
    const db = getDb();
    const today = new Date().toISOString().split("T")[0];

    const existing = await db
      .select({ id: todayWordSelections.id })
      .from(todayWordSelections)
      .where(
        and(
          eq(todayWordSelections.userId, ctx.user.id),
          eq(todayWordSelections.wordId, input.wordId),
          eq(todayWordSelections.date, today),
        ),
      )
      .limit(1);

    if (existing.length > 0) {
      // Remove
      await db
        .delete(todayWordSelections)
        .where(
          and(
            eq(todayWordSelections.userId, ctx.user.id),
            eq(todayWordSelections.wordId, input.wordId),
            eq(todayWordSelections.date, today),
          ),
        );
      return { selected: false };
    } else {
      // Add
      await db.insert(todayWordSelections).values({
        userId: ctx.user.id,
        wordId: input.wordId,
        date: today,
      });
      return { selected: true };
    }
  }),
});
