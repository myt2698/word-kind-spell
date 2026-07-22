/**
 * Audio playback — local audio first, instant response.
 *
 * Flow:
 * 1. Cache hit → play immediately (sync)
 * 2. Cache miss → fetch from server (async, ~100-300ms) → play local audio
 * 3. No local audio → Web Speech (instant fallback)
 * 4. No voices → Youdao API
 *
 * speakWord is async so the first click ALWAYS tries local audio first.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  try {
    const v = window.speechSynthesis.getVoices();
    if (v && v.length > 0) cachedVoices = v;
  } catch { /* ignore */ }
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

/** Global audio cache: wordId → base64 | null */
const audioCache = new Map<number, string | null>();

/** Play base64 audio */
function playBase64(base64: string) {
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
    const a = new Audio(url);
    a.onended = () => URL.revokeObjectURL(url);
    a.play().catch(() => {});
  } catch { /* ignore */ }
}

/** Warm up speech synthesis engine */
let engineWarmed = false;
function warmEngine() {
  if (engineWarmed) return;
  try {
    const s = window.speechSynthesis;
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    s.speak(u);
    s.cancel();
  } catch { /* ignore */ }
  engineWarmed = true;
}

/** Web Speech API */
function speakWebSpeech(word: string): boolean {
  if (!("speechSynthesis" in window)) return false;
  warmEngine();
  const list = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const voice =
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Google US")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Samantha")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Daniel")) ||
    list.find((v) => v.lang.startsWith("en"));
  if (!voice) return false;
  try {
    const s = window.speechSynthesis;
    s.resume();
    s.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.85;
    u.volume = 1;
    u.voice = voice;
    s.speak(u);
    return true;
  } catch { return false; }
}

/** Youdao API */
function speakYoudao(word: string) {
  if (!navigator.onLine) return;
  try {
    new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`).play().catch(() => {});
  } catch { /* ignore */ }
}

/** Fetch audio from server */
async function fetchAudio(wordId: number): Promise<string | null> {
  if (audioCache.has(wordId)) return audioCache.get(wordId) ?? null;
  try {
    const res = await fetch(`/api/trpc/audio.getByWordId?input=${encodeURIComponent(JSON.stringify({ wordId }))}`);
    const json = await res.json();
    const result = json.result?.data;
    if (result?.hasAudio && result?.audioData) {
      audioCache.set(wordId, result.audioData);
      return result.audioData;
    }
    audioCache.set(wordId, null);
    return null;
  } catch {
    return null;
  }
}

/**
 * Speak a word. LOCAL AUDIO FIRST — always.
 *
 * With wordId:
 *   1. Check cache → play if hit
 *   2. Fetch from server → play if exists
 *   3. Web Speech fallback
 *
 * Without wordId:
 *   1. Web Speech → Youdao
 */
export async function speakWord(word: string, wordId?: number) {
  if (!word) return;

  // Path A: With wordId — try local audio first
  if (wordId) {
    // Fast: cache hit
    if (audioCache.has(wordId)) {
      const cached = audioCache.get(wordId);
      if (cached) { playBase64(cached); return; }
      // cached === null → no audio, fall through to Web Speech
    } else {
      // Fetch from server (first time)
      const base64 = await fetchAudio(wordId);
      if (base64) { playBase64(base64); return; }
      // No local audio, fall through to Web Speech
    }
  }

  // Path B: Web Speech (fallback)
  if (speakWebSpeech(word)) return;

  // Path C: Youdao API (last resort)
  speakYoudao(word);
}
