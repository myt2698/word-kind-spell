import { useState } from "react";
import { trpc } from "@/providers/trpc";
import MobileNav from "@/components/MobileNav";
import FilterBar, { type SortBy } from "@/components/FilterBar";
import WordCard from "@/components/WordCard";
import EmptyState from "@/components/EmptyState";
import { Input } from "@/components/ui/input";
import { Search, X, BookOpen } from "lucide-react";

export default function Home() {
  // Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [selectedTextbookId, setSelectedTextbookId] = useState<number | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<number | null>(null);
  const [selectedTagId, setSelectedTagId] = useState<number | null>(null);

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

  // Selected names
  const selectedTextbookName = selectedTextbookId
    ? textbooks?.find((t) => t.id === selectedTextbookId)?.name || "课本"
    : "全部课本";
  const selectedUnitName = selectedUnitId
    ? units?.find((u) => u.id === selectedUnitId)?.name || "单元"
    : "全部单元";
  const selectedTagName = selectedTagId
    ? allTags?.find((t) => t.id === selectedTagId)?.name || "标签"
    : "全部标签";

  const clearFilters = () => {
    setSearchQuery("");
    setSelectedTextbookId(null);
    setSelectedUnitId(null);
    setSelectedTagId(null);
  };

  const activeFilterCount = [
    selectedTextbookId,
    selectedUnitId,
    selectedTagId,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-lg font-bold text-gray-900">WordMind</h1>
            {words && (
              <span className="text-xs text-gray-400 ml-auto">
                {words.length} 个单词
              </span>
            )}
          </div>

          {/* Search bar */}
          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
              <Input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="搜索单词、释义..."
                className="pl-9 h-10"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="max-w-3xl mx-auto px-4 py-3">
        <div className="flex flex-wrap items-center gap-2 mb-2">
          {/* Textbook dropdown */}
          <select
            value={selectedTextbookId ?? ""}
            onChange={(e) => {
              const v = e.target.value;
              setSelectedTextbookId(v ? Number(v) : null);
              setSelectedUnitId(null);
            }}
            className="h-9 px-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">全部课本</option>
            {textbooks?.map((tb) => (
              <option key={tb.id} value={tb.id}>{tb.name}</option>
            ))}
          </select>

          {/* Unit dropdown */}
          {selectedTextbookId && (
            <select
              value={selectedUnitId ?? ""}
              onChange={(e) => setSelectedUnitId(e.target.value ? Number(e.target.value) : null)}
              className="h-9 px-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">全部单元</option>
              {units?.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
          )}

          {/* Tag dropdown */}
          <select
            value={selectedTagId ?? ""}
            onChange={(e) => setSelectedTagId(e.target.value ? Number(e.target.value) : null)}
            className="h-9 px-2.5 rounded-lg border border-gray-200 bg-white text-sm text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">全部标签</option>
            {allTags?.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>

          {/* Sort */}
          <FilterBar sortBy={sortBy} onSortChange={setSortBy} />

          {/* Clear filters */}
          {(activeFilterCount > 0 || searchQuery) && (
            <button
              onClick={clearFilters}
              className="h-9 px-2.5 text-sm text-gray-500 hover:text-gray-700 flex items-center gap-1"
            >
              <X className="w-3.5 h-3.5" /> 清除
            </button>
          )}
        </div>

        {/* Active filter tags */}
        {activeFilterCount > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedTextbookId && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-purple-50 text-purple-600 rounded-full">
                {selectedTextbookName}
                <button onClick={() => { setSelectedTextbookId(null); setSelectedUnitId(null); }}><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedUnitId && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded-full">
                {selectedUnitName}
                <button onClick={() => setSelectedUnitId(null)}><X className="w-3 h-3" /></button>
              </span>
            )}
            {selectedTagId && (
              <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
                {selectedTagName}
                <button onClick={() => setSelectedTagId(null)}><X className="w-3 h-3" /></button>
              </span>
            )}
          </div>
        )}
      </div>

      {/* Word list */}
      <div className="max-w-3xl mx-auto px-4 pb-24">
        {wordsLoading ? (
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-24 bg-white rounded-xl border border-gray-100 animate-pulse" />
            ))}
          </div>
        ) : words && words.length > 0 ? (
          <div className="space-y-3">
            {words.map((word: any) => (
              <WordCard key={word.id} word={word} onEdit={() => {}} onDelete={() => {}} />
            ))}
          </div>
        ) : (
          <EmptyState
            title={searchQuery || activeFilterCount > 0 ? "没有找到匹配的单词" : "还没有单词"}
            description={searchQuery || activeFilterCount > 0 ? "尝试调整搜索或筛选条件" : "去管理后台添加一些单词吧"}
          />
        )}
      </div>

      {/* Bottom nav */}
      <MobileNav />
    </div>
  );
}
