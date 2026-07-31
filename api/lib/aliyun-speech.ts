import { createHmac, randomUUID } from "node:crypto";
import { env } from "./env";

const audioCache = new Map<string, Promise<Buffer | null>>();
const MAX_CACHE_ENTRIES = 1000;
const TOKEN_REFRESH_MARGIN_SECONDS = 5 * 60;

let tokenCache: { id: string; expireTime: number } | null = null;
let tokenRequest: Promise<string | null> | null = null;

function percentEncode(value: string): string {
  return encodeURIComponent(value)
    .replace(/\+/g, "%20")
    .replace(/\*/g, "%2A")
    .replace(/%7E/g, "~");
}

async function createToken(): Promise<{
  Token?: { Id?: string; ExpireTime?: number };
}> {
  const parameters: Record<string, string> = {
    AccessKeyId: env.aliyunAccessKeyId,
    Action: "CreateToken",
    Format: "JSON",
    RegionId: "cn-shanghai",
    SignatureMethod: "HMAC-SHA1",
    SignatureNonce: randomUUID(),
    SignatureVersion: "1.0",
    Timestamp: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
    Version: "2019-02-28",
  };
  const canonicalQuery = Object.keys(parameters)
    .sort()
    .map(
      (key) => `${percentEncode(key)}=${percentEncode(parameters[key] ?? "")}`,
    )
    .join("&");
  const stringToSign = `GET&%2F&${percentEncode(canonicalQuery)}`;
  const signature = createHmac(
    "sha1",
    `${env.aliyunAccessKeySecret}&`,
  )
    .update(stringToSign)
    .digest("base64");
  const url =
    "https://nls-meta.cn-shanghai.aliyuncs.com/?" +
    `${canonicalQuery}&Signature=${percentEncode(signature)}`;
  const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });
  const result = (await response.json()) as {
    Token?: { Id?: string; ExpireTime?: number };
    Message?: string;
  };
  if (!response.ok) {
    throw new Error(result.Message || `Token endpoint returned ${response.status}`);
  }
  return result;
}

async function requestToken(): Promise<string | null> {
  if (!env.aliyunAccessKeyId || !env.aliyunAccessKeySecret) return null;

  const now = Math.floor(Date.now() / 1000);
  if (
    tokenCache &&
    tokenCache.expireTime - TOKEN_REFRESH_MARGIN_SECONDS > now
  ) {
    return tokenCache.id;
  }
  if (tokenRequest) return tokenRequest;

  tokenRequest = (async () => {
    try {
      const result = await createToken();
      const id = result.Token?.Id;
      const expireTime = result.Token?.ExpireTime;
      if (!id || !expireTime) {
        console.error("[ALIYUN SPEECH] Token response is incomplete");
        return null;
      }
      tokenCache = { id, expireTime };
      return id;
    } catch (error) {
      console.error("[ALIYUN SPEECH] Token request failed:", error);
      return null;
    } finally {
      tokenRequest = null;
    }
  })();
  return tokenRequest;
}

async function requestAliyunSpeech(text: string): Promise<Buffer | null> {
  if (!env.aliyunSpeechAppKey) return null;
  const token = await requestToken();
  if (!token) return null;

  try {
    const response = await fetch(
      "https://nls-gateway-cn-shanghai.aliyuncs.com/stream/v1/tts",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appkey: env.aliyunSpeechAppKey,
          token,
          text,
          format: "mp3",
          sample_rate: 16000,
          voice: env.aliyunSpeechVoice || "annie",
          volume: 70,
          speech_rate: -100,
          pitch_rate: 0,
        }),
        signal: AbortSignal.timeout(15_000),
      },
    );
    const contentType = response.headers.get("content-type") ?? "";
    if (!response.ok || !contentType.toLowerCase().startsWith("audio/")) {
      console.error(
        "[ALIYUN SPEECH] Synthesis failed:",
        response.status,
        await response.text(),
      );
      return null;
    }
    return Buffer.from(await response.arrayBuffer());
  } catch (error) {
    console.error("[ALIYUN SPEECH] Synthesis request failed:", error);
    return null;
  }
}

export function synthesizeSpeech(text: string): Promise<Buffer | null> {
  const normalizedText = text.trim();
  const key = normalizedText.toLowerCase();
  const existing = audioCache.get(key);
  if (existing) return existing;

  if (audioCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = audioCache.keys().next().value;
    if (oldestKey) audioCache.delete(oldestKey);
  }
  const pending = requestAliyunSpeech(normalizedText);
  audioCache.set(key, pending);
  pending.then((audio) => {
    if (!audio) audioCache.delete(key);
  });
  return pending;
}
