/**
 * Cross-browser TTS
 * Strategy: Web Speech API first (instant, no network), Youdao API fallback.
 * This gives the fastest response on most devices.
 */

let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  try {
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) cachedVoices = voices;
  } catch { /* ignore */ }
}

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
  // Warm-up: Chrome's speechSynthesis is lazy-loaded and the first
  // speak() call often fails silently. Sending an empty utterance
  // wakes up the engine so the *real* first click works immediately.
  try {
    const warm = new SpeechSynthesisUtterance("");
    warm.volume = 0;
    window.speechSynthesis.speak(warm);
    window.speechSynthesis.cancel();
  } catch { /* ignore */ }
}

let audioUnlocked = false;

function unlockAudio() {
  if (audioUnlocked) return;
  try { new Audio().play().catch(() => {}); } catch { /* ignore */ }
  audioUnlocked = true;
}

/** Check if Web Speech has any English voice available */
function hasEnglishVoice(): boolean {
  if (!("speechSynthesis" in window)) return false;
  const list = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  return list.some((v) => v.lang.startsWith("en"));
}

/** Speak using Web Speech API — instant, no network */
function speakWithWebSpeech(word: string): boolean {
  if (!("speechSynthesis" in window)) return false;

  const list = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const enVoice =
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Google US")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Samantha")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Daniel")) ||
    list.find((v) => v.lang.startsWith("en"));

  if (!enVoice) return false;

  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(word);
    u.lang = "en-US";
    u.rate = 0.85;
    u.volume = 1;
    u.voice = enVoice;
    window.speechSynthesis.speak(u);
    return true;
  } catch {
    return false;
  }
}

/** Fallback: Youdao API — requires network, has latency */
function speakWithYoudao(word: string) {
  if (!navigator.onLine) return;
  try {
    const a = new Audio();
    a.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
    a.play().catch(() => {});
  } catch { /* ignore */ }
}

/**
 * Speak a word. Fastest path first.
 * 1. Web Speech API (instant) — works on most phones/PCs
 * 2. Youdao API (network) — fallback for devices without TTS voices
 */
export function speakWord(word: string) {
  if (!word) return;
  unlockAudio();

  // Try instant Web Speech first
  if (speakWithWebSpeech(word)) return;

  // Fallback to Youdao API
  speakWithYoudao(word);
}
