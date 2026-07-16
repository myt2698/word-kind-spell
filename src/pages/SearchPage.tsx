import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import { Input } from "@/components/ui/input";
import {
  Search,
  FolderOpen,
  Tag,
  Loader2,
  ArrowLeft,
  Star,
} from "lucide-react";
import { useNavigate } from "react-router";

export default function SearchPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  const { data: groups, isLoading: groupsLoading } = trpc.wordGroup.list.useQuery();
  const { data: tags, isLoading: tagsLoading } = trpc.tag.listWithCount.useQuery();
  const { data: userSettings } = trpc.wordGroup.getSettings.useQuery();

  const [searchQuery, setSearchQuery] = useState("");

  const isLoading = groupsLoading || tagsLoading;

  // Filter groups by search
  const filteredGroups = groups?.filter((g) =>
    searchQuery
      ? g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (g.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      : true
  );

  // Filter tags by search
  const filteredTags = tags?.filter((t) =>
    searchQuery
      ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      : true
  );

  const handleSelectGroup = (groupId: number) => {
    navigate(`/?groupId=${groupId}`);
  };

  const handleSelectTag = (tagId: number) => {
    navigate(`/?tagId=${tagId}`);
  };

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

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
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
              点击分组或标签查看对应单词
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
                    return (
                      <button
                        key={group.id}
                        onClick={() => handleSelectGroup(group.id)}
                        className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all text-left"
                      >
                        <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center shrink-0">
                          <FolderOpen className="w-5 h-5 text-indigo-500" />
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
                  {filteredTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleSelectTag(tag.id)}
                      className="inline-flex flex-col items-start px-3 py-2 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all"
                    >
                      <span className="text-sm font-medium text-gray-800">{tag.name}</span>
                      <span className="text-xs text-gray-400">{tag.wordCount} 个单词</span>
                      {tag.description && (
                        <span className="text-xs text-gray-400 mt-0.5 line-clamp-1 max-w-[200px]">
                          {tag.description}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <MobileNav activeTab="search" />
    </div>
  );
}
