import { describe, expect, it } from "vitest";
import { buildBlockPuzzleErrorReason } from "../src/utils/block-puzzle-feedback";

describe("buildBlockPuzzleErrorReason", () => {
  it("explains which block positions are wrong", () => {
    expect(
      buildBlockPuzzleErrorReason(["sh", "i", "p"], ["p", "i", "sh"]),
    ).toEqual({
      summary: "积木顺序不正确",
      detail: "第 1 格应为 “sh”，第 3 格应为 “p”。你拼成了 pish，正确答案是 ship。",
    });
  });

  it("reports incomplete answers", () => {
    expect(buildBlockPuzzleErrorReason(["c", "ake"], ["c", ""])).toEqual({
      summary: "还有积木没有放好",
      detail: "请把每一格都填满，再检查积木的位置。",
    });
  });
});
