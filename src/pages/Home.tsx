import { useState, useEffect } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import { preloadAudio } from "@/utils/speech";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import FilterBar, { type SortBy } from "@/components/FilterBar";
import WordCard from "@/components/WordCard";
import type { WordCardData } from "@/components/WordCard";
import WordForm, { type WordFormData } from "@/components/WordForm";
import EmptyState from "@/components/EmptyState";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Plus, Search, X } from "lucide-react";

export default function Home({ searchMode = false }: { searchMode?: boolean }) {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const navigate = useNavigate();

  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [selectedTextbookId, setSelectedTextbookId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);

  // Dialog state
  const [showWordForm, setShowWordForm] = useState(false);
  const [editWord, setEditWord] = useState<WordCardData | null>(null);

  // Fetch data
  const { data: words, isLoading: wordsLoading } = trpc.word.list.useQuery(
    searchMode
      ? {
          sortBy,
        }
      : {
          groupIds: selectedUnitId ? [selectedUnitId] : undefined,
          textbookId: selectedTextbookId ?? undefined,
          sortBy,
        }
  );

  const { data: textbooks } = trpc.textbook.list.useQuery();
  const { data: units } = trpc.wordGroup.list.useQuery(
    selectedTextbookId ? { textbookId: selectedTextbookId } : undefined,
    { enabled: !!selectedTextbookId }
  );

  // Preload audio for all visible words
  useEffect(() => {
    if (words && words.length > 0) {
      preloadAudio(words.map((w) => w.id));
    }
  }, [words]);

  // Selected names
  const selectedTextbookName = selectedTextbookId
    ? textbooks?.find((t) => t.id === selectedTextbookId)?.name || "课本"
    : "全部课本";
  const selectedUnitName = selectedUnitId
    ? units?.find((u) => u.id === selectedUnitId)?.name || "单元"
    : "全部单元";
  // Mutations
  const createWord = trpc.word.create.useMutation({
    onSuccess: () => { utils.word.list.invalidate(); utils.tag.listWithCount.invalidate(); },
  });
  const updateWord = trpc.word.update.useMutation({
    onSuccess: () => { utils.word.list.invalidate(); utils.tag.listWithCount.invalidate(); },
  });
  const deleteWord = trpc.word.delete.useMutation({
    onSuccess: () => { utils.word.list.invalidate(); utils.tag.listWithCount.invalidate(); },
  });

  const handleWordSubmit = (data: WordFormData & { id?: number }) => {
    const wordId = data.id || editWord?.id;
    if (wordId) {
      // 编辑模式
      updateWord.mutate({ ...data, id: wordId });
    } else {
      // 新建模式
      createWord.mutate(data);
    }
    setEditWord(null);
  };
  const handleDeleteWord = (id: number) => { if (confirm("确定删除这个单词吗？")) deleteWord.mutate({ id }); };
  const openEditForm = (word: WordCardData) => { setEditWord(word); setShowWordForm(true); };

  const clearFilters = () => {
    setSelectedTextbookId(null);
    setSelectedUnitId(null);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-10 h-10 border-3 border-indigo-200 border-t-indigo-500 rounded-full animate-spin" />
      </div>
    );
  }
  if (!user) return null;

  const canManageCatalog = user.role === "admin";
  const searchNeedle = searchQuery.trim().toLowerCase();
  const filteredWords = searchMode && searchNeedle
    ? (words || []).filter((word) =>
        word.word.toLowerCase().includes(searchNeedle) ||
        word.definition.toLowerCase().includes(searchNeedle) ||
        word.notes?.toLowerCase().includes(searchNeedle)
      )
    : words || [];
  const hasFilters = selectedTextbookId || selectedUnitId;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-4 py-4 pb-24">
        {searchMode ? (
          <div className="mb-4">
            <div className="flex items-center gap-2 mb-4">
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => navigate("/")}
                className="h-10 w-10 shrink-0 rounded-xl bg-white border border-gray-100"
                aria-label="返回单词首页"
              >
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <Input
                  autoFocus
                  type="search"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="搜索单词、释义或备注"
                  className="h-11 pl-10 pr-10 bg-white border-gray-200 rounded-xl"
                />
                {searchQuery && (
                  <button
                    type="button"
                    onClick={() => setSearchQuery("")}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-2"
                    aria-label="清除搜索"
                  >
                    <X className="w-4 h-4 text-gray-400" />
                  </button>
                )}
              </div>
            </div>

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">
                {searchQuery ? `找到 ${filteredWords.length} 个单词` : `共 ${filteredWords.length} 个单词`}
              </p>
              <FilterBar sortBy={sortBy} onSortChange={setSortBy} />
            </div>
          </div>
        ) : (
          <>
            {/* Textbook and unit filters share one roomy row. */}
            <div className="bg-white rounded-xl border border-gray-100 p-3 mb-4">
              <div className="grid grid-cols-2 gap-2">
                  {/* Textbook dropdown */}
                  <div className="relative min-w-0">
                    <select
                      value={selectedTextbookId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setSelectedTextbookId(val);
                        setSelectedUnitId(null);
                      }}
                      className="w-full h-9 pl-2.5 pr-7 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 appearance-none cursor-pointer hover:border-gray-300 transition-colors"
                    >
                      <option value="">全部课本</option>
                      {textbooks?.map((tb) => (
                        <option key={tb.id} value={tb.id}>{tb.name}</option>
                      ))}
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>

                  {/* Unit dropdown */}
                  <div className="relative min-w-0">
                    <select
                      value={selectedUnitId ?? ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setSelectedUnitId(val);
                      }}
                      disabled={!selectedTextbookId}
                      className="w-full h-9 pl-2.5 pr-7 text-xs bg-gray-50 border border-gray-200 rounded-lg text-gray-700 appearance-none cursor-pointer hover:border-gray-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <option value="">全部单元</option>
                      {units?.map((u) => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                    <svg className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
              </div>
            </div>

            {/* Active filters and page actions. */}
            {hasFilters && (
              <div className="flex flex-wrap items-center gap-2 text-xs mb-3">
                <span className="text-gray-400">当前筛选:</span>
                {selectedTextbookId && (
                  <span className="px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">{selectedTextbookName}</span>
                )}
                {selectedUnitId && (
                  <span className="px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">{selectedUnitName}</span>
                )}
                <button onClick={clearFilters} className="text-indigo-500 hover:text-indigo-600 underline ml-auto">
                  清除全部
                </button>
              </div>
            )}

            <div className="flex items-center justify-between mb-3">
              <p className="text-xs text-gray-500">
                共 {filteredWords.length} 个单词
              </p>
              <div className="flex items-center gap-2">
                <FilterBar sortBy={sortBy} onSortChange={setSortBy} />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  onClick={() => navigate("/search")}
                  className="h-9 w-9 rounded-lg bg-white"
                  aria-label="搜索单词"
                >
                  <Search className="w-4 h-4" />
                </Button>
                {canManageCatalog && (
                  <Button
                    onClick={() => { setEditWord(null); setShowWordForm(true); }}
                    className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-lg shadow-indigo-200 shrink-0 h-9"
                  >
                    <Plus className="w-4 h-4 mr-1" />添加
                  </Button>
                )}
              </div>
            </div>
          </>
        )}

        {/* Words List */}
        {filteredWords.length === 0 && !wordsLoading ? (
          <EmptyState
            type={searchMode || hasFilters ? "no-results" : "no-words"}
            onAdd={!searchMode && canManageCatalog ? () => setShowWordForm(true) : undefined}
          />
        ) : (
          <div className="space-y-3 pb-4">
            {filteredWords.map((word) => (
              <WordCard
                key={word.id}
                word={word}
                onEdit={openEditForm}
                onDelete={handleDeleteWord}
                canManage={canManageCatalog}
              />
            ))}
          </div>
        )}

        {canManageCatalog && (
          <WordForm
            open={showWordForm}
            onClose={() => { setShowWordForm(false); setEditWord(null); }}
            onSubmit={handleWordSubmit}
            editWord={editWord}
          />
        )}
      </main>

      <MobileNav />
    </div>
  );
}
