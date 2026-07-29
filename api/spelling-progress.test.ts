import { describe, expect, it } from "vitest";
import {
  calculatePracticePoints,
  calculateErrorBookStreak,
  DAILY_REWARDED_CORRECT_ATTEMPTS_PER_WORD,
  ERROR_BOOK_CLEAR_STREAK,
} from "./spelling-progress";

describe("error-book recovery streak", () => {
  it("starts at one after a correct answer", () => {
    expect(calculateErrorBookStreak(true, [])).toBe(1);
  });

  it("reaches the removal threshold after three consecutive correct answers", () => {
    expect(
      calculateErrorBookStreak(true, ["test_pass", "test_pass"]),
    ).toBe(ERROR_BOOK_CLEAR_STREAK);
  });

  it("stops counting at the most recent wrong answer", () => {
    expect(
      calculateErrorBookStreak(true, ["test_pass", "test_fail"]),
    ).toBe(2);
  });

  it("resets to zero whenever the current answer is wrong", () => {
    expect(
      calculateErrorBookStreak(false, ["test_pass", "test_pass"]),
    ).toBe(0);
  });
});

describe("practice points", () => {
  it("awards a moderate base reward for the first correct answer", () => {
    expect(
      calculatePracticePoints({
        isCorrect: true,
        consecutiveCorrect: 1,
        previousLevel: 1,
        newLevel: 1,
        removedFromErrorBook: false,
        rewardedCorrectAttemptsToday: 0,
      }),
    ).toMatchObject({ pointsEarned: 5, rewardCapped: false });
  });

  it("adds streak, level-up and error-book bonuses", () => {
    expect(
      calculatePracticePoints({
        isCorrect: true,
        consecutiveCorrect: 3,
        previousLevel: 1,
        newLevel: 2,
        removedFromErrorBook: true,
        rewardedCorrectAttemptsToday: 2,
      }),
    ).toMatchObject({ pointsEarned: 20, rewardCapped: false });
  });

  it("does not award points for a wrong answer", () => {
    expect(
      calculatePracticePoints({
        isCorrect: false,
        consecutiveCorrect: 0,
        previousLevel: 2,
        newLevel: 1,
        removedFromErrorBook: false,
        rewardedCorrectAttemptsToday: 0,
      }),
    ).toEqual({ pointsEarned: 0, rewardCapped: false, reasons: [] });
  });

  it("caps repeated correct answers for the same word each day", () => {
    expect(
      calculatePracticePoints({
        isCorrect: true,
        consecutiveCorrect: 3,
        previousLevel: 3,
        newLevel: 3,
        removedFromErrorBook: false,
        rewardedCorrectAttemptsToday:
          DAILY_REWARDED_CORRECT_ATTEMPTS_PER_WORD,
      }),
    ).toEqual({ pointsEarned: 0, rewardCapped: true, reasons: [] });
  });
});
