import {
  useState,
  useEffect,
  useRef,
  createContext,
  useContext,
  useCallback,
} from "react";
import confetti from "canvas-confetti";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import TagDetailDialog from "@/components/TagDetailDialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PenLine,
  Loader2,
  Play,
  Volume2,
  Zap,
  Puzzle,
  Keyboard,
  Headphones,
  ArrowLeft,
  RotateCcw,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Lightbulb,
  Delete,
  CalendarCheck,
  ListChecks,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Tag,
  Layers3,
  ShieldCheck,
  Flame,
} from "lucide-react";
import {
  generateLetterBlocks,
  generateFillBlank,
  getPhonicsColor,
  analyzeWordForStudy,
} from "@/utils/phonics";
import { useSearchParams } from "react-router";

import { speakWord, preloadAudio } from "@/utils/speech";
import {
  deselectFilteredWordIds,
  selectFilteredWordIds,
} from "@/utils/word-selection";
import DictationMode from "@/components/DictationMode";
import DailyReadingMode from "@/components/DailyReadingMode";

const AUTO_SPEAK_BASE_DELAY_MS = 1100;
const PRACTICE_EXTRA_KEYS = [
  { value: " ", label: "空格", wide: true },
  { value: ",", label: ",", wide: false },
  { value: "?", label: "?", wide: false },
  { value: ".", label: ".", wide: false },
  { value: "!", label: "!", wide: false },
  { value: '"', label: '"', wide: false },
  { value: "'", label: "'", wide: false },
] as const;

function autoSpeakDelay(word: string) {
  return Math.min(2200, AUTO_SPEAK_BASE_DELAY_MS + word.trim().length * 70);
}

function useAutoSpeakTwice(
  word?: { id: number; word: string; example?: string | null },
  retryToken = 0,
) {
  const wordId = word?.id;
  const wordText = word?.word;
  const practiceExample = wordText
    ? pickPracticeExample(word?.example, wordText)
    : null;

  useEffect(() => {
    if (!wordId || !wordText) return;

    // Scheduling the first read avoids React StrictMode playing it an extra
    // time during its development-only effect mount check.
    const firstReadTimer = window.setTimeout(() => {
      speakWord(wordText, wordId);
    }, 0);
    const secondReadTimer = window.setTimeout(() => {
      speakWord(wordText, wordId);
    }, autoSpeakDelay(wordText));
    const exampleReadTimer = practiceExample
      ? window.setTimeout(() => {
          speakWord(practiceExample);
        }, autoSpeakDelay(wordText) * 2)
      : null;

    return () => {
      window.clearTimeout(firstReadTimer);
      window.clearTimeout(secondReadTimer);
      if (exampleReadTimer !== null) {
        window.clearTimeout(exampleReadTimer);
      }
    };
  }, [wordId, wordText, practiceExample, retryToken]);
}

function pickPracticeExample(
  example: string | null | undefined,
  word: string,
): string | null {
  const candidates =
    example
      ?.split(/\r?\n+/)
      .map((line) => line.trim())
      .filter(Boolean) ?? [];
  if (candidates.length === 0) return null;

  const target = word.trim();
  if (!target) return null;
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const exactWordPattern = new RegExp(`\\b${escaped}\\b`, "i");
  return (
    candidates.find((candidate) => exactWordPattern.test(candidate)) ??
    null
  );
}

function normalizePracticeAnswer(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .replace(/[’‘]/g, "'")
    .replace(/[“”]/g, '"');
}

function PracticeExampleLine({
  currentWord,
  tone,
  reveal = false,
  answer = "",
  activeCharacterIndexes = [],
  onCharacterSelect,
}: {
  currentWord: any;
  tone: "indigo" | "emerald" | "amber";
  reveal?: boolean;
  answer?: string;
  activeCharacterIndexes?: number[];
  onCharacterSelect?: (characterIndex: number) => void;
}) {
  const example = pickPracticeExample(
    currentWord.example,
    currentWord.word,
  );
  if (!example) return null;

  const toneClasses = {
    indigo: "text-[#1D4ED8]",
    emerald: "text-[#1D4ED8]",
    amber: "text-[#1D4ED8]",
  }[tone];
  const surfaceClasses = {
    indigo: "border-blue-200 bg-blue-50/80",
    emerald: "border-blue-200 bg-blue-50/80",
    amber: "border-blue-200 bg-blue-50/80",
  }[tone];

  const targetWord = currentWord.word.trim();
  const escaped = targetWord.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pieces = example.split(new RegExp(`\\b(${escaped})\\b`, "gi"));

  return (
    <div className={`relative mb-4 mt-3 flex items-center justify-center rounded-xl border px-4 py-3 text-center shadow-sm ${surfaceClasses} ${toneClasses}`}>
      <p className="w-full min-w-0 px-8 text-center text-xl font-medium leading-[2.3]">
        {pieces.map((piece, pieceIndex) =>
          piece.toLowerCase() === targetWord.toLowerCase() ? (
            <strong
              key={pieceIndex}
              className={
                reveal
                  ? "font-semibold text-emerald-600"
                  : "font-mono font-bold tracking-wide text-[#1D4ED8]"
              }
            >
              {reveal ? (
                piece
              ) : (
                <span
                  className="mx-1 inline align-middle"
                  aria-label={`填写 ${targetWord}`}
                >
                  {[...piece].map((expectedCharacter, characterIndex) => {
                    if (/\s/.test(expectedCharacter)) {
                      return (
                        <span
                          key={characterIndex}
                          className="inline-block w-2"
                          aria-hidden="true"
                        />
                      );
                    }
                    const enteredCharacter = [...answer][characterIndex];
                    const hasInput = Boolean(
                      enteredCharacter &&
                        enteredCharacter !== " " &&
                        enteredCharacter !== "\u00a0",
                    );
                    const isActive = activeCharacterIndexes.includes(characterIndex);
                    return (
                      <button
                        type="button"
                        key={characterIndex}
                        onClick={() => onCharacterSelect?.(characterIndex)}
                        disabled={!onCharacterSelect}
                        className={`mx-0.5 my-1 inline-flex h-9 min-w-8 items-center justify-center rounded-md px-1 align-middle text-xl font-bold text-[#1D4ED8] transition-all ${
                          isActive
                            ? "border-[3px] border-[#FACC15] bg-[#FFFBEB] shadow-md ring-2 ring-[#FEF3C7]"
                            : "border-2 border-[#FDE68A] bg-[#F7FBFF]"
                        }`}
                        aria-label={`第 ${characterIndex + 1} 个字母${isActive ? "，正在输入" : ""}`}
                      >
                        {hasInput ? enteredCharacter : "\u00a0"}
                      </button>
                    );
                  })}
                </span>
              )}
            </strong>
          ) : (
            <span key={pieceIndex}>{piece}</span>
          ),
        )}
      </p>
      {reveal && (
        <button
          type="button"
          onClick={() => speakWord(example)}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1.5 opacity-70 hover:bg-white/70 hover:opacity-100"
          aria-label="朗读完整例句"
        >
          <Volume2 className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}

function PracticeExtraKeyboardRow({
  onKey,
  tone,
  includeSpace = true,
}: {
  onKey: (key: string) => void;
  tone: "emerald" | "amber";
  includeSpace?: boolean;
}) {
  const hoverClass =
    tone === "emerald"
      ? "hover:border-emerald-300 hover:bg-emerald-50"
      : "hover:border-amber-300 hover:bg-amber-50";

  return (
    <div className="mb-1 flex justify-center gap-1 sm:gap-1.5 md:mb-2 md:gap-2">
      {PRACTICE_EXTRA_KEYS.filter(
        (key) => includeSpace || key.value !== " ",
      ).map((key) => (
        <button
          type="button"
          key={key.value}
          onClick={() => onKey(key.value)}
          className={`${key.wide ? "min-w-16 flex-[2]" : "min-w-8 flex-1"} h-9 max-w-20 rounded-lg border border-gray-200 bg-white text-sm font-semibold text-gray-700 active:scale-95 ${hoverClass}`}
          aria-label={key.wide ? "输入空格" : `输入符号 ${key.label}`}
        >
          {key.label}
        </button>
      ))}
    </div>
  );
}

const FIREWORK_COLORS = [
  "#F59E0B",
  "#EC4899",
  "#8B5CF6",
  "#06B6D4",
  "#22C55E",
  "#F97316",
];

function playCuteCelebrationChime() {
  const AudioContextClass =
    window.AudioContext ??
    (
      window as typeof window & {
        webkitAudioContext?: typeof AudioContext;
      }
    ).webkitAudioContext;
  if (!AudioContextClass) return;

  try {
    const context = new AudioContextClass();
    const startedAt = context.currentTime + 0.02;
    const notes = [
      { frequency: 523.25, offset: 0, duration: 0.3, volume: 0.2 },
      { frequency: 659.25, offset: 0.1, duration: 0.34, volume: 0.2 },
      { frequency: 783.99, offset: 0.2, duration: 0.38, volume: 0.22 },
      { frequency: 1046.5, offset: 0.34, duration: 0.55, volume: 0.25 },
    ];

    notes.forEach(({ frequency, offset, duration, volume }) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      const noteStart = startedAt + offset;
      const noteEnd = noteStart + duration;

      oscillator.type = "sine";
      oscillator.frequency.setValueAtTime(frequency, noteStart);
      oscillator.frequency.exponentialRampToValueAtTime(
        frequency * 1.015,
        noteEnd,
      );
      gain.gain.setValueAtTime(0.0001, noteStart);
      gain.gain.exponentialRampToValueAtTime(volume, noteStart + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.0001, noteEnd);
      oscillator.connect(gain).connect(context.destination);
      oscillator.start(noteStart);
      oscillator.stop(noteEnd + 0.02);
    });

    window.setTimeout(() => {
      void context.close();
    }, 1_200);
  } catch {
    // Audio feedback is optional when a browser blocks synthesized sound.
  }
}

function CorrectCelebration({
  points,
  rewardCapped,
}: {
  points: number | null;
  rewardCapped: boolean;
}) {
  useEffect(() => {
    playCuteCelebrationChime();

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    const common = {
      colors: FIREWORK_COLORS,
      disableForReducedMotion: true,
      zIndex: 95,
    };
    const heart = confetti.shapeFromText({ text: "💖", scalar: 1.8 });
    const smilingStar = confetti.shapeFromText({
      text: "🌟",
      scalar: 1.8,
    });

    confetti({
      ...common,
      particleCount: 75,
      angle: 62,
      spread: 58,
      startVelocity: 58,
      gravity: 0.9,
      origin: { x: 0, y: 0.72 },
      shapes: ["circle", "square", "star"],
      scalar: 1.15,
    });
    confetti({
      ...common,
      particleCount: 75,
      angle: 118,
      spread: 58,
      startVelocity: 58,
      gravity: 0.9,
      origin: { x: 1, y: 0.72 },
      shapes: ["circle", "square", "star"],
      scalar: 1.15,
    });

    const emojiTimer = window.setTimeout(() => {
      confetti({
        ...common,
        particleCount: 22,
        spread: 110,
        startVelocity: 35,
        gravity: 0.7,
        ticks: 220,
        origin: { x: 0.5, y: 0.38 },
        shapes: [heart, smilingStar],
        scalar: 1.8,
      });
    }, 180);
    const finaleTimer = window.setTimeout(() => {
      confetti({
        ...common,
        particleCount: 55,
        spread: 125,
        startVelocity: 42,
        gravity: 0.85,
        origin: { x: 0.5, y: 0.42 },
        shapes: ["star", "circle"],
        scalar: 1.25,
      });
    }, 430);

    return () => {
      window.clearTimeout(emojiTimer);
      window.clearTimeout(finaleTimer);
    };
  }, []);

  return (
    <div
      className="wordmind-celebration-backdrop pointer-events-none fixed inset-0 z-[90] overflow-hidden"
      aria-live="polite"
      aria-label="回答正确"
    >
      <div className="wordmind-reward-pop absolute left-1/2 top-1/2 w-[min(84vw,320px)] rounded-[2rem] border-4 border-amber-300 bg-gradient-to-br from-yellow-50 via-white to-pink-50 px-6 py-5 text-center shadow-2xl">
        <div className="wordmind-reward-star mx-auto -mt-12 flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-amber-300 to-orange-400 text-5xl text-white shadow-lg">
          ★
        </div>
        <p className="mt-2 text-2xl font-black tracking-wide text-orange-500">
          太棒啦！
        </p>
        <p className="mt-1 text-sm font-bold text-pink-500">
          这道题答对了，继续加油！
        </p>
        <p className="mx-auto mt-3 w-fit whitespace-nowrap rounded-full bg-amber-100 px-4 py-1.5 text-base font-black text-amber-700">
          {points === null
            ? "积分结算中…"
            : points > 0
              ? `+${points} 积分`
              : rewardCapped
                ? "该词今日奖励已完成"
                : "继续保持"}
        </p>
      </div>
    </div>
  );
}

function PracticeRewardBadge({
  points,
  rewardCapped,
}: {
  points: number | null;
  rewardCapped: boolean;
}) {
  return (
    <div className="mx-auto mt-2 w-fit rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
      {points === null
        ? "正在结算积分…"
        : points > 0
          ? `本次获得 +${points} 积分`
          : rewardCapped
            ? "该单词今日已获得 3 次积分奖励"
            : "继续保持"}
    </div>
  );
}

// ============================================================
// Today Words Context - Server-synced selected words
// ============================================================
const LS_TODAY_KEY = "wordmind_today_words";
const LS_DATE_KEY = "wordmind_today_date";

interface TodayWordsContextType {
  selectedIds: number[];
  toggleWord: (id: number) => void;
  selectAll: (ids: number[]) => void;
  clearAll: () => void;
  isSelected: (id: number) => boolean;
  todayWords: any[];
}

const TodayWordsContext = createContext<TodayWordsContextType>({
  selectedIds: [],
  toggleWord: () => {},
  selectAll: () => {},
  clearAll: () => {},
  isSelected: () => false,
  todayWords: [],
});

function useTodayWords() {
  return useContext(TodayWordsContext);
}

function TodayWordsProvider({ children, allWords }: { children: React.ReactNode; allWords: any[] }) {
  const utils = trpc.useUtils();

  // 1. Load from server
  const { data: serverIds } = trpc.spelling.getTodaySelections.useQuery();

  // 2. Local state (optimistic)
  const [selectedIds, setSelectedIds] = useState<number[]>([]);

  // Sync server data → local state
  useEffect(() => {
    if (serverIds !== undefined) {
      if (serverIds.length > 0) {
        setSelectedIds(serverIds);
      } else {
        // Server empty: try migrate from localStorage (one-time)
        try {
          const saved = localStorage.getItem(LS_TODAY_KEY);
          const savedDate = localStorage.getItem(LS_DATE_KEY);
          const today = new Date().toISOString().split("T")[0];
          if (saved && savedDate === today) {
            const ids = JSON.parse(saved) as number[];
            if (ids.length > 0) {
              setSelectedIds(ids);
              // Sync to server
              syncToServer.mutate({ wordIds: ids });
            }
          }
        } catch { /* ignore */ }
      }
    }
  }, [serverIds]);

  // Mutations
  const syncToServer = trpc.spelling.setTodaySelections.useMutation({
    onSuccess: () => utils.spelling.getTodaySelections.invalidate(),
  });

  const toggleServer = trpc.spelling.toggleTodaySelection.useMutation({
    onSuccess: () => utils.spelling.getTodaySelections.invalidate(),
  });

  const toggleWord = useCallback((id: number) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
    toggleServer.mutate({ wordId: id });
  }, [toggleServer]);

  const selectAll = useCallback((ids: number[]) => {
    setSelectedIds(ids);
    syncToServer.mutate({ wordIds: ids });
  }, [syncToServer]);

  const clearAll = useCallback(() => {
    setSelectedIds([]);
    syncToServer.mutate({ wordIds: [] });
  }, [syncToServer]);

  const isSelected = useCallback(
    (id: number) => selectedIds.includes(id),
    [selectedIds]
  );

  // Filter full word data by selected IDs
  const todayWords = allWords.filter((w) => selectedIds.includes(w.id));

  return (
    <TodayWordsContext.Provider
      value={{ selectedIds, toggleWord, selectAll, clearAll, isSelected, todayWords }}
    >
      {children}
    </TodayWordsContext.Provider>
  );
}

// ============================================================
// Types
// ============================================================
type SpellView = "home" | "study" | "reading" | "blocks" | "fillblank" | "flash" | "dictation";
type PracticeSourceMode = "challenge" | "revenge";

// ============================================================
// Main Component
// ============================================================
export default function SpellPage() {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [view, setView] = useState<SpellView>((modeParam as SpellView) || "home");
  const [practiceSource, setPracticeSource] =
    useState<PracticeSourceMode>("challenge");

  // Fetch all active learning words for the provider
  const {
    data: learningQueue,
    isLoading: learningLoading,
    error: learningError,
    refetch: refetchLearningQueue,
  } = trpc.spelling.getLearningQueue.useQuery(undefined, {
    retry: 1,
  });

  if (learningLoading) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <AppHeader />
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
        </div>
        <MobileNav activeTab="spell" />
      </div>
    );
  }

  if (learningError) {
    return (
      <div className="min-h-screen bg-gray-50/50">
        <AppHeader />
        <main className="mx-auto flex min-h-[70vh] max-w-md flex-col items-center justify-center px-6 text-center">
          <XCircle className="mb-3 h-10 w-10 text-rose-400" />
          <h1 className="text-lg font-bold text-gray-900">拼写练习加载失败</h1>
          <p className="mt-2 text-sm leading-6 text-gray-500">
            {learningError.message || "网络连接异常，请稍后重试"}
          </p>
          <Button className="mt-5" onClick={() => refetchLearningQueue()}>
            <RotateCcw className="mr-2 h-4 w-4" />
            重新加载
          </Button>
        </main>
        <MobileNav activeTab="spell" />
      </div>
    );
  }

  const allWords = learningQueue ?? [];

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />
      <TodayWordsProvider allWords={allWords}>
        {view === "home" && (
          <SpellHome
            practiceSource={practiceSource}
            onPracticeSourceChange={setPracticeSource}
            onStart={(v) => setView(v)}
          />
        )}
        {view === "study" && <TodayStudyWrapper onBack={() => setView("home")} />}
        {view === "reading" && <DailyReadingMode onBack={() => setView("home")} />}
        {view !== "home" && view !== "study" && view !== "reading" && view !== "dictation" && (
          <PracticeModeWrapper
            mode={view}
            source={practiceSource}
            onBack={() => setView("home")}
          />
        )}
        {view === "dictation" && (
          <DictationWrapper
            source={practiceSource}
            onBack={() => setView("home")}
          />
        )}
      </TodayWordsProvider>
      {view === "home" && <MobileNav activeTab="spell" />}
    </div>
  );
}

// ============================================================
// Spell Home - Review Queue + Mode Selection
// ============================================================
function SpellHome({
  practiceSource,
  onPracticeSourceChange,
  onStart,
}: {
  practiceSource: PracticeSourceMode;
  onPracticeSourceChange: (source: PracticeSourceMode) => void;
  onStart: (mode: SpellView) => void;
}) {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { data: reviewQueue } = trpc.spelling.getReviewQueue.useQuery();
  const { data: learningQueue } = trpc.spelling.getLearningQueue.useQuery();
  const { data: errorWords } = trpc.spelling.getErrorWords.useQuery();
  const utils = trpc.useUtils();
  const clearErrors = trpc.spelling.clearErrors.useMutation({
    // Optimistic update: remove immediately from UI, then sync with server
    onMutate: async ({ wordId }) => {
      await utils.spelling.getErrorWords.cancel();
      const prev = utils.spelling.getErrorWords.getData();
      utils.spelling.getErrorWords.setData(undefined, (old) =>
        old ? old.filter((w) => w.id !== wordId) : old
      );
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) utils.spelling.getErrorWords.setData(undefined, ctx.prev);
    },
    onSettled: () => {
      utils.spelling.getErrorWords.invalidate();
      utils.spelling.getStats.invalidate();
    },
  });
  const { data: stats } = trpc.spelling.getStats.useQuery();
  const { selectedIds, todayWords } = useTodayWords();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogType, setDialogType] = useState<string>("");
  const [selectDialogOpen, setSelectDialogOpen] = useState(false);

  // Preload audio for all learning words
  useEffect(() => {
    if (learningQueue && learningQueue.length > 0) {
      preloadAudio(learningQueue.map((w) => w.id));
    }
  }, [learningQueue]);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }
  if (!user) return null;

  const manualDue = reviewQueue?.filter((w) => w.source === "manual" && w.totalAttempts === 0) ?? [];
  const allDue = reviewQueue ?? [];
  const practiceWordCount =
    practiceSource === "challenge"
      ? selectedIds.length
      : errorWords?.length ?? 0;
  const canPractice = practiceWordCount > 0;
  const emptyPracticeText =
    practiceSource === "challenge"
      ? "请先选择今日练习单词"
      : "错题本里还没有需要复习的单词";

  const openDialog = (type: string) => {
    setDialogType(type);
    setDialogOpen(true);
  };

  const startPractice = (mode: SpellView) => {
    if (canPractice) {
      onStart(mode);
    } else if (practiceSource === "challenge") {
      setSelectDialogOpen(true);
    } else {
      openDialog("errors");
    }
  };

  // Data for dialog
  const getDialogData = () => {
    switch (dialogType) {
      case "learning":
        return {
          title: "学习中的单词",
          color: "emerald",
          words: learningQueue ?? [],
          emptyText: "暂无学习中的单词",
          emptySub: "去单词列表点击「加入学习」",
        };
      case "new":
        return {
          title: "新学单词",
          color: "indigo",
          words: manualDue,
          emptyText: "暂无新学单词",
          emptySub: "去单词列表点击「加入学习」",
        };
      case "review":
        return {
          title: "待复习队列",
          color: "amber",
          words: allDue,
          emptyText: "暂无待复习单词",
          emptySub: "学习中的单词会按艾宾浩斯曲线自动进入复习队列",
        };
      case "errors":
        return {
          title: "错题本",
          color: "rose",
          words: errorWords ?? [],
          emptyText: "暂无错题",
          emptySub: "继续练习，错题会自动记录",
        };
      default:
        return { title: "", color: "gray", words: [], emptyText: "", emptySub: "" };
    }
  };

  const dialogData = getDialogData();
  const colorMap: Record<string, { bg: string; text: string; border: string; badge: string }> = {
    emerald: { bg: "bg-emerald-50", text: "text-emerald-800", border: "border-emerald-200", badge: "bg-emerald-100 text-emerald-600" },
    indigo: { bg: "bg-indigo-50", text: "text-indigo-800", border: "border-indigo-200", badge: "bg-indigo-100 text-indigo-600" },
    amber: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200", badge: "bg-amber-100 text-amber-600" },
    rose: { bg: "bg-rose-50", text: "text-rose-800", border: "border-rose-200", badge: "bg-rose-100 text-rose-600" },
    gray: { bg: "bg-gray-50", text: "text-gray-800", border: "border-gray-200", badge: "bg-gray-100 text-gray-600" },
  };
  const c = colorMap[dialogData.color] || colorMap.gray;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
        <h1 className="flex items-center gap-2 text-xl font-bold text-gray-900">
          <PenLine className="w-5 h-5 text-indigo-500" />
          单词拼写
        </h1>
        <div className="flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700">
          <Trophy className="h-3.5 w-3.5" />
          {stats?.totalPoints ?? 0} 积分
          {(stats?.todayPoints ?? 0) > 0 && (
            <span className="font-medium text-amber-500">
              今日 +{stats?.todayPoints}
            </span>
          )}
        </div>
      </div>
      <p className="text-sm text-gray-500 mb-6">先选择今日练习单词，再开始练习</p>

      {/* Stats Cards - Clickable to open dialog */}
      <div className="grid grid-cols-4 gap-3 mb-6">
        <button
          onClick={() => openDialog("learning")}
          className="bg-white rounded-xl border border-gray-100 p-3 text-center hover:border-emerald-200 hover:shadow-md transition-all"
        >
          <p className="text-2xl font-bold text-emerald-600">{stats?.learningWords ?? 0}</p>
          <p className="text-xs text-gray-500">学习中</p>
        </button>
        <button
          onClick={() => openDialog("new")}
          className="bg-white rounded-xl border border-gray-100 p-3 text-center hover:border-indigo-200 hover:shadow-md transition-all"
        >
          <p className="text-2xl font-bold text-indigo-600">{stats?.manualDue ?? 0}</p>
          <p className="text-xs text-gray-500">新学单词</p>
        </button>
        <button
          onClick={() => openDialog("review")}
          className="bg-white rounded-xl border border-gray-100 p-3 text-center hover:border-amber-200 hover:shadow-md transition-all"
        >
          <p className="text-2xl font-bold text-amber-600">{stats?.dueForReview ?? 0}</p>
          <p className="text-xs text-gray-500">总待复习</p>
        </button>
        <button
          onClick={() => openDialog("errors")}
          className="bg-white rounded-xl border border-gray-100 p-3 text-center hover:border-rose-200 hover:shadow-md transition-all"
        >
          <p className="text-2xl font-bold text-rose-600">{stats?.totalErrors ?? 0}</p>
          <p className="text-xs text-gray-500">错题</p>
        </button>
      </div>

      {/* Dialog for word lists */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md max-h-[70vh] p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader className="p-5 pb-3 border-b border-gray-100">
            <DialogTitle className="text-base font-semibold">
              {dialogData.title}
              {dialogData.words.length > 0 && (
                <span className="ml-2 text-xs font-normal text-gray-400">({dialogData.words.length} 个)</span>
              )}
            </DialogTitle>
          </DialogHeader>

          {dialogData.words.length > 0 ? (
            <ScrollArea className="max-h-[50vh]">
              <div className="p-3 space-y-1">
                {dialogData.words.map((w: any) => (
                  <div key={w.id} className={`flex items-center gap-3 p-3 rounded-xl ${c.bg} border ${c.border}`}>
                    <span className={`text-sm font-medium flex-1 ${c.text}`}>{w.word}</span>
                    {w.phonetic && <span className="text-xs text-gray-400 font-mono">{w.phonetic}</span>}
                    {dialogType === "errors" && (
                      <>
                        <span
                          className={`shrink-0 rounded-full px-1.5 py-0.5 text-[10px] font-semibold ${
                            (w.level ?? 1) === 1
                              ? "bg-red-100 text-red-600"
                              : (w.level ?? 1) === 2
                                ? "bg-amber-100 text-amber-700"
                                : "bg-emerald-100 text-emerald-700"
                          }`}
                        >
                          Lv.{w.level ?? 1}
                        </span>
                        {w.errorCount ? (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.badge}`}>错{w.errorCount}次</span>
                        ) : null}
                        <button
                          onClick={() => clearErrors.mutate({ wordId: w.id })}
                          className="text-xs text-gray-400 hover:text-rose-500 px-1.5 py-0.5 rounded hover:bg-rose-50 transition-colors"
                          title="移除错题"
                        >
                          移除
                        </button>
                      </>
                    )}
                    {dialogType === "review" && w.level && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${
                        w.level === 1 ? "bg-red-100 text-red-600" : w.level === 2 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"
                      }`}>Lv.{w.level}</span>
                    )}
                    {dialogType === "new" && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.badge}`}>新学</span>
                    )}
                    {dialogType === "learning" && w.level && (
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${c.badge}`}>Lv.{w.level}</span>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          ) : (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <p className="text-sm">{dialogData.emptyText}</p>
              <p className="text-xs text-gray-400 mt-1">{dialogData.emptySub}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Word Selection Dialog */}
      <WordSelectionDialog
        open={selectDialogOpen}
        onClose={() => setSelectDialogOpen(false)}
        words={learningQueue ?? []}
      />

      {/* Today's Practice Section */}
      <div
        role="button"
        tabIndex={0}
        aria-label={selectedIds.length > 0 ? "开始今日单词顺序学习" : "选择今日练习单词"}
        onClick={() => selectedIds.length > 0 ? onStart("study") : setSelectDialogOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            if (selectedIds.length > 0) onStart("study");
            else setSelectDialogOpen(true);
          }
        }}
        className="group bg-gradient-to-br from-white to-indigo-50/70 rounded-2xl border border-indigo-100 p-5 mb-6 cursor-pointer shadow-sm hover:shadow-md hover:border-indigo-300 transition-all active:scale-[0.995] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
              <CalendarCheck className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-gray-900">今日练习</h2>
              <p className="text-[11px] text-indigo-500">
                {selectedIds.length > 0 ? "点击卡片，按顺序学习每个单词" : "先选择今天要学习的单词"}
              </p>
            </div>
          </div>
          <button
            onClick={(event) => {
              event.stopPropagation();
              setSelectDialogOpen(true);
            }}
            className="text-xs text-indigo-500 hover:text-indigo-600 font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-50 transition-all"
          >
            {selectedIds.length > 0 ? "重新选词" : "去选词"}
          </button>
        </div>

        {selectedIds.length > 0 ? (
          <div className="space-y-3">
            <p className="text-xs text-gray-500">
              已选 <span className="font-semibold text-indigo-600">{selectedIds.length}</span> 个单词
            </p>
            {/* Mini word tags */}
            <div className="flex flex-wrap gap-1.5">
              {todayWords.slice(0, 15).map((w) => (
                <span
                  key={w.id}
                  className="inline-flex items-center gap-1 px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full text-xs border border-indigo-100"
                >
                  {w.word}
                </span>
              ))}
              {todayWords.length > 15 && (
                <span className="inline-flex items-center px-2 py-0.5 bg-gray-50 text-gray-400 rounded-full text-xs">
                  +{todayWords.length - 15}
                </span>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-4">
            <p className="text-sm text-gray-400 mb-2">还没有选择今日练习单词</p>
            <Button
              size="sm"
              className="bg-indigo-50 text-indigo-600 hover:bg-indigo-100 border-0"
              onClick={() => setSelectDialogOpen(true)}
            >
              <ListChecks className="w-3.5 h-3.5 mr-1" />
              选择单词
              </Button>
            </div>
          )}
          {selectedIds.length > 0 && (
            <div className="mt-4 pt-3 border-t border-indigo-100 flex items-center text-indigo-600">
              <BookOpen className="w-4 h-4 mr-2" />
              <span className="text-sm font-semibold">开始顺序学习</span>
              <span className="ml-2 text-xs text-indigo-400">自动朗读 · 详情 · 自然拼读</span>
              <ChevronRight className="w-5 h-5 ml-auto transition-transform group-hover:translate-x-1" />
            </div>
          )}
      </div>

      <button
        type="button"
        onClick={() => selectedIds.length > 0 ? onStart("reading") : setSelectDialogOpen(true)}
        className="mb-6 flex w-full items-center gap-4 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50 to-amber-50 p-4 text-left shadow-sm transition-all hover:border-violet-300 hover:shadow-md"
      >
        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-violet-100">
          <BookOpen className="h-6 w-6 text-violet-600" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-bold text-gray-900">今日单词趣味阅读</p>
          <p className="mt-0.5 text-xs text-gray-500">
            {selectedIds.length > 0 ? "3 篇不同主题短文 · 音节标注 · 阅读理解" : "选择今日单词后生成趣味短文"}
          </p>
        </div>
        <ChevronRight className="h-5 w-5 text-violet-400" />
      </button>

      {/* Practice source */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <h2 className="text-sm font-semibold text-gray-700">选择练习模式</h2>
        <span className="text-xs text-gray-400">{practiceWordCount} 个单词</span>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-4">
        <button
          type="button"
          onClick={() => onPracticeSourceChange("challenge")}
          className={`rounded-xl border p-3 text-left transition-all ${
            practiceSource === "challenge"
              ? "border-indigo-300 bg-indigo-50 shadow-sm"
              : "border-gray-100 bg-white hover:border-indigo-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <ShieldCheck className="w-4 h-4 text-indigo-500" />
            <span className="text-sm font-bold text-gray-900">闯关模式</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500">
            准备好接受今天的挑战了吗？
          </p>
        </button>
        <button
          type="button"
          onClick={() => onPracticeSourceChange("revenge")}
          className={`rounded-xl border p-3 text-left transition-all ${
            practiceSource === "revenge"
              ? "border-rose-300 bg-rose-50 shadow-sm"
              : "border-gray-100 bg-white hover:border-rose-200"
          }`}
        >
          <div className="flex items-center gap-2 mb-1">
            <Flame className="w-4 h-4 text-rose-500" />
            <span className="text-sm font-bold text-gray-900">复仇之战</span>
          </div>
          <p className="text-[11px] leading-relaxed text-gray-500">
            把曾经难倒你的单词通通拿下！
          </p>
        </button>
      </div>

      <div className="space-y-3">
        <button
          onClick={() => startPractice("blocks")}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Puzzle className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">积木拼拼乐</h3>
            <p className="text-xs text-gray-500">
              {canPractice ? "点击字母积木拼出正确单词" : emptyPracticeText}
            </p>
          </div>
          <Play className={`w-5 h-5 ${canPractice ? "text-indigo-400" : "text-gray-300"}`} />
        </button>

        <button
          onClick={() => startPractice("fillblank")}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Keyboard className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">单词消消乐</h3>
            <p className="text-xs text-gray-500">
              {canPractice ? "根据提示填写缺失的字母" : emptyPracticeText}
            </p>
          </div>
          <Play className={`w-5 h-5 ${canPractice ? "text-emerald-400" : "text-gray-300"}`} />
        </button>

        <button
          onClick={() => startPractice("flash")}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">极速闪电战</h3>
            <p className="text-xs text-gray-500">
              {canPractice ? "限时快速拼写挑战" : emptyPracticeText}
            </p>
          </div>
          <Play className={`w-5 h-5 ${canPractice ? "text-amber-400" : "text-gray-300"}`} />
        </button>

        <button
          onClick={() => startPractice("dictation")}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-purple-200 hover:shadow-md transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-purple-50 flex items-center justify-center shrink-0">
            <Headphones className="w-6 h-6 text-purple-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">听写模式</h3>
            <p className="text-xs text-gray-500">
              {canPractice ? "每个单词读两遍，听音写词" : emptyPracticeText}
            </p>
          </div>
          <Play className={`w-5 h-5 ${canPractice ? "text-purple-400" : "text-gray-300"}`} />
        </button>
      </div>
    </main>
  );
}

// ============================================================
// Word Selection Dialog
// ============================================================
function WordSelectionDialog({
  open,
  onClose,
  words,
}: {
  open: boolean;
  onClose: () => void;
  words: any[];
}) {
  const { selectedIds, toggleWord, selectAll, isSelected } = useTodayWords();
  const { data: textbooks = [] } = trpc.textbook.list.useQuery();
  const [selectedTextbookId, setSelectedTextbookId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedLevel, setSelectedLevel] = useState<number | null>(null);

  const units =
    textbooks.find((textbook) => textbook.id === selectedTextbookId)?.groups ?? [];
  const filteredWords = words.filter((word) => {
    const memberships = word.groups ?? [];
    const matchesTextbook =
      selectedTextbookId === null ||
      word.textbookId === selectedTextbookId ||
      memberships.some((group: any) => group.textbookId === selectedTextbookId);
    const matchesUnit =
      selectedUnitId === null ||
      word.groupId === selectedUnitId ||
      memberships.some((group: any) => group.groupId === selectedUnitId);
    const matchesLevel = selectedLevel === null || word.level === selectedLevel;
    return matchesTextbook && matchesUnit && matchesLevel;
  });
  const filteredWordIds = filteredWords.map((word) => word.id);
  const allSelected =
    filteredWordIds.length > 0 && filteredWordIds.every((id) => isSelected(id));
  const hasFilters =
    selectedTextbookId !== null ||
    selectedUnitId !== null ||
    selectedLevel !== null;

  const toggleSelectAll = () => {
    if (allSelected) {
      selectAll(deselectFilteredWordIds(selectedIds, filteredWordIds));
      return;
    }
    selectAll(selectFilteredWordIds(filteredWordIds));
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[85dvh] p-0 overflow-hidden flex flex-col" onInteractOutside={(e) => e.preventDefault()}>
        {/* Header */}
        <DialogHeader className="p-5 pb-3 border-b border-gray-100 shrink-0">
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <ListChecks className="w-4 h-4 text-indigo-500" />
            选择今日练习单词
            <span className="text-xs font-normal text-gray-400">({selectedIds.length} 已选)</span>
          </DialogTitle>
        </DialogHeader>

        {/* Textbook and unit filters */}
        <div className="px-5 py-3 shrink-0 border-b border-gray-100 space-y-2.5">
          <div className="grid grid-cols-2 gap-2">
            <label className="relative min-w-0">
              <BookOpen className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-indigo-400 pointer-events-none" />
              <select
                aria-label="筛选课本"
                value={selectedTextbookId ?? ""}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedTextbookId(value ? Number(value) : null);
                  setSelectedUnitId(null);
                }}
                className="w-full h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-8 pr-7 text-xs text-gray-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
              >
                <option value="">全部课本</option>
                {textbooks.map((textbook) => (
                  <option key={textbook.id} value={textbook.id}>
                    {textbook.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </label>
            <label className="relative min-w-0">
              <Layers3 className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-emerald-500 pointer-events-none" />
              <select
                aria-label="筛选单元"
                value={selectedUnitId ?? ""}
                disabled={selectedTextbookId === null}
                onChange={(event) => {
                  const value = event.target.value;
                  setSelectedUnitId(value ? Number(value) : null);
                }}
                className="w-full h-9 appearance-none rounded-lg border border-gray-200 bg-white pl-8 pr-7 text-xs text-gray-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 disabled:bg-gray-50 disabled:text-gray-400"
              >
                <option value="">全部单元</option>
                {units.map((unit) => (
                  <option key={unit.id} value={unit.id}>
                    {unit.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
            </label>
          </div>
          <label className="relative block min-w-0">
            <ShieldCheck className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-amber-500 pointer-events-none" />
            <select
              aria-label="筛选学习等级"
              value={selectedLevel ?? ""}
              onChange={(event) => {
                const value = event.target.value;
                setSelectedLevel(value ? Number(value) : null);
              }}
              className="h-9 w-full appearance-none rounded-lg border border-gray-200 bg-white pl-8 pr-7 text-xs text-gray-700 outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="">全部等级</option>
              <option value="1">Lv.1 新学</option>
              <option value="2">Lv.2 复习中</option>
              <option value="3">Lv.3 已熟悉</option>
            </select>
            <ChevronDown className="absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400 pointer-events-none" />
          </label>
          <div className="flex items-center justify-between">
            <button
              onClick={toggleSelectAll}
              disabled={filteredWordIds.length === 0}
              className="text-xs text-indigo-500 hover:text-indigo-600 font-medium disabled:text-gray-300"
            >
              {allSelected ? "取消当前全选" : "全选当前结果"}
            </button>
            <span className="text-xs text-gray-400">
              {hasFilters ? `${filteredWords.length} / ${words.length}` : words.length} 个单词
            </span>
          </div>
        </div>

        {/* Word List - flex-1 fills remaining space, overflow-y-auto for scrolling */}
        <div className="flex-1 overflow-y-auto px-5 py-3 min-h-0">
          <div className="space-y-1.5">
            {filteredWords.length === 0 ? (
              <div className="text-center py-8 text-gray-400 text-sm">
                {hasFilters ? "该课本或单元下暂无学习中的单词" : "暂无学习中的单词"}
              </div>
            ) : (
              filteredWords.map((w) => (
                <label
                  key={w.id}
                  className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition-all ${
                    isSelected(w.id)
                      ? "bg-indigo-50 border-indigo-200"
                      : "bg-white border-gray-100 hover:border-gray-200"
                  }`}
                >
                  <Checkbox
                    checked={isSelected(w.id)}
                    onCheckedChange={() => toggleWord(w.id)}
                    className="shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900">{w.word}</span>
                      {w.phonetic && (
                        <span className="text-xs text-gray-400 font-mono">{w.phonetic}</span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 truncate">{w.definition}</p>
                  </div>
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full shrink-0 ${
                      w.level === 1
                        ? "bg-red-100 text-red-600"
                        : w.level === 2
                        ? "bg-amber-100 text-amber-600"
                        : "bg-green-100 text-green-600"
                    }`}
                  >
                    Lv.{w.level}
                  </span>
                </label>
              ))
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-5 border-t border-gray-100 flex gap-3">
          <Button variant="outline" className="flex-1 h-10" onClick={onClose}>
            取消
          </Button>
          <Button
            className="flex-1 h-10 bg-gradient-to-r from-indigo-500 to-blue-600"
            onClick={onClose}
            disabled={selectedIds.length === 0}
          >
            确认 ({selectedIds.length} 个)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

// ============================================================
// Today's Sequential Study
// ============================================================
function TodayStudyWrapper({ onBack }: { onBack: () => void }) {
  const { todayWords, selectedIds } = useTodayWords();

  if (selectedIds.length === 0) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col items-center justify-center">
        <BookOpen className="w-12 h-12 text-gray-300 mb-4" />
        <p className="text-gray-500 mb-4">请先选择今日练习单词</p>
        <Button onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" />
          返回选词
        </Button>
      </main>
    );
  }

  if (todayWords.length === 0) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </main>
    );
  }

  return <TodayStudyMode words={todayWords} onBack={onBack} />;
}

function TodayStudyMode({ words, onBack }: { words: any[]; onBack: () => void }) {
  const [index, setIndex] = useState(0);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const currentWord = words[index];
  useAutoSpeakTwice(currentWord);

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
  }, [currentWord.id]);

  const phonics = currentWord.phonics ?? analyzeWordForStudy(currentWord.word);

  const goNext = () => {
    if (index < words.length - 1) {
      setIndex((current) => current + 1);
    } else {
      onBack();
    }
  };

  return (
    <main className="max-w-2xl mx-auto px-4 py-5 pb-28">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={onBack}
          className="h-10 w-10 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-gray-600"
          aria-label="返回拼写页"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div className="flex-1">
          <div className="flex items-center justify-between text-xs text-gray-500 mb-1.5">
            <span>今日顺序学习</span>
            <span>{index + 1} / {words.length}</span>
          </div>
          <div className="h-2 bg-indigo-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all"
              style={{ width: `${((index + 1) / words.length) * 100}%` }}
            />
          </div>
        </div>
      </div>

      <section className="rounded-3xl bg-gradient-to-br from-indigo-600 to-blue-600 text-white p-4 sm:p-5 text-center shadow-lg mb-4">
        <div className="flex items-center justify-center gap-2.5 min-w-0 overflow-x-auto">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight whitespace-nowrap">{currentWord.word}</h1>
          {currentWord.phonetic && (
            <span className="text-sm text-indigo-100 font-mono whitespace-nowrap">{currentWord.phonetic}</span>
          )}
          <button
            onClick={() => speakWord(currentWord.word, currentWord.id)}
            className="w-9 h-9 shrink-0 rounded-full bg-white/15 flex items-center justify-center hover:bg-white/25"
            aria-label={`朗读 ${currentWord.word}`}
          >
            <Volume2 className="w-5 h-5" />
          </button>
        </div>
        <p className="text-sm sm:text-base mt-2 leading-relaxed whitespace-pre-line">{currentWord.definition}</p>
        {currentWord.example && (
          <div className="mt-2.5 rounded-xl bg-white/10 px-3 py-2.5 text-left">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-indigo-100">课本例句</span>
              <button
                onClick={() => speakWord(currentWord.example)}
                className="inline-flex items-center gap-1 text-xs text-white bg-white/15 rounded-lg px-2 py-1 hover:bg-white/25"
              >
                <Volume2 className="w-3.5 h-3.5" />
                朗读
              </button>
            </div>
            <HighlightedStudyExample
              example={currentWord.example}
              word={currentWord.word}
              tone="hero"
            />
          </div>
        )}
        {currentWord.tags?.length > 0 && (
          <div className="mt-2.5 text-left">
            <p className="text-[11px] font-medium text-indigo-100 mb-1.5">单词标签</p>
            <div className="overflow-x-auto">
              <div className="flex flex-nowrap justify-start gap-2 min-w-max">
                {currentWord.tags.map((tag: any) => (
                  <button
                    type="button"
                    key={tag.id}
                    title={tag.description || tag.name}
                    onClick={() => setSelectedTagId(tag.id)}
                    className="inline-flex items-center rounded-full bg-white/25 border border-white/45 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-white/35 active:scale-95 transition-all"
                  >
                    <Tag className="w-3.5 h-3.5 mr-1.5" />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      <section className="rounded-2xl bg-white border border-gray-100 p-4 mb-4">
        <div className="flex items-center gap-2 mb-1">
          <Layers3 className="w-4 h-4 text-amber-500 shrink-0" />
          <h2 className="text-sm font-semibold text-gray-800">自然拼读拆分</h2>
          <span className="hidden sm:inline text-xs text-gray-400">先看音节，再按字母块合并拼读</span>
        </div>

        <div className="overflow-x-auto py-2">
          <div className="flex items-center gap-1.5 min-w-max">
            {phonics.syllables?.length > 0 && (
              <>
                <span className="text-[10px] text-gray-400 mr-0.5">音节</span>
              {phonics.syllables.map((syllable: string, syllableIndex: number) => (
                <span key={`${syllable}-${syllableIndex}`} className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 text-sm font-semibold">
                  {syllable}
                </span>
              ))}
                <span className="w-px h-7 bg-gray-200 mx-1" />
              </>
            )}
            <span className="text-[10px] text-gray-400 mr-0.5">字母块</span>
            {phonics.blocks.map((block: any, blockIndex: number) => {
              const color = block.comboType === "vowel_combo"
                ? "bg-amber-100 text-amber-700 border-amber-200"
                : block.comboType === "consonant_blend"
                  ? "bg-indigo-100 text-indigo-700 border-indigo-200"
                  : block.comboType === "magic_e"
                    ? "bg-pink-100 text-pink-700 border-pink-200"
                    : block.comboType === "separator"
                      ? "border-transparent text-gray-300"
                      : "bg-slate-50 text-slate-700 border-slate-200";
              return (
                <span key={`${block.letters}-${blockIndex}`} className={`px-2.5 py-1.5 rounded-lg border text-base font-bold ${color}`}>
                  {block.letters === " " ? "·" : block.letters}
                </span>
              );
            })}
          </div>
        </div>

        {phonics.patterns?.length > 0 ? (
          <div className="space-y-1.5 mt-1">
            {phonics.patterns.map((pattern: any, patternIndex: number) => (
              <div key={`${pattern.type}-${pattern.text}-${patternIndex}`} className="flex items-start gap-2 rounded-lg bg-amber-50/70 border border-amber-100 px-2.5 py-2">
                <span className="text-sm font-semibold text-amber-800 shrink-0">{pattern.text}</span>
                <p className="text-xs text-amber-700/80 leading-relaxed">{pattern.explanation}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-gray-500 leading-relaxed">
            这个词没有检测到固定字母组合，可以按上面的音节和单字母顺序，由慢到快合并拼读。
          </p>
        )}
        <p className="text-[10px] text-gray-400 mt-3">
          提示：自然拼读是常见规律，遇到不规则单词时请以音标和真人发音为准。
        </p>
      </section>

      {currentWord.notes && (
        <section className="rounded-2xl bg-white border border-gray-100 p-5 mb-4">
          <h2 className="text-sm font-semibold text-gray-800 mb-2">备注</h2>
          <p className="text-sm text-gray-600 whitespace-pre-line leading-relaxed">{currentWord.notes}</p>
        </section>
      )}

      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="outline"
          className="h-12"
          disabled={index === 0}
          onClick={() => setIndex((current) => Math.max(0, current - 1))}
        >
          <ChevronLeft className="w-4 h-4 mr-1" />
          上一个
        </Button>
        <Button className="h-12 bg-gradient-to-r from-indigo-500 to-blue-600" onClick={goNext}>
          {index < words.length - 1 ? "下一个" : "完成学习"}
          {index < words.length - 1 && <ChevronRight className="w-4 h-4 ml-1" />}
        </Button>
      </div>

      <TagDetailDialog
        tagId={selectedTagId}
        open={selectedTagId !== null}
        onClose={() => setSelectedTagId(null)}
      />
    </main>
  );
}

function HighlightedStudyExample({
  example,
  word,
  tone = "default",
}: {
  example: string;
  word: string;
  tone?: "default" | "hero";
}) {
  const escaped = word.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const pieces = example.split(new RegExp(`(${escaped})`, "gi"));
  return (
    <p className={`text-base leading-relaxed whitespace-pre-line ${tone === "hero" ? "text-white" : "text-emerald-950"}`}>
      {pieces.map((piece, index) =>
        piece.toLowerCase() === word.toLowerCase() ? (
          <span
            key={index}
            className={`font-bold ${tone === "hero" ? "text-emerald-200" : "text-emerald-600"}`}
          >
            {piece}
          </span>
        ) : (
          <span key={index}>{piece}</span>
        ),
      )}
    </p>
  );
}

// ============================================================
// Dictation Wrapper - uses the selected challenge/revenge word source
// ============================================================
function DictationWrapper({
  source,
  onBack,
}: {
  source: PracticeSourceMode;
  onBack: () => void;
}) {
  const { todayWords, selectedIds } = useTodayWords();
  const { data: errorWords, isLoading: errorsLoading } =
    trpc.spelling.getErrorWords.useQuery(undefined, {
      enabled: source === "revenge",
    });
  const words = source === "revenge" ? errorWords ?? [] : todayWords;
  const isEmpty =
    source === "revenge" ? !errorsLoading && words.length === 0 : selectedIds.length === 0;

  if (isEmpty) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-1">
            {source === "revenge" ? "错题本里还没有单词" : "还没有选择今日练习单词"}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {source === "revenge"
              ? "出现错题后，就可以回来发起复仇之战"
              : "请先返回首页选择要练习的单词"}
          </p>
          <Button className="bg-gradient-to-r from-indigo-500 to-blue-600" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
        </div>
      </main>
    );
  }

  if (errorsLoading) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-rose-500" />
      </main>
    );
  }

  return <DictationMode words={words} onBack={onBack} />;
}

// ============================================================
// Practice Mode Wrapper - loads challenge or revenge words
// ============================================================
function PracticeModeWrapper({
  mode,
  source,
  onBack,
}: {
  mode: SpellView;
  source: PracticeSourceMode;
  onBack: () => void;
}) {
  const { todayWords, selectedIds } = useTodayWords();
  const { data: errorWords, isLoading: errorsLoading } =
    trpc.spelling.getErrorWords.useQuery(undefined, {
      enabled: source === "revenge",
    });
  const words = source === "revenge" ? errorWords ?? [] : todayWords;
  const isEmpty =
    source === "revenge" ? !errorsLoading && words.length === 0 : selectedIds.length === 0;

  if (isEmpty) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <ListChecks className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500 mb-1">
            {source === "revenge" ? "错题本里还没有单词" : "还没有选择今日练习单词"}
          </p>
          <p className="text-xs text-gray-400 mb-4">
            {source === "revenge"
              ? "出现错题后，就可以回来发起复仇之战"
              : "请先返回首页选择要练习的单词"}
          </p>
          <Button
            className="bg-gradient-to-r from-indigo-500 to-blue-600"
            onClick={onBack}
          >
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回
          </Button>
        </div>
      </main>
    );
  }

  if (errorsLoading || words.length === 0) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-indigo-500 mx-auto mb-4" />
          <p className="text-gray-500">加载中...</p>
        </div>
      </main>
    );
  }

  switch (mode) {
    case "blocks":
      return <BlocksMode onBack={onBack} words={words} />;
    case "fillblank":
      return <FillBlankMode onBack={onBack} words={words} />;
    case "flash":
      return <FlashMode onBack={onBack} words={words} />;
    default:
      return null;
  }
}

// ============================================================
// Mode A: Blocks Puzzle (Drag & Drop Letter Blocks)
// ============================================================
function BlocksMode({ onBack, words }: { onBack: () => void; words: any[] }) {
  const utils = trpc.useUtils();
  const [rewardPoints, setRewardPoints] = useState<number | null>(null);
  const [rewardCapped, setRewardCapped] = useState(false);
  const submitResult = trpc.spelling.submitResult.useMutation({
    onSuccess: (data) => {
      if (data.isCorrect) {
        setRewardPoints(data.pointsEarned);
        setRewardCapped(data.rewardCapped);
        setSessionPoints((points) => points + data.pointsEarned);
      }
      void utils.spelling.getReviewQueue.invalidate();
      void utils.spelling.getErrorWords.invalidate();
      void utils.spelling.getErrorBook.invalidate();
      void utils.spelling.getStats.invalidate();
    },
  });

  const [index, setIndex] = useState(0);
  const [slots, setSlots] = useState<Array<{ letter: string; poolId: string } | null>>([]);
  const [pool, setPool] = useState<Array<{ id: string; letter: string; comboType?: string; used: boolean }>>([]);
  const [activeSlotIndex, setActiveSlotIndex] = useState(0);
  const [highlightedPoolId, setHighlightedPoolId] = useState<string | null>(null);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionResults, setSessionResults] = useState<Array<{ word: string; correct: boolean }>>([]);
  const [retryToken, setRetryToken] = useState(0);

  const currentWord = words?.[index];
  const practiceTarget = currentWord
    ? normalizePracticeAnswer(currentWord.word)
    : "";
  useAutoSpeakTwice(currentWord, retryToken);

  const [letterBlocks, setLetterBlocks] = useState<Array<{ id: string; letters: string; comboType?: string }>>([]);
  const blockCharacterRanges = letterBlocks.map((block, blockIndex) => {
    const start = letterBlocks
      .slice(0, blockIndex)
      .reduce((total, item) => total + item.letters.length, 0);
    return { start, end: start + block.letters.length };
  });
  const activeCharacterIndexes =
    blockCharacterRanges[activeSlotIndex]
      ? Array.from(
          {
            length:
              blockCharacterRanges[activeSlotIndex].end -
              blockCharacterRanges[activeSlotIndex].start,
          },
          (_, offset) => blockCharacterRanges[activeSlotIndex].start + offset,
        )
      : [];
  const currentAnswer = slots.map((slot) => slot?.letter ?? "").join("");
  const contextAnswer = slots
    .map((slot, slotIndex) =>
      slot?.letter ??
      "\u00a0".repeat(letterBlocks[slotIndex]?.letters.length ?? 1),
    )
    .join("")
    .trimEnd();
  const hasContextExample = Boolean(
    currentWord &&
      pickPracticeExample(currentWord.example, currentWord.word),
  );

  useEffect(() => {
    if (currentWord) {
      let practiceBlockIndex = 0;
      const blocks = (practiceTarget.match(/[a-z]+|[^a-z]+/gi) ?? [])
        .flatMap((segment) => {
          if (/^[a-z]+$/i.test(segment)) {
            return generateLetterBlocks(segment).map((block) => ({
              ...block,
              id: `practice-${practiceBlockIndex++}`,
            }));
          }
          return [...segment].map((character) => ({
            id: `practice-${practiceBlockIndex++}`,
            letters: character,
            isCombo: false,
            comboType: "separator",
          }));
        });
      setLetterBlocks(blocks);
      // Scramble pool
      const poolItems = blocks
        .filter((block) => !/^\s+$/.test(block.letters))
        .map((block) => ({
          id: block.id,
          letter: block.letters,
          comboType: block.comboType,
          used: false,
        }));
      poolItems.sort(() => Math.random() - 0.5);
      setPool(poolItems);
      setSlots(
        blocks.map((block) =>
          /^\s+$/.test(block.letters)
            ? { letter: block.letters, poolId: block.id }
            : null,
        ),
      );
      setActiveSlotIndex(
        blocks.findIndex((block) => !/^\s+$/.test(block.letters)),
      );
      setHighlightedPoolId(null);
      setRewardPoints(null);
      setRewardCapped(false);
      setResult(null);
    }
  }, [currentWord?.id, practiceTarget, retryToken]);

  const handleSlotClick = (slotIdx: number) => {
    if (result) return;
    if (/^\s+$/.test(letterBlocks[slotIdx]?.letters ?? "")) return;
    setActiveSlotIndex(slotIdx);
    if (!slots[slotIdx]) {
      setHighlightedPoolId(null);
      return;
    }
    const { poolId } = slots[slotIdx]!;
    setHighlightedPoolId(poolId);
    setSlots((s) => { const n = [...s]; n[slotIdx] = null; return n; });
    setPool((p) => p.map((item) => item.id === poolId ? { ...item, used: false } : item));
  };

  const handlePoolClick = (poolIdx: number) => {
    if (result) return;
    if (pool[poolIdx].used) {
      const slotIndex = slots.findIndex(
        (slot) => slot?.poolId === pool[poolIdx].id,
      );
      if (slotIndex >= 0) handleSlotClick(slotIndex);
      return;
    }
    const destination =
      activeSlotIndex >= 0 && activeSlotIndex < slots.length
        ? activeSlotIndex
        : slots.findIndex((slot) => !slot);
    if (destination === -1) return;
    const { letter, id: poolId } = pool[poolIdx];
    setHighlightedPoolId(null);
    const replacedPoolId = slots[destination]?.poolId;
    const nextSlots = [...slots];
    nextSlots[destination] = { letter, poolId };
    setSlots(nextSlots);
    setPool((items) =>
      items.map((item, itemIndex) => {
        if (itemIndex === poolIdx) return { ...item, used: true };
        if (item.id === replacedPoolId) return { ...item, used: false };
        return item;
      }),
    );
    const nextEmptyAfter = nextSlots.findIndex(
      (slot, slotIndex) => slotIndex > destination && !slot,
    );
    const nextEmpty = nextEmptyAfter >= 0
      ? nextEmptyAfter
      : nextSlots.findIndex((slot) => !slot);
    setActiveSlotIndex(nextEmpty >= 0 ? nextEmpty : destination);
  };

  const checkAnswer = () => {
    if (!currentWord) return;
    const correct =
      normalizePracticeAnswer(currentAnswer) === practiceTarget;
    setResult(correct ? "correct" : "wrong");
    setSessionResults((r) => [...r, { word: currentWord.word, correct }]);
    if (correct) setScore((s) => s + 1);

    submitResult.mutate({
      wordId: currentWord.id,
      isCorrect: correct,
      userInput: currentAnswer,
      practiceMode: "blocks",
    });
  };

  const nextWord = () => {
    if (words && index < words.length - 1) {
      setIndex((i) => i + 1);
      setResult(null);
    } else {
      setShowSummary(true);
    }
  };

  if (showSummary) return <SessionSummary results={sessionResults} score={score} points={sessionPoints} total={words?.length ?? 0} onBack={onBack} onRetry={() => { setIndex(0); setScore(0); setSessionPoints(0); setSessionResults([]); setShowSummary(false); setRetryToken((token) => token + 1); }} />;
  if (!currentWord) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">暂无单词可练习</p></div>;

  const allFilled = slots.every((s) => s !== null);

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-24">
      {result === "correct" && (
        <CorrectCelebration
          points={rewardPoints}
          rewardCapped={rewardCapped}
        />
      )}
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-500">{index + 1} / {words?.length}</span>
        </div>
        <span className="text-sm font-bold text-indigo-600">答对 {score}</span>
      </div>

      {/* Word Info */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
        <button
          onClick={() => speakWord(currentWord.word, currentWord.id)}
          className="inline-flex items-center gap-2 mb-2"
        >
          <Volume2 className="w-5 h-5 text-indigo-500" />
          <span className="text-xs text-gray-500">点击听发音</span>
        </button>
        <p className="text-sm text-gray-600 whitespace-pre-line">{currentWord.definition}</p>
      </div>
      <PracticeExampleLine
        currentWord={currentWord}
        tone="indigo"
        reveal={result !== null}
        answer={contextAnswer}
        activeCharacterIndexes={result ? [] : activeCharacterIndexes}
        onCharacterSelect={
          result
            ? undefined
            : (characterIndex) => {
                const blockIndex = blockCharacterRanges.findIndex(
                  (range) =>
                    characterIndex >= range.start &&
                    characterIndex < range.end,
                );
                if (blockIndex >= 0) handleSlotClick(blockIndex);
              }
        }
      />

      {/* Result - show full word details after submit */}
      {result && (
        <div className={`rounded-xl p-4 mb-4 text-center ${result === "correct" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          {result === "correct" ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">正确！</span>
              </div>
              <PracticeRewardBadge
                points={rewardPoints}
                rewardCapped={rewardCapped}
              />
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-red-700">错误</span>
            </div>
          )}
          {/* Full word info revealed after submit */}
          <div className="mt-3 pt-3 border-t border-gray-200/50">
            {result === "wrong" && (
              <p className="mb-1 text-xs text-red-500">正确单词</p>
            )}
            <p className="text-lg font-bold text-gray-900">{currentWord.word}</p>
            {result === "correct" && currentWord.phonetic && <p className="text-sm text-gray-400 font-mono mt-1">{currentWord.phonetic}</p>}
            {result === "correct" && currentWord.tags && currentWord.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {currentWord.tags.map((tag: any) => (
                  <span key={tag.id} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{tag.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {!hasContextExample && (
        <div className="flex justify-center gap-2 mb-6 flex-wrap">
          {slots.map((slot, i) => {
            const expected = letterBlocks[i];
            const isMultiLetter = expected && expected.letters.length > 1;
            return (
              <button
                key={i}
                onClick={() => handleSlotClick(i)}
                className={`h-14 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all ${
                  slot
                    ? result
                      ? letterBlocks[i] && slot.letter.toLowerCase() === letterBlocks[i].letters.toLowerCase()
                        ? "border-green-400 bg-green-50 text-green-700"
                        : "border-red-400 bg-red-50 text-red-700"
                      : "border-indigo-300 bg-indigo-50 text-indigo-700"
                    : "border-dashed border-gray-300 bg-gray-50"
                }`}
                style={isMultiLetter ? { minWidth: `${expected.letters.length * 40}px` } : { width: "48px" }}
              >
                {slot?.letter ?? ""}
              </button>
            );
          })}
        </div>
      )}

      {/* Pool */}
      {!result && (
        <div className="mb-6">
          <p className="mb-2 text-center text-[11px] text-gray-400">
            点击字母块填入例句，再次点击已选字母可撤回
          </p>
          <div className="flex justify-center gap-2 flex-wrap">
            {pool.map((item, i) => {
            const phonicsColor = item.comboType ? getPhonicsColor(item.comboType as any) : undefined;
            return (
              <button
                key={item.id}
                onClick={() => handlePoolClick(i)}
                className={`h-14 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all ${
                  item.used
                    ? "border-gray-200 bg-gray-100 text-gray-300 w-12"
                    : item.id === highlightedPoolId
                      ? "border-amber-600 bg-amber-200 text-amber-700 shadow-md ring-2 ring-amber-300"
                    : "bg-white hover:shadow-md text-gray-700 active:scale-95"
                }`}
                style={
                  !item.used
                    ? item.id === highlightedPoolId
                      ? {
                          minWidth: item.letter.length > 1 ? `${item.letter.length * 40}px` : "48px",
                          borderColor: "#D97706",
                          color: "#B45309",
                          backgroundColor: "#FDE68A",
                        }
                      : {
                        minWidth: item.letter.length > 1 ? `${item.letter.length * 40}px` : "48px",
                        borderColor: phonicsColor ?? "#d1d5db",
                        color: phonicsColor ?? "#374151",
                        backgroundColor: phonicsColor ? `${phonicsColor}15` : undefined,
                      }
                    : undefined
                }
              >
                {item.letter}
              </button>
            );
            })}
          </div>
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3">
        {!result ? (
          <Button
            className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-blue-600"
            disabled={!allFilled}
            onClick={checkAnswer}
          >
            检查答案
          </Button>
        ) : (
          <Button className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-blue-600" onClick={nextWord}>
            {words && index < words.length - 1 ? "下一个" : "查看结果"}
          </Button>
        )}
      </div>
    </main>
  );
}

// ============================================================
// Mode B: Fill in the Blank - 点击问号框 + 虚拟键盘
// ============================================================

// ============================================================
// Mode B: Fill in the Blank - 点击问号框 + 虚拟键盘
// ============================================================
function FillBlankMode({ onBack, words }: { onBack: () => void; words: any[] }) {
  const utils = trpc.useUtils();
  const [rewardPoints, setRewardPoints] = useState<number | null>(null);
  const [rewardCapped, setRewardCapped] = useState(false);
  const submitResult = trpc.spelling.submitResult.useMutation({
    onSuccess: (data) => {
      if (data.isCorrect) {
        setRewardPoints(data.pointsEarned);
        setRewardCapped(data.rewardCapped);
        setSessionPoints((points) => points + data.pointsEarned);
      }
      void utils.spelling.getReviewQueue.invalidate();
      void utils.spelling.getErrorWords.invalidate();
      void utils.spelling.getErrorBook.invalidate();
      void utils.spelling.getStats.invalidate();
    },
  });

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [activeBlankIdx, setActiveBlankIdx] = useState(0);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionResults, setSessionResults] = useState<Array<{ word: string; correct: boolean }>>([]);
  const [retryToken, setRetryToken] = useState(0);

  const currentWord = words?.[index];
  const practiceTarget = currentWord
    ? normalizePracticeAnswer(currentWord.word)
    : "";
  useAutoSpeakTwice(currentWord, retryToken);
  const blankPattern = currentWord ? generateFillBlank(practiceTarget) : null;
  // Positions that are blanks (indices in the display string)
  const blankPositions = blankPattern
    ? blankPattern.display.split("").map((c, i) => c === "_" ? i : -1).filter(i => i >= 0)
    : [];
  const blankCount = blankPositions.length;
  const hasContextExample = Boolean(
    currentWord &&
      pickPracticeExample(currentWord.example, currentWord.word),
  );

  useEffect(() => {
    setAnswers(new Array(blankCount).fill(""));
    setActiveBlankIdx(0);
    setRewardPoints(null);
    setRewardCapped(false);
    setResult(null);
  }, [index, blankCount, retryToken]);

  const handleLetterPress = (letter: string) => {
    if (result) return;
    const newAnswers = [...answers];
    newAnswers[activeBlankIdx] = letter;
    setAnswers(newAnswers);
    // Auto advance to next blank
    if (activeBlankIdx < blankCount - 1) {
      setActiveBlankIdx(activeBlankIdx + 1);
    }
  };

  const handleBackspace = () => {
    if (result) return;
    if (answers[activeBlankIdx]) {
      // Clear current
      const newAnswers = [...answers];
      newAnswers[activeBlankIdx] = "";
      setAnswers(newAnswers);
    } else if (activeBlankIdx > 0) {
      // Go back to previous
      setActiveBlankIdx(activeBlankIdx - 1);
    }
  };

  const handleBlankClick = (blankListIdx: number) => {
    if (result) return;
    setActiveBlankIdx(blankListIdx);
  };

  const checkAnswer = () => {
    if (!currentWord || !blankPattern) return;
    if (answers.some(a => !a)) return; // Not all filled

    const lower = practiceTarget;
    let filled = "";
    let ansIdx = 0;
    for (let i = 0; i < blankPattern.display.length; i++) {
      if (blankPattern.display[i] === "_") {
        filled += answers[ansIdx].toLowerCase();
        ansIdx++;
      } else {
        filled += lower[i];
      }
    }
    const correct = filled === lower;
    setResult(correct ? "correct" : "wrong");
    setSessionResults((r) => [...r, { word: currentWord.word, correct }]);
    if (correct) setScore((s) => s + 1);

    submitResult.mutate({
      wordId: currentWord.id,
      isCorrect: correct,
      userInput: filled,
      practiceMode: "fillblank",
    });
  };

  const nextWord = () => {
    if (words && index < words.length - 1) {
      setIndex((i) => i + 1);
    } else {
      setShowSummary(true);
    }
  };

  if (showSummary) return <SessionSummary results={sessionResults} score={score} points={sessionPoints} total={words?.length ?? 0} onBack={onBack} onRetry={() => { setIndex(0); setScore(0); setSessionPoints(0); setSessionResults([]); setShowSummary(false); setRetryToken((token) => token + 1); }} />;
  if (!currentWord) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">暂无单词可练习</p></div>;

  const allFilled = answers.every(a => a.length > 0);
  const contextAnswer = blankPattern
    ? blankPattern.display
        .split("")
        .map((character, displayIndex) => {
          if (character !== "_") return character;
          const answerIndex = blankPositions.indexOf(displayIndex);
          return answers[answerIndex] || "\u00a0";
        })
        .join("")
    : "";
  // Map blank position in display to blank list index
  let blankCounter = -1;

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col">
      {result === "correct" && (
        <CorrectCelebration
          points={rewardPoints}
          rewardCapped={rewardCapped}
        />
      )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-500">{index + 1} / {words?.length}</span>
        </div>
        <span className="text-sm font-bold text-emerald-600">答对 {score}</span>
      </div>

      {/* Word Info - 只显示释义 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
        <button
          onClick={() => speakWord(currentWord.word, currentWord.id)}
          className="inline-flex items-center gap-2 mb-2"
        >
          <Volume2 className="w-5 h-5 text-emerald-500" />
          <span className="text-xs text-gray-500">听发音</span>
        </button>
        <p className="text-sm text-gray-600 whitespace-pre-line">{currentWord.definition}</p>
      </div>
      <PracticeExampleLine
        currentWord={currentWord}
        tone="emerald"
        reveal={result !== null}
        answer={contextAnswer}
        activeCharacterIndexes={
          result || blankPositions[activeBlankIdx] === undefined
            ? []
            : [blankPositions[activeBlankIdx]]
        }
        onCharacterSelect={
          result
            ? undefined
            : (characterIndex) => {
                const blankIndex = blankPositions.indexOf(characterIndex);
                if (blankIndex >= 0) setActiveBlankIdx(blankIndex);
              }
        }
      />

      {!hasContextExample && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4">
        <p className="text-xs text-gray-400 text-center mb-3">点击虚线框，选择字母填入</p>
        <div className="flex items-center justify-center gap-1.5 flex-wrap">
          {blankPattern?.display.split("").map((char, displayIdx) => {
            if (char === "_") {
              blankCounter++;
              const listIdx = blankCounter;
              const isActive = listIdx === activeBlankIdx && !result;
              return (
                <button
                  key={displayIdx}
                  onClick={() => handleBlankClick(listIdx)}
                  disabled={!!result}
                  className={`w-12 h-14 rounded-xl flex items-center justify-center text-xl font-bold transition-all ${
                    result
                      ? answers[listIdx]?.toLowerCase() === practiceTarget[displayIdx]
                        ? "border-2 border-green-400 bg-green-50 text-green-700"
                        : "border-2 border-red-400 bg-red-50 text-red-700"
                      : isActive
                        ? "border-3 border-emerald-500 bg-emerald-100 text-emerald-800 shadow-md ring-2 ring-emerald-200"
                        : answers[listIdx]
                          ? "border-2 border-emerald-300 bg-emerald-50 text-emerald-700"
                          : "border-2 border-dashed border-emerald-300 bg-emerald-50/50 text-emerald-300"
                  }`}
                >
                  {answers[listIdx] || "?"}
                </button>
              );
            } else {
              return (
                <span
                  key={displayIdx}
                  className="w-10 h-14 rounded-lg flex items-center justify-center text-xl font-bold bg-gray-100 text-gray-700"
                >
                  {char}
                </span>
              );
            }
          })}
        </div>
        <p className="text-xs text-gray-400 text-center mt-2">{blankPattern?.hint}</p>
        </div>
      )}

      {/* Result after submit */}
      {result && (
        <div className={`rounded-xl p-4 mb-4 text-center ${result === "correct" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          {result === "correct" ? (
            <>
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">正确！</span>
              </div>
              <PracticeRewardBadge
                points={rewardPoints}
                rewardCapped={rewardCapped}
              />
            </>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-red-700">错误</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-200/50">
            <p className="text-lg font-bold text-gray-900">{currentWord.word}</p>
            {currentWord.phonetic && <p className="text-sm text-gray-400 font-mono mt-1">{currentWord.phonetic}</p>}
            {currentWord.tags && currentWord.tags.length > 0 && (
              <div className="flex flex-wrap justify-center gap-1 mt-2">
                {currentWord.tags.map((tag: any) => (
                  <span key={tag.id} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{tag.name}</span>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Virtual Keyboard */}
      {!result && (
        <div className="mt-auto">
          {/* A-Z keyboard */}
          <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-5">
            {/* Row 1: QWERTYUIOP */}
            <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2 mb-1 md:mb-2">
              {["q","w","e","r","t","y","u","i","o","p"].map(letter => (
                <button
                  key={letter}
                  onClick={() => handleLetterPress(letter)}
                  className="w-8 h-10 sm:w-9 sm:h-11 md:w-11 md:h-13 lg:w-12 lg:h-14 rounded-lg bg-white border border-gray-200 text-sm sm:text-base md:text-lg font-semibold text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 active:scale-95 transition-all"
                >
                  {letter}
                </button>
              ))}
            </div>
            {/* Row 2: asdfghjkl */}
            <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2 mb-1 md:mb-2">
              {["a","s","d","f","g","h","j","k","l"].map(letter => (
                <button
                  key={letter}
                  onClick={() => handleLetterPress(letter)}
                  className="w-8 h-10 sm:w-9 sm:h-11 md:w-11 md:h-13 lg:w-12 lg:h-14 rounded-lg bg-white border border-gray-200 text-sm sm:text-base md:text-lg font-semibold text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 active:scale-95 transition-all"
                >
                  {letter}
                </button>
              ))}
            </div>
            <PracticeExtraKeyboardRow
              tone="emerald"
              onKey={handleLetterPress}
              includeSpace={false}
            />
            {/* Row 3: zxcvbnm + Delete */}
            <div className="flex justify-center gap-1">
              {["z","x","c","v","b","n","m"].map(letter => (
                <button
                  key={letter}
                  onClick={() => handleLetterPress(letter)}
                  className="w-8 h-10 sm:w-9 sm:h-11 md:w-11 md:h-13 lg:w-12 lg:h-14 rounded-lg bg-white border border-gray-200 text-sm sm:text-base md:text-lg font-semibold text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 active:scale-95 transition-all"
                >
                  {letter}
                </button>
              ))}
              <button
                onClick={handleBackspace}
                className="w-10 h-10 sm:w-11 sm:h-11 md:w-13 md:h-13 lg:w-14 lg:h-14 rounded-lg bg-gray-200 border border-gray-300 text-sm sm:text-base font-semibold text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:scale-95 transition-all flex items-center justify-center"
                title="删除"
              >
                <Delete className="w-4 h-4 sm:w-5 sm:h-5" />
              </button>
              <button
                onClick={checkAnswer}
                disabled={!allFilled}
                className={`h-10 sm:h-11 md:h-13 lg:h-14 rounded-lg text-xs sm:text-sm md:text-base font-semibold transition-all active:scale-95 flex items-center justify-center px-2 sm:px-3 ${
                  allFilled
                    ? "bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md"
                    : "bg-gray-300 text-gray-500 cursor-not-allowed"
                }`}
                title="提交答案"
              >
                提交
              </button>
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="mt-4">
          <Button className="w-full h-12 bg-gradient-to-r from-emerald-500 to-teal-600" onClick={nextWord}>
            {words && index < words.length - 1 ? "下一个" : "查看结果"}
          </Button>
        </div>
      )}
    </main>
  );
}

// ============================================================
// Mode C: Flash Speed Challenge
// ============================================================

// ============================================================
// Mode C: Flash Speed Challenge
// ============================================================
function FlashMode({ onBack, words }: { onBack: () => void; words: any[] }) {
  const utils = trpc.useUtils();
  const [rewardPoints, setRewardPoints] = useState<number | null>(null);
  const [rewardCapped, setRewardCapped] = useState(false);
  const submitResult = trpc.spelling.submitResult.useMutation({
    onSuccess: (data) => {
      if (data.isCorrect) {
        setRewardPoints(data.pointsEarned);
        setRewardCapped(data.rewardCapped);
        setSessionPoints((points) => points + data.pointsEarned);
      }
      void utils.spelling.getReviewQueue.invalidate();
      void utils.spelling.getErrorWords.invalidate();
      void utils.spelling.getErrorBook.invalidate();
      void utils.spelling.getStats.invalidate();
    },
  });

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"show" | "input" | "result">("show");
  const [input, setInput] = useState("");
  const [activeInputIndex, setActiveInputIndex] = useState(0);
  const [timeLeft, setTimeLeft] = useState(3);
  const [score, setScore] = useState(0);
  const [sessionPoints, setSessionPoints] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionResults, setSessionResults] = useState<Array<{ word: string; correct: boolean }>>([]);
  const [retryToken, setRetryToken] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentWord = words?.[index];
  const hasContextExample = Boolean(
    currentWord &&
      pickPracticeExample(currentWord.example, currentWord.word),
  );
  useAutoSpeakTwice(currentWord, retryToken);

  useEffect(() => {
    if (phase === "show" && currentWord) {
      setTimeLeft(3);
      const timer = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timer);
            setActiveInputIndex(0);
            setPhase("input");
            return 0;
          }
          return t - 1;
        });
      }, 1000);
      timerRef.current = timer;
      return () => clearInterval(timer);
    }
  }, [phase, currentWord]);

  const checkAnswer = () => {
    if (!currentWord) return;
    const correct =
      normalizePracticeAnswer(input) ===
      normalizePracticeAnswer(currentWord.word);
    setPhase("result");
    setSessionResults((r) => [...r, { word: currentWord.word, correct }]);
    if (correct) setScore((s) => s + 1);

    submitResult.mutate({
      wordId: currentWord.id,
      isCorrect: correct,
      userInput: input,
      practiceMode: "flash",
    });
  };

  const handleFlashKey = (key: string) => {
    setInput((previous) => {
      const characters = [...previous];
      while (characters.length <= activeInputIndex) {
        characters.push("\u00a0");
      }
      characters[activeInputIndex] = key;
      const nextEmpty = characters.findIndex(
        (character, characterIndex) =>
          characterIndex > activeInputIndex &&
          (character === "\u00a0" || character === " "),
      );
      setActiveInputIndex(
        nextEmpty >= 0
          ? nextEmpty
          : Math.min(
              activeInputIndex + 1,
              Math.max(0, [...normalizePracticeAnswer(currentWord?.word ?? "")].length - 1),
            ),
      );
      return characters.join("");
    });
  };

  const handleFlashDelete = () => {
    setInput((previous) => {
      const characters = [...previous];
      if (activeInputIndex < characters.length) {
        characters[activeInputIndex] = "\u00a0";
      }
      return characters.join("").trimEnd();
    });
  };

  const nextWord = () => {
    if (words && index < words.length - 1) {
      setIndex((i) => i + 1);
      setInput("");
      setActiveInputIndex(0);
      setRewardPoints(null);
      setRewardCapped(false);
      setPhase("show");
    } else {
      setShowSummary(true);
    }
  };

  if (showSummary) return <SessionSummary results={sessionResults} score={score} points={sessionPoints} total={words?.length ?? 0} onBack={onBack} onRetry={() => { setIndex(0); setScore(0); setSessionPoints(0); setRewardPoints(null); setRewardCapped(false); setSessionResults([]); setShowSummary(false); setPhase("show"); setInput(""); setRetryToken((token) => token + 1); }} />;
  if (!currentWord) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">暂无单词可练习</p></div>;

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-24">
      {phase === "result" &&
        normalizePracticeAnswer(input) ===
          normalizePracticeAnswer(currentWord.word) && (
          <CorrectCelebration
            points={rewardPoints}
            rewardCapped={rewardCapped}
          />
        )}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-500">{index + 1} / {words?.length}</span>
        </div>
        <span className="text-sm font-bold text-amber-600">答对 {score}</span>
      </div>

      {phase === "show" && (
        <div>
          <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
            <p className="text-sm text-gray-500 mb-4">记住这个单词！</p>
            <div className="flex items-center justify-center gap-3 mb-2">
              <h2 className="text-3xl font-bold text-gray-900">{currentWord.word}</h2>
              <button
                onClick={() => speakWord(currentWord.word, currentWord.id)}
                className="p-2 rounded-lg hover:bg-amber-50 text-gray-400 hover:text-amber-600 transition-colors active:scale-90"
                title="重听发音"
              >
                <Volume2 className="w-5 h-5" />
              </button>
            </div>
            {currentWord.phonetic && <p className="text-sm text-gray-400 font-mono mb-2">{currentWord.phonetic}</p>}
            <p className="text-sm text-gray-600 mb-6 whitespace-pre-line">{currentWord.definition}</p>
            <div className="flex items-center justify-center gap-2">
              <Clock className="w-5 h-5 text-amber-500" />
              <span className="text-2xl font-bold text-amber-500">{timeLeft}</span>
            </div>
          </div>
          <PracticeExampleLine currentWord={currentWord} tone="amber" reveal />
        </div>
      )}

      {phase === "input" && (
        <div className="space-y-4 min-h-[60vh] flex flex-col">
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <Lightbulb className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-amber-700 whitespace-pre-line">{currentWord.definition}</p>
          </div>
          <PracticeExampleLine
            currentWord={currentWord}
            tone="amber"
            answer={input}
            activeCharacterIndexes={[activeInputIndex]}
            onCharacterSelect={setActiveInputIndex}
          />

          {!hasContextExample && (
            <div className="flex-1 flex flex-col justify-center">
              <div className="h-14 rounded-xl border-2 border-amber-300 bg-white flex items-center justify-center text-xl tracking-[0.3em] font-mono font-bold text-gray-900">
                {input || <span className="text-gray-300 text-sm tracking-normal">点击键盘输入单词</span>}
              </div>
            </div>
          )}

          {/* Virtual Keyboard */}
          <div className="mt-auto">
            <div className="bg-gray-50 rounded-xl p-3 sm:p-4 md:p-5">
              {/* Row 1: QWERTYUIOP */}
              <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2 mb-1 md:mb-2">
                {["q","w","e","r","t","y","u","i","o","p"].map(letter => (
                  <button
                    key={letter}
                    onClick={() => handleFlashKey(letter)}
                    className="w-8 h-10 sm:w-9 sm:h-11 md:w-11 md:h-13 lg:w-12 lg:h-14 rounded-lg bg-white border border-gray-200 text-sm sm:text-base md:text-lg font-semibold text-gray-700 hover:bg-amber-50 hover:border-amber-300 active:scale-95 transition-all"
                  >
                    {letter}
                  </button>
                ))}
              </div>
              {/* Row 2: asdfghjkl */}
              <div className="flex justify-center gap-1 sm:gap-1.5 md:gap-2 mb-1 md:mb-2">
                {["a","s","d","f","g","h","j","k","l"].map(letter => (
                  <button
                    key={letter}
                    onClick={() => handleFlashKey(letter)}
                    className="w-8 h-10 sm:w-9 sm:h-11 md:w-11 md:h-13 lg:w-12 lg:h-14 rounded-lg bg-white border border-gray-200 text-sm sm:text-base md:text-lg font-semibold text-gray-700 hover:bg-amber-50 hover:border-amber-300 active:scale-95 transition-all"
                  >
                    {letter}
                  </button>
                ))}
              </div>
              <PracticeExtraKeyboardRow
                tone="amber"
                onKey={handleFlashKey}
              />
              {/* Row 3: zxcvbnm + Delete */}
              <div className="flex justify-center gap-1">
                {["z","x","c","v","b","n","m"].map(letter => (
                  <button
                    key={letter}
                    onClick={() => handleFlashKey(letter)}
                    className="w-8 h-10 sm:w-9 sm:h-11 md:w-11 md:h-13 lg:w-12 lg:h-14 rounded-lg bg-white border border-gray-200 text-sm sm:text-base md:text-lg font-semibold text-gray-700 hover:bg-amber-50 hover:border-amber-300 active:scale-95 transition-all"
                  >
                    {letter}
                  </button>
                ))}
                <button
                  onClick={handleFlashDelete}
                  className="w-10 h-10 sm:w-11 sm:h-11 md:w-13 md:h-13 lg:w-14 lg:h-14 rounded-lg bg-gray-200 border border-gray-300 text-sm sm:text-base font-semibold text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:scale-95 transition-all flex items-center justify-center"
                  title="删除"
                >
                  <Delete className="w-4 h-4 sm:w-5 sm:h-5" />
                </button>
                <button
                  onClick={checkAnswer}
                  disabled={!input.trim()}
                  className={`h-10 sm:h-11 md:h-13 lg:h-14 rounded-lg text-xs sm:text-sm md:text-base font-semibold transition-all active:scale-95 flex items-center justify-center px-2 sm:px-3 ${
                    input.trim()
                      ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white shadow-md"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                  title="提交答案"
                >
                  提交
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="space-y-4">
          <div className={`rounded-xl p-4 text-center ${
            normalizePracticeAnswer(input) ===
            normalizePracticeAnswer(currentWord.word)
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}>
            {normalizePracticeAnswer(input) ===
            normalizePracticeAnswer(currentWord.word) ? (
              <>
                <div className="flex items-center justify-center gap-2 mb-2">
                  <CheckCircle2 className="w-5 h-5 text-green-500" />
                  <span className="text-sm font-medium text-green-700">正确！</span>
                </div>
                <PracticeRewardBadge
                  points={rewardPoints}
                  rewardCapped={rewardCapped}
                />
              </>
            ) : (
              <div className="flex items-center justify-center gap-2 mb-2">
                <XCircle className="w-5 h-5 text-red-500" />
                <span className="text-sm font-medium text-red-700">错误</span>
              </div>
            )}
            {/* Full word details */}
            <div className="mt-3 pt-3 border-t border-gray-200/50 text-left">
              <div className="flex items-center justify-between">
                <p className="text-lg font-bold text-gray-900">{currentWord.word}</p>
                <button onClick={() => speakWord(currentWord.word)} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-amber-500">
                  <Volume2 className="w-4 h-4" />
                </button>
              </div>
              {currentWord.phonetic && <p className="text-sm text-gray-400 font-mono mt-0.5">{currentWord.phonetic}</p>}
              <p className="text-sm text-gray-600 mt-2 whitespace-pre-line">{currentWord.definition}</p>
              <PracticeExampleLine currentWord={currentWord} tone="amber" reveal />
              {currentWord.tags && currentWord.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {currentWord.tags.map((tag: any) => (
                    <span key={tag.id} className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-600 rounded">{tag.name}</span>
                  ))}
                </div>
              )}
              <p className="text-xs text-gray-400 mt-2">你的输入：{input}</p>
            </div>
          </div>
          <Button className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-600" onClick={nextWord}>
            {words && index < words.length - 1 ? "下一个" : "查看结果"}
          </Button>
        </div>
      )}
    </main>
  );
}

// ============================================================
// Session Summary Component
// ============================================================

// ============================================================
// Session Summary Component
// ============================================================
function SessionSummary({
  results,
  score,
  points,
  total,
  onBack,
  onRetry,
}: {
  results: Array<{ word: string; correct: boolean }>;
  score: number;
  points: number;
  total: number;
  onBack: () => void;
  onRetry: () => void;
}) {
  const accuracy = total > 0 ? Math.round((score / total) * 100) : 0;

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="bg-white rounded-xl border border-gray-100 p-6 text-center mb-6">
        <Trophy className="w-12 h-12 text-amber-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-gray-900 mb-1">练习完成！</h2>
        <p className="text-3xl font-bold text-indigo-600 mb-2">{score} / {total}</p>
        <p className="text-sm text-gray-500">正确率 {accuracy}%</p>
        <div className="mx-auto mt-3 w-fit rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-700">
          本轮获得 +{points} 积分
        </div>

        {/* Level badge */}
        <div className="mt-3">
          {accuracy >= 80 ? (
            <span className="text-xs bg-green-100 text-green-700 px-3 py-1 rounded-full font-medium">优秀</span>
          ) : accuracy >= 60 ? (
            <span className="text-xs bg-amber-100 text-amber-700 px-3 py-1 rounded-full font-medium">良好</span>
          ) : (
            <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">继续加油</span>
          )}
        </div>
      </div>

      {/* Result list */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
        <h3 className="text-sm font-semibold text-gray-700 mb-3">详细结果</h3>
        <div className="space-y-1.5 max-h-64 overflow-y-auto">
          {results.map((r, i) => (
            <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
              {r.correct ? (
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
              )}
              <span className="text-sm font-medium flex-1">{r.word}</span>
              <span className={`text-xs ${r.correct ? "text-green-500" : "text-red-500"}`}>
                {r.correct ? "正确" : "错误"}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        <Button variant="outline" className="flex-1 h-12" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回
        </Button>
        <Button className="flex-1 h-12 bg-gradient-to-r from-indigo-500 to-blue-600" onClick={onRetry}>
          <RotateCcw className="w-4 h-4 mr-1" /> 再来一轮
        </Button>
      </div>
    </main>
  );
}
