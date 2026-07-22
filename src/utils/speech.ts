/**
 * Audio playback with local cache first, then Web Speech, then Youdao API.
 * Local audio (from DB) is the fastest path — plays instantly.
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

/** Play base64 audio data directly */
function playBase64Audio(base64: string) {
  try {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    const blob = new Blob([bytes], { type: "audio/mpeg" });
    const url = URL.createObjectURL(blob);
    const a = new Audio(url);
    a.onended = () => URL.revokeObjectURL(url);
    a.play().catch(() => {});
  } catch { /* ignore */ }
}

/** Try local audio via API fetch */
async function tryLocalAudio(wordId: number): Promise<boolean> {
  try {
    // Use a global cache to avoid repeated fetches for the same word
    const cache = (window as any).__wordAudioCache || ((window as any).__wordAudioCache = new Map());

    // Check cache first
    if (cache.has(wordId)) {
      const data = cache.get(wordId);
      if (data) playBase64Audio(data);
      return !!data;
    }

    // Fetch from API
    const res = await fetch(`/api/trpc/audio.getByWordId?input=${encodeURIComponent(JSON.stringify({ wordId }))}`);
    if (!res.ok) return false;
    const json = await res.json();
    const result = json.result?.data;

    if (result?.hasAudio && result?.audioData) {
      cache.set(wordId, result.audioData);
      playBase64Audio(result.audioData);
      return true;
    }

    cache.set(wordId, null); // Mark as checked but no audio
    return false;
  } catch {
    return false;
  }
}

/** Web Speech API fallback */
function speakWithWebSpeech(word: string): boolean {
  if (!("speechSynthesis" in window)) return false;
  const list = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const voice =
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Google US")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Samantha")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Daniel")) ||
    list.find((v) => v.lang.startsWith("en"));
  if (!voice) return false;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US"; u.rate = 0.85; u.volume = 1; u.voice = voice;
    window.speechSynthesis.speak(u);
    return true;
  } catch { return false; }
}

/** Youdao API fallback */
function speakWithYoudao(word: string) {
  if (!navigator.onLine) return;
  try {
    new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`).play().catch(() => {});
  } catch { /* ignore */ }
}

/**
 * Speak a word. Priority:
 * 1. Local audio (fastest, from DB) — async fetch + cache
 * 2. Web Speech API (instant, device TTS)
 * 3. Youdao API (network, last resort)
 *
 * For sync callers without wordId, pass wordId to enable local audio.
 */
export function speakWord(word: string, wordId?: number) {
  if (!word) return;

  // Path 1: Try local audio if wordId is provided
  if (wordId) {
    tryLocalAudio(wordId).then((played) => {
      if (!played) {
        // Fall back to Web Speech or Youdao
        if (!speakWithWebSpeech(word)) speakWithYoudao(word);
      }
    });
    return;
  }

  // No wordId: direct Web Speech -> Youdao
  if (!speakWithWebSpeech(word)) speakWithYoudao(word);
}
