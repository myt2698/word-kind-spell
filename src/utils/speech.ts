/**
 * Cross-browser TTS with Youdao API fallback
 * Critical: audio.play() MUST be called synchronously within a user gesture handler
 * for Huawei/Safari browsers to allow playback.
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

// ---- Persistent audio element (crucial for Huawei browser) ----
let audioEl: HTMLAudioElement | null = null;
let audioUnlocked = false;

function getAudio(): HTMLAudioElement {
  if (!audioEl) {
    audioEl = new Audio();
    audioEl.crossOrigin = "anonymous";
    audioEl.preload = "auto";
  }
  return audioEl;
}

/**
 * Unlock audio on first user interaction.
 * Must be called directly inside a click/touch event handler.
 */
function unlockAudio() {
  if (audioUnlocked) return;
  try {
    const a = getAudio();
    a.src = "";
    const p = a.play();
    if (p) p.catch(() => {});
  } catch { /* ignore */ }
  audioUnlocked = true;
}

/**
 * Speak a word. Call this directly from an onClick handler.
 */
export function speakWord(word: string) {
  if (!word) return;

  // 1. Try to unlock audio context (first click only)
  unlockAudio();

  // 2. Stop any ongoing speech
  try { window.speechSynthesis.cancel(); } catch { /* ignore */ }

  // 3. Play via Youdao API — set src and play() in the same synchronous call
  if (navigator.onLine) {
    try {
      const a = getAudio();
      // Pause current first
      a.pause();
      // Set new source
      a.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
      a.currentTime = 0;
      // Play synchronously — this is the key for Huawei browser
      const playPromise = a.play();
      if (playPromise) {
        playPromise.catch((err) => {
          console.warn("[speak] Audio play blocked:", err?.name);
          // Fallback to Web Speech
          speakLocal(word);
        });
      }
      return;
    } catch (e) {
      console.warn("[speak] Youdao error:", e);
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
