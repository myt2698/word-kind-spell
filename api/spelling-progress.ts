export type SpellingAttemptAction = "test_pass" | "test_fail";

export const ERROR_BOOK_CLEAR_STREAK = 3;

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
