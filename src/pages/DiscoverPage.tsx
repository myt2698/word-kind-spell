import { useState } from "react";
import { useNavigate } from "react-router";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import { Input } from "@/components/ui/input";
import {
  Search,
  BookOpen,
  Tag,
  FolderOpen,
  Loader2,
  ArrowLeft,
  Star,
  Shuffle,
  ChevronRight,
} from "lucide-react";

export default function DiscoverPage() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });

  const { data: textbooks, isLoading: textbooksLoading } = trpc.textbook.list.useQuery();
  const { data: tags, isLoading: tagsLoading } = trpc.tag.listWithCount.useQuery();
  const { data: words } = trpc.word.list.useQuery({ sortBy: "newest" });

  const [searchQuery, setSearchQuery] = useState("");
  const [expandedTextbookId, setExpandedTextbookId] = useState<number | null>(null);

  // Filter textbooks by search
  const filteredTextbooks = textbooks?.filter((tb) =>
    searchQuery
      ? tb.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tb.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      : true
  );

  // Filter tags by search
  const filteredTags = tags?.filter((t) =>
    searchQuery
      ? t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (t.description?.toLowerCase().includes(searchQuery.toLowerCase()) ?? false)
      : true
  );

  const handleSelectTextbook = (textbookId: number) => {
    navigate(`/?textbookId=${textbookId}`);
  };

  const handleSelectUnit = (unitId: number) => {
    navigate(`/?groupIds=${unitId}`);
  };

  const handleSelectTag = (tagId: number) => {
    navigate(`/?tagIds=${tagId}`);
  };

  // Random words for discovery
  const randomWords = words
    ? [...words].sort(() => Math.random() - 0.5).slice(0, 6)
    : [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) return null;

  const isLoading = textbooksLoading || tagsLoading;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Search className="w-5 h-5 text-indigo-500" />
              发现
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">浏览课本、单元和标签</p>
          </div>
        </div>

        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="搜索课本或标签..."
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
            {/* Random Words Section */}
            {!searchQuery && randomWords.length > 0 && (
              <section>
                <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                  <Shuffle className="w-4 h-4" />
                  随机单词
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {randomWords.map((w) => (
                    <button
                      key={w.id}
                      onClick={() => navigate(`/?search=${encodeURIComponent(w.word)}`)}
                      className="flex flex-col items-start p-3 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-indigo-200 transition-all text-left"
                    >
                      <span className="text-sm font-semibold text-gray-900">{w.word}</span>
                      {w.phonetic && <span className="text-xs text-gray-400 font-mono">{w.phonetic}</span>}
                      <span className="text-xs text-gray-500 line-clamp-1 mt-0.5">{w.definition}</span>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Textbooks Section */}
            <section>
              <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                课本
                <span className="text-xs normal-case">({filteredTextbooks?.length ?? 0})</span>
              </h2>

              {!filteredTextbooks || filteredTextbooks.length === 0 ? (
                <div className="text-center py-8 bg-white rounded-xl border border-gray-100">
                  <BookOpen className="w-10 h-10 text-gray-200 mx-auto mb-2" />
                  <p className="text-sm text-gray-400">
                    {searchQuery ? "没有匹配的课本" : "暂无课本"}
                  </p>
                </div>
              ) : (
                <div className="space-y-2">
                  {filteredTextbooks.map((tb) => {
                    const isExpanded = expandedTextbookId === tb.id;
                    return (
                      <div key={tb.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                        {/* Textbook header - clickable to filter */}
                        <div className="flex items-center gap-3 p-3">
                          <button
                            onClick={() => setExpandedTextbookId(isExpanded ? null : tb.id)}
                            className="shrink-0"
                          >
                            <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                          </button>
                          <button
                            onClick={() => handleSelectTextbook(tb.id)}
                            className="flex-1 min-w-0 text-left hover:opacity-70 transition-opacity"
                          >
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm font-medium text-gray-900 truncate">{tb.name}</p>
                              <span className="text-xs text-gray-400 shrink-0">{(tb as any).groupCount ?? 0} 个单元</span>
                            </div>
                            {tb.description && (
                              <p className="text-xs text-gray-400 truncate">{tb.description}</p>
                            )}
                          </button>
                        </div>

                        {/* Expanded units */}
                        {isExpanded && (
                          <div className="border-t border-gray-50 px-4 pb-3">
                            <div className="flex flex-wrap gap-2 pt-2">
                              {/* Fetch units for this textbook */}
                              <TextbookUnits textbookId={tb.id} onSelectUnit={handleSelectUnit} />
                            </div>
                          </div>
                        )}
                      </div>
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
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {filteredTags.map((tag) => (
                    <button
                      key={tag.id}
                      onClick={() => handleSelectTag(tag.id)}
                      className="flex items-center justify-center h-11 bg-white rounded-xl border border-gray-100 hover:shadow-md hover:border-emerald-200 transition-all text-sm font-medium text-gray-700"
                    >
                      {tag.name}
                    </button>
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </main>

      <MobileNav activeTab="discover" />
    </div>
  );
}

// Sub-component to fetch and display units for a textbook
function TextbookUnits({ textbookId, onSelectUnit }: { textbookId: number; onSelectUnit: (id: number) => void }) {
  const { data: units, isLoading } = trpc.wordGroup.list.useQuery({ textbookId });

  if (isLoading) return <Loader2 className="w-4 h-4 animate-spin text-gray-300" />;
  if (!units?.length) return <span className="text-xs text-gray-400">暂无单元</span>;

  return (
    <>
      {units.map((unit) => (
        <button
          key={unit.id}
          onClick={() => onSelectUnit(unit.id)}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100 hover:bg-indigo-100 transition-colors text-xs text-indigo-700"
        >
          <FolderOpen className="w-3 h-3" />
          <span className="truncate max-w-[120px]">{unit.name}</span>
          <span className="text-indigo-400">{(unit as any).wordCount ?? 0}</span>
        </button>
      ))}
    </>
  );
}
