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
]);

function isSilentTInSt(word: string, index: number): boolean {
  return word === "listen" && index === 2;
}

/**
 * Reviewed multi-letter graphemes that must win over shorter combinations.
 *
 * For example, `share` is `sh + are`, not `sh + ar + e`, while `queen` is
 * `qu + ee + n`, not `q + ue + e + n`. Keep this table longest-first so a
 * shorter rule can never consume part of a reviewed grapheme.
 */
const PRIORITY_GRAPHEMES = [
  { text: "eau", type: "vowel_combo" },
  { text: "eigh", type: "vowel_combo" },
  { text: "igh", type: "vowel_combo" },
  { text: "ture", type: "vowel_combo" },
  { text: "air", type: "vowel_combo" },
  { text: "are", type: "vowel_combo" },
  { text: "ear", type: "vowel_combo" },
  { text: "ere", type: "vowel_combo" },
  { text: "eir", type: "vowel_combo" },
  { text: "ire", type: "vowel_combo" },
  { text: "ore", type: "vowel_combo" },
  { text: "our", type: "vowel_combo" },
  { text: "oor", type: "vowel_combo" },
  { text: "str", type: "consonant_blend" },
  { text: "qu", type: "consonant_blend" },
  { text: "nk", type: "consonant_blend" },
] as const;

type PriorityGraphemeMatch = {
  text: string;
  type: (typeof PRIORITY_GRAPHEMES)[number]["type"];
  start: number;
  end: number;
};

function findPriorityGraphemes(word: string): PriorityGraphemeMatch[] {
  const lower = word.toLowerCase();
  const matches: PriorityGraphemeMatch[] = [];
  let index = 0;

  while (index < lower.length) {
    const grapheme = PRIORITY_GRAPHEMES.find(({ text }) =>
      lower.startsWith(text, index),
    );
    if (!grapheme) {
      index++;
      continue;
    }

    matches.push({
      ...grapheme,
      start: index,
      end: index + grapheme.text.length,
    });
    index += grapheme.text.length;
  }

  return matches;
}

// ========== Priority 2: Prefixes / Suffixes / Compound Words ==========

/** Special endings that form their own syllable */
const SPECIAL_ENDINGS = ["cle", "tle", "dle", "ckle", "gle", "ble", "ple", "fle", "kle", "zle"];

/**
 * Reviewed word divisions.
 *
 * English spelling does not encode every spoken syllable unambiguously, so a
 * curated dictionary is safer than forcing every word through one mechanical
 * VCV rule. This dictionary is the source of truth; generated text in database
 * notes must never override it.
 */
const CURATED_WORD_DIVISIONS: Record<string, string[]> = {
  "about": ["a", "bout"],
  "among": ["a", "mong"],
  "apple": ["ap", "ple"],
  "afternoon": ["af", "ter", "noon"],
  "baby": ["ba", "by"],
  "banana": ["ba", "na", "na"],
  "basketball": ["bas", "ket", "ball"],
  "body": ["bod", "y"],
  "beautiful": ["beau", "ti", "ful"],
  "busy": ["bus", "y"],
  "buy": ["buy"],
  "canada": ["can", "a", "da"],
  "china": ["chi", "na"],
  "chinese": ["chi", "nese"],
  "classmate": ["class", "mate"],
  "children": ["chil", "dren"],
  "closed": ["closed"],
  "colour": ["col", "our"],
  "colourful": ["col", "our", "ful"],
  "community": ["com", "mu", "ni", "ty"],
  "computer": ["com", "pu", "ter"],
  "cloudy": ["cloud", "y"],
  "cleaner": ["clean", "er"],
  "cookie": ["cook", "ie"],
  "cousin": ["cous", "in"],
  "delivery": ["de", "liv", "er", "y"],
  "dinner": ["din", "ner"],
  "driver": ["driv", "er"],
  "eight": ["eight"],
  "eighteen": ["eigh", "teen"],
  "elephant": ["e", "le", "phant"],
  "eleven": ["e", "lev", "en"],
  "english": ["eng", "lish"],
  "eraser": ["e", "ras", "er"],
  "everyone": ["ev", "ery", "one"],
  "eye": ["eye"],
  "factory": ["fac", "to", "ry"],
  "farmer": ["farm", "er"],
  "favour": ["fa", "vour"],
  "favourite": ["fa", "vour", "ite"],
  "firefighter": ["fire", "fight", "er"],
  "flavour": ["fla", "vour"],
  "giraffe": ["gi", "raffe"],
  "goodbye": ["good", "bye"],
  "grandfather": ["grand", "fa", "ther"],
  "grandma": ["grand", "ma"],
  "grandmother": ["grand", "mo", "ther"],
  "grandpa": ["grand", "pa"],
  "healthy": ["health", "y"],
  "helpful": ["help", "ful"],
  "hospital": ["hos", "pi", "tal"],
  "humour": ["hu", "mour"],
  "idea": ["i", "de", "a"],
  "japanese": ["jap", "a", "nese"],
  "letter": ["let", "ter"],
  "library": ["li", "brar", "y"],
  "lion": ["li", "on"],
  "listen": ["lis", "ten"],
  "lovely": ["love", "ly"],
  "many": ["man", "y"],
  "monkey": ["mon", "key"],
  "morning": ["morn", "ing"],
  "mr": ["mis", "ter"],
  "mrs": ["mis", "iz"],
  "neighbour": ["neigh", "bour"],
  "nineteen": ["nine", "teen"],
  "office": ["of", "fice"],
  "orange": ["or", "ange"],
  "paper": ["pa", "per"],
  "painting": ["paint", "ing"],
  "pe": ["p", "e"],
  "people": ["peo", "ple"],
  "police": ["po", "lice"],
  "purple": ["pur", "ple"],
  "queen": ["queen"],
  "question": ["ques", "tion"],
  "rabbit": ["rab", "bit"],
  "rainy": ["rain", "y"],
  "seven": ["sev", "en"],
  "seventeen": ["sev", "en", "teen"],
  "sister": ["sis", "ter"],
  "snowman": ["snow", "man"],
  "student": ["stu", "dent"],
  "sugar": ["sug", "ar"],
  "summer": ["sum", "mer"],
  "sunny": ["sun", "ny"],
  "sweater": ["sweat", "er"],
  "sydney": ["syd", "ney"],
  "teacher": ["teach", "er"],
  "their": ["their"],
  "tiger": ["ti", "ger"],
  "tired": ["tired"],
  "today": ["to", "day"],
  "together": ["to", "ge", "ther"],
  "tomorrow": ["to", "mor", "row"],
  "tongue": ["tongue"],
  "uk": ["u", "k"],
  "uncle": ["un", "cle"],
  "usa": ["u", "s", "a"],
  "very": ["ver", "y"],
  "water": ["wa", "ter"],
  "weather": ["wea", "ther"],
  "weight": ["weight"],
  "windy": ["wind", "y"],
  "woman": ["wom", "an"],
  "worker": ["work", "er"],
  "year": ["year"],
  "yellow": ["yel", "low"],
  "yes": ["yes"],
  "your": ["your"],
  "yummy": ["yum", "my"],
  "every": ["ev", "ery"],
  "business": ["busi", "ness"],
  "favorite": ["fa", "vor", "ite"],
  "chocolate": ["cho", "co", "late"],
  "different": ["dif", "fer", "ent"],
  "interest": ["in", "ter", "est"],
  "family": ["fam", "i", "ly"],
  "animal": ["an", "i", "mal"],
  "vegetable": ["veg", "e", "ta", "ble"],
  "comfortable": ["com", "for", "ta", "ble"],
};

function isVowelOrY(ch: string): boolean {
  return Y_VOWEL.has(ch.toLowerCase());
}

function isConsonant(ch: string): boolean {
  return /^[a-z]$/i.test(ch) && !VOWELS.has(ch.toLowerCase());
}

/**
 * Predict syllable split points using VCCV rule (for Bossy R validation)
 * Returns array of positions where syllables should be split.
 */
function predictSplitPoints(word: string): number[] {
  const lower = word.toLowerCase();
  const splits: number[] = [];

  // Find all vowel positions
  const vowelPositions: number[] = [];
  for (let i = 0; i < lower.length; i++) {
    if (isVowelOrY(lower[i])) {
      vowelPositions.push(i);
    }
  }

  for (let i = 0; i < vowelPositions.length - 1; i++) {
    const v1 = vowelPositions[i];
    const v2 = vowelPositions[i + 1];
    const consonants = lower.substring(v1 + 1, v2);

    if (consonants.length === 1) {
      // V-C-V: consonant goes to next syllable
      splits.push(v1 + 1);
    } else if (consonants.length === 2) {
      if (CONSONANT_BLENDS.has(consonants)) {
        // Blend goes to next syllable
        splits.push(v1 + 1);
      } else {
        // Split in middle
        splits.push(v1 + 2);
      }
    } else if (consonants.length >= 3) {
      // 3+ consonants: split before last consonant/blend
      if (CONSONANT_BLENDS.has(consonants.substring(1))) {
        splits.push(v1 + 2);
      } else if (CONSONANT_BLENDS.has(consonants.substring(0, 2))) {
        splits.push(v1 + 3);
      } else {
        splits.push(v1 + 1 + Math.floor(consonants.length / 2));
      }
    }
  }

  return [...new Set(splits)].sort((a, b) => a - b);
}

/**
 * Find all vowel groups with Bossy R co-syllable validation.
 * R-controlled vowels (ar/er/ir/or/ur) are only valid when vowel and r are in the same syllable.
 */
function findVowelGroups(word: string): Array<{ start: number; end: number; text: string }> {
  const groups: Array<{ start: number; end: number; text: string }> = [];
  const lower = word.toLowerCase();

  // Step 1: Predict split points for Bossy R validation
  const splitPoints = predictSplitPoints(word);

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

      // Regular vowel combos (always valid)
      if (VOWEL_COMBOS.has(bi)) {
        groups.push({ start: i, end: i + 2, text: bi });
        i += 2;
        continue;
      }

      // Bossy R: ONLY valid if vowel and r are in the same syllable
      // (no split point between them)
      if (R_CONTROLLED.has(bi)) {
        const vowelEnd = i + 1; // position right after vowel, before 'r'
        const isSplitBetween = splitPoints.some((p) => p === vowelEnd);

        if (isSplitBetween) {
          // Vowel and r are in different syllables → NOT a Bossy R
          // Process vowel as single, r as consonant
          groups.push({ start: i, end: i + 1, text: lower[i] });
          i++;
          continue;
        } else {
          // Same syllable → valid Bossy R
          groups.push({ start: i, end: i + 2, text: bi });
          i += 2;
          continue;
        }
      }
    }

    // Single vowel
    if (isVowelOrY(lower[i])) {
      // Silent e at end of word
      if (lower[i] === "e" && i === lower.length - 1 && groups.length > 0) {
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
  // Check exception dictionary first
  if (CURATED_WORD_DIVISIONS[lower]) {
    return [...CURATED_WORD_DIVISIONS[lower]];
  }
  if (!lower || lower.length <= 2) return [lower];

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
      // Distinct adjacent vowel groups represent separate syllable nuclei.
      // Recognised vowel teams were already grouped by findVowelGroups().
      splitPoints.push(gapStart);
      continue;
    }

    if (consonants.length === 1) {
      // For VCV, try V/CV first (ti-ger, e-le-phant). Words whose first
      // vowel is short and need VC/V are kept in the reviewed dictionary.
      splitPoints.push(gapStart);
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
  const syllables = splitSyllables(word);
  const syllableBoundaries = new Set<number>();
  let syllableOffset = 0;
  for (const syllable of syllables.slice(0, -1)) {
    syllableOffset += syllable.length;
    syllableBoundaries.add(syllableOffset);
  }
  const priorityMatches = findPriorityGraphemes(lower);
  const priorityCovered = new Set(
    priorityMatches.flatMap(({ start, end }) =>
      Array.from({ length: end - start }, (_, offset) => start + offset),
    ),
  );

  for (const match of priorityMatches) {
    tags.push({
      type: match.type,
      text: match.text,
      position: [match.start, match.end],
      description:
        match.type === "vowel_combo"
          ? `元音或常见拼写组合 "${match.text}"`
          : `辅音组合或辅音连缀 "${match.text}"`,
    });
  }

  // 1. Detect vowel combinations
  for (let i = 0; i < lower.length - 1; i++) {
    const bigram = lower.substring(i, i + 2);
    if (
      VOWEL_COMBOS.has(bigram) &&
      !syllableBoundaries.has(i + 1) &&
      !priorityCovered.has(i) &&
      !priorityCovered.has(i + 1)
    ) {
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
      if (
        CONSONANT_BLENDS.has(tri) &&
        tri.length === 3 &&
        ![i, i + 1, i + 2].some((position) => priorityCovered.has(position))
      ) {
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
    if (
      CONSONANT_BLENDS.has(bi) &&
      !(bi === "st" && isSilentTInSt(lower, i)) &&
      !priorityCovered.has(i) &&
      !priorityCovered.has(i + 1)
    ) {
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

  // 3. Detect word-final magic e patterns. An internal VCe sequence such as
  // "ele" in elephant is not a magic-e syllable.
  for (let i = 0; i < lower.length - 2; i++) {
    const v1 = lower[i];
    const mid = lower[i + 1];
    const e = lower[i + 2];
    if (
      VOWELS.has(v1) &&
      e === "e" &&
      i + 2 === lower.length - 1 &&
      isConsonant(mid) &&
      ![i, i + 1, i + 2].some((position) => priorityCovered.has(position))
    ) {
      tags.push({
        type: "magic_e",
        text: `${v1}${mid}e`,
        position: [i, i + 3],
        description: `魔法e: ${v1} 发长音`,
      });
    }
  }

  // 4. Detect r-controlled vowels only when the vowel and r remain in the
  // same reviewed/predicted syllable.
  for (const group of findVowelGroups(lower)) {
    if (
      R_CONTROLLED.has(group.text) &&
      !Array.from(
        { length: group.end - group.start },
        (_, offset) => group.start + offset,
      ).some((position) => priorityCovered.has(position))
    ) {
      tags.push({
        type: "r_controlled",
        text: group.text,
        position: [group.start, group.end],
        description: `R控元音 "${group.text}"`,
      });
    }
  }

  // 5. Mark syllable boundaries
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

export interface StudyPhonicsAnalysis {
  syllables: string[];
  blocks: Array<{
    letters: string;
    comboType?: string;
    isCombo: boolean;
  }>;
  patterns: Array<{
    type: Exclude<PhonicsTag["type"], "syllable">;
    text: string;
    explanation: string;
  }>;
}

function explainStudyPattern(
  type: Exclude<PhonicsTag["type"], "syllable">,
  text: string,
): string {
  switch (type) {
    case "vowel_combo":
      if (text === "eau") {
        return `"eau" 在 beautiful 中整体对应 /juː/，拼读时不要拆成 ea 和 au。`;
      }
      if (text === "ture") {
        return `"ture" 是常见词尾拼写组合，通常整体读作 /tʃə(r)/，如 picture、future。`;
      }
      return `"${text}" 是元音组合，通常作为一个发音单位整体认读，拼读时不要拆成两个独立元音。`;
    case "consonant_blend":
      if (text === "ph") {
        return `"ph" 是辅音字母组合，通常合起来发 /f/，拼读时不要拆开。`;
      }
      if (text === "qu") {
        return `"qu" 是常见辅音组合，通常整体发 /kw/，如 queen、quick。`;
      }
      if (text === "nk") {
        return `"nk" 是常见词尾辅音组合，通常整体发 /ŋk/，如 pink、drink。`;
      }
      return `"${text}" 是辅音组合或辅音连缀，拼读时要让相邻辅音自然衔接。`;
    case "magic_e":
      return `"${text}" 符合“魔法 e”规律：词尾 e 通常不发音，并让前面的元音倾向读字母本音。`;
    case "r_controlled":
      return `"${text}" 是 R 控元音，元音受到 r 的影响，需要作为一个整体认读。`;
  }
}

/**
 * Build a compact, reader-facing phonics analysis for the sequential study
 * experience. Phrases and hyphenated words are analysed one alphabetic segment
 * at a time so punctuation never becomes a phonics block.
 */
export function analyzeWordForStudy(word: string): StudyPhonicsAnalysis {
  const segments = word.match(/[a-z]+|[^a-z]+/gi) ?? [];
  const syllables: string[] = [];
  const blocks: StudyPhonicsAnalysis["blocks"] = [];
  const patterns: StudyPhonicsAnalysis["patterns"] = [];
  const seenPatterns = new Set<string>();

  for (const segment of segments) {
    if (!/^[a-z]+$/i.test(segment)) {
      if (segment.trim()) {
        blocks.push({ letters: segment, isCombo: false, comboType: "separator" });
      } else {
        blocks.push({ letters: " ", isCombo: false, comboType: "separator" });
      }
      continue;
    }

    syllables.push(...splitSyllables(segment));
    blocks.push(
      ...generateLetterBlocks(segment).map((block) => ({
        letters: block.letters,
        isCombo: block.isCombo,
        comboType: block.comboType,
      })),
    );

    for (const tag of detectPhonicsTags(segment)) {
      if (tag.type === "syllable") continue;
      const key = `${tag.type}:${tag.text}`;
      if (seenPatterns.has(key)) continue;
      seenPatterns.add(key);
      patterns.push({
        type: tag.type,
        text: tag.text,
        explanation: explainStudyPattern(tag.type, tag.text),
      });
    }
  }

  return { syllables, blocks, patterns };
}

/**
 * Format the current engine result for generated notes and migration scripts
 * while preserving spaces and punctuation between words.
 */
export function formatSyllableDivision(word: string): string {
  return (word.match(/[a-z]+|[^a-z]+/gi) ?? [])
    .map((segment) =>
      /^[a-z]+$/i.test(segment)
        ? splitSyllables(segment).join("-")
        : segment,
    )
    .join("")
    .trim();
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

  const reviewedSyllables = splitSyllables(word);
  // Spoken abbreviations may use an expanded pronunciation (`Mr` → mis-ter).
  // Letter blocks must always reconstruct the spelling shown to the learner.
  const syllables =
    reviewedSyllables.join("") === lower ? reviewedSyllables : [lower];
  const priorityMatches = findPriorityGraphemes(lower);
  const priorityCovered = new Set(
    priorityMatches.flatMap(({ start, end }) =>
      Array.from({ length: end - start }, (_, offset) => start + offset),
    ),
  );
  const blocks: Array<{ id: string; letters: string; isCombo: boolean; comboType?: string }> = [];
  let blockId = 0;
  let syllableOffset = 0;

  // Split each syllable into letter blocks based on phonics combos
  for (const syl of syllables) {
    const sylLower = syl.toLowerCase();
    const covered = new Set<number>();
    const sylBlocks: Array<{ letters: string; isCombo: boolean; comboType?: string; start: number }> = [];

    // Apply reviewed longest-match graphemes first. A match may cross a
    // syllable boundary (`mon-key` contains `nk`), but it is emitted once at
    // its starting position and the remaining positions stay covered.
    for (const match of priorityMatches) {
      if (
        match.start < syllableOffset ||
        match.start >= syllableOffset + sylLower.length
      ) {
        continue;
      }
      for (let position = match.start; position < match.end; position++) {
        if (
          position >= syllableOffset &&
          position < syllableOffset + sylLower.length
        ) {
          covered.add(position - syllableOffset);
        }
      }
      sylBlocks.push({
        letters: match.text,
        isCombo: true,
        comboType: match.type,
        start: match.start - syllableOffset,
      });
    }

    // Find vowel combos in this syllable
    for (let i = 0; i < sylLower.length - 1; i++) {
      const absoluteIndex = syllableOffset + i;
      if (covered.has(i) || priorityCovered.has(absoluteIndex)) continue;

      // Check 3-letter combos
      if (i < sylLower.length - 2) {
        const tri = sylLower.substring(i, i + 3);
        const triIsAvailable = [0, 1, 2].every(
          (offset) =>
            !covered.has(i + offset) &&
            !priorityCovered.has(absoluteIndex + offset),
        );
        if (triIsAvailable && (tri === "igh" || VOWEL_COMBOS.has(tri))) {
          for (let j = i; j < i + 3; j++) covered.add(j);
          sylBlocks.push({ letters: tri, isCombo: true, comboType: "vowel_combo", start: i });
          continue;
        }
      }

      // Check 2-letter combos
      const bi = sylLower.substring(i, i + 2);
      const biIsAvailable =
        !covered.has(i + 1) &&
        !priorityCovered.has(absoluteIndex + 1);
      if (
        biIsAvailable &&
        (VOWEL_COMBOS.has(bi) || R_CONTROLLED.has(bi))
      ) {
        for (let j = i; j < i + 2; j++) covered.add(j);
        sylBlocks.push({ letters: bi, isCombo: true, comboType: "vowel_combo", start: i });
        continue;
      }

      // Check consonant blends
      if (
        biIsAvailable &&
        CONSONANT_BLENDS.has(bi) &&
        !(bi === "st" && isSilentTInSt(lower, absoluteIndex))
      ) {
        for (let j = i; j < i + 2; j++) covered.add(j);
        sylBlocks.push({ letters: bi, isCombo: true, comboType: "consonant_blend", start: i });
        continue;
      }
    }

    // Detect magic e pattern: vowel + single consonant + e at end of syllable
    // Merge the trailing "consonant + e" into a magic_e block
    if (sylLower.length >= 3) {
      const lastIdx = sylLower.length - 1;
      const penult = lastIdx - 1; // position of consonant before final e
      if (
        sylLower[lastIdx] === "e" &&
        isConsonant(sylLower[penult]) &&
        !covered.has(penult) &&
        !priorityCovered.has(syllableOffset + penult) &&
        !priorityCovered.has(syllableOffset + lastIdx)
      ) {
        // Check that there is a vowel before the consonant
        let hasVowelBefore = false;
        for (let i = 0; i < penult; i++) {
          if (!covered.has(i) && isVowelOrY(sylLower[i])) {
            hasVowelBefore = true;
            break;
          }
        }
        // Also accept if a vowel combo was already found
        if (!hasVowelBefore) {
          hasVowelBefore = sylBlocks.some(
            (b) => b.comboType === "vowel_combo" || b.comboType === "r_controlled",
          );
        }
        if (hasVowelBefore) {
          // Remove any single-letter entries for these positions
          for (let i = sylBlocks.length - 1; i >= 0; i--) {
            if (sylBlocks[i].start >= penult && sylBlocks[i].start <= lastIdx) {
              sylBlocks.splice(i, 1);
            }
          }
          covered.add(penult);
          covered.add(lastIdx);
          sylBlocks.push({
            letters: sylLower.substring(penult),
            isCombo: true,
            comboType: "magic_e",
            start: penult,
          });
        }
      }
    }

    // Fill in single letters for uncovered positions
    for (let i = 0; i < sylLower.length; i++) {
      if (
        !covered.has(i) &&
        !priorityCovered.has(syllableOffset + i)
      ) {
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
    syllableOffset += sylLower.length;
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
