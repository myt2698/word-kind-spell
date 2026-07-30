import { describe, expect, it } from "vitest";
import {
  deselectFilteredWordIds,
  selectFilteredWordIds,
} from "../src/utils/word-selection";

describe("filtered word selection", () => {
  it("keeps only the current filtered results when selecting all", () => {
    expect(selectFilteredWordIds([3, 5, 3])).toEqual([3, 5]);
  });

  it("removes only filtered words when cancelling the current selection", () => {
    expect(deselectFilteredWordIds([1, 3, 5, 8], [3, 5])).toEqual([1, 8]);
  });
});
