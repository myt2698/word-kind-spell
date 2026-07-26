import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import TagDetailDialog from "@/components/TagDetailDialog";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  PHONEMES,
  PHONEME_SECTIONS,
  PHONEME_SECTION_LABELS,
  type Phoneme,
} from "@/data/phonemes";
import { speakBritishWord, unlockAudio } from "@/utils/speech";
import {
  ArrowLeft,
  AudioLines,
  BookOpenText,
  ChevronRight,
  Hash,
  Loader2,
  Tags,
  Volume2,
} from "lucide-react";

type PhonicsView = "home" | "letters" | "ipa";

export default function PhonicsPage() {
  const { user, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const [view, setView] = useState<PhonicsView>("home");
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);
  const [selectedPhoneme, setSelectedPhoneme] = useState<Phoneme | null>(null);
  const { data: tags, isLoading: tagsLoading } = trpc.tag.listWithCount.useQuery();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [view]);

  const sortedTags = useMemo(
    () =>
      [...(tags ?? [])].sort((left, right) =>
        left.name.localeCompare(right.name, "en", {
          numeric: true,
          sensitivity: "base",
        }),
      ),
    [tags],
  );

  if (authLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-500" />
      </div>
    );
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-slate-50/80">
      <AppHeader />
      <main className="mx-auto max-w-3xl px-4 py-6 pb-24">
        {view === "home" && <PhonicsHome onOpen={setView} />}
        {view === "letters" && (
          <LetterCombinations
            tags={sortedTags}
            loading={tagsLoading}
            onBack={() => setView("home")}
            onOpenTag={setSelectedTagId}
          />
        )}
        {view === "ipa" && (
          <IpaLibrary
            onBack={() => setView("home")}
            onOpen={(phoneme) => {
              unlockAudio();
              speakBritishWord(phoneme.example.word);
              setSelectedPhoneme(phoneme);
            }}
          />
        )}
      </main>
      <MobileNav activeTab="phonics" />

      <TagDetailDialog
        tagId={selectedTagId}
        open={selectedTagId !== null}
        onClose={() => setSelectedTagId(null)}
      />

      <PhonemeDialog
        phoneme={selectedPhoneme}
        onClose={() => setSelectedPhoneme(null)}
      />
    </div>
  );
}

function PhonicsHome({ onOpen }: { onOpen: (view: PhonicsView) => void }) {
  return (
    <>
      <div className="mb-6">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-indigo-500">
          Phonics
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-950">拼读</h1>
        <p className="mt-2 text-sm leading-6 text-slate-500">
          从字母组合认识拼写规律，再用音标看清每一个英语发音。
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <EntryCard
          icon={Tags}
          eyebrow="LETTER PATTERNS"
          title="字母组合"
          description="查看现有标签及其关联单词，按字母顺序排列。"
          accent="emerald"
          onClick={() => onOpen("letters")}
        />
        <EntryCard
          icon={AudioLines}
          eyebrow="IPA SOUNDS"
          title="音标"
          description="学习短元音、长元音、双元音和 24 个辅音。"
          accent="indigo"
          onClick={() => onOpen("ipa")}
        />
      </div>

      <div className="mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/70 p-4">
        <div className="flex gap-3">
          <BookOpenText className="mt-0.5 h-5 w-5 shrink-0 text-indigo-500" />
          <p className="text-sm leading-6 text-indigo-900/75">
            音标页采用常见英式 44 音体系。点击任一音标会播放示例词，设备音色可能略有差异。
          </p>
        </div>
      </div>
    </>
  );
}

function EntryCard({
  icon: Icon,
  eyebrow,
  title,
  description,
  accent,
  onClick,
}: {
  icon: typeof Tags;
  eyebrow: string;
  title: string;
  description: string;
  accent: "emerald" | "indigo";
  onClick: () => void;
}) {
  const colors =
    accent === "emerald"
      ? "bg-emerald-50 text-emerald-600 group-hover:bg-emerald-100"
      : "bg-indigo-50 text-indigo-600 group-hover:bg-indigo-100";

  return (
    <button
      type="button"
      className="group flex min-h-44 w-full flex-col rounded-2xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md"
      onClick={onClick}
    >
      <div className={`flex h-11 w-11 items-center justify-center rounded-xl transition ${colors}`}>
        <Icon className="h-5 w-5" />
      </div>
      <p className="mt-5 text-[10px] font-bold tracking-[0.18em] text-slate-400">{eyebrow}</p>
      <div className="mt-1 flex w-full items-center gap-2">
        <h2 className="flex-1 text-lg font-bold text-slate-900">{title}</h2>
        <ChevronRight className="h-5 w-5 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-indigo-500" />
      </div>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>
    </button>
  );
}

function SectionHeader({
  title,
  subtitle,
  onBack,
}: {
  title: string;
  subtitle: string;
  onBack: () => void;
}) {
  return (
    <div className="mb-6 flex items-start gap-3">
      <button
        type="button"
        aria-label="返回拼读首页"
        className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm hover:text-indigo-600"
        onClick={onBack}
      >
        <ArrowLeft className="h-4 w-4" />
      </button>
      <div>
        <h1 className="text-xl font-bold text-slate-950">{title}</h1>
        <p className="mt-1 text-sm leading-5 text-slate-500">{subtitle}</p>
      </div>
    </div>
  );
}

function LetterCombinations({
  tags,
  loading,
  onBack,
  onOpenTag,
}: {
  tags: Array<{ id: number; name: string; description: string | null; wordCount: number }>;
  loading: boolean;
  onBack: () => void;
  onOpenTag: (tagId: number) => void;
}) {
  return (
    <>
      <SectionHeader
        title="字母组合"
        subtitle="现有标签按英文字母顺序排列，点击可查看说明和关联单词。"
        onBack={onBack}
      />
      {loading ? (
        <Loader2 className="mx-auto mt-16 h-7 w-7 animate-spin text-indigo-500" />
      ) : tags.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center text-sm text-slate-400">
          暂无字母组合
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {tags.map((tag) => (
            <button
              type="button"
              key={tag.id}
              className="group relative min-h-24 overflow-hidden rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:border-emerald-300 hover:shadow-md active:scale-[0.98]"
              onClick={() => onOpenTag(tag.id)}
            >
              <Hash className="h-4 w-4 text-emerald-500" />
              <p className="mt-3 break-words text-sm font-semibold leading-5 text-slate-800">
                {tag.name}
              </p>
              <p className="mt-1 text-[11px] text-slate-400">{tag.wordCount} 个单词</p>
            </button>
          ))}
        </div>
      )}
    </>
  );
}

function IpaLibrary({
  onBack,
  onOpen,
}: {
  onBack: () => void;
  onOpen: (phoneme: Phoneme) => void;
}) {
  return (
    <>
      <SectionHeader
        title="英语音标"
        subtitle="点击音标试听示例词，并查看发音要领和常见拼写。"
        onBack={onBack}
      />

      <div className="space-y-5">
        <div>
          <h2 className="text-base font-bold text-slate-900">元音</h2>
          <p className="mt-1 text-xs text-slate-500">单元音包含短元音和长元音，双元音带有口形滑动。</p>
        </div>
        {PHONEME_SECTIONS.filter((section) => section.key !== "consonant").map((section) => (
          <PhonemeSectionCard key={section.key} section={section} onOpen={onOpen} />
        ))}

        <div className="pt-2">
          <h2 className="text-base font-bold text-slate-900">辅音</h2>
          <p className="mt-1 text-xs text-slate-500">注意清辅音与浊辅音的声带振动差别。</p>
        </div>
        {PHONEME_SECTIONS.filter((section) => section.key === "consonant").map((section) => (
          <PhonemeSectionCard key={section.key} section={section} onOpen={onOpen} />
        ))}
      </div>

      <div className="mt-6 rounded-xl bg-slate-100 px-4 py-3 text-xs leading-5 text-slate-500">
        分类参考：
        <a
          className="ml-1 text-indigo-600 hover:underline"
          href="https://downloads.bbc.co.uk/worldservice/learningenglish/pronunciation/pdf/sounds/sounds_chart.pdf"
          target="_blank"
          rel="noreferrer"
        >
          BBC Sounds of English
        </a>
        <span>、</span>
        <a
          className="text-indigo-600 hover:underline"
          href="https://dictionary.cambridge.org/help/phonetics.html"
          target="_blank"
          rel="noreferrer"
        >
          Cambridge pronunciation symbols
        </a>
        。
      </div>
    </>
  );
}

function PhonemeSectionCard({
  section,
  onOpen,
}: {
  section: (typeof PHONEME_SECTIONS)[number];
  onOpen: (phoneme: Phoneme) => void;
}) {
  const phonemes = PHONEMES.filter((phoneme) => phoneme.section === section.key);
  const isConsonant = section.key === "consonant";

  return (
    <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3">
        <h3 className="text-sm font-bold text-slate-900">{section.title}</h3>
        <p className="mt-0.5 text-xs leading-5 text-slate-400">{section.description}</p>
      </div>
      <div className={`grid gap-2 ${isConsonant ? "grid-cols-4 sm:grid-cols-6" : "grid-cols-4 sm:grid-cols-5"}`}>
        {phonemes.map((phoneme) => (
          <button
            type="button"
            key={phoneme.symbol}
            onTouchStart={unlockAudio}
            onClick={() => onOpen(phoneme)}
            className="group flex min-h-18 flex-col items-center justify-center rounded-xl border border-slate-200 bg-slate-50 px-2 py-2 transition hover:border-indigo-300 hover:bg-indigo-50 active:scale-95"
            aria-label={`音标 ${phoneme.symbol}，示例 ${phoneme.example.word}`}
          >
            <span className="font-serif text-2xl font-semibold text-slate-900 group-hover:text-indigo-700">
              /{phoneme.symbol}/
            </span>
            <span className="mt-1 max-w-full truncate text-[10px] text-slate-400">
              {phoneme.example.word}
            </span>
          </button>
        ))}
      </div>
    </section>
  );
}

function PhonemeDialog({
  phoneme,
  onClose,
}: {
  phoneme: Phoneme | null;
  onClose: () => void;
}) {
  return (
    <Dialog open={phoneme !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-sm">
        {phoneme && (
          <>
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="flex h-16 min-w-20 items-center justify-center rounded-2xl bg-indigo-50 px-3 font-serif text-3xl font-bold text-indigo-700">
                  /{phoneme.symbol}/
                </div>
                <div>
                  <DialogTitle>{PHONEME_SECTION_LABELS[phoneme.section]}</DialogTitle>
                  <DialogDescription className="mt-1">{phoneme.soundType}</DialogDescription>
                </div>
              </div>
            </DialogHeader>

            <div className="space-y-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs font-semibold text-slate-500">发音要领</p>
                <p className="mt-1 text-sm leading-6 text-slate-700">{phoneme.tip}</p>
              </div>

              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border border-indigo-100 bg-indigo-50/60 p-3 text-left transition hover:bg-indigo-50 active:scale-[0.99]"
                onTouchStart={unlockAudio}
                onClick={() => speakBritishWord(phoneme.example.word)}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-indigo-600 text-white">
                  <Volume2 className="h-5 w-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline gap-2">
                    <span className="text-base font-bold text-slate-900">{phoneme.example.word}</span>
                    <span className="font-mono text-xs text-slate-500">{phoneme.example.phonetic}</span>
                  </span>
                  <span className="mt-0.5 block text-xs text-slate-500">
                    {phoneme.example.meaning} · 点击播放英式发音
                  </span>
                </span>
              </button>

              <div>
                <p className="text-xs font-semibold text-slate-500">常见拼写</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {phoneme.spellings.map((spelling) => (
                    <span
                      key={spelling}
                      className="rounded-lg bg-emerald-50 px-2.5 py-1 font-mono text-xs font-semibold text-emerald-700"
                    >
                      {spelling}
                    </span>
                  ))}
                </div>
              </div>

              <div>
                <p className="text-xs font-semibold text-slate-500">更多例词</p>
                <p className="mt-1.5 text-sm text-slate-700">{phoneme.moreExamples.join(" · ")}</p>
              </div>
            </div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
