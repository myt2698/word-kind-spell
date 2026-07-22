/**
 * Audio playback — local audio first, Web Speech fallback
 *
 * Strategy:
 * 1. Cache hit (local audio loaded) → play instantly (sync)
 * 2. No cache → Web Speech immediately (sync, no delay) + fetch local in background
 * 3. No Web Speech voices → Youdao API
 *
 * This ensures the user ALWAYS hears something on the first click.
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
const fetchingSet = new Set<number>();

/** Play base64 audio data */
function playBase64(base64: string) {
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
    const a = new Audio(url);
    a.onended = () => URL.revokeObjectURL(url);
    a.play().catch(() => {});
  } catch { /* ignore */ }
}

/** Fetch audio from server and cache it (fire-and-forget) */
function fetchAndCacheAudio(wordId: number) {
  if (fetchingSet.has(wordId)) return;
  fetchingSet.add(wordId);

  fetch(`/api/trpc/audio.getByWordId?input=${encodeURIComponent(JSON.stringify({ wordId }))}`)
    .then((r) => r.json())
    .then((json) => {
      const result = json.result?.data;
      if (result?.hasAudio && result?.audioData) {
        audioCache.set(wordId, result.audioData);
      } else {
        audioCache.set(wordId, null);
      }
    })
    .catch(() => { /* ignore */ });
}

/** Warm up speech synthesis engine (Chrome lazy-load bug) */
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

/** Web Speech API — synchronous, instant */
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
  } catch {
    return false;
  }
}

/** Youdao API fallback */
function speakYoudao(word: string) {
  if (!navigator.onLine) return;
  try {
    new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`).play().catch(() => {});
  } catch { /* ignore */ }
}

/**
 * Speak a word.
 *
 * With wordId:
 *   - Cache hit → play local audio instantly
 *   - Cache miss → Web Speech NOW + fetch local in background
 *
 * Without wordId:
 *   - Web Speech → Youdao fallback
 */
export function speakWord(word: string, wordId?: number) {
  if (!word) return;

  // Fast path: cached local audio (second click onwards)
  if (wordId && audioCache.has(wordId)) {
    const cached = audioCache.get(wordId);
    if (cached) {
      playBase64(cached);
      return;
    }
    // cached === null means no audio exists, fall through to Web Speech
  }

  // Start fetching local audio in background (if wordId provided and not yet fetched)
  if (wordId && !audioCache.has(wordId)) {
    fetchAndCacheAudio(wordId);
  }

  // Immediate path: Web Speech (always works on first click)
  if (speakWebSpeech(word)) return;

  // Last resort: Youdao API
  speakYoudao(word);
}
