import { useMemo, useState } from "react";
import {
  ArrowLeft,
  ChevronRight,
  CirclePlay,
  Film,
  Loader2,
  RotateCcw,
} from "lucide-react";
import { trpc } from "@/providers/trpc";

type RestEpisode = {
  id: number;
  title: string;
  episodeNumber: number;
  videoUrl: string;
  durationSeconds: number | null;
};

type RestSeries = {
  id: number;
  title: string;
  description: string | null;
  coverUrl: string;
  episodeCount: number;
  episodes?: RestEpisode[];
};

const previewSeries: RestSeries[] = [
  { id: -1, title: "森林小伙伴", description: "看看森林里的安静日常", coverUrl: "/rest-preview/forest-bear.webp", episodeCount: 12 },
  { id: -2, title: "小小工程车", description: "沿着山谷慢慢出发", coverUrl: "/rest-preview/little-train.webp", episodeCount: 8 },
  { id: -3, title: "海底慢慢游", description: "和小机器人一起观察花草", coverUrl: "/rest-preview/garden-robot.webp", episodeCount: 10 },
  { id: -4, title: "星星故事屋", description: "跟着纸飞机看看远方", coverUrl: "/rest-preview/paper-plane.webp", episodeCount: 6 },
];

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return `${minutes}:${rest.toString().padStart(2, "0")}`;
}

function Header({ title, subtitle, onBack }: { title: string; subtitle: string; onBack: () => void }) {
  return (
    <header className="relative flex min-h-[88px] items-center justify-center px-16 text-center">
      <button
        type="button"
        onClick={onBack}
        aria-label="返回"
        className="absolute left-5 top-5 flex h-11 w-11 items-center justify-center rounded-[14px] bg-[#f1efff] text-[#6f67ba] transition-colors hover:bg-[#e9e6ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#8b83d6]"
      >
        <ArrowLeft className="h-5 w-5" />
      </button>
      <div className="pt-1">
        <h1 className="text-[22px] font-bold tracking-tight text-[#2d2a3f]">{title}</h1>
        <p className="mt-1 text-[12px] text-[#8d899f]">{subtitle}</p>
      </div>
    </header>
  );
}

export default function RestMode({ onBack }: { onBack: () => void }) {
  const isLocalPreview = window.location.hostname === "127.0.0.1" || window.location.hostname === "localhost";
  const previewEnabled = isLocalPreview && new URLSearchParams(window.location.search).get("restPreview") === "1";
  const [selectedSeriesId, setSelectedSeriesId] = useState<number | null>(null);
  const [selectedEpisode, setSelectedEpisode] = useState<RestEpisode | null>(null);
  const listQuery = trpc.rest.listSeries.useQuery(undefined, { enabled: !previewEnabled });
  const detailQuery = trpc.rest.getSeries.useQuery(
    { id: selectedSeriesId ?? 0 },
    { enabled: !previewEnabled && selectedSeriesId !== null },
  );

  const series = useMemo<RestSeries[]>(
    () => previewEnabled ? previewSeries : (listQuery.data ?? []),
    [listQuery.data, previewEnabled],
  );

  const selectedPreview = previewEnabled
    ? previewSeries.find((item) => item.id === selectedSeriesId)
    : null;
  const selectedSeries: RestSeries | null = previewEnabled && selectedPreview
    ? {
        ...selectedPreview,
        episodes: Array.from({ length: selectedPreview.episodeCount }, (_, index) => ({
          id: selectedPreview.id * 100 - index,
          title: `第 ${index + 1} 集`,
          episodeNumber: index + 1,
          videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
          durationSeconds: 180 + index * 12,
        })),
      }
    : (detailQuery.data ?? null);

  if (selectedEpisode && selectedSeries) {
    return (
      <main className="min-h-screen bg-white pb-10">
        <Header
          title={selectedEpisode.title}
          subtitle={selectedSeries.title}
          onBack={() => setSelectedEpisode(null)}
        />
        <div className="mx-auto max-w-3xl px-5 pt-4">
          <div className="overflow-hidden rounded-[22px] bg-black shadow-sm">
            <video
              key={selectedEpisode.videoUrl}
              src={selectedEpisode.videoUrl}
              controls
              playsInline
              preload="metadata"
              poster={selectedSeries.coverUrl}
              className="aspect-video w-full bg-black object-contain"
            />
          </div>
          <div className="mt-5 rounded-2xl border border-[#ebe9f4] bg-[#faf9ff] px-5 py-4">
            <p className="font-semibold text-[#2d2a3f]">
              第 {selectedEpisode.episodeNumber} 集 · {selectedEpisode.title}
            </p>
            <p className="mt-1.5 text-sm leading-6 text-[#827e92]">
              播放结束后不会自动连播。想继续看时，再回到集数列表自己选择。
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (selectedSeriesId !== null) {
    return (
      <main className="min-h-screen bg-white pb-10">
        <Header
          title={selectedSeries?.title ?? "选择集数"}
          subtitle={selectedSeries ? `共 ${selectedSeries.episodeCount} 集，选一集慢慢看` : "正在加载集数"}
          onBack={() => setSelectedSeriesId(null)}
        />
        <div className="mx-auto max-w-3xl px-5 pt-3">
          {detailQuery.isLoading && !previewEnabled ? (
            <div className="flex min-h-[360px] items-center justify-center">
              <Loader2 className="h-7 w-7 animate-spin text-[#8b83d6]" />
            </div>
          ) : detailQuery.error && !previewEnabled ? (
            <ErrorState message={detailQuery.error.message} onRetry={() => detailQuery.refetch()} />
          ) : selectedSeries ? (
            <>
              <div className="mb-6 overflow-hidden rounded-[20px] bg-[#f4f2fb]">
                <img
                  src={selectedSeries.coverUrl}
                  alt={`${selectedSeries.title}封面`}
                  className="aspect-[2/1] w-full object-cover"
                />
              </div>
              <div className="divide-y divide-[#efedf4] border-y border-[#efedf4]">
                {selectedSeries.episodes?.map((episode) => (
                  <button
                    key={episode.id}
                    type="button"
                    onClick={() => setSelectedEpisode(episode)}
                    className="flex min-h-[74px] w-full items-center gap-4 px-1 text-left transition-colors hover:bg-[#faf9ff] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8b83d6]"
                  >
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-[#f1efff] text-sm font-semibold text-[#746dcc]">
                      {episode.episodeNumber}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[15px] font-semibold text-[#353143]">{episode.title}</span>
                      {formatDuration(episode.durationSeconds) && (
                        <span className="mt-1 block text-xs text-[#9a96a8]">{formatDuration(episode.durationSeconds)}</span>
                      )}
                    </span>
                    <CirclePlay className="h-5 w-5 text-[#9a94cf]" />
                  </button>
                ))}
              </div>
            </>
          ) : null}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-white pb-12">
      <Header title="休息小站" subtitle="选一部动画，再挑选具体集数" onBack={onBack} />
      <div className="mx-auto max-w-3xl px-5 pt-3">
        {listQuery.isLoading && !previewEnabled ? (
          <div className="flex min-h-[480px] items-center justify-center">
            <Loader2 className="h-7 w-7 animate-spin text-[#8b83d6]" />
          </div>
        ) : listQuery.error && !previewEnabled ? (
          <ErrorState message={listQuery.error.message} onRetry={() => listQuery.refetch()} />
        ) : series.length === 0 ? (
          <div className="flex min-h-[460px] flex-col items-center justify-center px-8 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-[#f3f1fb]">
              <Film className="h-6 w-6 text-[#8b83d6]" />
            </div>
            <p className="mt-4 font-semibold text-[#4a4659]">短片还在准备中</p>
            <p className="mt-1 text-sm leading-6 text-[#9691a3]">管理员添加短片系列和集数后，就会显示在这里。</p>
          </div>
        ) : (
          <div className="divide-y divide-[#efedf4] border-y border-[#efedf4]">
            {series.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedSeriesId(item.id)}
                className="group flex w-full items-center gap-4 py-[13px] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#8b83d6] sm:gap-6"
              >
                <img
                  src={item.coverUrl}
                  alt={`${item.title}封面`}
                  className="h-[105px] w-[158px] shrink-0 rounded-[16px] object-cover sm:h-[126px] sm:w-[190px]"
                />
                <span className="min-w-0 flex-1">
                  <span className="block text-[17px] font-bold leading-6 text-[#353143]">{item.title}</span>
                  <span className="mt-2 block text-[13px] text-[#908b9c]">共 {item.episodeCount} 集</span>
                </span>
                <ChevronRight className="h-5 w-5 shrink-0 text-[#a39ecb] transition-transform group-hover:translate-x-0.5" />
              </button>
            ))}
          </div>
        )}
        <div className="mt-7 flex items-center justify-center gap-3 text-[12px] text-[#a7a2b0]">
          <span className="h-px w-5 bg-[#dcd8eb]" />
          <span>点选短片可查看全部集数</span>
          <span className="h-px w-5 bg-[#dcd8eb]" />
        </div>
      </div>
    </main>
  );
}

function ErrorState({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="flex min-h-[420px] flex-col items-center justify-center px-8 text-center">
      <p className="text-sm leading-6 text-[#8d899f]">{message || "短片加载失败，请稍后重试"}</p>
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 inline-flex items-center gap-2 rounded-xl bg-[#f1efff] px-4 py-2 text-sm font-semibold text-[#6f67ba]"
      >
        <RotateCcw className="h-4 w-4" />
        重新加载
      </button>
    </div>
  );
}
