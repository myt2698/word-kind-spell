import { describe, expect, it } from "vitest";
import { generateDailyReading } from "./reading-generator";

describe("generateDailyReading", () => {
  it("creates three different stories with all selected words and five questions", () => {
    const reading = generateDailyReading("2026-07-31", [
      { word: "apple", definition: "苹果" },
      { word: "beautiful", definition: "美丽的" },
      { word: "elephant", definition: "大象" },
    ]);

    expect(reading.stories).toHaveLength(3);
    expect(new Set(reading.stories.map((story) => story.theme)).size).toBe(3);
    for (const story of reading.stories) {
      expect(story.questions).toHaveLength(5);
      expect(new Set(story.questions.map((question) => question.correctIndex)).size).toBe(3);
      expect(story.content).toContain("ap-ple");
      expect(story.content).toContain("beau-ti-ful");
      expect(story.content).toContain("e-le-phant");
    }
  });

  it("returns no stories when there are no valid English words", () => {
    expect(generateDailyReading("2026-07-31", []).stories).toEqual([]);
  });
});
