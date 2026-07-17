import { SlidersHorizontal } from "lucide-react";

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

export default function FilterBar({ sortBy, onSortChange, resultCount }: FilterBarProps) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-2">
        <SlidersHorizontal className="w-3.5 h-3.5 text-gray-400" />
        <span className="text-xs text-gray-400">排序</span>
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
  );
}
