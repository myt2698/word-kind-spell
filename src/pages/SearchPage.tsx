import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Search,
  FolderOpen,
  Tag,
  Loader2,
  ArrowLeft,
  Star,
  Check,
  X,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function SearchPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  const { data: groups, isLoading: groupsLoading } = trpc.wordGroup.list.useQuery();
  const { data: tags, isLoading: tagsLoading } = trpc.tag.listWithCount.useQuery();
  const { data: userSettings } = trpc.wordGroup.getSettings.useQuery();

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGroupIds, setSelectedGroupIds] = useState<Set<number>>(new Set());
  const [selectedTagIds, setSelectedTagIds] = useState<Set<number>>(new Set());

  const isLoading = groupsLoading || tagsLoading;

  // Toggle group selection
  const toggleGroup = (groupId: number) => {
    setSelectedGroupIds((prev) => {
      const next = new Set(prev);
      if (next.has(groupId)) {
        next.delete(groupId);
      } else {
        next.add(groupId);
      }
      return next;
    });
  };

  // Toggle tag selection
  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) => {
      const next = new Set(prev);
      if (next.has(tagId)) {
        next.delete(tagId);
      } else {
        next.add(tagId);
      }
      return next;
    });
  };

  // Filter groups by search text
  const filteredGroups = groups?.filter((g) =>
    searchQuery
      ? g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      : true
  );

  // Filter tags by search text
  const filteredTags = tags?.filter((t) =>
    searchQuery
      ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      : true
  );

  // Navigate to results
  const handleViewResults = () => {
    const params = new URLSearchParams();
    if (selectedGroupIds.size > 0) {
      params.set("groupIds", Array.from(selectedGroupIds).join(","));
    }
    if (selectedTagIds.size > 0) {
      params.set("tagIds", Array.from(selectedTagIds).join(","));
    }
    const queryString = params.toString();
    navigate(queryString ? `/?${queryString}` : "/");
  };

  const totalSelected = selectedGroupIds.size + selectedTagIds.size;

  // Get names for selected chips
  const selectedGroupNames = Array.from(selectedGroupIds)
    .map((id) => groups?.find((g) => g.id === id))
    .filter(Boolean);
  const selectedTagNames = Array.from(selectedTagIds)
    .map((id) => tags?.find((t) => t.id === id))
    .filter(Boolean);

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-32">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/")}
            className="h-9 w-9 flex items-center justify-center -ml-1 rounded-lg hover:bg-gray-100 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-500" />
              搜索
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              选择分组和标签进行联合筛选
            </p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索分组或标签..."
            className="h-11 pl-10 pr-4 bg-white border-gray-200 rounded-xl text-sm"
            autoFocus
          />
        </div>

        {/* Selected chips */}
        {totalSelected > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {selectedGroupNames.map((g) => (
              <span
                key={`g-${g!.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-indigo-50 text-indigo-600 border border-indigo-200"
              >
                <FolderOpen className="w-3 h-3" />
                {g!.name}
                <button
                  onClick={() => toggleGroup(g!.id)}
                  className="ml-0.5 hover:text-indigo-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
            {selectedTagNames.map((t) => (
              <span
                key={`t-${t!.id}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200"
              >
                <Tag className="w-3 h-3" />
                {t!.name}
                <button
                  onClick={() => toggleTag(t!.id)}
                  className="ml-0.5 hover:text-emerald-800"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Groups Section */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <FolderOpen className="w-4 h-4" />
                分组
                <span className="text-xs normal-case">({filteredGroups?.length ?? 0})</span>
              </h2>

              {!filteredGroups || filteredGroups.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
                  <FolderOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {searchQuery ? "没有匹配的分组" : "暂无分组"}
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {filteredGroups.map((group) => {
                    const isDefault = userSettings?.defaultGroupId === group.id;
                    const isSelected = selectedGroupIds.has(group.id);
                    return (
                      <button
                        key={group.id}
                        onClick={() => toggleGroup(group.id)}
                        className={`flex items-center gap-3 p-3 rounded-xl border transition-all text-left ${
                          isSelected
                            ? "bg-indigo-50 border-indigo-300 ring-1 ring-indigo-200 shadow-sm"
                            : "bg-white border-gray-100 hover:shadow-md hover:border-indigo-200"
                        }`}
                      >
                        <div
                          className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
                            isSelected ? "bg-indigo-100" : "bg-indigo-50"
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-5 h-5 text-indigo-600" />
                          ) : (
                            <FolderOpen className="w-5 h-5 text-indigo-500" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-sm font-medium text-gray-900 truncate">
                              {group.name}
                            </p>
                            {isDefault && (
                              <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                            )}
                          </div>
                          {(group as any).wordCount !== undefined && (
                            <p className="text-xs text-gray-400">
                              {(group as any).wordCount} 个单词
                            </p>
                          )}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Tags Section */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <Tag className="w-4 h-4" />
                标签
                <span className="text-xs normal-case">({filteredTags?.length ?? 0})</span>
              </h2>

              {!filteredTags || filteredTags.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
                  <Tag className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {searchQuery ? "没有匹配的标签" : "暂无标签"}
                  </p>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {filteredTags.map((tag) => {
                    const isSelected = selectedTagIds.has(tag.id);
                    return (
                      <button
                        key={tag.id}
                        onClick={() => toggleTag(tag.id)}
                        className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border transition-all ${
                          isSelected
                            ? "bg-emerald-50 border-emerald-300 ring-1 ring-emerald-200 shadow-sm"
                            : "bg-white border-gray-100 hover:shadow-md hover:border-emerald-200"
                        }`}
                      >
                        {isSelected ? (
                          <Check className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        ) : (
                          <Tag className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                        )}
                        <div className="flex flex-col items-start">
                          <span
                            className={`text-sm font-medium ${
                              isSelected ? "text-emerald-700" : "text-gray-800"
                            }`}
                          >
                            {tag.name}
                          </span>
                          <span className="text-xs text-gray-400">
                            {tag.wordCount} 个单词
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      {/* Bottom action bar */}
      {totalSelected > 0 && (
        <div className="fixed bottom-16 left-0 right-0 z-40 bg-white/90 backdrop-blur-lg border-t border-gray-100 px-4 py-3">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">
              已选
              {selectedGroupIds.size > 0 && (
                <span className="text-indigo-600 font-medium"> {selectedGroupIds.size} 个分组</span>
              )}
              {selectedGroupIds.size > 0 && selectedTagIds.size > 0 && (
                <span className="text-gray-400"> + </span>
              )}
              {selectedTagIds.size > 0 && (
                <span className="text-emerald-600 font-medium">{selectedTagIds.size} 个标签</span>
              )}
            </p>
            <Button
              onClick={handleViewResults}
              className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-lg px-6"
            >
              查看结果
            </Button>
          </div>
        </div>
      )}

      <MobileNav activeTab="search" />
    </div>
  );
}
