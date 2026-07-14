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
import { X, Plus, Tag, Folder } from "lucide-react";
import { useState, useEffect } from "react";
import { trpc } from "@/providers/trpc";
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

const proficiencyOptions = [
  { value: "new" as const, label: "新词" },
  { value: "learning" as const, label: "学习中" },
  { value: "familiar" as const, label: "熟悉" },
  { value: "mastered" as const, label: "已掌握" },
];

export default function WordForm({ open, onClose, onSubmit, editWord }: WordFormProps) {
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

  useEffect(() => {
    if (editWord) {
      setForm({
        word: editWord.word,
        phonetic: editWord.phonetic || "",
        definition: editWord.definition,
        example: editWord.example || "",
        notes: editWord.notes || "",
        groupId: undefined, // Will be set if group exists
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
  }, [editWord, open]);

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
      if (data.created) {
        setForm((prev) => ({
          ...prev,
          tagIds: [...prev.tagIds, data.id],
        }));
      } else {
        // Tag already exists, add it
        if (!form.tagIds.includes(data.id)) {
          setForm((prev) => ({
            ...prev,
            tagIds: [...prev.tagIds, data.id],
          }));
        }
      }
      setNewTagName("");
    },
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTagMutation.mutate({ name: newTagName.trim() });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editWord ? "编辑单词" : "添加新单词"}</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Word */}
          <div className="space-y-1.5">
            <Label htmlFor="word" className="text-sm font-medium">
              单词 <span className="text-red-400">*</span>
            </Label>
            <Input
              id="word"
              value={form.word}
              onChange={(e) => setForm((p) => ({ ...p, word: e.target.value }))}
              placeholder="输入单词"
              className="h-10"
              required
            />
          </div>

          {/* Phonetic */}
          <div className="space-y-1.5">
            <Label htmlFor="phonetic" className="text-sm font-medium">
              音标
            </Label>
            <Input
              id="phonetic"
              value={form.phonetic}
              onChange={(e) => setForm((p) => ({ ...p, phonetic: e.target.value }))}
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
              onChange={(e) => setForm((p) => ({ ...p, definition: e.target.value }))}
              placeholder="输入单词释义"
              className="min-h-[60px] resize-none"
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
              onChange={(e) => setForm((p) => ({ ...p, example: e.target.value }))}
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
              onChange={(e) => setForm((p) => ({ ...p, notes: e.target.value }))}
              placeholder="添加你的学习备注、记忆技巧等"
              className="min-h-[60px] resize-none"
            />
          </div>

          {/* Proficiency */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium">熟练度</Label>
            <div className="flex gap-2">
              {proficiencyOptions.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, proficiency: opt.value }))}
                  className={`flex-1 py-2 text-xs rounded-lg border transition-all ${
                    form.proficiency === opt.value
                      ? "bg-indigo-50 border-indigo-300 text-indigo-700 font-medium shadow-sm"
                      : "bg-white border-gray-200 text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Group */}
          <div className="space-y-1.5">
            <Label className="text-sm font-medium flex items-center gap-1">
              <Folder className="w-3.5 h-3.5" /> 分组
            </Label>
            <Select
              value={form.groupId?.toString() || "none"}
              onValueChange={(v) =>
                setForm((p) => ({ ...p, groupId: v === "none" ? undefined : parseInt(v) }))
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
