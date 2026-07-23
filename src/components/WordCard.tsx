// Simple div-based list item — no Card/hover effects that break mobile touch
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { trpc } from "@/providers/trpc";
import { speakWord } from "@/utils/speech";
import TagDetailDialog from "./TagDetailDialog";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Volume2,
  Edit3,
  Trash2,
  Tag,
  Folder,
  ChevronDown,
  GraduationCap,
  Pause,
  CheckCircle2,
  Loader2,
} from "lucide-react";
import { useState } from "react";

interface TagInfo {
  id: number;
  name: string;
}

export interface WordCardData {
  id: number;
  word: string;
  phonetic?: string | null;
  definition: string;
  example?: string | null;
  notes?: string | null;
  proficiency: "new" | "learning" | "familiar" | "mastered";
  tags: TagInfo[];
  groupId?: number | null;
  groupName?: string | null;
  textbookId?: number | null;
  textbookName?: string | null;
  createdAt: Date;
  updatedAt: Date;
  learningStatus?: "idle" | "active" | "paused";
}

interface WordCardProps {
  word: WordCardData;
  onEdit: (word: WordCardData) => void;
  onDelete: (id: number) => void;
}

export default function WordCard({ word, onEdit, onDelete }: WordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState(word.learningStatus || "idle");
  const [tagDialogId, setTagDialogId] = useState<number | null>(null);
  const [editTagOpen, setEditTagOpen] = useState(false);
  const [editTagForm, setEditTagForm] = useState({ id: 0, name: "", description: "" });

  const utils = trpc.useUtils();

  const updateTag = trpc.tag.update.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.tag.listWithCount.invalidate();
      utils.word.list.invalidate();
    },
  });

  const addToLearning = trpc.spelling.addToLearning.useMutation({
    onSuccess: () => {
      setLocalStatus("active");
      utils.spelling.getStats.invalidate();
      utils.spelling.getLearningQueue.invalidate();
      utils.word.list.invalidate();
    },
  });

  const removeFromLearning = trpc.spelling.removeFromLearning.useMutation({
    onSuccess: () => {
      setLocalStatus("idle");
      utils.spelling.getStats.invalidate();
      utils.spelling.getLearningQueue.invalidate();
      utils.word.list.invalidate();
    },
  });

  const pauseLearning = trpc.spelling.pauseLearning.useMutation({
    onSuccess: () => {
      setLocalStatus("paused");
      utils.spelling.getStats.invalidate();
      utils.word.list.invalidate();
    },
  });

  const handleSpeak = () => speakWord(word.word, word.id);

  const isActive = localStatus === "active";
  const isPaused = localStatus === "paused";
  const isIdle = localStatus === "idle";

  const hasDetails = word.example || word.notes;

  return (
    <>
      {/* Clickable card — tap anywhere to expand/collapse details */}
      <div
        className={`bg-white rounded-xl border transition-colors ${
          hasDetails ? "cursor-pointer hover:border-gray-200" : ""
        } ${expanded ? "border-gray-200" : "border-gray-100"}`}
        onClick={() => hasDetails && setExpanded(!expanded)}
      >
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Word and phonetic */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900">{word.word}</h3>
                {word.phonetic && (
                  <span className="text-sm text-gray-400 font-mono">{word.phonetic}</span>
                )}
                <button
                  onClick={(e) => { e.stopPropagation(); speakWord(word.word, word.id); }}
                  className="p-2 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors active:scale-90"
                  title="播放发音"
                >
                  <Volume2 className="w-5 h-5" />
                </button>

                {/* Learning status badge */}
                {isActive && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />学习中
                  </Badge>
                )}
                {isPaused && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50">
                    <Pause className="w-2.5 h-2.5 mr-0.5" />暂停
                  </Badge>
                )}
              </div>

              {/* Definition */}
              <p className="text-sm text-gray-700 mt-1.5 leading-relaxed whitespace-pre-line">{word.definition}</p>

              {/* Group and Tags */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {word.textbookName && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 border-gray-200 cursor-default">
                    <Folder className="w-3 h-3 mr-1" />
                    {word.textbookName}
                    {word.groupName ? ` > ${word.groupName}` : ""}
                  </Badge>
                )}
                {word.tags.map((tag) => (
                  <button
                    key={tag.id}
                    onClick={(e) => { e.stopPropagation(); setTagDialogId(tag.id); }}
                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-600 border border-indigo-200 hover:bg-indigo-100 hover:border-indigo-300 hover:text-indigo-700 transition-colors cursor-pointer"
                  >
                    <Tag className="w-3 h-3" />
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions — always visible */}
            <div className="flex flex-col items-end gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
              {isIdle ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => addToLearning.mutate({ wordId: word.id })}
                  disabled={addToLearning.isPending}
                >
                  <GraduationCap className="w-3.5 h-3.5 mr-1" />
                  {addToLearning.isPending ? "..." : "加入学习"}
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs border-emerald-200 bg-emerald-50 text-emerald-600 hover:bg-white hover:text-emerald-700"
                  onClick={() => removeFromLearning.mutate({ wordId: word.id })}
                  disabled={removeFromLearning.isPending}
                >
                  <CheckCircle2 className="w-3.5 h-3.5 mr-1" />
                  {removeFromLearning.isPending ? "..." : "已加入"}
                </Button>
              )}

              {/* Edit/Delete */}
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-indigo-600" onClick={() => onEdit(word)}>
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => onDelete(word.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Expand indicator */}
          {hasDetails && (
            <div className="flex items-center justify-center mt-2 pt-1 border-t border-dashed border-gray-100">
              <span className={`text-xs transition-all ${expanded ? "text-gray-400" : "text-gray-300"}`}>
                {expanded ? "收起详情" : "点击查看详情"}
              </span>
              <ChevronDown className={`w-3.5 h-3.5 ml-1 transition-transform ${expanded ? "text-gray-400 rotate-180" : "text-gray-300"}`} />
            </div>
          )}
        </div>

        {/* Expanded content */}
        {expanded && hasDetails && (
          <div className="px-4 pb-4 pt-0 space-y-2 border-t border-gray-50">
            {word.example && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">例句</p>
                <HighlightedExample example={word.example} word={word.word} />
              </div>
            )}
            {word.notes && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">备注</p>
                <p className="text-sm text-gray-600 bg-amber-50 rounded-lg p-2.5 whitespace-pre-line">{word.notes}</p>
              </div>
            )}
            </div>
          )}
      </div>

      {/* Tag Detail Dialog */}
      <TagDetailDialog
        tagId={tagDialogId}
        open={!!tagDialogId}
        onClose={() => setTagDialogId(null)}
        onEdit={(tag) => {
          setEditTagForm({ id: tag.id, name: tag.name, description: tag.description || "" });
          setEditTagOpen(true);
        }}
      />

      {/* Tag Edit Dialog */}
      <Dialog open={editTagOpen} onOpenChange={setEditTagOpen}>
        <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Edit3 className="w-4 h-4 text-emerald-500" />
              编辑标签
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm">标签名称</Label>
              <Input
                value={editTagForm.name}
                onChange={(e) => setEditTagForm((p) => ({ ...p, name: e.target.value.slice(0, 50) }))}
                placeholder="标签名称"
                className="h-10 mt-1"
                autoFocus
              />
            </div>
            <div>
              <Label className="text-sm">备注（可选）</Label>
              <Textarea
                value={editTagForm.description}
                onChange={(e) => setEditTagForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="备注"
                className="min-h-[60px] resize-y mt-1"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setEditTagOpen(false)}>
                取消
              </Button>
              <Button
                className="flex-1 h-10 bg-gradient-to-r from-emerald-500 to-teal-600"
                disabled={!editTagForm.name.trim() || updateTag.isPending}
                onClick={() => {
                  updateTag.mutate(
                    {
                      id: editTagForm.id,
                      name: editTagForm.name,
                      description: editTagForm.description || undefined,
                    },
                    {
                      onSuccess: () => setEditTagOpen(false),
                    }
                  );
                }}
              >
                {updateTag.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "保存"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}

/**
 * Highlight the target word in the example sentence.
 * Simple string-based matching — no regex while loop.
 */
function HighlightedExample({ example, word }: { example: string; word: string }) {
  if (!word || !example) return <p className="text-base text-gray-600 bg-gray-50 rounded-lg p-2.5 whitespace-pre-line">{example}</p>;

  const lw = word.toLowerCase();
  const le = example.toLowerCase();
  const tokens: { text: string; hl: boolean }[] = [];
  let i = 0;

  while (i < example.length) {
    const idx = le.indexOf(lw, i);
    if (idx === -1) {
      tokens.push({ text: example.slice(i), hl: false });
      break;
    }
    if (idx > i) {
      tokens.push({ text: example.slice(i, idx), hl: false });
    }

    const after = idx + word.length;
    const chAfter = after < example.length ? example[after] : " ";
    const chBefore = idx > 0 ? example[idx - 1] : " ";
    const isBoundary = (c: string) => /\s|[.,;:!?"'()\-\[\]{}]/.test(c);

    if (isBoundary(chBefore) && isBoundary(chAfter)) {
      tokens.push({ text: example.slice(idx, after), hl: true });
      i = after;
    } else if (isBoundary(chBefore) && after < example.length && /\w/.test(chAfter)) {
      let end = after;
      while (end < example.length && /\w/.test(example[end])) end++;
      tokens.push({ text: example.slice(idx, after), hl: true });
      tokens.push({ text: example.slice(after, end), hl: false });
      i = end;
    } else {
      tokens.push({ text: example.slice(idx, after), hl: false });
      i = after;
    }
  }

  return (
    <p className="text-base text-gray-600 bg-gray-50 rounded-lg p-2.5 whitespace-pre-line">
      {tokens.map((t, idx) =>
        t.hl ? (
          <span key={idx} className="font-semibold text-emerald-600">{t.text}</span>
        ) : (
          <span key={idx}>{t.text}</span>
        )
      )}
    </p>
  );
}
