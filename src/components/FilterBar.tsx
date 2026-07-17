import { SlidersHorizontal, BookOpen, FolderOpen, Tag, X } from "lucide-react";
import { useState } from "react";
import { trpc } from "@/providers/trpc";

export type SortBy = "newest" | "oldest" | "alphabetical";

interface FilterBarProps {
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
  resultCount: number;
  selectedTextbookId: number | null;
  selectedUnitId: number | null;
  selectedTagIds: number[];
  onTextbookChange: (id: number | null) => void;
  onUnitChange: (id: number | null) => void;
  onTagChange: (ids: number[]) => void;
}

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "newest", label: "最新" },
  { value: "oldest", label: "最早" },
  { value: "alphabetical", label: "字母" },
];

export default function FilterBar({
  sortBy,
  onSortChange,
  resultCount,
  selectedTextbookId,
  selectedUnitId,
  selectedTagIds,
  onTextbookChange,
  onUnitChange,
  onTagChange,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  const { data: textbooks } = trpc.textbook.list.useQuery();
  const { data: units } = trpc.wordGroup.list.useQuery(
    selectedTextbookId ? { textbookId: selectedTextbookId } : undefined,
    { enabled: !!selectedTextbookId }
  );
  const { data: allTags } = trpc.tag.list.useQuery();

  const hasActiveFilters = selectedTextbookId !== null || selectedUnitId !== null || selectedTagIds.length > 0;

  const clearAll = () => {
    onTextbookChange(null);
    onUnitChange(null);
    onTagChange([]);
  };

  return (
    <div className="space-y-3">
      {/* Top bar: filter toggle + sort + count */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className={`transition-colors ${hasActiveFilters ? "text-indigo-600" : "text-gray-500 hover:text-gray-700"}`}
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400">共 {resultCount} 个单词</span>
          {hasActiveFilters && (
            <button
              onClick={clearAll}
              className="text-xs text-indigo-500 hover:text-indigo-600 underline"
            >
              清除筛选
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {sortOptions.map((opt) => (
            <button
              key={opt.value}
              onClick={() => onSortChange(opt.value)}
              className={`px-2.5 py-1 text-xs rounded-md transition-all ${
                sortBy === opt.value
                  ? "bg-indigo-50 text-indigo-600 font-medium"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Filter panel */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
          {/* Textbook selector */}
          <div>
            <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
              <BookOpen className="w-3 h-3" /> 课本
            </label>
            <div className="flex flex-wrap gap-1.5">
              <button
                onClick={() => { onTextbookChange(null); onUnitChange(null); }}
                className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                  !selectedTextbookId
                    ? "bg-purple-100 text-purple-700 font-medium"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                全部
              </button>
              {textbooks?.map((tb) => (
                <button
                  key={tb.id}
                  onClick={() => {
                    if (selectedTextbookId === tb.id) {
                      onTextbookChange(null);
                      onUnitChange(null);
                    } else {
                      onTextbookChange(tb.id);
                      onUnitChange(null);
                    }
                  }}
                  className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                    selectedTextbookId === tb.id
                      ? "bg-purple-100 text-purple-700 font-medium"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  {tb.name}
                </button>
              ))}
            </div>
          </div>

          {/* Unit selector - only show when textbook selected */}
          {selectedTextbookId && units && units.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                <FolderOpen className="w-3 h-3" /> 单元
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  onClick={() => onUnitChange(null)}
                  className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                    !selectedUnitId
                      ? "bg-indigo-100 text-indigo-700 font-medium"
                      : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                  }`}
                >
                  全部单元
                </button>
                {units.map((u) => (
                  <button
                    key={u.id}
                    onClick={() => onUnitChange(selectedUnitId === u.id ? null : u.id)}
                    className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                      selectedUnitId === u.id
                        ? "bg-indigo-100 text-indigo-700 font-medium"
                        : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                  >
                    {u.name}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Tag selector */}
          {allTags && allTags.length > 0 && (
            <div>
              <label className="text-xs text-gray-500 mb-1.5 flex items-center gap-1">
                <Tag className="w-3 h-3" /> 标签
              </label>
              <div className="flex flex-wrap gap-1.5">
                {allTags.map((t) => {
                  const isSelected = selectedTagIds.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      onClick={() => {
                        if (isSelected) {
                          onTagChange(selectedTagIds.filter((id) => id !== t.id));
                        } else {
                          onTagChange([...selectedTagIds, t.id]);
                        }
                      }}
                      className={`px-2.5 py-1 text-xs rounded-full transition-all ${
                        isSelected
                          ? "bg-emerald-100 text-emerald-700 font-medium"
                          : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                      }`}
                    >
                      {t.name}
                      {isSelected && <X className="w-3 h-3 inline ml-0.5" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Active filter chips (compact) */}
      {hasActiveFilters && (
        <div className="flex flex-wrap gap-1.5">
          {selectedTextbookId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-purple-50 text-purple-600 border border-purple-200">
              {textbooks?.find((t) => t.id === selectedTextbookId)?.name}
              <button onClick={() => { onTextbookChange(null); onUnitChange(null); }} className="hover:text-purple-800">x</button>
            </span>
          )}
          {selectedUnitId && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200">
              {units?.find((u) => u.id === selectedUnitId)?.name}
              <button onClick={() => onUnitChange(null)} className="hover:text-indigo-800">x</button>
            </span>
          )}
          {selectedTagIds.map((tagId) => {
            const tag = allTags?.find((t) => t.id === tagId);
            if (!tag) return null;
            return (
              <span key={tagId} className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200">
                {tag.name}
                <button onClick={() => onTagChange(selectedTagIds.filter((id) => id !== tagId))} className="hover:text-emerald-800">x</button>
              </span>
            );
          })}
        </div>
      )}
    </div>
  );
}
