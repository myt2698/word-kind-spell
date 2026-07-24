/**
 * Phonics Engine - Syllable Splitting & Phonics Rule Detection
 * Based on English syllable division rules:
 * 1. Vowel combos, consonant blends, consonant digraphs are indivisible blocks
 * 2. Prefixes/suffixes (-cle, -tle, -dle, -ckle, -er, -or) and compound words
 * 3. VCCV core rule: long vowel → consonant goes back; short vowel → consonant goes front
 * 4. Special cases dictionary
 */

const VOWELS = new Set(["a", "e", "i", "o", "u"]);
const Y_VOWEL = new Set(["a", "e", "i", "o", "u", "y"]);

/** Check if char is a vowel (a/e/i/o/u, not y unless at end) */
function isVowel(ch: string, pos: number, total: number): boolean {
  const lower = ch.toLowerCase();
  if (VOWELS.has(lower)) return true;
  // y acts as vowel at end of word or between consonants
  if (lower === "y") {
    return pos > 0 && pos === total - 1;
  }
  return false;
}

// ========== Priority 1: Indivisible Blocks ==========

/** Vowel combinations (digraphs/diphthongs) - never split */
const VOWEL_COMBOS = new Set([
  "ai", "ay", "ea", "ee", "ie", "oa", "oo", "ou", "ow",
  "oi", "oy", "au", "aw", "ew", "ue", "ui", "igh",
]);

/** R-controlled vowels */
const R_CONTROLLED = new Set(["ar", "er", "ir", "or", "ur"]);

/** Consonant blends - never split */
const CONSONANT_BLENDS = new Set([
  "bl", "br", "cl", "cr", "dr", "fr", "tr", "pr",
  "gl", "gr", "pl", "sl", "sm", "sn", "sp", "st", "sw", "sc", "sk", "tw", "wh",
  "ch", "sh", "th", "ph", "ck", "ng",
  // Double consonants (two same letters = one sound)
  "ff", "ll", "ss", "tt", "pp", "mm", "nn", "rr", "dd", "gg", "bb", "cc", "zz",
]);

// ========== Priority 2: Prefixes / Suffixes / Compound Words ==========

const PREFIXES = new Set([
  "un", "re", "dis", "mis", "pre", "over", "under", "out", "up", "down",
]);

const SUFFIXES = new Set([
  "er", "or", "ar", "est", "ness", "less", "ful", "ment", "tion", "sion",
]);

/** Special endings that form their own syllable */
const SPECIAL_ENDINGS = ["cle", "tle", "dle", "ckle", "gle", "ble", "ple", "fle", "kle", "zle"];

/** Short vowel sounds (closed syllable indicator) */
const SHORT_VOWEL_INDICATORS: Record<string, string[]> = {
  a: ["cat", "hat", "mat", "ran", "sat", "bad", "had", "dad", "mad", "sad", "bag", "rag", "tag", "cap", "map", "nap", "tap", "rat", "bat", "fat", "pat", "van", "can", "man", "pan"],
  e: ["bed", "red", "led", "fed", "wet", "get", "let", "met", "net", "pet", "set", "bet", "hen", "men", "pen", "ten", "den", "vet", "web", "jet"],
  i: ["bit", "fit", "hit", "kit", "lit", "pit", "sit", "win", "pin", "tin", "bin", "din", "fin", "gin", "him", "dim", "rid", "hid", "bid", "did", "kid", "lid", "mid"],
  o: ["hot", "not", "got", "lot", "pot", "dot", "cot", "jot", "rot", "tot", "dog", "fog", "hog", "log", "bog", "cog", "jog", "mob", "rob", "sob", "job", "nod", "rod", "cod", "pod"],
  u: ["but", "cut", "hut", "nut", "rut", "gum", "hum", "sum", "bum", "mum", "dug", "hug", "jug", "mug", "pug", "rug", "tug", "bud", "mud", "pub", "rub", "sub", "tub"],
};

/** Common words that are exceptions to rules */
const EXCEPTION_WORDS: Record<string, string[]> = {
  "every": ["ev", "ery"],
  "business": ["busi", "ness"],
  "favorite": ["fa", "vor", "ite"],
  "chocolate": ["cho", "co", "late"],
  "different": ["dif", "fer", "ent"],
  "interest": ["in", "ter", "est"],
  "family": ["fa", "mi", "ly"],
  "animal": ["a", "ni", "mal"],
  "vegetable": ["ve", "ge", "ta", "ble"],
  "comfortable": ["com", "for", "ta", "ble"],
};

/**
 * Check if a vowel is likely short based on common word patterns
 */
function isShortVowel(vowel: string, before: string, after: string): boolean {
  // Check if followed by single consonant + another vowel (often short)
  if (after.length >= 2 && isConsonant(after[0]) && isVowelOrY(after[1])) {
    return true;
  }
  // Check if followed by double consonant (definitely short)
  if (after.length >= 2 && after[0] === after[1]) {
    return true;
  }
  // Single consonant at end of word (closed syllable)
  if (after.length === 1 && isConsonant(after[0])) {
    return true;
  }
  return false;
}

function isVowelOrY(ch: string): boolean {
  return Y_VOWEL.has(ch.toLowerCase());
}

function isConsonant(ch: string): boolean {
  return /^[a-z]$/i.test(ch) && !VOWELS.has(ch.toLowerCase());
}

/**
 * Find all vowel groups (single vowels or vowel combos) in a word
 * Returns array of {start, end, text} for each vowel sound unit
 */
function findVowelGroups(word: string): Array<{ start: number; end: number; text: string }> {
  const groups: Array<{ start: number; end: number; text: string }> = [];
  const lower = word.toLowerCase();
  let i = 0;

  while (i < lower.length) {
    // Check 3-letter vowel combos first (igh)
    if (i < lower.length - 2) {
      const tri = lower.substring(i, i + 3);
      if (tri === "igh") {
        groups.push({ start: i, end: i + 3, text: tri });
        i += 3;
        continue;
      }
    }

    // Check 2-letter vowel combos
    if (i < lower.length - 1) {
      const bi = lower.substring(i, i + 2);
      if (VOWEL_COMBOS.has(bi) || R_CONTROLLED.has(bi)) {
        groups.push({ start: i, end: i + 2, text: bi });
        i += 2;
        continue;
      }
    }

    // Single vowel
    if (isVowelOrY(lower[i])) {
      // Silent e at end of word
      if (lower[i] === "e" && i === lower.length - 1 && groups.length > 0) {
        // Skip silent e
        i++;
        continue;
      }
      groups.push({ start: i, end: i + 1, text: lower[i] });
      i++;
      continue;
    }

    i++;
  }

  return groups;
}

/**
 * Split word into syllables using the priority-based algorithm
 */
export function splitSyllables(word: string): string[] {
  const lower = word.toLowerCase().trim();
  if (!lower || lower.length <= 2) return [lower];

  // Check exception dictionary first
  if (EXCEPTION_WORDS[lower]) {
    return [...EXCEPTION_WORDS[lower]];
  }

  // Find all vowel groups
  const vowelGroups = findVowelGroups(lower);
  if (vowelGroups.length <= 1) return [lower];

  const splitPoints: number[] = [];

  for (let i = 0; i < vowelGroups.length - 1; i++) {
    const v1 = vowelGroups[i];
    const v2 = vowelGroups[i + 1];
    const gapStart = v1.end;
    const gapEnd = v2.start;
    const consonants = lower.substring(gapStart, gapEnd);

    if (consonants.length === 0) {
      // Adjacent vowels - check if compound word split
      // (handled by no split between adjacent vowel groups)
      continue;
    }

    if (consonants.length === 1) {
      // V-C-V pattern: check if vowel is long or short
      // Long vowel → consonant goes to next syllable (V / CV)
      // Short vowel → consonant stays with previous (VC / V)
      if (isShortVowel(v1.text, lower.substring(0, v1.start), consonants + lower.substring(v2.start))) {
        splitPoints.push(gapStart + 1); // consonant stays with first
      } else {
        splitPoints.push(gapStart); // consonant goes to second
      }
      continue;
    }

    if (consonants.length === 2) {
      // V-CC-V pattern: check if it's a blend
      const pair = consonants;
      if (CONSONANT_BLENDS.has(pair)) {
        // Blend stays together → goes to next syllable
        splitPoints.push(gapStart);
      } else {
        // Split in the middle (VC / CV)
        splitPoints.push(gapStart + 1);
      }
      continue;
    }

    if (consonants.length >= 3) {
      // V-CCC-V or more: keep blends together
      // Try to split before the last consonant or consonant blend
      if (CONSONANT_BLENDS.has(consonants.substring(1))) {
        splitPoints.push(gapStart + 1);
      } else if (CONSONANT_BLENDS.has(consonants.substring(0, 2))) {
        splitPoints.push(gapStart + 2);
      } else {
        splitPoints.push(gapStart + Math.floor(consonants.length / 2));
      }
      continue;
    }
  }

  // Check for special endings (-cle, -tle, -dle, -ckle, etc.)
  for (const ending of SPECIAL_ENDINGS) {
    if (lower.endsWith(ending) && lower.length > ending.length + 1) {
      const beforeEnding = lower.length - ending.length;
      // The consonant before the ending forms a syllable with it
      // e.g., pick-le, lit-tle
      if (!splitPoints.includes(beforeEnding - 1)) {
        // Remove nearby split points and add correct one
        const idx = splitPoints.findIndex((p) => Math.abs(p - beforeEnding) <= 1);
        if (idx >= 0) splitPoints.splice(idx, 1);
        splitPoints.push(beforeEnding - 1);
      }
    }
  }

  // Build syllables from split points
  splitPoints.sort((a, b) => a - b);
  const uniquePoints = [...new Set(splitPoints)].filter((p) => p > 0 && p < lower.length);

  const syllables: string[] = [];
  let start = 0;
  for (const point of uniquePoints) {
    syllables.push(lower.substring(start, point));
    start = point;
  }
  syllables.push(lower.substring(start));

  return syllables.filter((s) => s.length > 0);
}

// ========== Types ==========

export interface PhonicsTag {
  type: "vowel_combo" | "consonant_blend" | "magic_e" | "r_controlled" | "syllable";
  text: string;
  position: [number, number];
  description: string;
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
    if (i < lower.length - 2) {
      const tri = lower.substring(i, i + 3);
      if (CONSONANT_BLENDS.has(tri) && tri.length === 3) {
        tags.push({
          type: "consonant_blend",
          text: tri,
          position: [i, i + 3],
          description: `辅音连缀 "${tri}"`,
        });
        i += 2;
        continue;
      }
    }
    const bi = lower.substring(i, i + 2);
    if (CONSONANT_BLENDS.has(bi)) {
      const overlapping = tags.some(
        (t) =>
          t.type === "consonant_blend" &&
          ((t.position[0] <= i && t.position[1] > i) ||
            (t.position[0] < i + 2 && t.position[1] >= i + 2)),
      );
      if (!overlapping) {
        tags.push({
          type: "consonant_blend",
          text: bi,
          position: [i, i + 2],
          description: `辅音组合 "${bi}"`,
        });
      }
    }
  }

  // 3. Detect magic e patterns
  for (let i = 0; i < lower.length - 2; i++) {
    const v1 = lower[i];
    const mid = lower[i + 1];
    const e = lower[i + 2];
    if (VOWELS.has(v1) && e === "e" && isConsonant(mid)) {
      tags.push({
        type: "magic_e",
        text: `${v1}${mid}e`,
        position: [i, i + 3],
        description: `魔法e: ${v1} 发长音`,
      });
    }
  }

  // 4. Detect r-controlled vowels
  for (let i = 0; i < lower.length - 1; i++) {
    const bi = lower.substring(i, i + 2);
    if (R_CONTROLLED.has(bi)) {
      tags.push({
        type: "r_controlled",
        text: bi,
        position: [i, i + 2],
        description: `R控元音 "${bi}"`,
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

  tags.sort((a, b) => a.position[0] - b.position[0] || b.position[1] - a.position[1]);
  return tags;
}

export function getPhonicsColor(type: PhonicsTag["type"]): string {
  switch (type) {
    case "vowel_combo": return "#f59e0b";
    case "consonant_blend": return "#6366f1";
    case "magic_e": return "#ec4899";
    case "r_controlled": return "#10b981";
    case "syllable": return "#6b7280";
  }
}

/**
 * Generate blocks for "积木拼拼乐" mode
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

  const syllables = splitSyllables(word);
  const blocks: Array<{ id: string; letters: string; isCombo: boolean; comboType?: string }> = [];
  let blockId = 0;

  // Split each syllable into letter blocks based on phonics combos
  for (const syl of syllables) {
    const sylLower = syl.toLowerCase();
    const covered = new Set<number>();
    const sylBlocks: Array<{ letters: string; isCombo: boolean; comboType?: string; start: number }> = [];

    // Find vowel combos in this syllable
    for (let i = 0; i < sylLower.length - 1; i++) {
      if (covered.has(i)) continue;

      // Check 3-letter combos
      if (i < sylLower.length - 2) {
        const tri = sylLower.substring(i, i + 3);
        if (tri === "igh" || VOWEL_COMBOS.has(tri)) {
          for (let j = i; j < i + 3; j++) covered.add(j);
          sylBlocks.push({ letters: tri, isCombo: true, comboType: "vowel_combo", start: i });
          continue;
        }
      }

      // Check 2-letter combos
      const bi = sylLower.substring(i, i + 2);
      if (VOWEL_COMBOS.has(bi) || R_CONTROLLED.has(bi)) {
        for (let j = i; j < i + 2; j++) covered.add(j);
        sylBlocks.push({ letters: bi, isCombo: true, comboType: "vowel_combo", start: i });
        continue;
      }

      // Check consonant blends
      if (CONSONANT_BLENDS.has(bi)) {
        for (let j = i; j < i + 2; j++) covered.add(j);
        sylBlocks.push({ letters: bi, isCombo: true, comboType: "consonant_blend", start: i });
        continue;
      }
    }

    // Fill in single letters for uncovered positions
    for (let i = 0; i < sylLower.length; i++) {
      if (!covered.has(i)) {
        sylBlocks.push({ letters: sylLower[i], isCombo: false, start: i });
      }
    }

    // Sort by position within syllable
    sylBlocks.sort((a, b) => a.start - b.start);

    // Add to main blocks
    for (const b of sylBlocks) {
      blocks.push({
        id: `b${blockId++}`,
        letters: b.letters,
        isCombo: b.isCombo,
        comboType: b.comboType,
      });
    }
  }

  return blocks;
}

/**
 * Generate fill-in-the-blank pattern for "单词消消乐" mode
 */
export function generateFillBlank(word: string): {
  display: string;
  answerPositions: number[];
  hint: string;
} {
  const lower = word.toLowerCase();
  if (lower.length <= 3) {
    return {
      display: lower[0] + "_".repeat(lower.length - 1),
      answerPositions: Array.from({ length: lower.length - 1 }, (_, i) => i + 1),
      hint: `首字母 ${lower[0]}`,
    };
  }

  const tags = detectPhonicsTags(word);
  const vowelComboPositions = new Set<number>();

  for (const tag of tags) {
    if (tag.type === "vowel_combo" || tag.type === "r_controlled") {
      for (let i = tag.position[0]; i < tag.position[1]; i++) {
        vowelComboPositions.add(i);
      }
    }
  }

  const show: boolean[] = new Array(lower.length).fill(false);
  show[0] = true;
  show[lower.length - 1] = true;

  const answerPositions: number[] = [];
  for (let i = 1; i < lower.length - 1; i++) {
    if (vowelComboPositions.has(i)) {
      answerPositions.push(i);
    } else if (!show[i]) {
      if (lower.length > 6 && (i === 2 || i === lower.length - 2)) {
        answerPositions.push(i);
      }
    }
  }

  if (answerPositions.length === 0) {
    const hideStart = Math.floor(lower.length * 0.3);
    const hideEnd = Math.ceil(lower.length * 0.7);
    for (let i = hideStart; i < hideEnd && i < lower.length - 1; i++) {
      if (i > 0) answerPositions.push(i);
    }
  }

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

  const result: Array<{ char: string; status: "correct" | "wrong" | "missing" | "extra" }> = [];
  const errorPositions: number[] = [];

  let ci = 0, ui = 0;
  while (ci < c.length || ui < u.length) {
    if (ci >= c.length) {
      result.push({ char: u[ui], status: "extra" });
      errorPositions.push(ci);
      ui++;
    } else if (ui >= u.length) {
      result.push({ char: c[ci], status: "missing" });
      errorPositions.push(ci);
      ci++;
    } else if (c[ci] === u[ui]) {
      result.push({ char: c[ci], status: "correct" });
      ci++;
      ui++;
    } else {
      if (ci + 1 < c.length && ui + 1 < u.length &&
          c[ci] === u[ui + 1] && c[ci + 1] === u[ui]) {
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

  let errorType: "wrong_letter" | "wrong_order" | "missing_letter" | "extra_letter" | "other" = "other";
  const hasMissing = result.some((r) => r.status === "missing");
  const hasExtra = result.some((r) => r.status === "extra");
  const hasWrong = result.some((r) => r.status === "wrong");

  if (hasMissing && !hasExtra && !hasWrong) errorType = "missing_letter";
  else if (hasExtra && !hasMissing && !hasWrong) errorType = "extra_letter";
  else if (hasWrong && result.filter((r) => r.status === "wrong").length === 2 && c.length === u.length) errorType = "wrong_order";
  else if (hasWrong) errorType = "wrong_letter";

  return { isCorrect: false, errorType, errorPositions: [...new Set(errorPositions)], correctLetters: result };
}

// ============================================================
// Ebbinghaus Review Algorithm
// ============================================================

const REVIEW_INTERVALS: Record<number, number[]> = {
  1: [5, 30, 12 * 60, 24 * 60],
  2: [24 * 60, 2 * 24 * 60, 4 * 24 * 60, 7 * 24 * 60],
  3: [7 * 24 * 60, 15 * 24 * 60, 30 * 24 * 60],
};

export function calculateNextReview(level: number, streak: number): Date {
  const intervals = REVIEW_INTERVALS[level] || REVIEW_INTERVALS[1];
  const intervalIndex = Math.min(streak, intervals.length - 1);
  const minutes = intervals[intervalIndex];
  const now = new Date();
  return new Date(now.getTime() + minutes * 60 * 1000);
}

export function updateLevel(currentLevel: number, isCorrect: boolean): {
  newLevel: number;
  newStreak: number;
} {
  if (isCorrect) {
    return {
      newLevel: Math.min(currentLevel + 1, 3),
      newStreak: currentLevel + 1 <= 3 ? 1 : 0,
    };
  } else {
    return { newLevel: 1, newStreak: 0 };
  }
}

export function getDueWords(
  spellingData: Array<{
    wordId: number;
    level: number;
    nextReviewAt: Date;
    lastReviewAt: Date | null;
  }>
): Array<{ wordId: number; level: number }> {
  const now = new Date();
  return spellingData
    .filter((d) => d.nextReviewAt <= now)
    .sort((a, b) => a.nextReviewAt.getTime() - b.nextReviewAt.getTime())
    .map((d) => ({ wordId: d.wordId, level: d.level }));
}
