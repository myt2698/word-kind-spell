/**
 * Dictionary Lookup Router
 * Combines multiple free APIs:
 * - iciba: Chinese definitions
 * - Free Dictionary API: phonetic
 * - Tatoeba: bilingual example sentences (EN/ZH)
 */

import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

/** Fetch Chinese definitions from iciba */
async function fetchIciba(word: string): Promise<{ definitions: string } | null> {
  try {
    const url = `https://dict-mobile.iciba.com/interface/index.php?c=word&m=getsuggest&nums=1&client=6&is_need_mean=1&word=${encodeURIComponent(word.toLowerCase())}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      message?: Array<{
        key: string;
        paraphrase: string;
        means: Array<{ part: string; means: string[] }>;
      }>;
      status: number;
    };
    if (!data.message || data.message.length === 0) return null;

    const entry = data.message[0];
    let definitions = "";

    if (entry.means && entry.means.length > 0) {
      for (const m of entry.means) {
        const part = m.part;
        const means = m.means.join("，");
        if (definitions) definitions += "\n";
        definitions += `${part} ${means}`;
      }
    }

    if (!definitions && entry.paraphrase) {
      definitions = entry.paraphrase;
    }

    if (!definitions) return null;
    return { definitions };
  } catch {
    return null;
  }
}

/** Fetch phonetic from Free Dictionary API */
async function fetchPhonetic(word: string): Promise<string> {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return "";
    const data = (await res.json()) as Array<{
      phonetic?: string;
      phonetics: Array<{ text?: string; audio?: string }>;
    }>;
    if (!data || data.length === 0) return "";

    const entry = data[0];
    let phonetic = entry.phonetic || "";
    if (!phonetic) {
      for (const p of entry.phonetics) {
        if (p.text) { phonetic = p.text; break; }
      }
    }
    return phonetic;
  } catch {
    return "";
  }
}

/** Check if sentence contains the target word as a whole word */
function sentenceContainsWord(sentence: string, word: string): boolean {
  // Match as whole word (word boundary), case-insensitive
  const pattern = new RegExp(
    "(?:^|[^a-zA-Z])" + word.replace(/[.*+?^${}()|[\]\\]/g, "\\$") + "(?:[^a-zA-Z]|$)",
    "i"
  );
  return pattern.test(sentence);
}

/** Fetch bilingual example sentences from Tatoeba */
async function fetchExamples(word: string): Promise<string> {
  try {
    const lowerWord = word.toLowerCase();
    // Use = prefix for exact word match on Tatoeba
    const url = `https://tatoeba.org/en/api_v0/search?from=eng&to=cmn&query=${encodeURIComponent("=" + lowerWord)}&sort=relevance&limit=10`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return "";
    const data = (await res.json()) as {
      results: Array<{
        text: string;
        translations: Array<Array<{ text: string }>>;
      }>;
    };

    const examples: string[] = [];
    for (const result of data.results) {
      if (examples.length >= 2) break;

      const en = result.text;

      // Filter: only keep sentences that actually contain the target word
      if (!sentenceContainsWord(en, lowerWord)) {
        continue;
      }

      let zh = "";
      for (const transGroup of result.translations) {
        if (transGroup && transGroup.length > 0) {
          zh = transGroup[0].text;
          break;
        }
      }

      if (zh) {
        examples.push(`${en}\n${zh}`);
      } else {
        examples.push(en);
      }
    }

    return examples.join("\n\n");
  } catch {
    return "";
  }
}

export const dictRouter = createRouter({
  lookup: publicQuery
    .input(z.object({ word: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const word = input.word.trim().toLowerCase();

      // Query all 3 APIs in parallel
      const [icibaResult, phonetic, example] = await Promise.all([
        fetchIciba(word),
        fetchPhonetic(word),
        fetchExamples(word),
      ]);

      if (!icibaResult && !phonetic && !example) {
        return { found: false as const, phonetic: "", definition: "", example: "" };
      }

      return {
        found: true as const,
        phonetic,
        definition: icibaResult?.definitions || "",
        example,
        partial: !icibaResult || (!phonetic && !example),
      };
    }),
});
