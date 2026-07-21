/**
 * Cross-browser TTS helper with iOS/Safari compatibility
 * - Caches voices on load and voiceschanged event
 * - Handles iOS requirement: speak() must be in user gesture context
 * - Retries if voices not loaded yet
 */
let cachedVoices: SpeechSynthesisVoice[] = [];

function loadVoices() {
  try {
    const voices = window.speechSynthesis.getVoices();
    if (voices && voices.length > 0) {
      cachedVoices = voices;
    }
  } catch {
    /* ignore */
  }
}

// Load voices immediately + on voiceschanged event
if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

export function speakWord(word: string) {
  if (!("speechSynthesis" in window)) return;

  const doSpeak = () => {
    try {
      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(word);
      utterance.lang = "en-US";
      utterance.rate = 0.85;
      utterance.volume = 1;
      utterance.pitch = 1;

      const voiceList =
        cachedVoices.length > 0
          ? cachedVoices
          : window.speechSynthesis.getVoices();
      const enVoice =
        voiceList.find(
          (v) => v.lang.startsWith("en") && v.name.includes("Google US")
        ) ||
        voiceList.find(
          (v) => v.lang.startsWith("en") && v.name.includes("Google")
        ) ||
        voiceList.find(
          (v) => v.lang.startsWith("en") && v.name.includes("Samantha")
        ) ||
        voiceList.find(
          (v) => v.lang.startsWith("en") && v.name.includes("Daniel")
        ) ||
        voiceList.find((v) => v.lang.startsWith("en"));
      if (enVoice) utterance.voice = enVoice;

      setTimeout(() => {
        try {
          window.speechSynthesis.speak(utterance);
        } catch (e) {
          console.error("speak error:", e);
        }
      }, 50);
    } catch (e) {
      console.error("TTS error:", e);
    }
  };

  const voiceList =
    cachedVoices.length > 0
      ? cachedVoices
      : window.speechSynthesis.getVoices();
  if (!voiceList || voiceList.length === 0) {
    const checkAndSpeak = () => {
      loadVoices();
      const v = window.speechSynthesis.getVoices();
      if (v && v.length > 0) {
        doSpeak();
      } else {
        setTimeout(checkAndSpeak, 100);
      }
    };
    setTimeout(checkAndSpeak, 100);
  } else {
    doSpeak();
  }
}
