import { SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";

export type ProficiencyFilter = "all" | "new" | "learning" | "familiar" | "mastered";
export type SortBy = "newest" | "oldest" | "alphabetical";

interface FilterBarProps {
  proficiency: ProficiencyFilter;
  onProficiencyChange: (p: ProficiencyFilter) => void;
  sortBy: SortBy;
  onSortChange: (s: SortBy) => void;
  resultCount: number;
}

const proficiencyOptions: { value: ProficiencyFilter; label: string; color: string }[] = [
  { value: "all", label: "全部", color: "bg-gray-100 text-gray-700 hover:bg-gray-200" },
  { value: "new", label: "新词", color: "bg-red-50 text-red-600 hover:bg-red-100 border-red-200" },
  { value: "learning", label: "学习中", color: "bg-yellow-50 text-yellow-600 hover:bg-yellow-100 border-yellow-200" },
  { value: "familiar", label: "熟悉", color: "bg-blue-50 text-blue-600 hover:bg-blue-100 border-blue-200" },
  { value: "mastered", label: "已掌握", color: "bg-green-50 text-green-600 hover:bg-green-100 border-green-200" },
];

const sortOptions: { value: SortBy; label: string }[] = [
  { value: "newest", label: "最新" },
  { value: "oldest", label: "最早" },
  { value: "alphabetical", label: "字母" },
];

export default function FilterBar({
  proficiency,
  onProficiencyChange,
  sortBy,
  onSortChange,
  resultCount,
}: FilterBarProps) {
  const [showFilters, setShowFilters] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 text-gray-500 lg:hidden"
            onClick={() => setShowFilters(!showFilters)}
          >
            <SlidersHorizontal className="w-4 h-4 mr-1" />
            筛选
          </Button>
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

      {/* Proficiency filters */}
      <div className={`flex flex-wrap gap-1.5 ${showFilters ? "block" : "hidden lg:flex"}`}>
        {proficiencyOptions.map((opt) => (
          <button
            key={opt.value}
            onClick={() => onProficiencyChange(opt.value)}
            className={`px-3 py-1.5 text-xs rounded-full border transition-all ${
              proficiency === opt.value
                ? opt.color + " ring-2 ring-offset-1 ring-indigo-200 font-medium"
                : "bg-white text-gray-500 border-gray-200 hover:bg-gray-50"
            }`}
          >
            {opt.label}
          </button>
        ))}
      </div>
    </div>
  );
}
