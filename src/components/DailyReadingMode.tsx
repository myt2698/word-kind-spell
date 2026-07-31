import { useEffect, useState } from "react";
import { ArrowLeft, BookOpenText, CheckCircle2, Loader2, LockKeyhole, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

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
};

type ReadingReward = {
  isCorrect: boolean;
  pointsEarned: number;
  storyBonus: number;
  alreadyRewarded: boolean;
};

async function callReadingApi<T>(
  procedure: "getDailyReading" | "submitReadingAnswer",
  input?: Record<string, number>,
): Promise<T> {
  const isMutation = procedure === "submitReadingAnswer";
  const envelope = JSON.stringify({ json: input ?? null });
  const url = `/api/trpc/spelling.${procedure}${
    isMutation ? "" : `?input=${encodeURIComponent(envelope)}`
  }`;
  const response = await fetch(url, {
    method: isMutation ? "POST" : "GET",
    credentials: "include",
    headers: {
      Accept: "application/json",
      ...(isMutation ? { "Content-Type": "application/json" } : {}),
    },
    body: isMutation ? envelope : undefined,
    signal: AbortSignal.timeout(20_000),
  });
  const payload = await response.json();
  if (!response.ok || payload.error) {
    const errorData = payload.error?.json ?? payload.error;
    throw new Error(errorData?.message ?? `请求失败（${response.status}）`);
  }
  const data = payload.result?.data;
  if (data == null) throw new Error("服务器没有返回阅读数据");
  return (data.json ?? data) as T;
}

export default function DailyReadingMode({ onBack }: { onBack: () => void }) {
  const utils = trpc.useUtils();
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["daily-reading"],
    queryFn: () => callReadingApi<DailyReadingData>("getDailyReading"),
    retry: 1,
  });
  const submitAnswer = useMutation({
    mutationFn: (input: {
      storyIndex: number;
      questionIndex: number;
      selectedIndex: number;
    }) => callReadingApi<ReadingReward>("submitReadingAnswer", input),
    onSuccess: () => {
      utils.spelling.getStats.invalidate();
    },
  });
  const [answers, setAnswers] = useState<Record<string, number>>({});
  const [rewards, setRewards] = useState<
    Record<string, { pointsEarned: number; storyBonus: number; alreadyRewarded: boolean }>
  >({});
  const [unlockedLevel, setUnlockedLevel] = useState(0);
  const [unlockMessage, setUnlockMessage] = useState("");

  useEffect(() => {
    if (!data?.stories.length) return;
    const completed = data.stories[unlockedLevel]?.questions.every(
      (_, questionIndex) => answers[`${unlockedLevel}-${questionIndex}`] !== undefined,
    );
    if (!completed) return;
    if (unlockedLevel < data.stories.length - 1) {
      setUnlockedLevel((level) => level + 1);
      setUnlockMessage(`🌟 太棒了！第 ${unlockedLevel + 2} 关已解锁`);
    } else {
      setUnlockMessage("🏆 恭喜你！三个阅读任务全部完成");
    }
  }, [answers, data, unlockedLevel]);

  useEffect(() => {
    if (!unlockMessage) return;
    const timer = window.setTimeout(() => setUnlockMessage(""), 2600);
    return () => window.clearTimeout(timer);
  }, [unlockMessage]);

  if (isLoading) {
    return (
      <main className="min-h-[70vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-violet-500" />
      </main>
    );
  }

  return (
    <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
      <button onClick={onBack} className="mb-5 inline-flex items-center gap-1 text-sm text-gray-500 hover:text-violet-600">
        <ArrowLeft className="h-4 w-4" /> 返回
      </button>

      <div className="mb-6 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 to-amber-50 p-5">
        <div className="flex items-center gap-3">
          <div className="rounded-xl bg-violet-100 p-2.5"><BookOpenText className="h-6 w-6 text-violet-600" /></div>
          <div>
            <h1 className="text-xl font-bold text-gray-900">今日单词趣味阅读</h1>
            <p className="mt-0.5 text-xs text-gray-500">三种不同主题 · 自然拼读音节标注 · 每篇 5 题</p>
          </div>
        </div>
        {!!data?.words.length && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {data.words.map((word) => <span key={word} className="rounded-full border border-violet-100 bg-white/80 px-2 py-1 text-xs text-violet-700">{word}</span>)}
          </div>
        )}
      </div>

      {error ? (
        <div className="rounded-xl border border-rose-200 bg-rose-50 p-5 text-center text-sm text-rose-600">
          加载失败：{error.message}
          <Button variant="outline" size="sm" className="ml-3" onClick={() => refetch()}><RotateCcw className="mr-1 h-3.5 w-3.5" />重试</Button>
        </div>
      ) : !data?.stories.length ? (
        <div className="rounded-2xl border border-dashed border-gray-200 bg-white p-10 text-center">
          <BookOpenText className="mx-auto mb-3 h-10 w-10 text-gray-300" />
          <p className="font-medium text-gray-700">还没有今日单词</p>
          <p className="mt-1 text-sm text-gray-400">返回选择今日练习单词后，就能生成趣味阅读。</p>
          <Button className="mt-5" onClick={onBack}>返回选词</Button>
        </div>
      ) : (
        <div className="space-y-6">
          {data.stories.map((story, storyIndex) => (
            storyIndex <= unlockedLevel ? (
            <article key={story.title} className="animate-in fade-in slide-in-from-bottom-3 overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm duration-500">
              <header className="border-b border-violet-50 bg-violet-50/60 p-5">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-violet-600">
                  <Sparkles className="h-3.5 w-3.5" /> 第 {storyIndex + 1} 关 · {story.theme}
                </div>
                <h2 className="text-lg font-bold text-gray-900">{story.title}</h2>
              </header>
              <div className="p-5">
                <p className="text-[17px] leading-8 text-sky-700">{story.content}</p>
                <p className="mt-2 text-[11px] text-gray-400">带连字符的词为自然拼读音节拆分</p>
                <div className="mt-6 space-y-5">
                  {story.questions.map((question, questionIndex) => {
                    const key = `${storyIndex}-${questionIndex}`;
                    const selected = answers[key];
                    const reward = rewards[key];
                    return (
                      <section key={key}>
                        <p className="mb-2 text-sm font-semibold text-gray-800">{questionIndex + 1}. {question.question}</p>
                        <div className="grid gap-2 sm:grid-cols-3">
                          {question.options.map((option, optionIndex) => {
                            const chosen = selected === optionIndex;
                            const correct = optionIndex === question.correctIndex;
                            const revealed = selected !== undefined;
                            return (
                              <button
                                key={option}
                                type="button"
                                disabled={revealed}
                                onClick={() => {
                                  setAnswers((old) => ({ ...old, [key]: optionIndex }));
                                  submitAnswer.mutate(
                                    { storyIndex, questionIndex, selectedIndex: optionIndex },
                                    {
                                      onSuccess: (result) =>
                                        setRewards((old) => ({ ...old, [key]: result })),
                                    },
                                  );
                                }}
                                className={`flex min-h-10 items-center rounded-xl border px-3 py-2 text-left text-sm transition-colors ${
                                  revealed && correct ? "border-emerald-300 bg-emerald-50 text-emerald-700" :
                                  revealed && chosen ? "border-rose-300 bg-rose-50 text-rose-700" :
                                  "border-gray-200 hover:border-violet-300 hover:bg-violet-50"
                                }`}
                              >
                                <span className="mr-2 font-semibold">{String.fromCharCode(65 + optionIndex)}.</span>{option}
                                {revealed && correct && <CheckCircle2 className="ml-auto h-4 w-4" />}
                                {revealed && chosen && !correct && <XCircle className="ml-auto h-4 w-4" />}
                              </button>
                            );
                          })}
                        </div>
                        {reward && (
                          <p className={`mt-2 text-xs font-semibold ${reward.pointsEarned > 0 ? "text-amber-600" : "text-gray-400"}`}>
                            {reward.pointsEarned > 0
                              ? `🌟 +${reward.pointsEarned} 积分${reward.storyBonus > 0 ? "（含全对通关奖 +5）" : ""}`
                              : reward.alreadyRewarded
                                ? "本题今日已结算过积分"
                                : "答错不扣分，继续加油"}
                          </p>
                        )}
                      </section>
                    );
                  })}
                </div>
              </div>
            </article>
            ) : (
              <div key={story.title} className="flex min-h-32 items-center gap-4 rounded-2xl border border-dashed border-gray-200 bg-gray-50/70 p-5 text-gray-400">
                <div className="rounded-xl bg-gray-100 p-3"><LockKeyhole className="h-6 w-6" /></div>
                <div>
                  <p className="font-bold text-gray-500">第 {storyIndex + 1} 关尚未解锁</p>
                  <p className="mt-1 text-xs">完成上一关的 5 道阅读理解题即可解锁</p>
                </div>
              </div>
            )
          ))}
        </div>
      )}
      {unlockMessage && (
        <div className="fixed inset-x-0 top-24 z-50 mx-auto w-fit animate-in zoom-in-90 fade-in rounded-2xl border border-amber-200 bg-white px-6 py-4 text-base font-bold text-amber-600 shadow-xl duration-300">
          {unlockMessage}
        </div>
      )}
    </main>
  );
}
