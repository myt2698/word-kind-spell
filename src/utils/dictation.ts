export function pickShortestDictationExample(
  example: string | null | undefined,
  word: string,
): string | null {
  const target = word.trim();
  if (!target) return null;

  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exactWordPattern = new RegExp(`\\b${escaped}\\b`, "i");
  const candidates =
    example
      ?.split(/\r?\n+/)
      .map((line) => line.trim())
      .filter((line) => line && exactWordPattern.test(line)) ?? [];

  return candidates.reduce<string | null>(
    (shortest, candidate) =>
      shortest === null || candidate.length < shortest.length
        ? candidate
        : shortest,
    null,
  );
}

export function getDictationExampleWaitTime(example: string): number {
  const wordCount = example.trim().split(/\s+/).filter(Boolean).length;
  return Math.min(8_000, Math.max(3_000, wordCount * 550 + 1_200));
}
