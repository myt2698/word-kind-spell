import { describe, expect, it } from "vitest";

// The production sync script is ESM JavaScript so it can run directly with Node.
// @ts-expect-error The helper intentionally has no separate TypeScript declarations.
import * as textbookSyncUtils from "../scripts/lib/textbook-sync-utils.mjs";

const { consolidateEntries, mergeExamples, mergeNotes } = textbookSyncUtils;

const monday = {
  word: "Monday",
  phonetic: "/ˈmʌndeɪ/",
  definition: "星期一",
  split: "Mon-day",
  tags: ["o /ʌ/ 特例"],
  sourcePages: [16, 28],
  example: "We have to finish by Monday.\nIt is Monday night.",
  unit: "Unit 2",
};

describe("textbook sync utilities", () => {
  it("consolidates one word across units without losing source metadata", () => {
    const [entry] = consolidateEntries([
      monday,
      {
        ...monday,
        unit: "Unit 3",
        tags: ["o /ʌ/ 特例", "ay"],
        sourcePages: [28, 29],
        example: "It is Monday night.\nSchool starts on Mondays.",
      },
    ]);

    expect(entry.units).toEqual(["Unit 2", "Unit 3"]);
    expect(entry.tags).toEqual(["o /ʌ/ 特例", "ay"]);
    expect(entry.sourcePages).toEqual([16, 28, 29]);
    expect(entry.example.split("\n")).toEqual([
      "We have to finish by Monday.",
      "It is Monday night.",
      "School starts on Mondays.",
    ]);
  });

  it("preserves every unique shared example and note", () => {
    expect(mergeExamples("one\ntwo\nthree", "two\nfour")).toBe(
      "one\ntwo\nthree\nfour",
    );
    expect(mergeNotes("旧教材备注", "新教材备注")).toBe(
      "旧教材备注\n新教材备注",
    );
    expect(mergeNotes("相同备注", "相同备注")).toBe("相同备注");
  });

  it("rejects conflicting canonical metadata for duplicate words", () => {
    expect(() =>
      consolidateEntries([
        monday,
        { ...monday, unit: "Unit 3", definition: "星期一；周一" },
      ]),
    ).toThrow("同一单词的 definition 不一致");
  });
});
