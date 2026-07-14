import { SlidersHorizontal } from "lucide-react";
import { useState } from "react";

export type SortBy = "newest" | "oldest" | "alphabetical";

interface FilterBarProps {
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
  resultCount: number;
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
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            className="lg:hidden text-gray-500 hover:text-gray-700 transition-colors"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4" />
          </button>
          <span className="text-xs text-gray-400">
            共 {resultCount} 个单词
          </span>
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
    </div>
  );
}
