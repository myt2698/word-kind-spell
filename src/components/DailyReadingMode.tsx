import { useEffect, useRef, useState } from "react";
import {
  ArrowLeft,
  BookOpenText,
  CheckCircle2,
  Flag,
  Loader2,
  Map,
  RotateCcw,
  Sparkles,
  Trophy,
  XCircle,
} from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { rawTrpcCall } from "@/utils/raw-trpc";

type ReadingStage = "story" | "questions" | "complete";

type DailyReadingData = {
  date: string;
  words: string[];
  stories: Array<{
    title: string;
    theme: string;
    content: string;
    questions: Array<{
      question: string;
      options: string[];
      correctIndex: number;
    }>;
  }>;
  progress: {
    currentStoryIndex: number;
    stage: ReadingStage;
    paragraphIndex: number;
    completedStories: number[];
    answered: Array<{
      storyIndex: number;
      questionIndex: number;
      selectedIndex: number;
      correctIndex: number;
      isCorrect: boolean;
    }>;
  };
};

type ReadingReward = {
  isCorrect: boolean;
  pointsEarned: number;
  storyBonus: number;
  alreadyRewarded: boolean;
  storyCompleted: boolean;
  allCompleted: boolean;
};

function splitStoryParagraphs(content: string) {
  const sentences = content.split(/(?<=[.!?])\s+/).filter(Boolean);
  const paragraphs: string[] = [];
  for (let index = 0; index < sentences.length; index += 2) {
    paragraphs.push(sentences.slice(index, index + 2).join(" "));
  }
  return paragraphs.length > 0 ? paragraphs : [content];
}

export default function DailyReadingMode({ onBack }: { onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["daily-reading"],
    queryFn: () =>
      rawTrpcCall<DailyReadingData>("spelling.getDailyReading"),
    retry: 1,
  });
  const [activeStory, setActiveStory] = useState(0);
  const [stage, setStage] = useState<ReadingStage>("story");
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [rewards, setRewards] = useState<
    Record<
      string,
      { pointsEarned: number; storyBonus: number; alreadyRewarded: boolean }
    >
  >({});
  const [completedStories, setCompletedStories] = useState<number[]>([]);
  const [unlockedStory, setUnlockedStory] = useState(0);
  const [unlockMessage, setUnlockMessage] = useState("");
  const [resumeParagraph, setResumeParagraph] = useState(0);
  const [showResume, setShowResume] = useState(false);
  const latestParagraph = useRef(0);
  const progressTimer = useRef<number | null>(null);

  const saveProgress = useMutation({
    mutationFn: (input: {
      storyIndex: number;
      stage: "story" | "questions";
      paragraphIndex: number;
    }) =>
      rawTrpcCall<{ success: boolean }>("spelling.saveReadingProgress", {
        method: "POST",
        input,
      }),
  });
  const submitAnswer = useMutation({
    mutationFn: (input: {
      storyIndex: number;
      questionIndex: number;
      selectedIndex: number;
    }) =>
      rawTrpcCall<ReadingReward>("spelling.submitReadingAnswer", {
        method: "POST",
        input,
      }),
    onSuccess: () => utils.spelling.getStats.invalidate(),
  });

  const scheduleParagraphSave = (storyIndex: number, paragraphIndex: number) => {
    if (progressTimer.current !== null) {
      window.clearTimeout(progressTimer.current);
    }
    progressTimer.current = window.setTimeout(() => {
      saveProgress.mutate({
        storyIndex,
        stage: "story",
        paragraphIndex,
      });
      progressTimer.current = null;
    }, 800);
  };

  useEffect(() => () => {
    if (progressTimer.current !== null) {
      window.clearTimeout(progressTimer.current);
    }
  }, []);

  useEffect(() => {
    if (!data) return;
    setAnswers(
      Object.fromEntries(
        data.progress.answered.map((attempt) => [
          `${attempt.storyIndex}-${attempt.questionIndex}`,
          attempt.selectedIndex,
        ]),
      ),
    );
    setCompletedStories(data.progress.completedStories);
    setUnlockedStory(Math.min(data.progress.currentStoryIndex, 2));
    if (data.progress.currentStoryIndex >= data.stories.length) {
      setStage("complete");
      setActiveStory(data.stories.length - 1);
      return;
    }
    setActiveStory(data.progress.currentStoryIndex);
    setStage(data.progress.stage);
    setResumeParagraph(data.progress.paragraphIndex);
    latestParagraph.current = data.progress.paragraphIndex;
    setShowResume(
      data.progress.stage === "story" && data.progress.paragraphIndex > 0,
    );
  }, [data]);

  useEffect(() => {
    if (!data || stage !== "story") return;
    const timer = window.setTimeout(() => {
      if (resumeParagraph > 0) {
        document
          .querySelector(
            `[data-reading-paragraph="${activeStory}-${resumeParagraph}"]`,
          )
          ?.scrollIntoView({ behavior: "smooth", block: "center" });
      }
      const elements = document.querySelectorAll(
        `[data-reading-story="${activeStory}"] [data-reading-paragraph]`,
      );
      const observer = new IntersectionObserver(
        (entries) => {
          const visible = entries
            .filter((entry) => entry.isIntersecting)
            .sort(
              (a, b) =>
                Number(
                  a.target.getAttribute("data-paragraph-index") ?? 0,
                ) -
                Number(b.target.getAttribute("data-paragraph-index") ?? 0),
            );
          const last = visible.at(-1);
          if (!last) return;
          const paragraphIndex = Number(
            last.target.getAttribute("data-paragraph-index") ?? 0,
          );
          if (paragraphIndex === latestParagraph.current) return;
          latestParagraph.current = paragraphIndex;
          scheduleParagraphSave(activeStory, paragraphIndex);
        },
        { threshold: 0.6 },
      );
      elements.forEach((element) => observer.observe(element));
      return () => observer.disconnect();
    }, 350);
    return () => window.clearTimeout(timer);
  }, [activeStory, data, resumeParagraph, stage]);

  useEffect(() => {
    if (!unlockMessage) return;
    const timer = window.setTimeout(() => setUnlockMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [unlockMessage]);

  const openStory = (storyIndex: number) => {
    if (storyIndex > unlockedStory && !completedStories.includes(storyIndex)) {
      return;
    }
    setActiveStory(storyIndex);
    setStage("story");
    setResumeParagraph(
      storyIndex === data?.progress.currentStoryIndex
        ? data.progress.paragraphIndex
        : 0,
    );
    latestParagraph.current = 0;
  };

  const startQuestions = () => {
    setShowResume(false);
    setStage("questions");
    saveProgress.mutate({
      storyIndex: activeStory,
      stage: "questions",
      paragraphIndex: latestParagraph.current,
    });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const finishStory = (result: ReadingReward) => {
    const finishedStory = activeStory;
    setCompletedStories((old) => [...new Set([...old, finishedStory])]);
    if (result.allCompleted || finishedStory >= 2) {
      setUnlockMessage("🏆 恭喜你！三个阅读任务全部完成");
      window.setTimeout(() => setStage("complete"), 1200);
      return;
    }
    const nextStory = finishedStory + 1;
    setUnlockedStory(nextStory);
    setUnlockMessage(`🌟 太棒了！第 ${nextStory + 1} 关已解锁`);
    saveProgress.mutate({
      storyIndex: nextStory,
      stage: "story",
      paragraphIndex: 0,
    });
    window.setTimeout(() => {
      setActiveStory(nextStory);
      setStage("story");
      setResumeParagraph(0);
      latestParagraph.current = 0;
      window.scrollTo({ top: 0, behavior: "smooth" });
    }, 1200);
  };

  if (isLoading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <button
        onClick={onBack}
        className="mb-5 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-violet-600"
      >
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <div className="mb-5 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-amber-50 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-2.5">
            <BookOpenText className="h-6 w-6 text-violet-600" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">
              今日单词趣味阅读
            </h1>
            <p className="mt-0.5 text-xs text-gray-500">
              三关连续挑战 · 自动保存阅读进度
            </p>
          </div>
        </div>
        {!!data?.words.length && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {data.words.map((word) => (
              <span
                key={word}
                className="rounded-full border border-violet-100 bg-white/80 px-2 py-1 text-xs text-violet-700"
              >
                {word}
              </span>
            ))}
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-600">
          加载失败：{error.message}
          <Button
            variant="outline"
            size="sm"
            className="ml-3"
            onClick={() => refetch()}
          >
            <RotateCcw className="mr-1 h-3.5 w-3.5" />
            重试
          </Button>
        </div>
      ) : !data?.stories.length ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <BookOpenText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-700">还没有今日单词</p>
          <p className="mt-1 text-sm text-gray-400">
            返回选择今日练习单词后，就能生成趣味阅读。
          </p>
          <Button className="mt-5" onClick={onBack}>
            返回选词
          </Button>
        </div>
      ) : (
        <>
          <section className="mb-5 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-sm font-bold text-gray-700">
              <Map className="h-4 w-4 text-violet-500" /> 今日闯关地图
            </div>
            <div className="grid grid-cols-3 gap-2">
              {data.stories.map((story, storyIndex) => {
                const complete = completedStories.includes(storyIndex);
                const current =
                  stage !== "complete" && storyIndex === activeStory;
                const unlocked =
                  complete ||
                  storyIndex <= unlockedStory;
                return (
                  <button
                    key={story.title}
                    type="button"
                    disabled={!unlocked}
                    onClick={() => openStory(storyIndex)}
                    className={`rounded-xl border p-3 text-center transition-all ${
                      complete
                        ? "border-amber-200 bg-amber-50 text-amber-700"
                        : current
                          ? "border-violet-300 bg-violet-50 text-violet-700 shadow-sm"
                          : unlocked
                            ? "border-gray-200 bg-white text-gray-600"
                            : "border-gray-100 bg-gray-50 text-gray-300"
                    }`}
                  >
                    <div className="mb-1 text-xl">
                      {complete ? "⭐" : unlocked ? "🚩" : "🔒"}
                    </div>
                    <p className="text-xs font-bold">第 {storyIndex + 1} 关</p>
                    <p className="mt-0.5 truncate text-[10px]">{story.theme}</p>
                  </button>
                );
              })}
            </div>
          </section>

          {stage === "complete" ? (
            <section className="animate-in zoom-in-95 rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-violet-50 p-8 text-center shadow-md">
              <Trophy className="mx-auto h-16 w-16 text-amber-500" />
              <h2 className="mt-4 text-2xl font-black text-gray-900">
                今日阅读任务已完成
              </h2>
              <p className="mt-2 text-sm leading-6 text-gray-500">
                三个故事、十五道阅读理解全部完成，明天继续新的冒险吧！
              </p>
              <div className="mt-5 text-4xl">⭐ ⭐ ⭐</div>
              <Button className="mt-6" onClick={onBack}>
                返回拼写首页
              </Button>
            </section>
          ) : stage === "story" ? (
            <article
              data-reading-story={activeStory}
              className="animate-in fade-in slide-in-from-bottom-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm duration-500"
            >
              <header className="border-b border-violet-50 bg-violet-50/60 p-5">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-violet-600">
                  <Sparkles className="h-3.5 w-3.5" /> 第 {activeStory + 1} 关 ·{" "}
                  {data.stories[activeStory].theme}
                </div>
                <h2 className="text-lg font-bold text-gray-900">
                  {data.stories[activeStory].title}
                </h2>
              </header>
              <div className="p-5">
                {showResume && (
                  <button
                    type="button"
                    onClick={() => {
                      document
                        .querySelector(
                          `[data-reading-paragraph="${activeStory}-${resumeParagraph}"]`,
                        )
                        ?.scrollIntoView({
                          behavior: "smooth",
                          block: "center",
                        });
                      setShowResume(false);
                    }}
                    className="mb-4 w-full rounded-xl border border-sky-200 bg-sky-50 px-4 py-3 text-left text-sm font-semibold text-sky-700"
                  >
                    上次读到这里啦，点击继续 👉
                  </button>
                )}
                <div className="space-y-4">
                  {splitStoryParagraphs(
                    data.stories[activeStory].content,
                  ).map((paragraph, paragraphIndex) => (
                    <p
                      key={paragraphIndex}
                      data-reading-paragraph={`${activeStory}-${paragraphIndex}`}
                      data-paragraph-index={paragraphIndex}
                      className="rounded-xl px-2 py-1 text-[17px] leading-8 text-sky-700"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>
                <p className="mt-3 text-[11px] text-gray-400">
                  带连字符的词为自然拼读音节拆分
                </p>
                <Button
                  className="mt-6 w-full bg-violet-600 hover:bg-violet-700"
                  onClick={startQuestions}
                >
                  故事读完了，开始答题
                  <Flag className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </article>
          ) : (
            <article className="animate-in fade-in overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <header className="border-b border-violet-50 bg-violet-50/60 p-5">
                <div className="text-xs font-semibold text-violet-600">
                  第 {activeStory + 1} 关 · 阅读理解
                </div>
                <h2 className="mt-1 text-lg font-bold text-gray-900">
                  {data.stories[activeStory].title}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setStage("story");
                    setResumeParagraph(0);
                    latestParagraph.current = 0;
                    saveProgress.mutate({
                      storyIndex: activeStory,
                      stage: "story",
                      paragraphIndex: 0,
                    });
                  }}
                  className="mt-2 text-xs text-violet-500 hover:underline"
                >
                  再读一遍故事
                </button>
              </header>
              <div className="space-y-6 p-5">
                {data.stories[activeStory].questions.map(
                  (question, questionIndex) => {
                    const key = `${activeStory}-${questionIndex}`;
                    const selected = answers[key];
                    const reward = rewards[key];
                    return (
                      <section key={key}>
                        <p className="mb-2 text-sm font-semibold text-gray-800">
                          {questionIndex + 1}. {question.question}
                        </p>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {question.options.map((option, optionIndex) => {
                            const chosen = selected === optionIndex;
                            const correct =
                              optionIndex === question.correctIndex;
                            const revealed = selected !== undefined;
                            return (
                              <button
                                key={option}
                                type="button"
                                disabled={revealed}
                                onClick={() => {
                                  setAnswers((old) => ({
                                    ...old,
                                    [key]: optionIndex,
                                  }));
                                  submitAnswer.mutate(
                                    {
                                      storyIndex: activeStory,
                                      questionIndex,
                                      selectedIndex: optionIndex,
                                    },
                                    {
                                      onSuccess: (result) => {
                                        setRewards((old) => ({
                                          ...old,
                                          [key]: result,
                                        }));
                                        if (result.storyCompleted) {
                                          finishStory(result);
                                        }
                                      },
                                    },
                                  );
                                }}
                                className={`flex min-h-10 items-center rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                                  revealed && correct
                                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                                    : revealed && chosen
                                      ? "border-rose-300 bg-rose-50 text-rose-700"
                                      : "border-gray-200 hover:border-violet-300 hover:bg-violet-50"
                                }`}
                              >
                                <span className="mr-2 font-semibold">
                                  {String.fromCharCode(65 + optionIndex)}.
                                </span>
                                {option}
                                {revealed && correct && (
                                  <CheckCircle2 className="ml-auto h-4 w-4" />
                                )}
                                {revealed && chosen && !correct && (
                                  <XCircle className="ml-auto h-4 w-4" />
                                )}
                              </button>
                            );
                          })}
                        </div>
                        {reward && (
                          <p
                            className={`mt-2 text-xs font-semibold ${
                              reward.pointsEarned > 0
                                ? "text-amber-600"
                                : "text-gray-400"
                            }`}
                          >
                            {reward.pointsEarned > 0
                              ? `🌟 +${reward.pointsEarned} 积分${
                                  reward.storyBonus > 0
                                    ? "（含全对通关奖 +5）"
                                    : ""
                                }`
                              : reward.alreadyRewarded
                                ? "本题今日已结算过积分"
                                : "答错不扣分，继续加油"}
                          </p>
                        )}
                      </section>
                    );
                  },
                )}
              </div>
            </article>
          )}
        </>
      )}

      {unlockMessage && (
        <div className="fixed inset-x-0 top-24 z-50 mx-auto w-fit animate-in zoom-in-90 fade-in rounded-2xl border border-amber-200 bg-white px-6 py-4 text-base font-bold text-amber-600 shadow-xl duration-300">
          {unlockMessage}
        </div>
      )}
    </main>
  );
}
