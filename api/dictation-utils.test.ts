import { describe, expect, it } from "vitest";
import {
  getDictationExampleWaitTime,
  pickShortestDictationExample,
} from "../src/utils/dictation";

describe("pickShortestDictationExample", () => {
  it("selects the shortest example that contains the target word", () => {
    expect(
      pickShortestDictationExample(
        "I take an apple to school every day.\nThe apple is red.\nWe eat fruit.",
        "apple",
      ),
    ).toBe("The apple is red.");
  });

  it("matches the whole word and returns null when no example qualifies", () => {
    expect(pickShortestDictationExample("A pineapple is sweet.", "apple")).toBeNull();
    expect(pickShortestDictationExample("", "apple")).toBeNull();
  });
});

describe("getDictationExampleWaitTime", () => {
  it("keeps the estimated playback window within a practical range", () => {
    expect(getDictationExampleWaitTime("Apple is red.")).toBe(3_000);
    expect(getDictationExampleWaitTime(Array(30).fill("word").join(" "))).toBe(8_000);
  });
});
