import { useState } from "react";
import { trpc } from "@/providers/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import WordForm, { type WordFormData } from "./WordForm";
import { speakWord } from "@/utils/speech";
import { Hash, BookOpen, Folder, GraduationCap, Edit3, Loader2, Volume2 } from "lucide-react";

interface TagDetailDialogProps {
  tagId: number | null;
  open: boolean;
  onClose: () => void;
  onEdit?: (tag: { id: number; name: string; description: string | null }) => void;
  canEditWords?: boolean;
}

export default function TagDetailDialog({
  tagId,
  open,
  onClose,
  onEdit,
  canEditWords = false,
}: TagDetailDialogProps) {
  const utils = trpc.useUtils();
  const { data, isLoading } = trpc.tag.getById.useQuery(
    { id: tagId! },
    { enabled: !!tagId && open }
  );

  const [editingWord, setEditingWord] = useState<any>(null);
  const [wordFormOpen, setWordFormOpen] = useState(false);

  const updateWord = trpc.word.update.useMutation({
    onSuccess: () => {
      utils.tag.getById.invalidate({ id: tagId! });
      utils.word.list.invalidate();
      setWordFormOpen(false);
      setEditingWord(null);
    },
  });

  const handleEditWord = (formData: WordFormData) => {
    if (editingWord) {
      updateWord.mutate({ id: editingWord.id, ...formData });
    }
  };

  const editWordCard = editingWord
    ? {
        id: editingWord.id,
        word: editingWord.word,
        phonetic: editingWord.phonetic,
        definition: editingWord.definition,
        example: editingWord.example,
        notes: editingWord.notes,
        proficiency: editingWord.proficiency,
        groupId: editingWord.groupId,
        groupName: editingWord.groupName,
        textbookId: editingWord.textbookId,
        textbookName: editingWord.textbookName,
        groupIds: editingWord.groupIds,
        groups: editingWord.groups,
        tags: editingWord.tags,
        createdAt: new Date(),
        updatedAt: new Date(),
        learningStatus: "idle" as const,
      }
    : null;

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="sm:max-w-md max-h-[80vh] p-0 overflow-hidden" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader className="p-5 pb-3 border-b border-gray-100 relative">
          {isLoading ? (
            <div className="flex items-center gap-2 py-2">
              <Loader2 className="w-4 h-4 animate-spin text-indigo-500" />
              <span className="text-sm text-gray-500">加载中...</span>
            </div>
          ) : data ? (
            <>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                  <Hash className="w-4.5 h-4.5 text-indigo-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <DialogTitle className="text-base font-semibold text-gray-900">
                      {data.tag.name}
                    </DialogTitle>
                    {onEdit && (
                      <button
                        onClick={() => onEdit(data.tag)}
                        className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-indigo-500 transition-colors"
                        title="编辑标签"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                  <DialogDescription className="text-xs text-gray-400 mt-0.5">
                    {data.words.length} 个单词
                    {data.tag.description ? ` · ${data.tag.description}` : ""}
                  </DialogDescription>
                </div>
              </div>
            </>
          ) : (
            <DialogTitle className="text-base text-gray-500">标签不存在</DialogTitle>
          )}
        </DialogHeader>

        {data && data.words.length > 0 && (
          <ScrollArea className="max-h-[50vh]">
            <div className="p-3 space-y-1.5">
              {data.words.map((word) => (
                <div
                  key={word.id}
                  className="flex items-start gap-3 p-3 rounded-xl bg-gray-50/70 hover:bg-gray-50 transition-colors"
                >
                  {/* Left: word + phonetic */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-semibold text-gray-900">
                        {word.word}
                      </span>
                      {word.phonetic && (
                        <span className="text-xs text-gray-400 font-mono">
                          {word.phonetic}
                        </span>
                      )}
                      <button
                        onClick={() => speakWord(word.word, word.id)}
                        className="p-1.5 rounded-lg hover:bg-indigo-50 text-gray-400 hover:text-indigo-600 transition-colors active:scale-90"
                        title="播放发音"
                      >
                        <Volume2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-1 leading-relaxed line-clamp-2">
                      {word.definition}
                    </p>

                    {/* Meta info */}
                    <div className="flex flex-wrap items-center gap-1.5 mt-2">
                      {word.textbookName && (
                        <Badge
                          variant="outline"
                          className="text-[10px] px-1.5 py-0 bg-white text-gray-400 border-gray-200"
                        >
                          <Folder className="w-2.5 h-2.5 mr-0.5" />
                          {word.textbookName}
                          {word.groupName ? ` > ${word.groupName}` : ""}
                        </Badge>
                      )}
                      {word.learningStatus === "active" && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                          <GraduationCap className="w-2.5 h-2.5 mr-0.5" />
                          学习中
                        </Badge>
                      )}
                      {word.learningStatus === "paused" && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50">
                          暂停
                        </Badge>
                      )}
                    </div>
                  </div>

                  {/* Right: edit + other tags */}
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    {canEditWords && (
                      <button
                        onClick={() => {
                          setEditingWord(word);
                          setWordFormOpen(true);
                        }}
                        className="inline-flex items-center gap-1 rounded-lg border border-indigo-100 bg-white px-2 py-1 text-[11px] font-medium text-indigo-600 transition-colors hover:border-indigo-200 hover:bg-indigo-50"
                        title="编辑单词"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        编辑
                      </button>
                    )}
                    {word.tags.length > 1 && (
                      <div className="flex flex-wrap gap-1 max-w-[120px] justify-end">
                        {word.tags
                          .filter((t) => t.id !== tagId)
                          .slice(0, 3)
                          .map((t) => (
                            <span
                              key={t.id}
                              className="text-[10px] px-1.5 py-0.5 bg-indigo-50 text-indigo-500 rounded-md"
                            >
                              {t.name}
                            </span>
                          ))}
                        {word.tags.filter((t) => t.id !== tagId).length > 3 && (
                          <span className="text-[10px] text-gray-400">
                            +{word.tags.filter((t) => t.id !== tagId).length - 3}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}

        {data && data.words.length === 0 && (
          <div className="flex flex-col items-center justify-center py-10 text-gray-400">
            <BookOpen className="w-10 h-10 mb-2 text-gray-300" />
            <p className="text-sm">该标签下暂无单词</p>
          </div>
        )}
      </DialogContent>

      {/* WordForm placed outside DialogContent to avoid nesting issues */}
      {wordFormOpen && editWordCard && (
        <WordForm
          open={wordFormOpen}
          onClose={() => { setWordFormOpen(false); setEditingWord(null); }}
          onSubmit={handleEditWord}
          editWord={editWordCard}
        />
      )}
    </Dialog>
  );
}
