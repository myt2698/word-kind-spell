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
import { speakWord } from "@/utils/speech";
import {
  X,
  Plus,
  Tag,
  BookOpen,
  Loader2,
  Search,
  Volume2,
  Sparkles,
  AlertTriangle,
  Edit3,
} from "lucide-react";
import { useState, useEffect, useRef } from "react";
import type { WordCardData } from "./WordCard";

const LAST_TEXTBOOK_KEY = "wordmind:lastTextbookId:v2";
const LAST_UNIT_KEY = "wordmind:lastUnitId:v2";

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
  const { data: textbooks } = trpc.textbook.listWithDefault.useQuery();
  const { data: allTags } = trpc.tag.list.useQuery();
  const { data: userSettings } = trpc.wordGroup.getSettings.useQuery();

  const [selectedTextbookId, setSelectedTextbookId] = useState<number | null>(null);
  const [isEditingMode, setIsEditingMode] = useState(false);
  const [editingWordId, setEditingWordId] = useState<number | null>(null);
  const { data: units } = trpc.wordGroup.list.useQuery(
    selectedTextbookId ? { textbookId: selectedTextbookId } : undefined,
    { enabled: !!selectedTextbookId }
  );

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

  const prevOpenRef = useRef(false);
  const [newTagDialogOpen, setNewTagDialogOpen] = useState(false);
  const [newTagName, setNewTagName] = useState("");
  const [newTagDesc, setNewTagDesc] = useState("");
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [dictError, setDictError] = useState("");
  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [existingWord, setExistingWord] = useState<{
    id: number;
    word: string;
    phonetic: string | null;
    definition: string;
    example: string | null;
    notes: string | null;
    proficiency: string;
    tags: { id: number; name: string }[];
    groupId: number | null;
    groupName: string | null;
    createdAt: Date;
    updatedAt: Date;
  } | null>(null);

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

  // Track dialog open/close to reset edit mode
  useEffect(() => {
    if (!open) {
      setIsEditingMode(false);
      setEditingWordId(null);
    }
  }, [open]);

  // Reset form only when dialog opens (open transitions from false to true)
  useEffect(() => {
    if (open && !prevOpenRef.current) {
      setIsEditingMode(!!editWord);
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
          groupId: editWord.groupId ?? undefined,
          tagIds: editWord.tags.map((t) => t.id),
          proficiency: editWord.proficiency,
        });
        // Use textbookId from editWord if available
        if ((editWord as any)?.textbookId) {
          setSelectedTextbookId((editWord as any).textbookId);
        }
      } else {
        // Load last selected textbook & unit from localStorage
        const lastTextbookId = localStorage.getItem(LAST_TEXTBOOK_KEY);
        const lastUnitId = localStorage.getItem(LAST_UNIT_KEY);
        const savedTextbookId = lastTextbookId ? Number(lastTextbookId) : null;
        const savedUnitId = lastUnitId ? Number(lastUnitId) : null;

        if (savedTextbookId) {
          // Restore last selection
          setSelectedTextbookId(savedTextbookId);
          setForm({
            word: "",
            phonetic: "",
            definition: "",
            example: "",
            notes: "",
            groupId: savedUnitId ?? undefined,
            tagIds: [],
            proficiency: "new",
          });
        } else {
          // No previous selection: default "扩展词汇" (null = no textbook)
          setSelectedTextbookId(null);
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
    }
    // Track previous open state
    prevOpenRef.current = open;
  }, [editWord, open, userSettings, textbooks]);

  const doLookup = async (word: string) => {
    if (!word || word.length < 2) {
      setDictError("请输入至少2个字母的单词");
      return;
    }
    setIsLookingUp(true);
    setDictError("");
    setExistingWord(null);

    try {
      // 先检查单词是否已存在
      const checkResult = await utils.word.checkExists.fetch({ word });
      if (checkResult.exists) {
        // 已存在：记录已有数据用于提示，但仍继续查询字典获取最新数据
        setExistingWord(checkResult.word);
      }
    } catch {
      // 检查失败，继续查询字典
    }

    // 始终查询字典（无论是否已存在，都获取最新音标和释义）
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
    // Save last selection to localStorage (skip default "扩展词汇" textbook)
    const defaultTbId = textbooks?.find((tb: any) => tb.isDefault)?.id;
    const isDefaultTextbook = selectedTextbookId === defaultTbId;
    if (selectedTextbookId && !isDefaultTextbook) {
      localStorage.setItem(LAST_TEXTBOOK_KEY, String(selectedTextbookId));
      if (form.groupId) {
        localStorage.setItem(LAST_UNIT_KEY, String(form.groupId));
      } else {
        localStorage.removeItem(LAST_UNIT_KEY);
      }
    } else {
      // Default textbook or none: clear saved selection
      localStorage.removeItem(LAST_TEXTBOOK_KEY);
      localStorage.removeItem(LAST_UNIT_KEY);
    }
    if (editingWordId) {
      // Edit mode: include id
      onSubmit({ ...form, id: editingWordId } as any);
    } else {
      onSubmit(form);
    }
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
      if (data.created || !form.tagIds.includes(data.id)) {
        setForm((prev) => ({ ...prev, tagIds: [...prev.tagIds, data.id] }));
      }
      setNewTagName("");
      setNewTagDesc("");
      setNewTagDialogOpen(false);
    },
  });

  const handleCreateTag = () => {
    if (!newTagName.trim()) return;
    createTagMutation.mutate({ name: newTagName.trim(), description: newTagDesc || undefined });
  };

  const handleSpeak = () => {
    if (form.word) speakWord(form.word);
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
      <DialogContent key={isEditingMode ? "edit" : "new"} className="max-w-lg max-h-[90vh] overflow-y-auto" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-500" />
            {editWord || isEditingMode ? "编辑单词" : "添加新单词"}
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

            {/* Existing word warning */}
            {existingWord && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-2">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <p className="text-sm font-medium text-amber-700">
                    该单词已添加过
                  </p>
                </div>
                <div className="pl-6 space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-semibold text-gray-900">{existingWord.word}</span>
                    {existingWord.phonetic && (
                      <span className="text-xs text-gray-400 font-mono">{existingWord.phonetic}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 whitespace-pre-line">{existingWord.definition}</p>
                  {existingWord.example && (
                    <p className="text-xs text-gray-500 italic">{existingWord.example}</p>
                  )}
                  {existingWord.notes && (
                    <p className="text-xs text-gray-500 bg-white rounded p-1.5 mt-1">{existingWord.notes}</p>
                  )}
                  <div className="flex items-center gap-2 flex-wrap mt-1">
                    {existingWord.groupName && (
                      <span className="text-[10px] bg-gray-200 text-gray-600 px-1.5 py-0.5 rounded">{existingWord.groupName}</span>
                    )}
                    {existingWord.tags.map((t) => (
                      <span key={t.id} className="text-[10px] bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded">{t.name}</span>
                    ))}
                  </div>
                </div>
                <div className="flex gap-2 pl-6 pt-1">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => {
                      // Switch to edit mode in-place
                      const ew = existingWord;
                      setExistingWord(null);
                      setIsEditingMode(true);
                      setEditingWordId(ew.id);
                      setForm({
                        word: ew.word,
                        phonetic: ew.phonetic || "",
                        definition: ew.definition,
                        example: ew.example || "",
                        notes: ew.notes || "",
                        groupId: ew.groupId ?? undefined,
                        tagIds: ew.tags.map((t: any) => t.id),
                        proficiency: ew.proficiency,
                      });
                      // Set textbook for this unit
                      if (ew.textbookId) {
                        setSelectedTextbookId(ew.textbookId);
                      } else {
                        const allUnits = textbooks?.flatMap((tb: any) => tb.groups || []);
                        const unit = allUnits?.find((u: any) => u.id === ew.groupId);
                        if (unit?.textbookId) setSelectedTextbookId(unit.textbookId);
                      }
                    }}
                  >
                    <Edit3 className="w-3 h-3 mr-1" />
                    编辑此单词
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs text-gray-500"
                    onClick={() => {
                      setExistingWord(null);
                      lookupMutation.mutate({ word: form.word.trim() });
                    }}
                  >
                    仍要重新查询
                  </Button>
                </div>
              </div>
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
              className="min-h-[120px] resize-y"
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
              className="min-h-[120px] resize-y"
            />
          </div>

          {/* Textbook + Unit (cascade) */}
          <div className="space-y-2">
            <Label className="text-sm font-medium flex items-center gap-1">
              <BookOpen className="w-3.5 h-3.5" /> 课本 & 单元
            </Label>
            {/* Textbook selector */}
            <Select
              value={selectedTextbookId == null ? "default" : String(selectedTextbookId)}
              onValueChange={(v) => {
                const tbId = v === "default" ? null : parseInt(v);
                setSelectedTextbookId(tbId);
                updateForm({ groupId: null });
              }}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="扩展词汇" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="default">扩展词汇</SelectItem>
                {textbooks?.map((tb) => (
                  <SelectItem key={tb.id} value={tb.id.toString()}>
                    {tb.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Unit selector - only show when a non-default textbook is selected */}
            {selectedTextbookId != null && !textbooks?.find((tb: any) => tb.id === selectedTextbookId)?.isDefault && (
              <Select
                value={form.groupId == null ? "default" : String(form.groupId)}
                onValueChange={(v) =>
                  updateForm({ groupId: v === "default" ? null : parseInt(v) })
                }
              >
                <SelectTrigger className="h-10">
                  <SelectValue placeholder="不选单元" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="default">不选单元</SelectItem>
                  {units?.map((u) => (
                    <SelectItem key={u.id} value={u.id.toString()}>
                      {u.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
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
                      ? "bg-indigo-50 text-indigo-600 border-indigo-300 ring-2 ring-offset-1 ring-indigo-200 font-medium"
                      : "bg-gray-50 text-gray-500 border-gray-200 opacity-70 hover:opacity-100"
                  }`}
                >
                  {tag.name}
                  {form.tagIds.includes(tag.id) && <X className="w-3 h-3" />}
                </button>
              ))}
            </div>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-indigo-500 hover:text-indigo-600 hover:bg-indigo-50 mt-1"
              onClick={() => { setNewTagName(""); setNewTagDesc(""); setNewTagDialogOpen(true); }}
            >
              <Plus className="w-3.5 h-3.5 mr-1" />
              新建标签
            </Button>
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
              {editWord || isEditingMode ? "保存修改" : "添加单词"}
            </Button>
          </div>
        </form>
      </DialogContent>

      {/* New Tag Dialog */}
      <Dialog open={newTagDialogOpen} onOpenChange={setNewTagDialogOpen}>
        <DialogContent className="sm:max-w-sm" onInteractOutside={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-emerald-500" />
              新建标签
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label className="text-sm">标签名称</Label>
              <Input
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value.slice(0, 50))}
                placeholder="输入标签名称"
                className="h-10 mt-1"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    handleCreateTag();
                  }
                }}
              />
            </div>
            <div>
              <Label className="text-sm">备注（可选）</Label>
              <Textarea
                value={newTagDesc}
                onChange={(e) => setNewTagDesc(e.target.value)}
                placeholder="备注"
                className="min-h-[60px] resize-y mt-1"
              />
            </div>
            <div className="flex gap-2 pt-1">
              <Button variant="outline" className="flex-1 h-10" onClick={() => setNewTagDialogOpen(false)}>
                取消
              </Button>
              <Button
                className="flex-1 h-10 bg-gradient-to-r from-emerald-500 to-teal-600"
                disabled={!newTagName.trim() || createTagMutation.isPending}
                onClick={handleCreateTag}
              >
                {createTagMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "创建"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
