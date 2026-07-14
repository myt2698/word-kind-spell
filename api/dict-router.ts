/**
 * Dictionary Lookup Router
 * - iciba: Chinese definitions (~100ms)
 * - Free Dictionary API: phonetic + English examples (~1-2s)
 */

import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";

/** Fetch Chinese definitions from iciba */
async function fetchIciba(word: string): Promise<{ definitions: string } | null> {
  try {
    const url = `https://dict-mobile.iciba.com/interface/index.php?c=word&m=getsuggest&nums=1&client=6&is_need_mean=1&word=${encodeURIComponent(word.toLowerCase())}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
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

/** Fetch phonetic + examples from Free Dictionary API */
async function fetchFreeDict(word: string): Promise<{
  phonetic: string;
  examples: string[];
} | null> {
  try {
    const url = `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const data = (await res.json()) as Array<{
      phonetic?: string;
      phonetics: Array<{ text?: string; audio?: string }>;
      meanings: Array<{
        partOfSpeech: string;
        definitions: Array<{ definition: string; example?: string }>;
      }>;
    }>;
    if (!data || data.length === 0) return null;

    const entry = data[0];

    // Phonetic
    let phonetic = entry.phonetic || "";
    if (!phonetic) {
      for (const p of entry.phonetics) {
        if (p.text) { phonetic = p.text; break; }
      }
    }

    // Examples (up to 2)
    const examples: string[] = [];
    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions) {
        if (def.example && examples.length < 2) {
          examples.push(def.example);
        }
      }
    }

    return { phonetic, examples };
  } catch {
    return null;
  }
}

export const dictRouter = createRouter({
  lookup: publicQuery
    .input(z.object({ word: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const word = input.word.trim().toLowerCase();

      // Query both APIs in parallel
      const [icibaResult, dictResult] = await Promise.all([
        fetchIciba(word),
        fetchFreeDict(word),
      ]);

      if (!icibaResult && !dictResult) {
        return { found: false as const, phonetic: "", definition: "", example: "" };
      }

      return {
        found: true as const,
        phonetic: dictResult?.phonetic || "",
        definition: icibaResult?.definitions || "",
        example: (dictResult?.examples || []).join("\n"),
        partial: !icibaResult || !dictResult,
      };
    }),
});
