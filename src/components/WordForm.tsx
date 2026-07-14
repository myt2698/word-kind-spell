import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/providers/trpc";
import {
  X,
  Plus,
  Tag,
  Folder,
  BookOpen,
  Loader2,
  Search,
  Volume2,
  Sparkles,
} from "lucide-react";
import { useState, useEffect } from "react";
import type { WordCardData } from "./WordCard";

interface WordFormProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (data: WordFormData) => void;
  editWord?: WordCardData | null;
}

export interface WordFormData {
  word: string;
  phonetic: string;
  definition: string;
  example: string;
  notes: string;
  groupId: number | undefined;
  tagIds: number[];
  proficiency: "new" | "learning" | "familiar" | "mastered";
}

export default function WordForm({ open, onClose, onSubmit, editWord }: WordFormProps) {
  const utils = trpc.useUtils();
  const { data: groups } = trpc.wordGroup.list.useQuery();
  const { data: allTags } = trpc.tag.list.useQuery();

  const [form, setForm] = useState<WordFormData>({
    word: "",
    phonetic: "",
    definition: "",
    example: "",
    notes: "",
    groupId: undefined,
    tagIds: [],
    proficiency: "new",
  });

  const [newTagName, setNewTagName] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [dictError, setDictError] = useState("");
  const [hasAutoFilled, setHasAutoFilled] = useState(false);

  const lookupMutation = trpc.dict.lookup.useMutation({
    onSuccess: (result) => {
      setIsLookingUp(false);
      if (result.found) {
        setForm((prev) => ({
          ...prev,
          phonetic: result.phonetic || prev.phonetic,
          definition: result.definition || prev.definition,
          example: result.example || prev.example,
        }));
        setHasAutoFilled(true);
        if (result.partial && !result.definition) {
          setDictError("未找到中文释义，音标和例句已填充，请手动补充释义");
        } else if (result.partial) {
          setDictError("部分数据未获取到，请检查并补充");
        } else {
          setDictError("");
        }
      } else {
        setDictError(`未找到 "${form.word.trim()}" 的释义，请手动填写`);
      }
    },
    onError: (err) => {
      setIsLookingUp(false);
      setDictError("查询失败: " + (err.message || "网络错误"));
    },
  });

  // Reset form when dialog opens
  useEffect(() => {
    if (open) {
      setDictError("");
      setHasAutoFilled(false);
      lookupMutation.reset();
      if (editWord) {
        setForm({
          word: editWord.word,
          phonetic: editWord.phonetic || "",
          definition: editWord.definition,
          example: editWord.example || "",
          notes: editWord.notes || "",
          groupId: undefined,
          tagIds: editWord.tags.map((t) => t.id),
          proficiency: editWord.proficiency,
        });
      } else {
        setForm({
          word: "",
          phonetic: "",
          definition: "",
          example: "",
          notes: "",
          groupId: undefined,
          tagIds: [],
          proficiency: "new",
        });
      }
    }
  }, [editWord, open]);

  const doLookup = (word: string) => {
    if (!word || word.length < 2) {
      setDictError("请输入至少2个字母的单词");
      return;
    }
    setIsLookingUp(true);
    setDictError("");
    lookupMutation.mutate({ word });
  };

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== "Enter") return;
    e.preventDefault();
    e.stopPropagation();
    const word = form.word.trim();
    if (word.length >= 2) {
      doLookup(word);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.word.trim() || !form.definition.trim()) return;
    onSubmit(form);
    onClose();
  };

  const toggleTag = (tagId: number) => {
    setForm((prev) => ({
      ...prev,
      tagIds: prev.tagIds.includes(tagId)
        ? prev.tagIds.filter((id) => id !== tagId)
        : [...prev.tagIds, tagId],
    }));
  };

  const createTagMutation = trpc.tag.create.useMutation({
    onSuccess: (data) => {
      utils.tag.list.invalidate();
      utils.tag.listWithCount.invalidate();
      if (data.created) {
        setForm((prev) => ({ ...prev, tagIds: [...prev.tagIds, data.id] }));
      } else if (!form.tagIds.includes(data.id)) {
        setForm((prev) => ({ ...prev, tagIds: [...prev.tagIds, data.id] }));
      }
      setNewTagName("");
    },
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTagMutation.mutate({ name: newTagName.trim() });
  };

  const handleSpeak = () => {
    if (form.word && "speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(form.word);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const updateForm = (updates: Partial<WordFormData>) => {
    setForm((prev) => {
      const next = { ...prev, ...updates };
      if (updates.word !== undefined && updates.word !== prev.word) {
        setHasAutoFilled(false);
        setDictError("");
      }
      return next;
    });
  };

  const isPending = isLookingUp || lookupMutation.isPending;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            {editWord ? "编辑单词" : "添加新单词"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Word + Lookup */}
          <div className="space-y-1.5">
            <Label htmlFor="word" className="text-sm font-medium">
              单词 <span className="text-red-400">*</span>
            </Label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Input
                  id="word"
                  value={form.word}
                  onChange={(e) => updateForm({ word: e.target.value })}
                  onKeyDown={handleSearchKeyDown}
                  placeholder="输入英文单词"
                  className="h-11 pr-10"
                  required
                  autoFocus
                />
                {form.word && (
                  <button
                    type="button"
                    onClick={handleSpeak}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-indigo-500 transition-colors"
                    title="朗读"
                  >
                    <Volume2 className="w-4 h-4" />
                  </button>
                )}
              </div>
              {!editWord && (
                <Button
                  type="button"
                  variant="outline"
                  className="h-11 px-3 shrink-0"
                  onClick={() => doLookup(form.word.trim())}
                  disabled={isPending || form.word.trim().length < 2}
                  title="从字典查询释义"
                >
                  {isPending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Search className="w-4 h-4" />
                  )}
                </Button>
              )}
            </div>
            {isPending && (
              <p className="text-xs text-indigo-500 flex items-center gap-1">
                <Loader2 className="w-3 h-3 animate-spin" />
                正在查询字典...
              </p>
            )}
            {dictError && (
              <p className="text-xs text-amber-600">{dictError}</p>
            )}
            {!editWord && !hasAutoFilled && !dictError && !isPending && (
              <p className="text-xs text-gray-400">
                输入单词后，点击搜索按钮或按 Enter 键查询字典
              </p>
            )}
            {hasAutoFilled && !dictError && (
              <p className="text-xs text-green-600 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                已从字典自动填充释义
              </p>
            )}
          </div>

          {/* Phonetic */}
          <div className="space-y-1.5">
            <Label htmlFor="phonetic" className="text-sm font-medium">
              音标
            </Label>
            <Input
              id="phonetic"
              value={form.phonetic}
              onChange={(e) => updateForm({ phonetic: e.target.value })}
              placeholder="/fəˈnetɪk/"
              className="h-10 font-mono text-sm"
            />
          </div>

          {/* Definition */}
          <div className="space-y-1.5">
            <Label htmlFor="definition" className="text-sm font-medium">
              释义 <span className="text-red-400">*</span>
            </Label>
            <Textarea
              id="definition"
              value={form.definition}
              onChange={(e) => updateForm({ definition: e.target.value })}
              placeholder="输入单词释义"
              className="min-h-[80px] resize-none"
              required
            />
          </div>

          {/* Example */}
          <div className="space-y-1.5">
            <Label htmlFor="example" className="text-sm font-medium">
              例句
            </Label>
            <Textarea
              id="example"
              value={form.example}
              onChange={(e) => updateForm({ example: e.target.value })}
              placeholder="输入例句（可选）"
              className="min-h-[60px] resize-none"
            />
          </div>

          {/* Notes */}
          <div className="space-y-1.5">
            <Label htmlFor="notes" className="text-sm font-medium">
              备注
            </Label>
            <Textarea
              id="notes"
              value={form.notes}
              onChange={(e) => updateForm({ notes: e.target.value })}
              placeholder="添加你的学习备注、记忆技巧等"
              className="min-h-[60px] resize-none"
            />
          </div>

          {/* Group */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1">
              <Folder className="w-3.5 h-3.5" /> 分组
            </Label>
            <Select
              value={form.groupId?.toString() || "none"}
              onValueChange={(v) =>
                updateForm({ groupId: v === "none" ? undefined : parseInt(v) })
              }
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="选择分组（可选）" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">不分组</SelectItem>
                {groups?.map((g) => (
                  <SelectItem key={g.id} value={g.id.toString()}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-2.5 h-2.5 rounded-full"
                        style={{ backgroundColor: g.color || "#3b82f6" }}
                      />
                      {g.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Tags */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1">
              <Tag className="w-3.5 h-3.5" /> 标签
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {allTags?.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all ${
                    form.tagIds.includes(tag.id)
                      ? "ring-2 ring-offset-1 ring-indigo-200 font-medium"
                      : "opacity-60 hover:opacity-100"
                  }`}
                  style={
                    form.tagIds.includes(tag.id)
                      ? {
                          backgroundColor: (tag.color || "#10b981") + "20",
                          borderColor: (tag.color || "#10b981") + "60",
                          color: tag.color || "#10b981",
                        }
                      : {
                          backgroundColor: "#f3f4f6",
                          borderColor: "#e5e7eb",
                          color: "#6b7280",
                        }
                  }
                >
                  {tag.name}
                  {form.tagIds.includes(tag.id) && <X className="w-3 h-3" />}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mt-2">
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="新建标签"
                className="h-8 text-sm"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleCreateTag())}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-8 px-2"
                onClick={handleCreateTag}
                disabled={!newTagName.trim() || createTagMutation.isPending}
              >
                <Plus className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1 h-10" onClick={onClose}>
              取消
            </Button>
            <Button
              type="submit"
              className="flex-1 h-10 bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700"
              disabled={!form.word.trim() || !form.definition.trim()}
            >
              {editWord ? "保存修改" : "添加单词"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
