/**
 * Phonics Engine - Syllable Splitting & Phonics Rule Detection
 * Based on PRD Section 4.2
 */

const VOWELS = new Set(["a", "e", "i", "o", "u", "y"]);

/** Check if char is a vowel */
export function isVowel(char: string): boolean {
  return VOWELS.has(char.toLowerCase());
}

/** Check if char is a consonant */
export function isConsonant(char: string): boolean {
  return /^[a-z]$/i.test(char) && !isVowel(char);
}

// Vowel combinations (digraphs/diphthongs)
export const VOWEL_COMBOS = new Set([
  "ai", "ay", "ea", "ee", "ie", "oa", "ow", "oi", "oy", "oo", "ou", "ue", "ui",
  "au", "aw", "ew", "igh",
]);

// Consonant blends/clusters (should not be split)
export const CONSONANT_BLENDS = new Set([
  "bl", "br", "cl", "cr", "dr", "fl", "fr", "gl", "gr", "pl", "pr", "sk", "sl", "sm", "sn", "sp", "st", "sw", "tr", "tw",
  "scr", "shr", "spl", "spr", "squ", "str", "thr",
  "ch", "sh", "th", "wh", "ph", "ck", "ng", "nk", "gh", "kn", "wr", "mb", "mn",
]);

// Magic e patterns
export const MAGIC_E_PATTERNS: Array<{ pattern: RegExp; name: string }> = [
  { pattern: /a_e/, name: "魔法e (a_e)" },
  { pattern: /i_e/, name: "魔法e (i_e)" },
  { pattern: /o_e/, name: "魔法e (o_e)" },
  { pattern: /u_e/, name: "魔法e (u_e)" },
];

// R-controlled patterns
export const R_CONTROLLED = new Set(["ar", "er", "ir", "or", "ur"]);

export interface SyllableResult {
  syllables: string[];
  phonicsTags: PhonicsTag[];
}

export interface PhonicsTag {
  type: "vowel_combo" | "consonant_blend" | "magic_e" | "r_controlled" | "syllable";
  text: string;
  position: [number, number]; // start, end (exclusive)
  description: string;
}

/**
 * Split word into syllables using phonics rules
 * Rule 1: Two分手 (VC-CV) - split between two consonants
 * Rule 2: One归后 (V-CV) - consonant goes to next syllable
 * Rule 3: Blends don't split
 */
export function splitSyllables(word: string): string[] {
  const lower = word.toLowerCase();
  if (lower.length <= 3) return [lower];

  // Find all vowel positions
  const vowelPositions: number[] = [];
  for (let i = 0; i < lower.length; i++) {
    if (isVowel(lower[i])) {
      vowelPositions.push(i);
    }
  }

  // No vowels or single vowel cluster
  if (vowelPositions.length <= 1) return [lower];

  const syllables: string[] = [];
  let start = 0;

  for (let i = 0; i < vowelPositions.length - 1; i++) {
    const v1Pos = vowelPositions[i];
    const v2Pos = vowelPositions[i + 1];
    const consonantsBetween = v2Pos - v1Pos - 1;

    let splitPoint: number;

    if (consonantsBetween === 0) {
      // Adjacent vowels - don't split (diphthong)
      continue;
    } else if (consonantsBetween === 1) {
      // Rule 2: One归后 - consonant goes to next syllable
      splitPoint = v1Pos + 1;
    } else if (consonantsBetween === 2) {
      // Check if it's a blend
      const c1 = lower[v1Pos + 1];
      const c2 = lower[v2Pos - 1];
      const pair = c1 + c2;

      if (CONSONANT_BLENDS.has(pair)) {
        // Don't split blends - move to next syllable
        splitPoint = v1Pos + 1;
      } else {
        // Rule 1: Two分手 - split in the middle
        splitPoint = v1Pos + 2;
      }
    } else {
      // Rule 1: Two分手 - split in the middle
      splitPoint = v1Pos + 1 + Math.floor(consonantsBetween / 2);
    }

    syllables.push(lower.substring(start, splitPoint));
    start = splitPoint;
  }

  // Add the final syllable
  syllables.push(lower.substring(start));

  return syllables.filter((s) => s.length > 0);
}

/**
 * Detect all phonics patterns in a word
 */
export function detectPhonicsTags(word: string): PhonicsTag[] {
  const lower = word.toLowerCase();
  const tags: PhonicsTag[] = [];

  // 1. Detect vowel combinations
  for (let i = 0; i < lower.length - 1; i++) {
    const bigram = lower.substring(i, i + 2);
    if (VOWEL_COMBOS.has(bigram)) {
      tags.push({
        type: "vowel_combo",
        text: bigram,
        position: [i, i + 2],
        description: `元音组合 "${bigram}"`,
      });
    }
  }

  // 2. Detect consonant blends
  for (let i = 0; i < lower.length - 1; i++) {
    // Check 3-letter blends first
    if (i < lower.length - 2) {
      const trigram = lower.substring(i, i + 3);
      if (CONSONANT_BLENDS.has(trigram)) {
        tags.push({
          type: "consonant_blend",
          text: trigram,
          position: [i, i + 3],
          description: `辅音连缀 "${trigram}"`,
        });
        i += 2; // Skip ahead
        continue;
      }
    }
    const bigram = lower.substring(i, i + 2);
    if (CONSONANT_BLENDS.has(bigram)) {
      // Avoid overlapping with already tagged positions
      const overlapping = tags.some(
        (t) => t.type === "consonant_blend" &&
          ((t.position[0] <= i && t.position[1] > i) ||
           (t.position[0] < i + 2 && t.position[1] >= i + 2))
      );
      if (!overlapping) {
        tags.push({
          type: "consonant_blend",
          text: bigram,
          position: [i, i + 2],
          description: `辅音组合 "${bigram}"`,
        });
      }
    }
  }

  // 3. Detect magic e patterns (a_e, i_e, o_e, u_e)
  for (let i = 0; i < lower.length - 2; i++) {
    const v1 = lower[i];
    const mid = lower[i + 1];
    const e = lower[i + 2];
    if (
      isVowel(v1) &&
      e === "e" &&
      isConsonant(mid) &&
      !isVowel(mid)
    ) {
      const pattern = `${v1}_${e}`;
      const name = `魔法e (${pattern})`;
      tags.push({
        type: "magic_e",
        text: `${v1}${mid}e`,
        position: [i, i + 3],
        description: `${name}: ${v1} 发长音`,
      });
    }
  }

  // 4. Detect r-controlled vowels
  for (let i = 0; i < lower.length - 1; i++) {
    const bigram = lower.substring(i, i + 2);
    if (R_CONTROLLED.has(bigram)) {
      tags.push({
        type: "r_controlled",
        text: bigram,
        position: [i, i + 2],
        description: `R控元音 "${bigram}"`,
      });
    }
  }

  // 5. Mark syllable boundaries
  const syllables = splitSyllables(word);
  let pos = 0;
  for (const syl of syllables) {
    tags.push({
      type: "syllable",
      text: syl,
      position: [pos, pos + syl.length],
      description: `音节 "${syl}"`,
    });
    pos += syl.length;
  }

  // Sort by position
  tags.sort((a, b) => a.position[0] - b.position[0] || b.position[1] - a.position[1]);

  return tags;
}

/**
 * Get color for a phonics tag type
 */
export function getPhonicsColor(type: PhonicsTag["type"]): string {
  switch (type) {
    case "vowel_combo": return "#f59e0b"; // amber
    case "consonant_blend": return "#6366f1"; // indigo
    case "magic_e": return "#ec4899"; // pink
    case "r_controlled": return "#10b981"; // emerald
    case "syllable": return "#6b7280"; // gray
  }
}

/**
 * Generate blocks for "积木拼拼乐" mode
 * Splits word into letter blocks, grouping phonics combinations
 */
export function generateLetterBlocks(word: string): Array<{
  id: string;
  letters: string;
  isCombo: boolean;
  comboType?: string;
}> {
  const lower = word.toLowerCase();
  if (lower.length <= 1) {
    return [{ id: "b0", letters: lower, isCombo: false }];
  }

  const tags = detectPhonicsTags(word);
  const nonSyllableTags = tags.filter((t) => t.type !== "syllable");

  // Sort by length (longest first) to prioritize multi-letter combos
  nonSyllableTags.sort((a, b) => (b.position[1] - b.position[0]) - (a.position[1] - a.position[0]));

  const covered = new Set<number>();
  const blocks: Array<{ id: string; letters: string; isCombo: boolean; comboType?: string }> = [];
  let blockId = 0;

  // First pass: add phonics combo blocks
  for (const tag of nonSyllableTags) {
    const [s, e] = tag.position;
    // Check if any position is already covered
    let overlap = false;
    for (let i = s; i < e; i++) {
      if (covered.has(i)) { overlap = true; break; }
    }
    if (overlap) continue;

    for (let i = s; i < e; i++) covered.add(i);
    blocks.push({
      id: `b${blockId++}`,
      letters: lower.substring(s, e),
      isCombo: true,
      comboType: tag.type,
    });
  }

  // Second pass: add single-letter blocks for uncovered positions
  const singleBlocks: Array<{ id: string; letters: string; isCombo: boolean; index: number }> = [];
  for (let i = 0; i < lower.length; i++) {
    if (!covered.has(i)) {
      singleBlocks.push({
        id: `b${blockId++}`,
        letters: lower[i],
        isCombo: false,
        index: i,
      });
    }
  }

  // Merge all blocks and sort by original position
  const allBlocks = [
    ...blocks,
    ...singleBlocks.map((b) => ({ ...b, comboType: undefined })),
  ];

  // Re-assign positions properly
  const usedPositions = new Set<number>();

  // Sort blocks by their actual start position in the word
  const sortedBlocks = allBlocks.map((b) => {
    let start = 0;
    let found = false;
    while (start <= lower.length - b.letters.length) {
      if (lower.substring(start, start + b.letters.length) === b.letters) {
        let available = true;
        for (let p = start; p < start + b.letters.length; p++) {
          if (usedPositions.has(p)) { available = false; break; }
        }
        if (available) {
          for (let p = start; p < start + b.letters.length; p++) usedPositions.add(p);
          found = true;
          break;
        }
      }
      start++;
    }
    return { ...b, sortPos: found ? start : Infinity };
  });

  sortedBlocks.sort((a, b) => a.sortPos - b.sortPos);

  return sortedBlocks.map(({ id, letters, isCombo, comboType }) => ({
    id, letters, isCombo, comboType,
  }));
}

/**
 * Generate fill-in-the-blank pattern for "单词消消乐" mode
 * Shows first and last letters, hides middle letters or combinations
 */
export function generateFillBlank(word: string): {
  display: string;       // e.g. "h__p__"
  answerPositions: number[]; // indices that need to be filled
  hint: string;          // e.g. "首字母h，尾字母y"
} {
  const lower = word.toLowerCase();
  if (lower.length <= 3) {
    return {
      display: lower[0] + "_".repeat(lower.length - 1),
      answerPositions: Array.from({ length: lower.length - 1 }, (_, i) => i + 1),
      hint: `首字母 ${lower[0]}`,
    };
  }

  // Show first and last letter, hide middle with focus on vowel combos
  const tags = detectPhonicsTags(word);
  const vowelComboPositions = new Set<number>();

  for (const tag of tags) {
    if (tag.type === "vowel_combo" || tag.type === "r_controlled") {
      for (let i = tag.position[0]; i < tag.position[1]; i++) {
        vowelComboPositions.add(i);
      }
    }
  }

  // Decide what to show/hide
  const show: boolean[] = new Array(lower.length).fill(false);
  show[0] = true; // Always show first letter
  show[lower.length - 1] = true; // Always show last letter

  // Hide vowel combos (these are the answer)
  const answerPositions: number[] = [];
  for (let i = 1; i < lower.length - 1; i++) {
    if (vowelComboPositions.has(i)) {
      answerPositions.push(i);
    } else if (!show[i]) {
      // Some consonants might also be hidden for longer words
      if (lower.length > 6 && (i === 2 || i === lower.length - 2)) {
        answerPositions.push(i);
      }
    }
  }

  // If no vowel combos found, hide middle 60%
  if (answerPositions.length === 0) {
    const hideStart = Math.floor(lower.length * 0.3);
    const hideEnd = Math.ceil(lower.length * 0.7);
    for (let i = hideStart; i < hideEnd && i < lower.length - 1; i++) {
      if (i > 0) answerPositions.push(i);
    }
  }

  // Build display string
  let display = "";
  for (let i = 0; i < lower.length; i++) {
    if (show[i]) {
      display += lower[i];
    } else if (answerPositions.includes(i)) {
      display += "_";
    } else {
      display += lower[i];
    }
  }

  return {
    display,
    answerPositions: [...new Set(answerPositions)].sort((a, b) => a - b),
    hint: `首字母 ${lower[0]}，尾字母 ${lower[lower.length - 1]}`,
  };
}

/**
 * Compare user input with correct word and identify errors
 */
export function analyzeSpellingErrors(
  correct: string,
  userInput: string
): {
  isCorrect: boolean;
  errorType: "wrong_letter" | "wrong_order" | "missing_letter" | "extra_letter" | "other";
  errorPositions: number[];
  correctLetters: Array<{ char: string; status: "correct" | "wrong" | "missing" | "extra" }>;
} {
  const c = correct.toLowerCase().trim();
  const u = userInput.toLowerCase().trim();

  if (c === u) {
    return {
      isCorrect: true,
      errorType: "other",
      errorPositions: [],
      correctLetters: c.split("").map((char) => ({ char, status: "correct" as const })),
    };
  }

  // Use simple diff-like comparison
  const result: Array<{ char: string; status: "correct" | "wrong" | "missing" | "extra" }> = [];
  const errorPositions: number[] = [];

  let ci = 0, ui = 0;
  while (ci < c.length || ui < u.length) {
    if (ci >= c.length) {
      // Extra letters in user input
      result.push({ char: u[ui], status: "extra" });
      errorPositions.push(ci);
      ui++;
    } else if (ui >= u.length) {
      // Missing letters
      result.push({ char: c[ci], status: "missing" });
      errorPositions.push(ci);
      ci++;
    } else if (c[ci] === u[ui]) {
      result.push({ char: c[ci], status: "correct" });
      ci++;
      ui++;
    } else {
      // Mismatch - try to detect transposition
      if (ci + 1 < c.length && ui + 1 < u.length &&
          c[ci] === u[ui + 1] && c[ci + 1] === u[ui]) {
        // Wrong order (transposition)
        result.push({ char: u[ui], status: "wrong" });
        errorPositions.push(ci);
        ui++;
      } else {
        result.push({ char: u[ui], status: "wrong" });
        errorPositions.push(ci);
        ci++;
        ui++;
      }
    }
  }

  // Determine error type
  let errorType: "wrong_letter" | "wrong_order" | "missing_letter" | "extra_letter" | "other" = "other";
  const hasMissing = result.some((r) => r.status === "missing");
  const hasExtra = result.some((r) => r.status === "extra");
  const hasWrong = result.some((r) => r.status === "wrong");

  if (hasMissing && !hasExtra && !hasWrong) errorType = "missing_letter";
  else if (hasExtra && !hasMissing && !hasWrong) errorType = "extra_letter";
  else if (hasWrong && result.filter((r) => r.status === "wrong").length === 2 &&
           c.length === u.length) errorType = "wrong_order";
  else if (hasWrong) errorType = "wrong_letter";

  return { isCorrect: false, errorType, errorPositions: [...new Set(errorPositions)], correctLetters: result };
}

// ============================================================
// Ebbinghaus Review Algorithm
// ============================================================

// Review intervals in minutes for each level
const REVIEW_INTERVALS: Record<number, number[]> = {
  1: [5, 30, 12 * 60, 24 * 60],        // Lv.1陌生: 5min, 30min, 12h, 1d
  2: [24 * 60, 2 * 24 * 60, 4 * 24 * 60, 7 * 24 * 60], // Lv.2熟悉: 1d, 2d, 4d, 7d
  3: [7 * 24 * 60, 15 * 24 * 60, 30 * 24 * 60],       // Lv.3掌握: 7d, 15d, 30d
};

/**
 * Calculate next review time based on current level and streak
 */
export function calculateNextReview(level: number, streak: number): Date {
  const intervals = REVIEW_INTERVALS[level] || REVIEW_INTERVALS[1];
  const intervalIndex = Math.min(streak, intervals.length - 1);
  const minutes = intervals[intervalIndex];

  const now = new Date();
  return new Date(now.getTime() + minutes * 60 * 1000);
}

/**
 * Update level based on correctness
 * - Correct: level + 1 (max 3), streak + 1
 * - Wrong: level reset to 1, streak reset to 0
 */
export function updateLevel(currentLevel: number, isCorrect: boolean): {
  newLevel: number;
  newStreak: number;
} {
  if (isCorrect) {
    return {
      newLevel: Math.min(currentLevel + 1, 3),
      newStreak: currentLevel + 1 <= 3 ? 1 : 0, // Reset streak on level up
    };
  } else {
    return {
      newLevel: 1,
      newStreak: 0,
    };
  }
}

/**
 * Get words due for review now
 */
export function getDueWords(spellingData: Array<{
  wordId: number;
  level: number;
  nextReviewAt: Date;
  lastReviewAt: Date | null;
}>): Array<{ wordId: number; level: number }> {
  const now = new Date();
  return spellingData
    .filter((d) => d.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime())
    .map((d) => ({ wordId: d.wordId, level: d.level }));
}
