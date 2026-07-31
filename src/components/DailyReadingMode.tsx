import { useState } from "react";
import { ArrowLeft, BookOpenText, CheckCircle2, Loader2, RotateCcw, Sparkles, XCircle } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";

export default function DailyReadingMode({ onBack }: { onBack: () => void }) {
  const { data, isLoading, error, refetch } = trpc.spelling.getDailyReading.useQuery();
  const [answers, setAnswers] = useState<Record<string, number>>({});

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
            <article key={story.title} className="overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-sm">
              <header className="border-b border-violet-50 bg-violet-50/60 p-5">
                <div className="mb-1 flex items-center gap-2 text-xs font-semibold text-violet-600">
                  <Sparkles className="h-3.5 w-3.5" /> 故事 {storyIndex + 1} · {story.theme}
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
                                onClick={() => setAnswers((old) => ({ ...old, [key]: optionIndex }))}
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
                      </section>
                    );
                  })}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  );
}
