import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import SearchBar from "@/components/SearchBar";
import FilterBar, { type SortBy } from "@/components/FilterBar";
import WordCard from "@/components/WordCard";
import type { WordCardData } from "@/components/WordCard";
import WordForm, { type WordFormData } from "@/components/WordForm";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  // Filter state (managed internally, not via URL)
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [selectedTextbookId, setSelectedTextbookId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);

  // Dialog state
  const [showWordForm, setShowWordForm] = useState(false);
  const [editWord, setEditWord] = useState<WordCardData | null>(null);

  // Fetch words with filters
  const { data: words, isLoading: wordsLoading } = trpc.word.list.useQuery({
    groupIds: selectedUnitId ? [selectedUnitId] : undefined,
    tagIds: selectedTagIds.length > 0 ? selectedTagIds : undefined,
    textbookId: selectedTextbookId ?? undefined,
    search: searchQuery || undefined,
    sortBy,
  });

  // Fetch names for display
  const { data: textbooksList } = trpc.textbook.list.useQuery();
  const { data: groupsList } = trpc.wordGroup.list.useQuery(
    selectedTextbookId ? { textbookId: selectedTextbookId } : undefined
  );

  // Mutations
  const createWord = trpc.word.create.useMutation({
    onSuccess: () => {
      utils.word.list.invalidate();
      utils.word.stats.invalidate();
      utils.tag.listWithCount.invalidate();
    },
  });

  const updateWord = trpc.word.update.useMutation({
    onSuccess: () => {
      utils.word.list.invalidate();
      utils.word.stats.invalidate();
      utils.tag.listWithCount.invalidate();
    },
  });

  const deleteWord = trpc.word.delete.useMutation({
    onSuccess: () => {
      utils.word.list.invalidate();
      utils.word.stats.invalidate();
      utils.tag.listWithCount.invalidate();
    },
  });

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
  }, []);

  const handleAddWord = (data: WordFormData) => {
    createWord.mutate(data);
  };

  const handleEditWord = (data: WordFormData) => {
    if (editWord) {
      updateWord.mutate({ id: editWord.id, ...data });
      setEditWord(null);
    }
  };

  const handleDeleteWord = (id: number) => {
    if (confirm("确定要删除这个单词吗？")) {
      deleteWord.mutate({ id });
    }
  };

  const openEditForm = (word: WordCardData) => {
    setEditWord(word);
    setShowWordForm(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
          <p className="text-sm text-gray-500">加载中...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const filteredWords = words || [];

  // Build page title
  let pageTitle = "我的单词本";
  if (selectedTextbookId && selectedUnitId) {
    const tbName = textbooksList?.find((t) => t.id === selectedTextbookId)?.name;
    const unitName = groupsList?.find((g) => g.id === selectedUnitId)?.name;
    pageTitle = `${tbName} · ${unitName}`;
  } else if (selectedTextbookId) {
    pageTitle = textbooksList?.find((t) => t.id === selectedTextbookId)?.name || "课本单词";
  } else if (selectedUnitId) {
    pageTitle = groupsList?.find((g) => g.id === selectedUnitId)?.name || "单元单词";
  } else if (selectedTagIds.length > 0) {
    pageTitle = "标签筛选";
  } else if (searchQuery) {
    pageTitle = `搜索: ${searchQuery}`;
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <AppHeader searchComponent={<SearchBar onSearch={handleSearch} />} />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-4 lg:px-6 lg:py-6 pb-24">
        {/* Title */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{pageTitle}</h1>
            <p className="text-sm text-gray-500 mt-0.5">共 {filteredWords.length} 个单词</p>
          </div>
          <Button
            onClick={() => {
              setEditWord(null);
              setShowWordForm(true);
            }}
            className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-lg shadow-indigo-200 shrink-0 ml-3"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            添加
          </Button>
        </div>

        {/* Filter Bar with textbook/unit/tag */}
        <div className="mb-4">
          <FilterBar
            sortBy={sortBy}
            onSortChange={setSortBy}
            resultCount={filteredWords.length}
            selectedTextbookId={selectedTextbookId}
            selectedUnitId={selectedUnitId}
            selectedTagIds={selectedTagIds}
            onTextbookChange={setSelectedTextbookId}
            onUnitChange={setSelectedUnitId}
            onTagChange={setSelectedTagIds}
          />
        </div>

        {/* Words List */}
        {filteredWords.length === 0 && !wordsLoading ? (
          <EmptyState type={searchQuery || selectedTextbookId || selectedUnitId || selectedTagIds.length > 0 ? "no-results" : "no-words"} onAdd={() => setShowWordForm(true)} />
        ) : (
          <div className="space-y-3 pb-4">
            {filteredWords.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                onEdit={openEditForm}
                onDelete={handleDeleteWord}
              />
            ))}
          </div>
        )}
      </main>

      {/* Mobile Bottom Nav */}
      <MobileNav />

      {/* Word Form Dialog */}
      <WordForm
        open={showWordForm}
        onClose={() => {
          setShowWordForm(false);
          setEditWord(null);
        }}
        onSubmit={editWord ? handleEditWord : handleAddWord}
        editWord={editWord}
      />
    </div>
  );
}
