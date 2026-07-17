import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import FilterBar, { type SortBy } from "@/components/FilterBar";
import WordCard from "@/components/WordCard";
import type { WordCardData } from "@/components/WordCard";
import WordForm, { type WordFormData } from "@/components/WordForm";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, BookOpen, FolderOpen, Tag, X } from "lucide-react";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [selectedTextbookId, setSelectedTextbookId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

  // Dialog state
  const [showWordForm, setShowWordForm] = useState(false);
  const [editWord, setEditWord] = useState<WordCardData | null>(null);

  // Fetch data
  const { data: words, isLoading: wordsLoading } = trpc.word.list.useQuery({
    groupIds: selectedUnitId ? [selectedUnitId] : undefined,
    tagId: selectedTagId ?? undefined,
    textbookId: selectedTextbookId ?? undefined,
    search: searchQuery || undefined,
    sortBy,
  });

  const { data: textbooks } = trpc.textbook.list.useQuery();
  const { data: units } = trpc.wordGroup.list.useQuery(
    selectedTextbookId ? { textbookId: selectedTextbookId } : undefined,
    { enabled: !!selectedTextbookId }
  );
  const { data: allTags } = trpc.tag.list.useQuery();

  // Mutations
  const createWord = trpc.word.create.useMutation({
    onSuccess: () => {
      utils.word.list.invalidate();
      utils.tag.listWithCount.invalidate();
    },
  });
  const updateWord = trpc.word.update.useMutation({
    onSuccess: () => {
      utils.word.list.invalidate();
      utils.tag.listWithCount.invalidate();
    },
  });
  const deleteWord = trpc.word.delete.useMutation({
    onSuccess: () => {
      utils.word.list.invalidate();
      utils.tag.listWithCount.invalidate();
    },
  });

  const handleAddWord = (data: WordFormData) => createWord.mutate(data);
  const handleEditWord = (data: WordFormData) => {
    if (editWord) { updateWord.mutate({ id: editWord.id, ...data }); setEditWord(null); }
  };
  const handleDeleteWord = (id: number) => { if (confirm("确定删除这个单词吗？")) deleteWord.mutate({ id }); };
  const openEditForm = (word: WordCardData) => { setEditWord(word); setShowWordForm(true); };

  // Clear all filters
  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTextbookId(null);
    setSelectedUnitId(null);
    setSelectedTagId(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const filteredWords = words || [];
  const hasFilters = searchQuery || selectedTextbookId || selectedUnitId || selectedTagId;

  // Build page title
  let pageTitle = "我的单词本";
  if (selectedUnitId) {
    const unit = units?.find((u) => u.id === selectedUnitId);
    pageTitle = unit?.name || "单元单词";
  } else if (selectedTextbookId) {
    const tb = textbooks?.find((t) => t.id === selectedTextbookId);
    pageTitle = tb?.name || "课本单词";
  } else if (selectedTagId) {
    const tag = allTags?.find((t) => t.id === selectedTagId);
    pageTitle = tag?.name ? `${tag.name} 标签` : "标签单词";
  } else if (searchQuery) {
    pageTitle = `"${searchQuery}" 的搜索结果`;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-4 py-4 pb-24">
        {/* ===== Top Filter Area ===== */}
        <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4 space-y-2.5">
          {/* Row 1: Search input */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="搜索单词、释义..."
              className="h-9 pl-9 pr-8 text-sm bg-gray-50 border-gray-200 rounded-lg"
            />
            {searchQuery && (
              <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2">
                <X className="w-3.5 h-3.5 text-gray-400" />
              </button>
            )}
          </div>

          {/* Row 2: Textbook selector */}
          <div className="flex items-center gap-2">
            <BookOpen className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <div className="flex gap-1.5 overflow-x-auto flex-1 no-scrollbar">
              <button
                onClick={() => { setSelectedTextbookId(null); setSelectedUnitId(null); }}
                className={`shrink-0 px-2.5 py-1 text-xs rounded-full transition-all ${
                  !selectedTextbookId ? "bg-purple-100 text-purple-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                全部课本
              </button>
              {textbooks?.map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => {
                    if (selectedTextbookId === tb.id) {
                      setSelectedTextbookId(null);
                      setSelectedUnitId(null);
                    } else {
                      setSelectedTextbookId(tb.id);
                      setSelectedUnitId(null);
                    }
                  }}
                  className={`shrink-0 px-2.5 py-1 text-xs rounded-full transition-all ${
                    selectedTextbookId === tb.id ? "bg-purple-100 text-purple-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {tb.name}
                </button>
              ))}
            </div>
          </div>

          {/* Row 3: Unit selector (only when textbook selected) */}
          {selectedTextbookId && units && units.length > 0 && (
            <div className="flex items-center gap-2">
              <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <div className="flex gap-1.5 overflow-x-auto flex-1 no-scrollbar">
                <button
                  onClick={() => setSelectedUnitId(null)}
                  className={`shrink-0 px-2.5 py-1 text-xs rounded-full transition-all ${
                    !selectedUnitId ? "bg-indigo-100 text-indigo-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  全部单元
                </button>
                {units.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => setSelectedUnitId(selectedUnitId === u.id ? null : u.id)}
                    className={`shrink-0 px-2.5 py-1 text-xs rounded-full transition-all ${
                      selectedUnitId === u.id ? "bg-indigo-100 text-indigo-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Row 4: Tag selector */}
          {allTags && allTags.length > 0 && (
            <div className="flex items-center gap-2">
              <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <div className="flex gap-1.5 overflow-x-auto flex-1 no-scrollbar">
                <button
                  onClick={() => setSelectedTagId(null)}
                  className={`shrink-0 px-2.5 py-1 text-xs rounded-full transition-all ${
                    !selectedTagId ? "bg-emerald-100 text-emerald-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  全部标签
                </button>
                {allTags.map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setSelectedTagId(selectedTagId === t.id ? null : t.id)}
                    className={`shrink-0 px-2.5 py-1 text-xs rounded-full transition-all ${
                      selectedTagId === t.id ? "bg-emerald-100 text-emerald-700 font-medium" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {t.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Title + Add button */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{pageTitle}</h1>
            <p className="text-xs text-gray-500 mt-0.5">
              共 {filteredWords.length} 个单词
              {hasFilters && (
                <button onClick={clearFilters} className="ml-2 text-indigo-500 hover:text-indigo-600 underline">清除筛选</button>
              )}
            </p>
          </div>
          <Button
            onClick={() => { setEditWord(null); setShowWordForm(true); }}
            className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-lg shadow-indigo-200 shrink-0 ml-3 h-9"
          >
            <Plus className="w-4 h-4 mr-1" />添加
          </Button>
        </div>

        {/* Sort bar */}
        <div className="mb-3">
          <FilterBar sortBy={sortBy} onSortChange={setSortBy} resultCount={filteredWords.length} />
        </div>

        {/* Words List */}
        {filteredWords.length === 0 && !wordsLoading ? (
          <EmptyState type={hasFilters ? "no-results" : "no-words"} onAdd={() => setShowWordForm(true)} />
        ) : (
          <div className="space-y-3 pb-4">
            {filteredWords.map((word) => (
              <WordCard key={word.id} word={word} onEdit={openEditForm} onDelete={handleDeleteWord} />
            ))}
          </div>
        )}

        <WordForm
          open={showWordForm}
          onClose={() => { setShowWordForm(false); setEditWord(null); }}
          onSubmit={editWord ? handleEditWord : handleAddWord}
          editWord={editWord}
        />
      </main>

      <MobileNav />
    </div>
  );
}
