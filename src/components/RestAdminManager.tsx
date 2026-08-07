import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown, ChevronRight, Edit3, FileImage, Loader2, Plus, Trash2, Upload, Video } from "lucide-react";
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

type UploadKind = "cover" | "video";

function formatBytes(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}

function uploadRestMedia(file: File, kind: UploadKind, onProgress: (progress: number) => void) {
  return new Promise<string>((resolve, reject) => {
    const request = new XMLHttpRequest();
    const query = new URLSearchParams({ kind, filename: file.name });
    request.open("POST", `/media/rest/upload?${query}`);
    request.withCredentials = true;
    request.responseType = "json";
    request.timeout = 60 * 60 * 1000;
    request.setRequestHeader("Content-Type", file.type || "application/octet-stream");
    request.upload.onprogress = (event) => {
      if (event.lengthComputable) onProgress(Math.round((event.loaded / event.total) * 100));
    };
    request.onload = () => {
      const response = request.response as { url?: string; error?: string } | null;
      if (request.status >= 200 && request.status < 300 && response?.url) {
        resolve(response.url);
      } else {
        reject(new Error(response?.error || `上传失败（${request.status}）`));
      }
    };
    request.onerror = () => reject(new Error("上传连接中断，请检查网络后重试"));
    request.ontimeout = () => reject(new Error("上传超时，请重试"));
    request.send(file);
  });
}

function readVideoDuration(file: File) {
  return new Promise<number | null>((resolve) => {
    const video = document.createElement("video");
    const objectUrl = URL.createObjectURL(file);
    const done = (value: number | null) => {
      URL.revokeObjectURL(objectUrl);
      video.remove();
      resolve(value);
    };
    video.preload = "metadata";
    video.onloadedmetadata = () => done(Number.isFinite(video.duration) ? Math.max(1, Math.round(video.duration)) : null);
    video.onerror = () => done(null);
    video.src = objectUrl;
  });
}

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
  const [seriesCoverFile, setSeriesCoverFile] = useState<File | null>(null);
  const [episodeVideoFile, setEpisodeVideoFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [formError, setFormError] = useState("");

  const refresh = () => utils.rest.adminList.invalidate();
  const closeSeriesDialog = () => { setSeriesDialogOpen(false); setSeriesCoverFile(null); setUploadProgress(null); setFormError(""); };
  const closeEpisodeDialog = () => { setEpisodeDialogOpen(false); setEpisodeVideoFile(null); setUploadProgress(null); setFormError(""); };

  const createSeries = trpc.rest.createSeries.useMutation();
  const updateSeries = trpc.rest.updateSeries.useMutation();
  const deleteSeries = trpc.rest.deleteSeries.useMutation({ onSuccess: refresh });
  const createEpisode = trpc.rest.createEpisode.useMutation();
  const updateEpisode = trpc.rest.updateEpisode.useMutation();
  const deleteEpisode = trpc.rest.deleteEpisode.useMutation({ onSuccess: refresh });

  const openSeriesCreate = () => {
    setEditingSeriesId(null);
    setSeriesForm(emptySeries);
    setSeriesCoverFile(null);
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
    setSeriesCoverFile(null);
    setFormError("");
    setSeriesDialogOpen(true);
  };

  const openEpisodeCreate = (seriesId: number, nextNumber: number) => {
    setEditingEpisodeId(null);
    setEpisodeForm({ ...emptyEpisode, seriesId, episodeNumber: String(nextNumber) });
    setEpisodeVideoFile(null);
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
    setEpisodeVideoFile(null);
    setFormError("");
    setEpisodeDialogOpen(true);
  };

  const submitSeries = async () => {
    setFormError("");
    if (!seriesForm.title.trim() || (!seriesCoverFile && !seriesForm.coverUrl.trim())) {
      setFormError("请填写系列名称并选择封面图片");
      return;
    }
    try {
      let coverUrl = seriesForm.coverUrl.trim();
      if (seriesCoverFile) {
        setUploadProgress(0);
        coverUrl = await uploadRestMedia(seriesCoverFile, "cover", setUploadProgress);
        setUploadProgress(null);
      }
      const input = {
        title: seriesForm.title.trim(),
        description: seriesForm.description.trim(),
        coverUrl,
        sortOrder: Number(seriesForm.sortOrder) || 0,
        enabled: seriesForm.enabled,
      };
      if (editingSeriesId) await updateSeries.mutateAsync({ id: editingSeriesId, ...input });
      else await createSeries.mutateAsync(input);
      await refresh();
      closeSeriesDialog();
    } catch (error) {
      setUploadProgress(null);
      setFormError(error instanceof Error ? error.message : "保存失败，请重试");
    }
  };

  const submitEpisode = async () => {
    setFormError("");
    if (!episodeForm.seriesId || !episodeForm.title.trim() || (!episodeVideoFile && !episodeForm.videoUrl.trim())) {
      setFormError("请填写集数标题并选择视频文件");
      return;
    }
    try {
      let videoUrl = episodeForm.videoUrl.trim();
      if (episodeVideoFile) {
        setUploadProgress(0);
        videoUrl = await uploadRestMedia(episodeVideoFile, "video", setUploadProgress);
        setUploadProgress(null);
      }
      const duration = episodeForm.durationSeconds.trim();
      const input = {
        seriesId: episodeForm.seriesId,
        title: episodeForm.title.trim(),
        episodeNumber: Math.max(1, Number(episodeForm.episodeNumber) || 1),
        videoUrl,
        durationSeconds: duration ? Math.max(1, Number(duration) || 1) : null,
        enabled: episodeForm.enabled,
      };
      if (editingEpisodeId) await updateEpisode.mutateAsync({ id: editingEpisodeId, ...input });
      else await createEpisode.mutateAsync(input);
      await refresh();
      closeEpisodeDialog();
    } catch (error) {
      setUploadProgress(null);
      setFormError(error instanceof Error ? error.message : "保存失败，请重试");
    }
  };

  const seriesSaving = createSeries.isPending || updateSeries.isPending || uploadProgress !== null;
  const episodeSaving = createEpisode.isPending || updateEpisode.isPending || uploadProgress !== null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-medium text-gray-500">共 {series.length} 个短片系列</h2>
          <p className="mt-1 text-xs text-gray-400">从电脑选择封面和视频，保存时自动上传到服务器</p>
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

      <Dialog open={seriesDialogOpen} onOpenChange={(open) => {
        if (open) setSeriesDialogOpen(true);
        else if (!seriesSaving) closeSeriesDialog();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingSeriesId ? "编辑短片系列" : "新建短片系列"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <Field label="系列名称"><Input value={seriesForm.title} onChange={(event) => setSeriesForm((form) => ({ ...form, title: event.target.value }))} placeholder="如：森林里的小熊" /></Field>
            <Field label="简介（可选）"><Textarea value={seriesForm.description} onChange={(event) => setSeriesForm((form) => ({ ...form, description: event.target.value }))} rows={2} placeholder="一句安静的内容介绍" /></Field>
            <MediaFileField
              label={editingSeriesId ? "封面图片（不选择则保留原封面）" : "封面图片"}
              accept="image/jpeg,image/png,image/webp,image/gif"
              icon={<FileImage className="h-5 w-5" />}
              file={seriesCoverFile}
              hint="支持 JPG、PNG、WebP、GIF，最大 10MB"
              onChange={(file) => {
                if (file && file.size > 10 * 1024 * 1024) {
                  setFormError("封面不能超过 10MB");
                  return;
                }
                setFormError("");
                setSeriesCoverFile(file);
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Field label="排序"><Input type="number" value={seriesForm.sortOrder} onChange={(event) => setSeriesForm((form) => ({ ...form, sortOrder: event.target.value }))} /></Field>
              <CheckField checked={seriesForm.enabled} onChange={(enabled) => setSeriesForm((form) => ({ ...form, enabled }))} label="在孩子端展示" />
            </div>
            <UploadStatus progress={uploadProgress} />
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <Button className="w-full" onClick={submitSeries} disabled={seriesSaving}>{seriesSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{uploadProgress !== null ? `正在上传 ${uploadProgress}%` : "正在保存"}</> : "保存系列"}</Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={episodeDialogOpen} onOpenChange={(open) => {
        if (open) setEpisodeDialogOpen(true);
        else if (!episodeSaving) closeEpisodeDialog();
      }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader><DialogTitle>{editingEpisodeId ? "编辑集数" : "添加集数"}</DialogTitle></DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="grid grid-cols-[110px_1fr] gap-4">
              <Field label="第几集"><Input type="number" min="1" value={episodeForm.episodeNumber} onChange={(event) => setEpisodeForm((form) => ({ ...form, episodeNumber: event.target.value }))} /></Field>
              <Field label="集数标题"><Input value={episodeForm.title} onChange={(event) => setEpisodeForm((form) => ({ ...form, title: event.target.value }))} placeholder="如：小熊去河边" /></Field>
            </div>
            <MediaFileField
              label={editingEpisodeId ? "视频文件（不选择则保留原视频）" : "视频文件"}
              accept="video/mp4,video/webm,video/ogg,video/quicktime,.mp4,.webm,.ogv,.mov"
              icon={<Video className="h-5 w-5" />}
              file={episodeVideoFile}
              hint="建议使用 MP4（H.264），最大 1GB"
              onChange={async (file) => {
                if (file && file.size > 1024 * 1024 * 1024) {
                  setFormError("视频不能超过 1GB");
                  return;
                }
                setFormError("");
                setEpisodeVideoFile(file);
                if (file) {
                  const duration = await readVideoDuration(file);
                  if (duration) setEpisodeForm((form) => ({ ...form, durationSeconds: String(duration) }));
                }
              }}
            />
            <div className="grid grid-cols-2 gap-4">
              <Field label="时长（秒，可选）"><Input type="number" min="1" value={episodeForm.durationSeconds} onChange={(event) => setEpisodeForm((form) => ({ ...form, durationSeconds: event.target.value }))} /></Field>
              <CheckField checked={episodeForm.enabled} onChange={(enabled) => setEpisodeForm((form) => ({ ...form, enabled }))} label="在孩子端展示" />
            </div>
            <UploadStatus progress={uploadProgress} />
            {formError && <p className="text-sm text-red-500">{formError}</p>}
            <Button className="w-full" onClick={submitEpisode} disabled={episodeSaving}>{episodeSaving ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />{uploadProgress !== null ? `正在上传 ${uploadProgress}%` : "正在保存"}</> : "保存集数"}</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <div className="space-y-1.5"><Label>{label}</Label>{children}</div>;
}

function MediaFileField({
  label,
  accept,
  icon,
  file,
  hint,
  onChange,
}: {
  label: string;
  accept: string;
  icon: ReactNode;
  file: File | null;
  hint: string;
  onChange: (file: File | null) => void | Promise<void>;
}) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <label className="flex min-h-20 cursor-pointer items-center gap-3 rounded-xl border border-dashed border-indigo-200 bg-indigo-50/40 px-4 py-3 text-indigo-600 transition-colors hover:bg-indigo-50">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-white shadow-sm">{icon}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-1 text-sm font-medium"><Upload className="h-3.5 w-3.5" />{file ? "已选择文件" : "点击选择本地文件"}</span>
          <span className="mt-1 block truncate text-xs text-gray-500">{file ? `${file.name} · ${formatBytes(file.size)}` : hint}</span>
        </span>
        <input
          type="file"
          accept={accept}
          className="sr-only"
          onChange={(event) => onChange(event.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

function UploadStatus({ progress }: { progress: number | null }) {
  if (progress === null) return null;
  return (
    <div className="space-y-1.5" role="status" aria-live="polite">
      <div className="flex justify-between text-xs text-gray-500"><span>正在上传到服务器，请勿关闭窗口</span><span>{progress}%</span></div>
      <div className="h-2 overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-indigo-500 transition-[width]" style={{ width: `${progress}%` }} />
      </div>
    </div>
  );
}

function CheckField({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return (
    <label className="mt-6 flex h-10 cursor-pointer items-center gap-2 rounded-lg border border-gray-200 px-3 text-sm text-gray-600">
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="h-4 w-4 accent-indigo-600" />
      {label}
    </label>
  );
}
