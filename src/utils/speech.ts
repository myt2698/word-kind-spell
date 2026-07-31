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

// ---- Audio cache: wordId -> binary audio URL | null ----
const audioCache = new Map<number, string | null>();

// ---- Persistent audio element ----
let _audio: HTMLAudioElement | null = null;

function getAudio(): HTMLAudioElement {
  if (!_audio) _audio = document.createElement("audio");
  return _audio;
}

/** Preload audio for given wordIds. Call when page loads. */
export function preloadAudio(wordIds: number[]) {
  const ids = [...new Set(wordIds)]
    .filter((id) => Number.isInteger(id) && id > 0 && !audioCache.has(id));

  for (let offset = 0; offset < ids.length; offset += 50) {
    const batch = ids.slice(offset, offset + 50);
    for (const id of batch) audioCache.set(id, null);

    const input = JSON.stringify({ json: { wordIds: batch } });
    fetch(`/api/trpc/audio.getByWordIds?input=${encodeURIComponent(input)}`, {
      headers: { Accept: "application/json" },
      credentials: "include",
    })
      .then((r) => r.json())
      .then((json) => {
        const data = json.result?.data;
        const rows = (data?.json ?? data) as Array<{
          wordId: number;
          audioUrl: string;
        }> | undefined;
        if (!Array.isArray(rows)) return;
        for (const row of rows) {
          if (row.audioUrl) audioCache.set(row.wordId, row.audioUrl);
        }
      })
      .catch(() => {
        // Keep null so playback immediately falls back to browser speech.
      });
  }
}

/** Play base64 — all sync operations */
function playAudioUrl(audioUrl: string) {
  try {
    const a = getAudio();
    a.pause();
    a.src = audioUrl;
    a.currentTime = 0;
    a.play().catch(() => {});
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
    if (cached) { playAudioUrl(cached); return; }
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
