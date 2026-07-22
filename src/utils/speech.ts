/**
 * Cross-browser TTS with Youdao API fallback
 * - Primary: Youdao online pronunciation (works on all devices with internet)
 * - Fallback: Web Speech API (works offline)
 *
 * Key: Creates a fresh Audio element per click for maximum reliability.
 * The old "persistent audio" approach failed on some browsers.
 */

// ---- Web Speech API voice cache ----
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
}

let audioUnlocked = false;

/**
 * Unlock audio context on first user gesture.
 */
function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const a = new Audio();
    a.play().catch(() => {});
  } catch { /* ignore */ }
  audioUnlocked = true;
}

/**
 * Speak a word. Call this directly from an onClick handler.
 */
export function speakWord(word: string) {
  if (!word) return;

  // 1. Unlock audio context
  unlockAudio();

  // 2. Cancel ongoing speech synthesis
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }

  // 3. Fresh Audio element each time — most reliable cross-browser approach
  if (navigator.onLine) {
    try {
      const a = new Audio();
      a.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;

      // Play as soon as enough data is loaded
      const playWhenReady = () => {
        const p = a.play();
        if (p) p.catch(() => speakLocal(word));
      };

      // Modern browsers: canplaythrough means we can play to end
      a.addEventListener("canplaythrough", playWhenReady, { once: true });

      // Fallback: if it takes too long, try anyway
      setTimeout(() => {
        if (a.paused) {
          a.removeEventListener("canplaythrough", playWhenReady);
          const p = a.play();
          if (p) p.catch(() => speakLocal(word));
        }
      }, 1500);

      return;
    } catch {
      // If Audio constructor itself fails, fall through
    }
  }

  // 4. Offline fallback
  speakLocal(word);
}

/** Web Speech API fallback */
function speakLocal(word: string) {
  if (!("speechSynthesis" in window)) return;

  const doSpeak = () => {
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(word);
      u.lang = "en-US";
      u.rate = 0.85;
      u.volume = 1;
      const list = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
      const v =
        list.find((x) => x.lang.startsWith("en") && x.name.includes("Google US")) ||
        list.find((x) => x.lang.startsWith("en") && x.name.includes("Google")) ||
        list.find((x) => x.lang.startsWith("en") && x.name.includes("Samantha")) ||
        list.find((x) => x.lang.startsWith("en") && x.name.includes("Daniel")) ||
        list.find((x) => x.lang.startsWith("en"));
      if (v) u.voice = v;
      setTimeout(() => {
        try { window.speechSynthesis.speak(u); } catch { /* ignore */ }
      }, 50);
    } catch { /* ignore */ }
  };

  const list = cachedVoices.length > 0 ? cachedVoices : window.speechSynthesis.getVoices();
  if (!list || list.length === 0) {
    setTimeout(() => {
      loadVoices();
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) doSpeak();
    }, 100);
  } else {
    doSpeak();
  }
}
