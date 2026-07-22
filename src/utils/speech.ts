/**
 * Audio playback — local audio first.
 *
 * Key insight: browsers (especially Chrome/Android) require AudioContext
 * to be unlocked by a user gesture. We keep a persistent <audio> element
 * and "prime" it on first click with an empty play(), then reuse it.
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

// ---- Persistent audio element (unlocked once, reused forever) ----
let _audioEl: HTMLAudioElement | null = null;
let _audioUnlocked = false;

function getAudio(): HTMLAudioElement {
  if (!_audioEl) {
    _audioEl = document.createElement("audio");
  }
  return _audioEl;
}

/** Unlock audio context — must be called INSIDE a click handler */
function unlockAudio() {
  if (_audioUnlocked) return;
  try {
    const a = getAudio();
    a.src = "data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQQAAACAgICAgICAf3hxAAB4cQB+cnEAfnJxAHhxAAB4cQB+cnEAfnJxAHhxAAB4cQB+cnEAfnJxAHhxAAB4cQB+cnEAfnJx";
    a.play().catch(() => {});
  } catch { /* ignore */ }
  _audioUnlocked = true;
}

/** Global audio cache */
const audioCache = new Map<number, string | null>();

/** Play base64 using the UNLOCKED persistent audio element */
function playBase64(base64: string): boolean {
  try {
    unlockAudio();
    const bytes = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
    const url = URL.createObjectURL(new Blob([bytes], { type: "audio/mpeg" }));
    const a = getAudio();
    a.pause();
    a.src = url;
    a.currentTime = 0;
    a.onended = () => URL.revokeObjectURL(url);
    a.onerror = () => URL.revokeObjectURL(url);

    const p = a.play();
    if (p) {
      p.catch(() => {
        // Playback was blocked — revoke the URL to prevent leak
        URL.revokeObjectURL(url);
      });
    }
    return true;
  } catch {
    return false;
  }
}

/** Web Speech API */
function speakWebSpeech(word: string): boolean {
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
  } catch { return false; }
}

/** Youdao API */
function speakYoudao(word: string) {
  if (!navigator.onLine) return;
  try {
    unlockAudio();
    const a = getAudio();
    a.pause();
    a.src = `https://dict.youdao.com/dictvoice?audio=${encodeURIComponent(word)}&type=2`;
    a.currentTime = 0;
    a.play().catch(() => {});
  } catch { /* ignore */ }
}

/** Fetch audio from server */
async function fetchAudio(wordId: number): Promise<string | null> {
  if (audioCache.has(wordId)) return audioCache.get(wordId) ?? null;
  try {
    const res = await fetch(`/api/trpc/audio.getByWordId?input=${encodeURIComponent(JSON.stringify({ wordId }))}`);
    const json = await res.json();
    const result = json.result?.data;
    if (result?.hasAudio && result?.audioData) {
      audioCache.set(wordId, result.audioData);
      return result.audioData;
    }
    audioCache.set(wordId, null);
    return null;
  } catch {
    return null;
  }
}

/**
 * Speak a word. LOCAL AUDIO FIRST.
 */
export async function speakWord(word: string, wordId?: number) {
  if (!word) return;

  // With wordId: try local audio first
  if (wordId) {
    // Cache hit
    if (audioCache.has(wordId)) {
      const cached = audioCache.get(wordId);
      if (cached) { playBase64(cached); return; }
      // No local audio → fall through
    } else {
      // Fetch from server
      const base64 = await fetchAudio(wordId);
      if (base64) { playBase64(base64); return; }
      // No local audio → fall through
    }
  }

  // Fallback: Web Speech
  if (speakWebSpeech(word)) return;

  // Last resort: Youdao
  speakYoudao(word);
}
