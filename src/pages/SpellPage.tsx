import { useState, useEffect, useRef } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  PenLine,
  Loader2,
  Play,
  Volume2,
  Zap,
  Puzzle,
  Keyboard,
  ArrowLeft,
  RotateCcw,
  Trophy,
  Clock,
  CheckCircle2,
  XCircle,
  Target,
  Lightbulb,
  GraduationCap,
  Sparkles,
  Delete,
} from "lucide-react";
import {
  generateLetterBlocks,
  generateFillBlank,
} from "@/utils/phonics";
import { useSearchParams } from "react-router";

// ============================================================
// Speech helper - reliable cross-browser TTS
// ============================================================
function speakWord(word: string) {
  if (!("speechSynthesis" in window)) return;
  // Cancel any ongoing speech first
  window.speechSynthesis.cancel();
  // Some browsers (Chrome) need resume() after cancel()
  window.speechSynthesis.resume();
  const utterance = new SpeechSynthesisUtterance(word);
  utterance.lang = "en-US";
  utterance.rate = 0.9;
  // Try to pick a good English voice
  const voices = window.speechSynthesis.getVoices();
  const enVoice = voices.find((v) => v.lang.startsWith("en") && v.name.includes("Google"))
    || voices.find((v) => v.lang.startsWith("en"))
    || voices[0];
  if (enVoice) utterance.voice = enVoice;
  window.speechSynthesis.speak(utterance);
}

// ============================================================
// Types
// ============================================================
type SpellView = "home" | "blocks" | "fillblank" | "flash";

// ============================================================
// Main Component
// ============================================================
export default function SpellPage() {
  const [searchParams] = useSearchParams();
  const modeParam = searchParams.get("mode");
  const [view, setView] = useState<SpellView>((modeParam as SpellView) || "home");

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />
      {view === "home" && <SpellHome onStart={(v) => setView(v)} />}
      {view === "blocks" && <BlocksMode onBack={() => setView("home")} />}
      {view === "fillblank" && <FillBlankMode onBack={() => setView("home")} />}
      {view === "flash" && <FlashMode onBack={() => setView("home")} />}
      <MobileNav activeTab="spell" />
    </div>
  );
}

// ============================================================
// Spell Home - Review Queue + Mode Selection
// ============================================================
function SpellHome({ onStart }: { onStart: (mode: SpellView) => void }) {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const { data: reviewQueue, isLoading } = trpc.spelling.getReviewQueue.useQuery();
  const { data: learningQueue } = trpc.spelling.getLearningQueue.useQuery();
  const { data: errorWords } = trpc.spelling.getErrorWords.useQuery();
  const { data: stats } = trpc.spelling.getStats.useQuery();
  const [expandedCard, setExpandedCard] = useState<string | null>(null);

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }
  if (!user) return null;

  const dueCount = reviewQueue?.length ?? 0;
  const manualDue = reviewQueue?.filter((w) => w.source === "manual") ?? [];
  const autoDue = reviewQueue?.filter((w) => w.source === "auto") ?? [];

  const toggleCard = (card: string) => {
    setExpandedCard(expandedCard === card ? null : card);
  };

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2 mb-1">
        <PenLine className="w-5 h-5 text-indigo-500" />
        单词拼写
      </h1>
      <p className="text-sm text-gray-500 mb-6">先加入学习，再按艾宾浩斯曲线复习</p>

      {/* Stats Cards - Clickable to expand lists */}
      <div className="grid grid-cols-4 gap-3 mb-4">
        {/* 学习中 */}
        <button
          onClick={() => toggleCard("learning")}
          className={`bg-white rounded-xl border p-3 text-center transition-all ${expandedCard === "learning" ? "border-emerald-400 ring-2 ring-emerald-100" : "border-gray-100 hover:border-emerald-200"}`}
        >
          <p className="text-2xl font-bold text-emerald-600">{stats?.learningWords ?? 0}</p>
          <p className="text-xs text-gray-500">学习中</p>
        </button>
        {/* 新学单词 */}
        <button
          onClick={() => toggleCard("new")}
          className={`bg-white rounded-xl border p-3 text-center transition-all ${expandedCard === "new" ? "border-indigo-400 ring-2 ring-indigo-100" : "border-gray-100 hover:border-indigo-200"}`}
        >
          <p className="text-2xl font-bold text-indigo-600">{stats?.manualDue ?? 0}</p>
          <p className="text-xs text-gray-500">新学单词</p>
        </button>
        {/* 总待复习 */}
        <button
          onClick={() => toggleCard("review")}
          className={`bg-white rounded-xl border p-3 text-center transition-all ${expandedCard === "review" ? "border-amber-400 ring-2 ring-amber-100" : "border-gray-100 hover:border-amber-200"}`}
        >
          <p className="text-2xl font-bold text-amber-600">{stats?.dueForReview ?? 0}</p>
          <p className="text-xs text-gray-500">总待复习</p>
        </button>
        {/* 错题 */}
        <button
          onClick={() => toggleCard("errors")}
          className={`bg-white rounded-xl border p-3 text-center transition-all ${expandedCard === "errors" ? "border-rose-400 ring-2 ring-rose-100" : "border-gray-100 hover:border-rose-200"}`}
        >
          <p className="text-2xl font-bold text-rose-600">{stats?.totalErrors ?? 0}</p>
          <p className="text-xs text-gray-500">错题</p>
        </button>
      </div>

      {/* Expanded Lists */}
      {expandedCard === "learning" && learningQueue && learningQueue.length > 0 && (
        <div className="bg-emerald-50 rounded-xl border border-emerald-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-emerald-700 mb-2 flex items-center gap-2">
            <GraduationCap className="w-4 h-4 text-emerald-500" />
            学习中的单词 ({learningQueue.length})
          </h2>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {learningQueue.map((w) => (
              <div key={w.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/80">
                <span className="text-sm font-medium flex-1 text-emerald-800">{w.word}</span>
                {w.phonetic && <span className="text-xs text-emerald-400 font-mono">{w.phonetic}</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-600">Lv.{w.level}</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {expandedCard === "learning" && (!learningQueue || learningQueue.length === 0) && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 text-center">
          <p className="text-sm text-gray-400">暂无学习中的单词</p>
          <p className="text-xs text-gray-400 mt-1">去单词列表点击"加入学习"</p>
        </div>
      )}

      {expandedCard === "new" && manualDue.length > 0 && (
        <div className="bg-indigo-50 rounded-xl border border-indigo-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-indigo-700 mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-500" />
            新学单词 ({manualDue.length})
          </h2>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {manualDue.map((w) => (
              <div key={w.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/80">
                <span className="text-sm font-medium flex-1 text-indigo-800">{w.word}</span>
                {w.phonetic && <span className="text-xs text-indigo-400 font-mono">{w.phonetic}</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-indigo-100 text-indigo-600">新学</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {expandedCard === "new" && manualDue.length === 0 && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 text-center">
          <p className="text-sm text-gray-400">暂无新学单词</p>
          <p className="text-xs text-gray-400 mt-1">去单词列表点击"加入学习"</p>
        </div>
      )}

      {expandedCard === "review" && (
        <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-amber-700 mb-2 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            待复习队列
          </h2>
          {autoDue.length > 0 ? (
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {autoDue.map((w) => (
                <div key={w.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/80">
                  <span className="text-sm font-medium flex-1 text-amber-800">{w.word}</span>
                  {w.phonetic && <span className="text-xs text-amber-400 font-mono">{w.phonetic}</span>}
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${w.level === 1 ? "bg-red-100 text-red-600" : w.level === 2 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>Lv.{w.level}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-400 text-center py-2">暂无待复习单词</p>
          )}
        </div>
      )}

      {expandedCard === "errors" && errorWords && errorWords.length > 0 && (
        <div className="bg-rose-50 rounded-xl border border-rose-200 p-4 mb-4">
          <h2 className="text-sm font-semibold text-rose-700 mb-2 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-rose-500" />
            错题本 ({errorWords.length})
          </h2>
          <div className="space-y-1.5 max-h-40 overflow-y-auto">
            {errorWords.map((w) => (
              <div key={w.id} className="flex items-center gap-3 p-2 rounded-lg bg-white/80">
                <span className="text-sm font-medium flex-1 text-rose-800">{w.word}</span>
                {w.phonetic && <span className="text-xs text-rose-400 font-mono">{w.phonetic}</span>}
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-rose-100 text-rose-600">错{w.errorCount}次</span>
              </div>
            ))}
          </div>
        </div>
      )}
      {expandedCard === "errors" && (!errorWords || errorWords.length === 0) && (
        <div className="bg-gray-50 rounded-xl border border-gray-200 p-4 mb-4 text-center">
          <p className="text-sm text-gray-400">暂无错题</p>
          <p className="text-xs text-gray-400 mt-1">继续练习，错题会自动记录</p>
        </div>
      )}

      {/*
      {/* Mode Selection */}
      <h2 className="text-sm font-semibold text-gray-700 mb-3">选择练习模式</h2>
      <div className="space-y-3">
        <button
          onClick={() => onStart("blocks")}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
            <Puzzle className="w-6 h-6 text-indigo-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">积木拼拼乐</h3>
            <p className="text-xs text-gray-500">点击字母积木拼出正确单词</p>
          </div>
          <Play className="w-5 h-5 text-indigo-400" />
        </button>

        <button
          onClick={() => onStart("fillblank")}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-emerald-200 hover:shadow-md transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
            <Keyboard className="w-6 h-6 text-emerald-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">单词消消乐</h3>
            <p className="text-xs text-gray-500">根据提示填写缺失的字母</p>
          </div>
          <Play className="w-5 h-5 text-emerald-400" />
        </button>

        <button
          onClick={() => onStart("flash")}
          className="w-full flex items-center gap-4 p-4 bg-white rounded-xl border border-gray-100 hover:border-amber-200 hover:shadow-md transition-all text-left"
        >
          <div className="w-12 h-12 rounded-xl bg-amber-50 flex items-center justify-center shrink-0">
            <Zap className="w-6 h-6 text-amber-500" />
          </div>
          <div className="flex-1">
            <h3 className="text-base font-semibold text-gray-900">极速闪电战</h3>
            <p className="text-xs text-gray-500">限时快速拼写挑战</p>
          </div>
          <Play className="w-5 h-5 text-amber-400" />
        </button>
      </div>
    </main>
  );
}

// ============================================================
// Mode A: Blocks Puzzle (Drag & Drop Letter Blocks)
// ============================================================
function BlocksMode({ onBack }: { onBack: () => void }) {
  const utils = trpc.useUtils();
  // Prefer manual (newly learned) words, fallback to all
  const { data: words, isLoading } = trpc.spelling.getPracticeWords.useQuery({ limit: 10, source: "manual" });
  const submitResult = trpc.spelling.submitResult.useMutation({
    onSuccess: () => utils.spelling.getReviewQueue.invalidate(),
  });

  const [index, setIndex] = useState(0);
  const [slots, setSlots] = useState<string[]>([]);
  const [pool, setPool] = useState<Array<{ id: string; letter: string; used: boolean }>>([]);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionResults, setSessionResults] = useState<Array<{ word: string; correct: boolean }>>([]);

  const currentWord = words?.[index];

  const [letterBlocks, setLetterBlocks] = useState<Array<{ id: string; letters: string }>>([]);

  useEffect(() => {
    if (currentWord) {
      const blocks = generateLetterBlocks(currentWord.word);
      setLetterBlocks(blocks);
      // Scramble pool
      const poolItems = blocks.map((b) => ({ id: b.id, letter: b.letters, used: false }));
      poolItems.sort(() => Math.random() - 0.5);
      setPool(poolItems);
      setSlots(new Array(blocks.length).fill(""));
      setResult(null);
    }
  }, [currentWord]);

  const handleSlotClick = (slotIdx: number) => {
    if (!slots[slotIdx] || result) return;
    const letter = slots[slotIdx];
    setSlots((s) => { const n = [...s]; n[slotIdx] = ""; return n; });
    setPool((p) => p.map((item) => item.letter === letter && item.used ? { ...item, used: false } : item));
  };

  const handlePoolClick = (poolIdx: number) => {
    if (pool[poolIdx].used || result) return;
    const emptySlot = slots.findIndex((s) => !s);
    if (emptySlot === -1) return;
    const letter = pool[poolIdx].letter;
    setSlots((s) => { const n = [...s]; n[emptySlot] = letter; return n; });
    setPool((p) => p.map((item, i) => i === poolIdx ? { ...item, used: true } : item));
  };

  const checkAnswer = () => {
    if (!currentWord) return;
    const userAnswer = slots.join("");
    const correct = userAnswer.toLowerCase() === currentWord.word.toLowerCase();
    setResult(correct ? "correct" : "wrong");
    setSessionResults((r) => [...r, { word: currentWord.word, correct }]);
    if (correct) setScore((s) => s + 1);

    submitResult.mutate({
      wordId: currentWord.id,
      isCorrect: correct,
      userInput: userAnswer,
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (showSummary) return <SessionSummary results={sessionResults} score={score} total={words?.length ?? 0} onBack={onBack} onRetry={() => { setIndex(0); setScore(0); setSessionResults([]); setShowSummary(false); }} />;
  if (!currentWord) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">暂无单词可练习</p></div>;

  const allFilled = slots.every((s) => s.length > 0);

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-500">{index + 1} / {words?.length}</span>
        </div>
        <span className="text-sm font-bold text-indigo-600">{score} 分</span>
      </div>

      {/* Word Info */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 text-center">
        <button
          onClick={() => speakWord(currentWord.word)}
          className="inline-flex items-center gap-2 mb-2"
        >
          <Volume2 className="w-5 h-5 text-indigo-500" />
          <span className="text-xs text-gray-500">点击听发音</span>
        </button>
        <p className="text-sm text-gray-600 whitespace-pre-line">{currentWord.definition}</p>
        {/* Example hidden until submitted */}
        {result && currentWord.example && <p className="text-xs text-gray-400 mt-1 italic">{currentWord.example}</p>}
      </div>

      {/* Result - show full word details after submit */}
      {result && (
        <div className={`rounded-xl p-4 mb-4 text-center ${result === "correct" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          {result === "correct" ? (
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">正确！</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-red-700">错误</span>
            </div>
          )}
          {/* Full word info revealed after submit */}
          <div className="mt-3 pt-3 border-t border-gray-200/50">
            <p className="text-lg font-bold text-gray-900">{currentWord.word}</p>
            {currentWord.phonetic && <p className="text-sm text-gray-400 font-mono mt-1">{currentWord.phonetic}</p>}
            {currentWord.example && <p className="text-xs text-gray-500 mt-2 italic">"{currentWord.example}"</p>}
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

      {/* Slots */}
      <div className="flex justify-center gap-2 mb-6 flex-wrap">
        {slots.map((slot, i) => (
          <button
            key={i}
            onClick={() => handleSlotClick(i)}
            className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all ${
              slot
                ? result
                  ? letterBlocks[i] && slot.toLowerCase() === letterBlocks[i].letters.toLowerCase()
                    ? "border-green-400 bg-green-50 text-green-700"
                    : "border-red-400 bg-red-50 text-red-700"
                  : "border-indigo-300 bg-indigo-50 text-indigo-700"
                : "border-dashed border-gray-300 bg-gray-50"
            }`}
          >
            {slot}
          </button>
        ))}
      </div>

      {/* Pool */}
      {!result && (
        <div className="flex justify-center gap-2 flex-wrap mb-6">
          {pool.map((item, i) => (
            <button
              key={item.id}
              onClick={() => handlePoolClick(i)}
              disabled={item.used}
              className={`w-12 h-14 rounded-xl border-2 flex items-center justify-center text-lg font-bold transition-all ${
                item.used
                  ? "border-gray-200 bg-gray-100 text-gray-300"
                  : "border-gray-300 bg-white hover:border-indigo-300 hover:shadow-md text-gray-700 active:scale-95"
              }`}
            >
              {item.letter}
            </button>
          ))}
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
function FillBlankMode({ onBack }: { onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data: words, isLoading } = trpc.spelling.getPracticeWords.useQuery({ limit: 10, source: "manual" });
  const submitResult = trpc.spelling.submitResult.useMutation({
    onSuccess: () => utils.spelling.getReviewQueue.invalidate(),
  });

  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [activeBlankIdx, setActiveBlankIdx] = useState(0);
  const [result, setResult] = useState<"correct" | "wrong" | null>(null);
  const [score, setScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionResults, setSessionResults] = useState<Array<{ word: string; correct: boolean }>>([]);

  const currentWord = words?.[index];
  const blankPattern = currentWord ? generateFillBlank(currentWord.word) : null;
  // Positions that are blanks (indices in the display string)
  const blankPositions = blankPattern
    ? blankPattern.display.split("").map((c, i) => c === "_" ? i : -1).filter(i => i >= 0)
    : [];
  const blankCount = blankPositions.length;

  useEffect(() => {
    setAnswers(new Array(blankCount).fill(""));
    setActiveBlankIdx(0);
    setResult(null);
  }, [index, blankCount]);

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

    const lower = currentWord.word.toLowerCase();
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

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (showSummary) return <SessionSummary results={sessionResults} score={score} total={words?.length ?? 0} onBack={onBack} onRetry={() => { setIndex(0); setScore(0); setSessionResults([]); setShowSummary(false); }} />;
  if (!currentWord) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">暂无单词可练习</p></div>;

  const allFilled = answers.every(a => a.length > 0);
  // Map blank position in display to blank list index
  let blankCounter = -1;

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-500">{index + 1} / {words?.length}</span>
        </div>
        <span className="text-sm font-bold text-emerald-600">{score} 分</span>
      </div>

      {/* Word Info - 只显示释义 */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-4 text-center">
        <button
          onClick={() => speakWord(currentWord.word)}
          className="inline-flex items-center gap-2 mb-2"
        >
          <Volume2 className="w-5 h-5 text-emerald-500" />
          <span className="text-xs text-gray-500">听发音</span>
        </button>
        <p className="text-sm text-gray-600">{currentWord.definition}</p>
      </div>

      {/* Blank pattern - clickable boxes */}
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
                      ? answers[listIdx]?.toLowerCase() === currentWord.word.toLowerCase()[displayIdx]
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

      {/* Result after submit */}
      {result && (
        <div className={`rounded-xl p-4 mb-4 text-center ${result === "correct" ? "bg-green-50 border border-green-200" : "bg-red-50 border border-red-200"}`}>
          {result === "correct" ? (
            <div className="flex items-center justify-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-green-500" />
              <span className="text-sm font-medium text-green-700">正确！</span>
            </div>
          ) : (
            <div className="flex items-center justify-center gap-2 mb-2">
              <XCircle className="w-5 h-5 text-red-500" />
              <span className="text-sm font-medium text-red-700">错误</span>
            </div>
          )}
          <div className="mt-3 pt-3 border-t border-gray-200/50">
            <p className="text-lg font-bold text-gray-900">{currentWord.word}</p>
            {currentWord.phonetic && <p className="text-sm text-gray-400 font-mono mt-1">{currentWord.phonetic}</p>}
            {currentWord.example && <p className="text-xs text-gray-500 mt-2 italic">&quot;{currentWord.example}&quot;</p>}
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
          {/* Submit button */}
          <div className="mb-3">
            <Button
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600"
              disabled={!allFilled}
              onClick={checkAnswer}
            >
              {allFilled ? "提交答案" : `还需填写 ${blankCount - answers.filter(a => a).length} 个字母`}
            </Button>
          </div>

          {/* A-Z keyboard */}
          <div className="bg-gray-50 rounded-xl p-3">
            {/* Row 1: QWERTYUIOP */}
            <div className="flex justify-center gap-1 mb-1">
              {["q","w","e","r","t","y","u","i","o","p"].map(letter => (
                <button
                  key={letter}
                  onClick={() => handleLetterPress(letter)}
                  className="w-8 h-10 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 active:scale-95 transition-all"
                >
                  {letter}
                </button>
              ))}
            </div>
            {/* Row 2: asdfghjkl */}
            <div className="flex justify-center gap-1 mb-1">
              {["a","s","d","f","g","h","j","k","l"].map(letter => (
                <button
                  key={letter}
                  onClick={() => handleLetterPress(letter)}
                  className="w-8 h-10 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 active:scale-95 transition-all"
                >
                  {letter}
                </button>
              ))}
            </div>
            {/* Row 3: zxcvbnm + Delete */}
            <div className="flex justify-center gap-1">
              {["z","x","c","v","b","n","m"].map(letter => (
                <button
                  key={letter}
                  onClick={() => handleLetterPress(letter)}
                  className="w-8 h-10 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-emerald-50 hover:border-emerald-300 active:scale-95 transition-all"
                >
                  {letter}
                </button>
              ))}
              <button
                onClick={handleBackspace}
                className="w-14 h-10 rounded-lg bg-gray-200 border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:scale-95 transition-all flex items-center justify-center"
              >
                <Delete className="w-4 h-4" />
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
function FlashMode({ onBack }: { onBack: () => void }) {
  const utils = trpc.useUtils();
  // Prefer manual (newly learned) words, fallback to all
  const { data: words, isLoading } = trpc.spelling.getPracticeWords.useQuery({ limit: 10, source: "manual" });
  const submitResult = trpc.spelling.submitResult.useMutation({
    onSuccess: () => utils.spelling.getReviewQueue.invalidate(),
  });

  const [index, setIndex] = useState(0);
  const [phase, setPhase] = useState<"show" | "input" | "result">("show");
  const [input, setInput] = useState("");
  const [timeLeft, setTimeLeft] = useState(3);
  const [score, setScore] = useState(0);
  const [showSummary, setShowSummary] = useState(false);
  const [sessionResults, setSessionResults] = useState<Array<{ word: string; correct: boolean }>>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const currentWord = words?.[index];

  useEffect(() => {
    if (phase === "show" && currentWord) {
      // Speak the word
      speakWord(currentWord.word);

      setTimeLeft(3);
      const timer = setInterval(() => {
        setTimeLeft((t) => {
          if (t <= 1) {
            clearInterval(timer);
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
    const correct = input.trim().toLowerCase() === currentWord.word.toLowerCase();
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

  const nextWord = () => {
    if (words && index < words.length - 1) {
      setIndex((i) => i + 1);
      setInput("");
      setPhase("show");
    } else {
      setShowSummary(true);
    }
  };

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  if (showSummary) return <SessionSummary results={sessionResults} score={score} total={words?.length ?? 0} onBack={onBack} onRetry={() => { setIndex(0); setScore(0); setSessionResults([]); setShowSummary(false); setPhase("show"); setInput(""); }} />;
  if (!currentWord) return <div className="min-h-screen flex items-center justify-center"><p className="text-gray-500">暂无单词可练习</p></div>;

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-24">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <button onClick={onBack} className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-100">
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <span className="text-xs px-2 py-1 bg-gray-100 rounded-md text-gray-500">{index + 1} / {words?.length}</span>
        </div>
        <span className="text-sm font-bold text-amber-600">{score} 分</span>
      </div>

      {phase === "show" && (
        <div className="bg-white rounded-xl border border-gray-100 p-8 text-center">
          <p className="text-sm text-gray-500 mb-4">记住这个单词！</p>
          <h2 className="text-3xl font-bold text-gray-900 mb-2">{currentWord.word}</h2>
          {currentWord.phonetic && <p className="text-sm text-gray-400 font-mono mb-2">{currentWord.phonetic}</p>}
          <p className="text-sm text-gray-600 mb-6">{currentWord.definition}</p>
          <div className="flex items-center justify-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <span className="text-2xl font-bold text-amber-500">{timeLeft}</span>
          </div>
        </div>
      )}

      {phase === "input" && (
        <div className="space-y-4 min-h-[60vh] flex flex-col">
          <div className="bg-amber-50 rounded-xl border border-amber-200 p-4 text-center">
            <Lightbulb className="w-6 h-6 text-amber-500 mx-auto mb-2" />
            <p className="text-sm text-amber-700">{currentWord.definition}</p>
          </div>

          {/* Read-only display box - no system keyboard */}
          <div className="flex-1 flex flex-col justify-center">
            <div className="h-14 rounded-xl border-2 border-amber-300 bg-white flex items-center justify-center text-xl tracking-[0.3em] font-mono font-bold text-gray-900">
              {input || <span className="text-gray-300 text-sm tracking-normal">点击键盘输入单词</span>}
            </div>
          </div>

          {/* Virtual Keyboard */}
          <div className="mt-auto">
            <Button className="w-full h-11 bg-gradient-to-r from-amber-500 to-orange-600 mb-3" onClick={checkAnswer} disabled={!input.trim()}>
              提交
            </Button>

            <div className="bg-gray-50 rounded-xl p-3">
              {/* Row 1: QWERTYUIOP */}
              <div className="flex justify-center gap-1 mb-1">
                {["q","w","e","r","t","y","u","i","o","p"].map(letter => (
                  <button
                    key={letter}
                    onClick={() => setInput((prev) => prev + letter)}
                    className="w-8 h-10 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:border-amber-300 active:scale-95 transition-all"
                  >
                    {letter}
                  </button>
                ))}
              </div>
              {/* Row 2: asdfghjkl */}
              <div className="flex justify-center gap-1 mb-1">
                {["a","s","d","f","g","h","j","k","l"].map(letter => (
                  <button
                    key={letter}
                    onClick={() => setInput((prev) => prev + letter)}
                    className="w-8 h-10 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:border-amber-300 active:scale-95 transition-all"
                  >
                    {letter}
                  </button>
                ))}
              </div>
              {/* Row 3: zxcvbnm + Delete */}
              <div className="flex justify-center gap-1">
                {["z","x","c","v","b","n","m"].map(letter => (
                  <button
                    key={letter}
                    onClick={() => setInput((prev) => prev + letter)}
                    className="w-8 h-10 rounded-lg bg-white border border-gray-200 text-sm font-semibold text-gray-700 hover:bg-amber-50 hover:border-amber-300 active:scale-95 transition-all"
                  >
                    {letter}
                  </button>
                ))}
                <button
                  onClick={() => setInput((prev) => prev.slice(0, -1))}
                  className="w-14 h-10 rounded-lg bg-gray-200 border border-gray-300 text-sm font-semibold text-gray-600 hover:bg-red-50 hover:border-red-300 hover:text-red-500 active:scale-95 transition-all flex items-center justify-center"
                >
                  <Delete className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="space-y-4">
          <div className={`rounded-xl p-4 text-center ${
            input.trim().toLowerCase() === currentWord.word.toLowerCase()
              ? "bg-green-50 border border-green-200"
              : "bg-red-50 border border-red-200"
          }`}>
            {input.trim().toLowerCase() === currentWord.word.toLowerCase() ? (
              <div className="flex items-center justify-center gap-2 mb-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                <span className="text-sm font-medium text-green-700">正确！</span>
              </div>
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
              <p className="text-sm text-gray-600 mt-2">{currentWord.definition}</p>
              {currentWord.example && <p className="text-xs text-gray-500 mt-1 italic">&quot;{currentWord.example}&quot;</p>}
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
function SessionSummary({
  results,
  score,
  total,
  onBack,
  onRetry,
}: {
  results: Array<{ word: string; correct: boolean }>;
  score: number;
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
