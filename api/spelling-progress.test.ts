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
    ).toMatchObject({ pointsEarned: 2, rewardCapped: false });
  });

  it("awards three points for the second consecutive correct answer", () => {
    expect(
      calculatePracticePoints({
        isCorrect: true,
        consecutiveCorrect: 2,
        previousLevel: 1,
        newLevel: 1,
        removedFromErrorBook: false,
        rewardedCorrectAttemptsToday: 1,
      }),
    ).toMatchObject({ pointsEarned: 3, rewardCapped: false });
  });

  it("awards four points for the third consecutive correct answer", () => {
    expect(
      calculatePracticePoints({
        isCorrect: true,
        consecutiveCorrect: 3,
        previousLevel: 1,
        newLevel: 1,
        removedFromErrorBook: false,
        rewardedCorrectAttemptsToday: 2,
      }),
    ).toMatchObject({ pointsEarned: 4, rewardCapped: false });
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
    ).toMatchObject({
      pointsEarned: 8,
      rewardCapped: false,
      reasons: [
        "答对 +2",
        "连续答对3次 +2",
        "熟练度升级 +2",
        "攻克错题 +2",
      ],
    });
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
