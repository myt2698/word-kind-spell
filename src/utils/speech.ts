/**
 * Cross-browser TTS
 * Chrome bug: speechSynthesis is PAUSED until first user gesture.
 * After idle it auto-pauses again. Must resume() before every speak().
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

/** Chrome requires resume() before speak() after any idle period */
function resumeAndSpeak(u: SpeechSynthesisUtterance) {
  const s = window.speechSynthesis;
  s.resume();
  s.cancel(); // clear any stuck utterance
  s.speak(u);
}

/** Try Web Speech. Returns true if a voice was found and speak queued. */
function tryWebSpeech(word: string): boolean {
  if (!("speechSynthesis" in window)) return false;

  const list = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  const voice =
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Google US")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Google")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Samantha")) ||
    list.find((v) => v.lang.startsWith("en") && v.name.includes("Daniel")) ||
    list.find((v) => v.lang.startsWith("en"));

  if (!voice) return false;

  const u = new SpeechSynthesisUtterance(word);
  u.lang = "en-US";
  u.rate = 0.85;
  u.volume = 1;
  u.voice = voice;

  resumeAndSpeak(u);
  return true;
}

/** Youdao fallback */
function tryYoudao(word: string) {
  if (!navigator.onLine) return;
  try {
    new Audio(`https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`).play().catch(() => {});
  } catch { /* ignore */ }
}

/**
 * Speak a word.
 * 1. Web Speech (instant) with auto-retry
 * 2. Youdao API (network fallback)
 */
export function speakWord(word: string) {
  if (!word) return;

  // Try Web Speech immediately
  if (tryWebSpeech(word)) {
    // Chrome sometimes drops the first utterance. Fire a silent retry
    // after 100ms: if the first one worked this is a no-op (cancel clears it).
    // If the first one was lost, this second one will actually play.
    setTimeout(() => {
      if (window.speechSynthesis.paused || window.speechSynthesis.pending) return;
      // If nothing is playing/pending, the first speak was lost → retry
      tryWebSpeech(word);
    }, 100);
    return;
  }

  // No English voice available → Youdao
  tryYoudao(word);
}
