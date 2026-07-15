import { useState, useCallback } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import AppSidebar from "@/components/AppSidebar";
import MobileNav from "@/components/MobileNav";
import SearchBar from "@/components/SearchBar";
import FilterBar, { type SortBy } from "@/components/FilterBar";
import WordCard from "@/components/WordCard";
import type { WordCardData } from "@/components/WordCard";
import WordForm, { type WordFormData } from "@/components/WordForm";
import GroupManager from "@/components/GroupManager";
import TagManager from "@/components/TagManager";
import StatsPanel from "@/components/StatsPanel";
import EmptyState from "@/components/EmptyState";
import {
  Sheet,
  SheetContent,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Plus, GraduationCap } from "lucide-react";

export default function Home() {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("newest");
  const [selectedGroup, setSelectedGroup] = useState<number | null>(null);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);

  // Dialog/Sheet state
  const [showWordForm, setShowWordForm] = useState(false);
  const [editWord, setEditWord] = useState<WordCardData | null>(null);
  const [showGroupManager, setShowGroupManager] = useState(false);
  const [showTagManager, setShowTagManager] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [mobileTab, setMobileTab] = useState("words");

  // Fetch words
  const { data: words, isLoading: wordsLoading } = trpc.word.list.useQuery({
    groupId: selectedGroup ?? undefined,
    tagId: selectedTag ?? undefined,
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

  const handleMobileTabChange = (tab: string) => {
    setMobileTab(tab);
    if (tab === "groups") {
      setShowGroupManager(true);
    } else if (tab === "tags") {
      setShowTagManager(true);
    } else if (tab === "stats") {
      setShowStats(true);
    }
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
  const isEmpty = filteredWords.length === 0 && !wordsLoading && !searchQuery && !selectedGroup && !selectedTag;

  return (
    <div className="min-h-screen bg-gray-50/50">
      {/* Header */}
      <AppHeader
        onMenuToggle={() => setShowMobileSidebar(true)}
        searchComponent={<SearchBar onSearch={handleSearch} />}
      />

      <div className="max-w-7xl mx-auto flex">
        {/* Desktop Sidebar */}
        <aside className="hidden lg:block w-64 shrink-0 sticky top-14 h-[calc(100vh-3.5rem)] border-r border-gray-100">
          <AppSidebar
            selectedGroup={selectedGroup}
            onSelectGroup={setSelectedGroup}
            selectedTag={selectedTag}
            onSelectTag={setSelectedTag}
            onOpenGroupManager={() => setShowGroupManager(true)}
            onOpenTagManager={() => setShowTagManager(true)}
            onOpenStats={() => setShowStats(true)}
          />
        </aside>

        {/* Mobile Sidebar Sheet */}
        <Sheet open={showMobileSidebar} onOpenChange={setShowMobileSidebar}>
          <SheetContent side="left" className="w-72 p-0">
            <AppSidebar
              selectedGroup={selectedGroup}
              onSelectGroup={(id) => {
                setSelectedGroup(id);
                setShowMobileSidebar(false);
              }}
              selectedTag={selectedTag}
              onSelectTag={(id) => {
                setSelectedTag(id);
                setShowMobileSidebar(false);
              }}
              onOpenGroupManager={() => {
                setShowGroupManager(true);
                setShowMobileSidebar(false);
              }}
              onOpenTagManager={() => {
                setShowTagManager(true);
                setShowMobileSidebar(false);
              }}
              onOpenStats={() => {
                setShowStats(true);
                setShowMobileSidebar(false);
              }}
              mobile
              onClose={() => setShowMobileSidebar(false)}
            />
          </SheetContent>
        </Sheet>

        {/* Main Content */}
        <main className="flex-1 min-w-0">
          <div className="px-4 py-4 lg:px-6 lg:py-6">
            {/* Title & Add Button (Desktop) */}
            <div className="hidden lg:flex items-center justify-between mb-4">
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  {selectedGroup && selectedTag
                    ? `${groupsList?.find((g) => g.id === selectedGroup)?.name ?? ""} + ${tagsList?.find((t) => t.id === selectedTag)?.name ?? ""}`
                    : selectedGroup
                      ? groupsList?.find((g) => g.id === selectedGroup)?.name ?? "分组单词"
                      : selectedTag
                        ? tagsList?.find((t) => t.id === selectedTag)?.name ?? "标签单词"
                        : "我的单词本"}
                </h1>
                <p className="text-sm text-gray-500 mt-0.5">
                  共 {filteredWords.length} 个单词
                </p>
              </div>
              <Button
                onClick={() => {
                  setEditWord(null);
                  setShowWordForm(true);
                }}
                className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700 shadow-lg shadow-indigo-200"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                添加单词
              </Button>
            </div>

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
              <div className="space-y-3 pb-20 lg:pb-0">
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
          </div>
        </main>
      </div>

      {/* Mobile Bottom Nav */}
      <MobileNav
        activeTab={mobileTab}
        onTabChange={handleMobileTabChange}
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

      {/* Group Manager Dialog */}
      <GroupManager
        open={showGroupManager}
        onClose={() => setShowGroupManager(false)}
      />

      {/* Tag Manager Dialog */}
      <TagManager
        open={showTagManager}
        onClose={() => setShowTagManager(false)}
      />

      {/* Stats Dialog */}
      <Dialog open={showStats} onOpenChange={setShowStats}>
        <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <GraduationCap className="w-5 h-5 text-indigo-500" />
              学习统计
            </DialogTitle>
          </DialogHeader>
          <StatsPanel />
        </DialogContent>
      </Dialog>
    </div>
  );
}
