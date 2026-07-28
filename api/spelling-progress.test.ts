import { describe, expect, it } from "vitest";
import {
  calculateErrorBookStreak,
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
