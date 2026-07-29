export type SpellingAttemptAction = "test_pass" | "test_fail";

export const ERROR_BOOK_CLEAR_STREAK = 3;
export const DAILY_REWARDED_CORRECT_ATTEMPTS_PER_WORD = 3;

export type PracticePointResult = {
  pointsEarned: number;
  rewardCapped: boolean;
  reasons: string[];
};

/**
 * Balanced reward rule:
 * - 5 points for a correct answer.
 * - +3/+5 for the second/third consecutive correct answer.
 * - +5 when the word advances a learning level.
 * - +5 when three consecutive correct answers clear it from the error book.
 * - Only the first three correct answers for the same word each day earn points.
 */
export function calculatePracticePoints(input: {
  isCorrect: boolean;
  consecutiveCorrect: number;
  previousLevel: number;
  newLevel: number;
  removedFromErrorBook: boolean;
  rewardedCorrectAttemptsToday: number;
}): PracticePointResult {
  if (!input.isCorrect) {
    return { pointsEarned: 0, rewardCapped: false, reasons: [] };
  }
  if (
    input.rewardedCorrectAttemptsToday >=
    DAILY_REWARDED_CORRECT_ATTEMPTS_PER_WORD
  ) {
    return { pointsEarned: 0, rewardCapped: true, reasons: [] };
  }

  let pointsEarned = 5;
  const reasons = ["答对 +5"];

  if (input.consecutiveCorrect >= 3) {
    pointsEarned += 5;
    reasons.push("连续答对3次 +5");
  } else if (input.consecutiveCorrect === 2) {
    pointsEarned += 3;
    reasons.push("连续答对2次 +3");
  }

  if (input.newLevel > input.previousLevel) {
    pointsEarned += 5;
    reasons.push("熟练度升级 +5");
  }
  if (input.removedFromErrorBook) {
    pointsEarned += 5;
    reasons.push("攻克错题 +5");
  }

  return { pointsEarned, rewardCapped: false, reasons };
}

/**
 * Calculate the error-book recovery streak after the current answer.
 * `recentActions` must be newest-first and only contain spelling attempts.
 */
export function calculateErrorBookStreak(
  isCorrect: boolean,
  recentActions: SpellingAttemptAction[],
): number {
  if (!isCorrect) return 0;

  let streak = 1;
  for (const action of recentActions) {
    if (action !== "test_pass") break;
    streak++;
    if (streak >= ERROR_BOOK_CLEAR_STREAK) break;
  }
  return streak;
}
