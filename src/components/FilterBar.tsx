import { ChevronDown, SlidersHorizontal } from "lucide-react";

export type SortBy = "newest" | "oldest" | "alphabetical";

interface FilterBarProps {
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
}

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "newest", label: "最新" },
  { value: "oldest", label: "最早" },
  { value: "alphabetical", label: "字母" },
];

export default function FilterBar({ sortBy, onSortChange }: FilterBarProps) {
  return (
    <div className="shrink-0">
      <div className="relative">
        <SlidersHorizontal className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
        <select
          aria-label="单词排序"
          value={sortBy}
          onChange={(event) => onSortChange(event.target.value as SortBy)}
          className="h-8 min-w-[104px] appearance-none rounded-lg border border-gray-200 bg-white pl-8 pr-7 text-xs text-gray-600 outline-none transition-colors hover:border-gray-300 focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
        >
          {sortOptions.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400 pointer-events-none" />
      </div>
    </div>
  );
}
