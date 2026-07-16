/**
 * Dictionary Lookup Router - Youdao Translation API
 * 有道智云翻译API: https://ai.youdao.com/doc.s#guide
 *
 * Sign algorithm (v2):
 *   sign = MD5(appKey + q + salt + appSecret)
 *
 * Requires env vars: YOUDAO_APP_KEY, YOUDAO_APP_SECRET
 */

import { z } from "zod";
import { createRouter, publicQuery } from "./middleware";
import { env } from "./lib/env";
import crypto from "crypto";

const YOUDAO_API_URL = "https://openapi.youdao.com/api";

/** Generate MD5 hash */
function md5(str: string): string {
  return crypto.createHash("md5").update(str).digest("hex");
}

/** Youdao API response type */
interface YoudaoResponse {
  errorCode?: string;
  query?: string;
  translation?: string[];
  basic?: {
    phonetic?: string;          // 默认音标
    "uk-phonetic"?: string;     // 英式音标
    "us-phonetic"?: string;     // 美式音标
    "uk-speech"?: string;
    "us-speech"?: string;
    explains?: string[];        // 中文释义（带词性）
  };
  web?: Array<{
    key: string;
    value: string[];
  }>;
  l?: string;
}

/** Call Youdao Translation API */
async function fetchYoudao(word: string): Promise<{
  phonetic: string;
  definition: string;
  example: string;
} | null> {
  const appKey = env.youdaoAppKey;
  const appSecret = env.youdaoAppSecret;

  // If no credentials configured, skip
  if (!appKey || !appSecret) {
    return null;
  }

  const salt = crypto.randomUUID();
  const sign = md5(appKey + word + salt + appSecret);

  const body = new URLSearchParams({
    q: word,
    from: "en",
    to: "zh-CHS",
    appKey,
    salt,
    sign,
  });

  try {
    const res = await fetch(YOUDAO_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
      signal: AbortSignal.timeout(8000),
    });

    if (!res.ok) return null;

    const data = (await res.json()) as YoudaoResponse;

    // Error code 0 means success
    if (data.errorCode && data.errorCode !== "0") {
      console.error(`[youdao] errorCode=${data.errorCode} for word="${word}"`);
      return null;
    }

    // Extract phonetic (prefer US > UK > default)
    let phonetic = "";
    if (data.basic) {
      phonetic = data.basic["us-phonetic"] || data.basic["uk-phonetic"] || data.basic.phonetic || "";
    }

    // Extract definitions with part-of-speech
    let definition = "";
    if (data.basic?.explains && data.basic.explains.length > 0) {
      definition = data.basic.explains.join("\n");
    } else if (data.translation && data.translation.length > 0) {
      // Fallback to translation result
      definition = data.translation.join("；");
    }

    // Extract examples from web definitions (first 2)
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
  } catch (err) {
    console.error("[youdao] fetch error:", err);
    return null;
  }
}

// ========== Fallback: iciba (Chinese definitions) ==========

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

// ========== Fallback: Free Dictionary API (phonetic + examples) ==========

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

    let phonetic = entry.phonetic || "";
    if (!phonetic) {
      for (const p of entry.phonetics) {
        if (p.text) { phonetic = p.text; break; }
      }
    }
    phonetic = phonetic.replace(/ɹ/g, "r");

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

// ========== Router ==========

export const dictRouter = createRouter({
  lookup: publicQuery
    .input(z.object({ word: z.string().min(1) }))
    .mutation(async ({ input }) => {
      const word = input.word.trim().toLowerCase();

      // Try Youdao first if configured
      const hasYoudao = !!(env.youdaoAppKey && env.youdaoAppSecret);
      if (hasYoudao) {
        const youdaoResult = await fetchYoudao(word);
        if (youdaoResult) {
          return {
            found: true as const,
            phonetic: youdaoResult.phonetic,
            definition: youdaoResult.definition,
            example: youdaoResult.example,
            source: "youdao" as const,
          };
        }
      }

      // Fallback: iciba + Free Dictionary API (parallel)
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
