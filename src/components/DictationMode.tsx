/**
 * Dictation Mode - Listen and Write
 * Plays each word twice with dynamic pacing based on syllable count.
 * Uses local audio cache first (fastest), falls back to Web Speech / Youdao.
 */

import { useState, useEffect, useCallback, useRef } from "react";
import { speakWord, preloadAudio } from "@/utils/speech";
import {
  getDictationExampleWaitTime,
  pickShortestDictationExample,
} from "@/utils/dictation";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Play, Pause, SkipForward, Headphones } from "lucide-react";

interface DictationModeProps {
  words: any[];
  onBack: () => void;
}

type Phase = "idle" | "playing" | "paused" | "done";

/** Count syllables in a word */
function countSyllables(word: string): number {
  try {
    // Fallback: count vowel groups
    const lower = word.toLowerCase();
    const matches = lower.match(/[aeiouy]+/g);
    return matches ? matches.length : 1;
  } catch {
    return 1;
  }
}

/** Get wait time in ms based on syllable count */
function getWaitTime(syllableCount: number): number {
  if (syllableCount === 1) return 4000;
  if (syllableCount === 2) return 6500;
  return 10000;
}

/** Play word using speakWord (local audio first) */
function play(word: string, wordId: number) {
  speakWord(word, wordId);
}

export default function DictationMode({ words, onBack }: DictationModeProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [currentIdx, setCurrentIdx] = useState(0);
  const [statusText, setStatusText] = useState("准备开始");
  const [showAnswers, setShowAnswers] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pausedRef = useRef(false);

  const total = words.length;
  const currentWord = words[currentIdx];
  // Preload all audio when component mounts
  useEffect(() => {
    if (words.length > 0) {
      preloadAudio(words.map((w) => w.id));
    }
  }, [words]);

  const clearTimer = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  const playSequence = useCallback(
    (idx: number) => {
      if (idx >= total) {
        setPhase("done");
        setStatusText("听写完成！");
        return;
      }

      const word = words[idx];
      const sylCount = countSyllables(word.word);
      const wordWaitTime = getWaitTime(sylCount);
      const example = pickShortestDictationExample(word.example, word.word);

      setCurrentIdx(idx);
      setStatusText(`第 ${idx + 1} / ${total} 个`);

      // Step 1: First read (normal speed)
      play(word.word, word.id);

      // Step 2: Second read — slower
      timerRef.current = setTimeout(() => {
        if (pausedRef.current) return;
        play(word.word, word.id);

        // Step 3: Read the shortest matching example, then move on.
        timerRef.current = setTimeout(() => {
          if (pausedRef.current) return;
          if (!example) {
            playSequence(idx + 1);
            return;
          }

          speakWord(example);
          timerRef.current = setTimeout(() => {
            if (pausedRef.current) return;
            playSequence(idx + 1);
          }, getDictationExampleWaitTime(example));
        }, example ? 1_600 : wordWaitTime);
      }, wordWaitTime + 800);
    },
    [total, words]
  );

  const start = () => {
    pausedRef.current = false;
    setPhase("playing");
    setShowAnswers(false);
    playSequence(0);
  };

  const pause = () => {
    pausedRef.current = true;
    clearTimer();
    setPhase("paused");
    setStatusText(`已暂停 · 第 ${currentIdx + 1} / ${total} 个`);
  };

  const resume = () => {
    pausedRef.current = false;
    setPhase("playing");
    playSequence(currentIdx);
  };

  const skip = () => {
    clearTimer();
    playSequence(currentIdx + 1);
  };

  // Cleanup
  useEffect(() => {
    return () => {
      clearTimer();
    };
  }, []);

  if (total === 0) {
    return (
      <main className="max-w-lg mx-auto px-4 py-6 pb-24 min-h-screen flex flex-col items-center justify-center">
        <div className="text-center">
          <Headphones className="w-12 h-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">还没有选择今日练习单词</p>
          <Button className="mt-4 bg-gradient-to-r from-indigo-500 to-blue-600" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-1" />
            返回选词
          </Button>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-lg mx-auto px-4 py-6 pb-24">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <button onClick={onBack} className="p-2 rounded-lg hover:bg-gray-100 text-gray-500">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-bold text-gray-900 flex items-center gap-2">
            <Headphones className="w-5 h-5 text-purple-500" />
            听写模式
          </h1>
          <p className="text-xs text-gray-500">
            {total} 个单词 · 单词读两遍，再读最短例句
          </p>
        </div>
      </div>

      {/* Status Card */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 text-center mb-6">
        {phase === "idle" && (
          <>
            <Headphones className="w-16 h-16 text-purple-100 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 mb-1">准备听写</p>
            <p className="text-sm text-gray-500 mb-6">
              请准备好纸笔，听音频写出单词
            </p>
            <Button className="h-11 px-8 bg-gradient-to-r from-purple-500 to-indigo-600" onClick={start}>
              <Play className="w-4 h-4 mr-2" />
              开始听写
            </Button>
          </>
        )}

        {phase === "playing" && currentWord && (
          <>
            {/* Progress */}
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs text-gray-400">{statusText}</span>
              <span className="text-xs text-purple-500 font-medium">
                请写下你听到的单词
              </span>
            </div>

            {/* Progress bar */}
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-6">
              <div
                className="h-full bg-purple-400 rounded-full transition-all duration-500"
                style={{ width: `${((currentIdx) / total) * 100}%` }}
              />
            </div>

            {/* Playing indicator */}
            <div className="flex items-center justify-center gap-1 mb-4">
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.2s" }} />
              <span className="w-2 h-2 bg-purple-400 rounded-full animate-pulse" style={{ animationDelay: "0.4s" }} />
              <span className="text-sm text-purple-500 ml-2">正在播放...</span>
            </div>

            {/* Controls */}
            <div className="flex items-center justify-center gap-3">
              <Button variant="outline" size="sm" className="h-9" onClick={pause}>
                <Pause className="w-4 h-4 mr-1" />
                暂停
              </Button>
              <Button variant="outline" size="sm" className="h-9" onClick={skip}>
                <SkipForward className="w-4 h-4 mr-1" />
                跳过
              </Button>
            </div>
          </>
        )}

        {phase === "paused" && (
          <>
            <Pause className="w-16 h-16 text-amber-100 mx-auto mb-4" />
            <p className="text-lg font-semibold text-gray-900 mb-1">已暂停</p>
            <p className="text-sm text-gray-500 mb-4">{statusText}</p>
            <div className="flex items-center justify-center gap-3">
              <Button className="h-10 bg-gradient-to-r from-purple-500 to-indigo-600" onClick={resume}>
                <Play className="w-4 h-4 mr-1" />
                继续
              </Button>
              <Button variant="outline" className="h-10" onClick={onBack}>
                结束
              </Button>
            </div>
          </>
        )}

        {phase === "done" && (
          <>
            <div className="w-16 h-16 rounded-full bg-green-50 flex items-center justify-center mx-auto mb-4">
              <Headphones className="w-8 h-8 text-green-500" />
            </div>
            <p className="text-lg font-semibold text-gray-900 mb-1">听写完成！</p>
            <p className="text-sm text-gray-500 mb-4">共 {total} 个单词</p>
            <div className="flex items-center justify-center gap-3 mb-4">
              <Button variant="outline" className="h-10" onClick={onBack}>
                <ArrowLeft className="w-4 h-4 mr-1" />
                返回
              </Button>
              <Button className="h-10 bg-gradient-to-r from-purple-500 to-indigo-600" onClick={start}>
                <Play className="w-4 h-4 mr-1" />
                再来一遍
              </Button>
            </div>
            <button
              onClick={() => setShowAnswers(!showAnswers)}
              className="text-xs text-purple-500 hover:text-purple-600 underline"
            >
              {showAnswers ? "隐藏答案" : "查看单词列表"}
            </button>
          </>
        )}
      </div>

      {/* Answer list (after done) */}
      {showAnswers && phase === "done" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4">
          <h3 className="text-sm font-semibold text-gray-900 mb-3">单词列表</h3>
          <div className="space-y-2">
            {words.map((w, i) => (
              <div key={w.id} className="flex items-center gap-3 p-2 rounded-lg bg-gray-50">
                <span className="text-xs text-gray-400 w-6">{i + 1}</span>
                <span className="text-sm font-semibold text-gray-900">{w.word}</span>
                {w.phonetic && <span className="text-xs text-gray-400 font-mono">{w.phonetic}</span>}
                <span className="text-xs text-gray-500 flex-1">{w.definition}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}
