export type BlockPuzzleErrorReason = {
  summary: string;
  detail: string;
};

function displayBlock(block: string): string {
  return block.trim() ? `“${block}”` : "空格";
}

export function buildBlockPuzzleErrorReason(
  expectedBlocks: string[],
  actualBlocks: string[],
): BlockPuzzleErrorReason {
  const mismatchedPositions = expectedBlocks
    .map((expected, index) =>
      expected.toLowerCase() === (actualBlocks[index] ?? "").toLowerCase()
        ? -1
        : index,
    )
    .filter((index) => index >= 0);

  if (actualBlocks.length < expectedBlocks.length || actualBlocks.some((block) => !block)) {
    return {
      summary: "还有积木没有放好",
      detail: "请把每一格都填满，再检查积木的位置。",
    };
  }

  if (actualBlocks.length > expectedBlocks.length) {
    return {
      summary: "使用了多余的积木",
      detail: `正确答案需要 ${expectedBlocks.length} 块积木。`,
    };
  }

  if (mismatchedPositions.length === 0) {
    return {
      summary: "大小写或符号不匹配",
      detail: `正确拼写是 ${expectedBlocks.join("")}。`,
    };
  }

  const positionDescription = mismatchedPositions
    .slice(0, 3)
    .map((index) => `第 ${index + 1} 格应为 ${displayBlock(expectedBlocks[index])}`)
    .join("，");
  const remainder =
    mismatchedPositions.length > 3
      ? `，另有 ${mismatchedPositions.length - 3} 格位置不对`
      : "";

  return {
    summary: "积木顺序不正确",
    detail: `${positionDescription}${remainder}。你拼成了 ${actualBlocks.join("")}，正确答案是 ${expectedBlocks.join("")}。`,
  };
}
