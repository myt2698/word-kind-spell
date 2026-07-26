/**
 * Audio playback — sync only, no async in the play path.
 *
 * iOS Safari requirement: audio.play() MUST be in the synchronous call chain
 * of a user gesture. Any await/fetch breaks this chain.
 *
 * Strategy:
 * - Page load: preload all audio into memory cache (async, background)
 * - On click: check cache → play immediately (sync)
 * - Cache miss: Web Speech (sync fallback) + lazy load for next time
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

// ---- Audio cache: wordId -> base64 | null ----
const audioCache = new Map<number, string | null>();

// ---- Persistent audio element ----
let _audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!_audio) _audio = document.createElement("audio");
  return _audio;
}

/** Preload audio for given wordIds. Call when page loads. */
export function preloadAudio(wordIds: number[]) {
  for (const id of wordIds) {
    if (audioCache.has(id)) continue;
    audioCache.set(id, null); // Mark as "fetching"
    fetch(`/api/trpc/audio.getByWordId?input=${encodeURIComponent(JSON.stringify({ wordId: id }))}`)
      .then((r) => r.json())
      .then((json) => {
        const d = json.result?.data;
        audioCache.set(id, d?.hasAudio && d?.audioData ? d.audioData : null);
      })
      .catch(() => audioCache.set(id, null));
  }
}

/** Play base64 — all sync operations */
function playBase64(base64: string) {
  try {
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const a = getAudio();
    a.pause();
    a.src = url;
    a.currentTime = 0;
    a.onended = () => URL.revokeObjectURL(url);
    a.onerror = () => URL.revokeObjectURL(url);
    a.play().catch(() => URL.revokeObjectURL(url));
  } catch { /* ignore */ }
}

/** Web Speech — sync */
function speakWeb(word: string, language = "en-US") {
  if (!("speechSynthesis" in window)) return false;
  try {
    const s = window.speechSynthesis;
    s.resume();
    s.cancel();
    const list = cachedVoices.length > 0 ? cachedVoices : s.getVoices();
    const languagePrefix = language.toLowerCase();
    const broadLanguage = languagePrefix.split("-")[0];
    const v =
      list.find((x) => x.lang.toLowerCase().startsWith(languagePrefix) && x.name.includes("Google")) ||
      list.find((x) => x.lang.toLowerCase().startsWith(languagePrefix)) ||
      list.find((x) => x.lang.toLowerCase().startsWith(broadLanguage) && x.name.includes("Google")) ||
      list.find((x) => x.lang.toLowerCase().startsWith(broadLanguage));
    if (!v) return false;
    const u = new SpeechSynthesisUtterance(word);
    u.lang = language; u.rate = 0.85; u.volume = 1; u.voice = v;
    s.speak(u);
    return true;
  } catch { return false; }
}

/** Youdao — last resort */
function speakYoudao(word: string, pronunciationType = 2) {
  if (!navigator.onLine) return;
  try {
    const a = getAudio();
    a.pause();
    a.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=${pronunciationType}`;
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch { /* ignore */ }
}

/** Unlock audio. MUST be called inside a touchstart handler (before click). */
export function unlockAudio() {
  try { getAudio().play().catch(() => {}); } catch { /* ignore */ }
}

/**
 * Speak a word — SYNC. No await, no fetch inside.
 * 1. Cache hit (base64) -> play instantly
 * 2. Cache miss / null -> Web Speech (sync) + lazy load
 * 3. No voices -> Youdao API
 */
export function speakWord(word: string, wordId?: number) {
  if (!word) return;

  // Path 1: cached local audio
  if (wordId) {
    const cached = audioCache.get(wordId);
    if (cached) { playBase64(cached); return; }
    if (cached === null) {
      // Explicitly cached as "no audio" -> Web Speech
      if (speakWeb(word)) return;
    }
    // "undefined" = not yet fetched -> Web Speech + trigger load
    if (speakWeb(word)) {
      // Lazy load for next time
      preloadAudio([wordId]);
      return;
    }
  }

  // Path 2/3: Web Speech -> Youdao
  if (speakWeb(word)) return;
  speakYoudao(word);
}

/** Speak a British-English example word for the phonics/IPA section. */
export function speakBritishWord(word: string) {
  if (!word) return;
  if (speakWeb(word, "en-GB")) return;
  speakYoudao(word, 1);
}
