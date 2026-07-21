/**
 * Cross-browser TTS with Youdao API fallback
 * Primary: Youdao online pronunciation (works on all devices with internet)
 * Fallback: Web Speech API (works offline, but many Android tablets lack English voices)
 *
 * Youdao API: https://dict.youdao.com/dictvoice?audio={word}&type=2 (US)
 *             https://dict.youdao.com/dictvoice?audio={word}&type=1 (UK)
 */

// Cache for Web Speech voices
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

if (typeof window !== "undefined" && "speechSynthesis" in window) {
  loadVoices();
  window.speechSynthesis.onvoiceschanged = loadVoices;
}

// Track last audio instance so we can stop it
let lastAudio: HTMLAudioElement | null = null;

/**
 * Speak a word using the best available method
 * Priority: Youdao API > Web Speech API
 */
export function speakWord(word: string) {
  if (!word) return;

  // Stop any ongoing audio first
  if (lastAudio) {
    lastAudio.pause();
    lastAudio = null;
  }

  // Check if we're online and use Youdao API (most reliable)
  if (navigator.onLine) {
    playYoudao(word);
    return;
  }

  // Offline: fallback to Web Speech API
  speakLocal(word);
}

/**
 * Play pronunciation using Youdao dictionary API
 * This works on all devices (Huawei, iOS, Android) with internet
 */
function playYoudao(word: string) {
  try {
    const audio = new Audio(
      `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`
    );
    lastAudio = audio;

    audio.onended = () => {
      lastAudio = null;
    };
    audio.onerror = () => {
      lastAudio = null;
      // Fallback to local if Youdao fails
      speakLocal(word);
    };

    // Some browsers require user gesture to play audio
    const playPromise = audio.play();
    if (playPromise) {
      playPromise.catch(() => {
        lastAudio = null;
        speakLocal(word);
      });
    }
  } catch {
    speakLocal(word);
  }
}

/**
 * Fallback: Web Speech API (works offline)
 * Known limitations:
 * - Huawei tablets: usually no English voices available
 * - iOS Safari: voices load async, requires user gesture
 */
function speakLocal(word: string) {
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
