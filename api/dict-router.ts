/**
 * Dictionary Lookup Router
 * - Youdao suggest: Chinese definitions (free, no key needed)
 * - Free Dictionary API: phonetic + examples
 * - Youdao Translation API: Chinese definitions (with key, fallback)
 */

import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { env } from "./lib/env";
import crypto from "crypto";
import { splitSyllables } from "../src/utils/phonics";

// ============================================================
// Youdao Translation API (V3 sign) - for Chinese definitions
// ============================================================

const YOUDAO_API_URL = "https://openapi.youdao.com/api";

function sha256(str: string): string {
  return crypto.createHash("sha256").update(str).digest("hex");
}

function truncateInput(q: string): string {
  const len = q.length;
  if (len <= 20) return q;
  return q.substring(0, 10) + len + q.substring(len - 10);
}

interface YoudaoResponse {
  errorCode?: string;
  query?: string;
  translation?: string[];
  basic?: {
    phonetic?: string;
    "uk-phonetic"?: string;
    "us-phonetic"?: string;
    explains?: string[];
  };
  web?: Array<{ key: string; value: string[] }>;
}

/** Youdao Translation API — returns Chinese translation + dict info if available */
async function fetchYoudaoTranslate(word: string): Promise<{
  phonetic: string;
  definition: string;
  example: string;
} | null> {
  const appKey = env.youdaoAppKey;
  const appSecret = env.youdaoAppSecret;
  if (!appKey || !appSecret) return null;

  const salt = crypto.randomUUID();
  const curtime = Math.floor(Date.now() / 1000).toString();
  const input = truncateInput(word);
  const sign = sha256(appKey + input + salt + curtime + appSecret);

  try {
    const res = await fetch(YOUDAO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        q: word, from: "en", to: "zh-CHS",
        appKey, salt, sign, signType: "v3", curtime,
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return null;

    const data = (await res.json()) as YoudaoResponse;
    if (data.errorCode && data.errorCode !== "0") return null;

    const phonetic = data.basic
      ? (data.basic["us-phonetic"] || data.basic["uk-phonetic"] || data.basic.phonetic || "")
      : "";

    let definition = "";
    if (data.basic?.explains && data.basic.explains.length > 0) {
      definition = data.basic.explains.join("\n");
    } else if (data.translation && data.translation.length > 0) {
      definition = data.translation.join("；");
    }

    let example = "";
    if (data.web && data.web.length > 0) {
      const examples: string[] = [];
      for (const entry of data.web) {
        if (entry.value && entry.value.length > 0) {
          examples.push(`${entry.key}: ${entry.value.join("；")}`);
        }
        if (examples.length >= 2) break;
      }
      example = examples.join("\n");
    }

    if (!definition && !phonetic) return null;
    return { phonetic, definition, example };
  } catch {
    return null;
  }
}

// ============================================================
// Youdao Suggest API — Chinese definitions (free, no key)
// ============================================================

async function fetchYoudaoSuggest(word: string): Promise<{ definitions: string } | null> {
  try {
    const res = await fetch(
      `https://dict.youdao.com/suggest?q=${encodeURIComponent(word)}&doctype=json&num=1`,
      {
        headers: {
          "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        },
        signal: AbortSignal.timeout(8000),
      }
    );
    if (!res.ok) return null;

    const data = (await res.json()) as {
      result?: { code: number; msg: string };
      data?: {
        entries?: Array<{ entry: string; explain: string }>;
      };
    };

    const entry = data.data?.entries?.[0];
    if (!entry?.explain) return null;

    return { definitions: entry.explain };
  } catch {
    return null;
  }
}

// ============================================================
// Free Dictionary API — phonetic + examples
// ============================================================

async function fetchFreeDict(word: string): Promise<{
  phonetic: string;
  examples: string[];
  simpleDefinition: string;
} | null> {
  try {
    const res = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(word.toLowerCase())}`,
      { signal: AbortSignal.timeout(10000) }
    );
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
    let phonetic = entry.phonetic || "";
    if (!phonetic) {
      // Prefer shorter/simpler phonetic (without ː) when multiple available
      const candidates = entry.phonetics
        .map((p) => p.text)
        .filter((t): t is string => !!t);
      // Pick first without ː, fallback to first with ː
      phonetic = candidates.find((t) => !t.includes("ː")) || candidates[0] || "";
    }
    phonetic = phonetic.replace(/ɹ/g, "r");

    const examples: string[] = [];
    let simpleDefinition = "";
    for (const meaning of entry.meanings) {
      for (const def of meaning.definitions) {
        if (!simpleDefinition && def.definition) {
          simpleDefinition = def.definition;
        }
        if (def.example && examples.length < 2) {
          examples.push(def.example);
        }
      }
    }

    return { phonetic, examples, simpleDefinition };
  } catch {
    return null;
  }
}

// ============================================================
// Router
// ============================================================

export const dictRouter = createRouter({
  readingHint: publicQuery
    .input(
      z.object({
        word: z.string().min(1).max(50),
        context: z.string().max(600).optional(),
      }),
    )
    .query(async ({ input }) => {
      const word = input.word.toLowerCase().replace(/[^a-z'-]/g, "");
      if (!word) {
        throw new Error("Invalid reading word");
      }
      const [youdao, freeDict] = await Promise.all([
        fetchYoudaoSuggest(word),
        fetchFreeDict(word),
      ]);
      const contextSentence = input.context
        ?.split(/(?<=[.!?])\s+/)
        .find((sentence) =>
          new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
            .test(sentence),
        );
      const simpleDefinition = freeDict?.simpleDefinition
        ? freeDict.simpleDefinition.split(/[.;]/)[0].trim()
        : `A word used to talk about ${word}.`;

      return {
        word,
        syllables: splitSyllables(word),
        phonetic: freeDict?.phonetic || "",
        simple_definition: simpleDefinition,
        example_sentence:
          contextSentence?.trim() ||
          freeDict?.examples[0] ||
          `I can use the word "${word}" in my story.`,
        translation: youdao?.definitions || "",
        image_keyword: word.replace(/'/g, ""),
      };
    }),

  lookup: publicQuery
    .input(z.object({ word: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const word = input.word.trim().toLowerCase();

      // Query all APIs in parallel for best results:
      // 1. Youdao translate (Chinese defs + phonetic, needs key)
      // 2. Youdao suggest (Chinese defs, free, no key)
      // 3. FreeDict (phonetic + examples)
      const [youdaoTrans, youdaoSuggest, freeDict] = await Promise.all([
        fetchYoudaoTranslate(word),
        fetchYoudaoSuggest(word),
        fetchFreeDict(word),
      ]);

      // Pick best definition: Youdao translate > Youdao suggest > none
      const definition = youdaoTrans?.definition
        || youdaoSuggest?.definitions
        || "";

      // Pick best phonetic: Youdao translate > FreeDict > none
      const phonetic = youdaoTrans?.phonetic
        || freeDict?.phonetic
        || "";

      // Pick best examples: FreeDict > Youdao translate web defs
      const example = freeDict?.examples.join("\n")
        || youdaoTrans?.example
        || "";

      // If we got nothing at all, return not found
      if (!definition && !phonetic) {
        return { found: false as const, phonetic: "", definition: "", example: "" };
      }

      return {
        found: true as const,
        phonetic,
        definition,
        example,
        partial: !definition || !phonetic,
      };
    }),
});
