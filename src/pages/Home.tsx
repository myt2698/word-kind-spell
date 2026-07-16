import { useState, useCallback, useEffect, useMemo } from "react";
import { useNavigate, useSearchParams } from "react-router";
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

function parseIdList(param: string | null): number[] {
  if (!param) return [];
  return param
    .split(",")
    .map((s) => Number(s.trim()))
    .filter((n) => !isNaN(n) && n > 0);
}

export default function Home() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  // Read filter params from URL
  const urlGroupIds = useMemo(() => parseIdList(searchParams.get("groupIds")), [searchParams]);
  const urlTagIds = useMemo(() => parseIdList(searchParams.get("tagIds")), [searchParams]);

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");

  // Dialog state
  const [showWordForm, setShowWordForm] = useState(false);
  const [editWord, setEditWord] = useState<WordCardData | null>(null);

  // Fetch words
  const { data: words, isLoading: wordsLoading } = trpc.word.list.useQuery({
    groupIds: urlGroupIds.length > 0 ? urlGroupIds : undefined,
    tagIds: urlTagIds.length > 0 ? urlTagIds : undefined,
    search: searchQuery || undefined,
    sortBy,
  });

  // Fetch group/tag names for display
  const { data: groupsList } = trpc.wordGroup.list.useQuery();
  const { data: tagsList } = trpc.tag.list.useQuery();

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

  // Clear filters
  const clearFilters = () => {
    setSearchParams({});
    setSearchQuery("");
  };

  // Remove single group filter
  const removeGroupFilter = (groupId: number) => {
    const newIds = urlGroupIds.filter((id) => id !== groupId);
    const newParams = new URLSearchParams(searchParams);
    if (newIds.length > 0) {
      newParams.set("groupIds", newIds.join(","));
    } else {
      newParams.delete("groupIds");
    }
    setSearchParams(newParams);
  };

  // Remove single tag filter
  const removeTagFilter = (tagId: number) => {
    const newIds = urlTagIds.filter((id) => id !== tagId);
    const newParams = new URLSearchParams(searchParams);
    if (newIds.length > 0) {
      newParams.set("tagIds", newIds.join(","));
    } else {
      newParams.delete("tagIds");
    }
    setSearchParams(newParams);
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
  const hasActiveFilters = urlGroupIds.length > 0 || urlTagIds.length > 0 || searchQuery.length > 0;
  const isEmpty = filteredWords.length === 0 && !wordsLoading && !hasActiveFilters;

  // Build page title based on active filters
  let pageTitle = "我的单词本";
  if (urlGroupIds.length > 0 && urlTagIds.length > 0) {
    const groupNames = urlGroupIds
      .map((id) => groupsList?.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join("、");
    const tagNames = urlTagIds
      .map((id) => tagsList?.find((t) => t.id === id)?.name)
      .filter(Boolean)
      .join("、");
    pageTitle = `${groupNames} + ${tagNames}`;
  } else if (urlGroupIds.length > 0) {
    const names = urlGroupIds
      .map((id) => groupsList?.find((g) => g.id === id)?.name)
      .filter(Boolean)
      .join("、");
    pageTitle = names || "分组单词";
  } else if (urlTagIds.length > 0) {
    const names = urlTagIds
      .map((id) => tagsList?.find((t) => t.id === id)?.name)
      .filter(Boolean)
      .join("、");
    pageTitle = names || "标签单词";
  }

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <AppHeader searchComponent={<SearchBar onSearch={handleSearch} />} />

      {/* Main Content */}
      <main className="max-w-3xl mx-auto px-4 py-4 lg:px-6 lg:py-6 pb-24">
        {/* Title & Filter Info */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 truncate">{pageTitle}</h1>
            <p className="text-sm text-gray-500 mt-0.5">
              共 {filteredWords.length} 个单词
              {hasActiveFilters && (
                <button
                  onClick={clearFilters}
                  className="ml-2 text-indigo-500 hover:text-indigo-600 text-xs underline"
                >
                  清除筛选
                </button>
              )}
            </p>
          </div>
          <Button
            onClick={() => {
              setEditWord(null);
              setShowWordForm(true);
            }}
            className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-lg shadow-indigo-200 shrink-0 ml-3"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            添加单词
          </Button>
        </div>

        {/* Active filter chips */}
        {hasActiveFilters && (
          <div className="flex flex-wrap gap-2 mb-4">
            {urlGroupIds.map((groupId) => {
              const group = groupsList?.find((g) => g.id === groupId);
              if (!group) return null;
              return (
                <span
                  key={`g-${groupId}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200"
                >
                  分组: {group.name}
                  <button
                    onClick={() => removeGroupFilter(groupId)}
                    className="ml-0.5 hover:text-indigo-800"
                  >
                    x
                  </button>
                </span>
              );
            })}
            {urlTagIds.map((tagId) => {
              const tag = tagsList?.find((t) => t.id === tagId);
              if (!tag) return null;
              return (
                <span
                  key={`t-${tagId}`}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200"
                >
                  标签: {tag.name}
                  <button
                    onClick={() => removeTagFilter(tagId)}
                    className="ml-0.5 hover:text-emerald-800"
                  >
                    x
                  </button>
                </span>
              );
            })}
            {searchQuery && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-gray-100 text-gray-600 border border-gray-200">
                搜索: {searchQuery}
                <button
                  onClick={() => setSearchQuery("")}
                  className="ml-0.5 hover:text-gray-800"
                >
                  x
                </button>
              </span>
            )}
          </div>
        )}

        {/* Filter Bar */}
        <div className="mb-4">
          <FilterBar
            sortBy={sortBy}
            onSortChange={setSortBy}
            resultCount={filteredWords.length}
          />
        </div>

        {/* Words List */}
        {isEmpty ? (
          <EmptyState type="no-words" onAdd={() => setShowWordForm(true)} />
        ) : filteredWords.length === 0 ? (
          <EmptyState type="no-results" />
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
      <MobileNav
        onAdd={() => {
          setEditWord(null);
          setShowWordForm(true);
        }}
      />

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
