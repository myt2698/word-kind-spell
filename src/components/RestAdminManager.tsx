import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Edit3, Loader2, Plus, Trash2 } from "lucide-react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

type SeriesForm = {
  title: string;
  description: string;
  coverUrl: string;
  sortOrder: string;
  enabled: boolean;
};

type EpisodeForm = {
  seriesId: number | null;
  title: string;
  episodeNumber: string;
  videoUrl: string;
  durationSeconds: string;
  enabled: boolean;
};

const emptySeries: SeriesForm = { title: "", description: "", coverUrl: "", sortOrder: "0", enabled: true };
const emptyEpisode: EpisodeForm = { seriesId: null, title: "", episodeNumber: "1", videoUrl: "", durationSeconds: "", enabled: true };

export default function RestAdminManager() {
  const utils = trpc.useUtils();
  const { data: series = [], isLoading } = trpc.rest.adminList.useQuery();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [seriesDialogOpen, setSeriesDialogOpen] = useState(false);
  const [episodeDialogOpen, setEpisodeDialogOpen] = useState(false);
  const [editingSeriesId, setEditingSeriesId] = useState<number | null>(null);
  const [editingEpisodeId, setEditingEpisodeId] = useState<number | null>(null);
  const [seriesForm, setSeriesForm] = useState<SeriesForm>(emptySeries);
  const [episodeForm, setEpisodeForm] = useState<EpisodeForm>(emptyEpisode);
  const [formError, setFormError] = useState("");

  const refresh = () => utils.rest.adminList.invalidate();
  const closeSeriesDialog = () => { setSeriesDialogOpen(false); setFormError(""); };
  const closeEpisodeDialog = () => { setEpisodeDialogOpen(false); setFormError(""); };
  const mutationError = (error: { message: string }) => setFormError(error.message || "保存失败，请重试");

  const createSeries = trpc.rest.createSeries.useMutation({ onSuccess: () => { refresh(); closeSeriesDialog(); }, onError: mutationError });
  const updateSeries = trpc.rest.updateSeries.useMutation({ onSuccess: () => { refresh(); closeSeriesDialog(); }, onError: mutationError });
  const deleteSeries = trpc.rest.deleteSeries.useMutation({ onSuccess: refresh });
  const createEpisode = trpc.rest.createEpisode.useMutation({ onSuccess: () => { refresh(); closeEpisodeDialog(); }, onError: mutationError });
  const updateEpisode = trpc.rest.updateEpisode.useMutation({ onSuccess: () => { refresh(); closeEpisodeDialog(); }, onError: mutationError });
  const deleteEpisode = trpc.rest.deleteEpisode.useMutation({ onSuccess: refresh });

  const openSeriesCreate = () => {
    setEditingSeriesId(null);
    setSeriesForm(emptySeries);
    setFormError("");
    setSeriesDialogOpen(true);
  };

  const openSeriesEdit = (item: any) => {
    setEditingSeriesId(item.id);
    setSeriesForm({
      title: item.title,
      description: item.description || "",
      coverUrl: item.coverUrl,
      sortOrder: String(item.sortOrder),
      enabled: item.enabled,
    });
    setFormError("");
    setSeriesDialogOpen(true);
  };

  const openEpisodeCreate = (seriesId: number, nextNumber: number) => {
    setEditingEpisodeId(null);
    setEpisodeForm({ ...emptyEpisode, seriesId, episodeNumber: String(nextNumber) });
    setFormError("");
    setEpisodeDialogOpen(true);
  };

  const openEpisodeEdit = (item: any) => {
    setEditingEpisodeId(item.id);
    setEpisodeForm({
      seriesId: item.seriesId,
      title: item.title,
      episodeNumber: String(item.episodeNumber),
      videoUrl: item.videoUrl,
      durationSeconds: item.durationSeconds ? String(item.durationSeconds) : "",
      enabled: item.enabled,
    });
    setFormError("");
    setEpisodeDialogOpen(true);
  };

  const submitSeries = () => {
    setFormError("");
    if (!seriesForm.title.trim() || !seriesForm.coverUrl.trim()) {
      setFormError("请填写系列名称和封面地址");
      return;
    }
    const input = {
      title: seriesForm.title.trim(),
      description: seriesForm.description.trim(),
      coverUrl: seriesForm.coverUrl.trim(),
      sortOrder: Number(seriesForm.sortOrder) || 0,
      enabled: seriesForm.enabled,
    };
    if (editingSeriesId) updateSeries.mutate({ id: editingSeriesId, ...input });
    else createSeries.mutate(input);
  };

  const submitEpisode = () => {
    setFormError("");
    if (!episodeForm.seriesId || !episodeForm.title.trim() || !episodeForm.videoUrl.trim()) {
      setFormError("请填写集数标题和视频地址");
      return;
    }
    const duration = episodeForm.durationSeconds.trim();
    const input = {
      seriesId: episodeForm.seriesId,
      title: episodeForm.title.trim(),
      episodeNumber: Math.max(1, Number(episodeForm.episodeNumber) || 1),
      videoUrl: episodeForm.videoUrl.trim(),
      durationSeconds: duration ? Math.max(1, Number(duration) || 1) : null,
      enabled: episodeForm.enabled,
    };
    if (editingEpisodeId) updateEpisode.mutate({ id: editingEpisodeId, ...input });
    else createEpisode.mutate(input);
  };

  const seriesSaving = createSeries.isPending || updateSeries.isPending;
  const episodeSaving = createEpisode.isPending || updateEpisode.isPending;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-gray-500">共 {series.length} 个短片系列</h2>
          <p className="mt-1 text-xs text-gray-400">填写 OSS 或其他 HTTPS 封面、视频地址</p>
        </div>
        <Button size="sm" onClick={openSeriesCreate} className="gap-1">
          <Plus className="h-4 w-4" />新建系列
        </Button>
      </div>

      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-100 bg-white">
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-5 w-5 animate-spin text-gray-400" /></div>
        ) : series.length === 0 ? (
          <div className="py-12 text-center text-sm text-gray-400">暂无短片，先创建一个系列</div>
        ) : series.map((item) => (
          <div key={item.id}>
            <div className="flex items-center gap-3 px-4 py-3">
              <img src={item.coverUrl} alt="" className="h-14 w-20 rounded-lg bg-gray-100 object-cover" />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="truncate text-sm font-semibold text-gray-900">{item.title}</p>
                  {!item.enabled && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">已下架</span>}
                </div>
                <p className="mt-0.5 text-xs text-gray-400">{item.episodeCount} 集 · 排序 {item.sortOrder}</p>
              </div>
              <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                {expandedId === item.id ? <ChevronDown className="mr-1 h-4 w-4" /> : <ChevronRight className="mr-1 h-4 w-4" />}
                集数
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-indigo-600" onClick={() => openSeriesEdit(item)}>
                <Edit3 className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="icon" className="h-8 w-8 text-gray-400 hover:text-red-500" onClick={() => {
                if (confirm(`确定删除系列“${item.title}”及其全部集数？`)) deleteSeries.mutate({ id: item.id });
              }}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>

            {expandedId === item.id && (
              <div className="border-t border-gray-100 bg-gray-50/70 px-4 py-3 pl-8 sm:pl-28">
                <div className="mb-2 flex items-center justify-between">
                  <span className="text-xs font-medium text-gray-500">集数列表</span>
                  <Button variant="ghost" size="sm" className="h-7 text-xs text-indigo-600" onClick={() => openEpisodeCreate(item.id, item.episodes.length + 1)}>
                    <Plus className="mr-1 h-3 w-3" />添加集数
                  </Button>
                </div>
                {item.episodes.length === 0 ? (
                  <p className="rounded-lg bg-white px-3 py-4 text-center text-xs text-gray-400">还没有集数</p>
                ) : (
                  <div className="space-y-1.5">
                    {item.episodes.map((episode) => (
                      <div key={episode.id} className="flex items-center gap-2 rounded-lg bg-white px-3 py-2">
                        <span className="w-10 text-xs font-semibold text-indigo-500">第 {episode.episodeNumber} 集</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-gray-700">{episode.title}</span>
                        {!episode.enabled && <span className="text-[10px] text-gray-400">已下架</span>}
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400" onClick={() => openEpisodeEdit(episode)}><Edit3 className="h-3 w-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => {
                          if (confirm(`确定删除第 ${episode.episodeNumber} 集？`)) deleteEpisode.mutate({ id: episode.id });
                        }}><Trash2 className="h-3 w-3" /></Button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      <Dialog open={seriesDialogOpen} onOpenChange={(open) => open ? setSeriesDialogOpen(true) : closeSeriesDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingSeriesId ? "编辑短片系列" : "新建短片系列"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Field label="系列名称"><Input value={seriesForm.title} onChange={(event) => setSeriesForm((form) => ({ ...form, title: event.target.value }))} placeholder="如：森林里的小熊" /></Field>
            <Field label="简介（可选）"><Textarea value={seriesForm.description} onChange={(event) => setSeriesForm((form) => ({ ...form, description: event.target.value }))} rows={2} placeholder="一句安静的内容介绍" /></Field>
            <Field label="封面地址"><Input value={seriesForm.coverUrl} onChange={(event) => setSeriesForm((form) => ({ ...form, coverUrl: event.target.value }))} placeholder="https://.../cover.jpg" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="排序"><Input type="number" value={seriesForm.sortOrder} onChange={(event) => setSeriesForm((form) => ({ ...form, sortOrder: event.target.value }))} /></Field>
              <CheckField checked={seriesForm.enabled} onChange={(enabled) => setSeriesForm((form) => ({ ...form, enabled }))} label="在孩子端展示" />
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <Button className="w-full" onClick={submitSeries} disabled={seriesSaving}>{seriesSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存系列"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={episodeDialogOpen} onOpenChange={(open) => open ? setEpisodeDialogOpen(true) : closeEpisodeDialog()}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingEpisodeId ? "编辑集数" : "添加集数"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-[110px_1fr] gap-4">
              <Field label="第几集"><Input type="number" min="1" value={episodeForm.episodeNumber} onChange={(event) => setEpisodeForm((form) => ({ ...form, episodeNumber: event.target.value }))} /></Field>
              <Field label="集数标题"><Input value={episodeForm.title} onChange={(event) => setEpisodeForm((form) => ({ ...form, title: event.target.value }))} placeholder="如：小熊去河边" /></Field>
            </div>
            <Field label="视频地址"><Input value={episodeForm.videoUrl} onChange={(event) => setEpisodeForm((form) => ({ ...form, videoUrl: event.target.value }))} placeholder="https://.../episode-01.mp4" /></Field>
            <div className="grid grid-cols-2 gap-4">
              <Field label="时长（秒，可选）"><Input type="number" min="1" value={episodeForm.durationSeconds} onChange={(event) => setEpisodeForm((form) => ({ ...form, durationSeconds: event.target.value }))} /></Field>
              <CheckField checked={episodeForm.enabled} onChange={(enabled) => setEpisodeForm((form) => ({ ...form, enabled }))} label="在孩子端展示" />
            </div>
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <Button className="w-full" onClick={submitEpisode} disabled={episodeSaving}>{episodeSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存集数"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function CheckField({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="mt-6 flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-600">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
      {label}
    </label>
  );
}
