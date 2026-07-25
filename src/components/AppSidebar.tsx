import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router";
import {
  LayoutGrid,
  Settings,
  BarChart3,
  ChevronRight,
  X,
  Star,
} from "lucide-react";

interface GroupItem {
  id: number;
  name: string;
  description: string | null;
  sortOrder: number;
  wordCount: number;
}

interface AppSidebarProps {
  selectedGroup: number | null;
  onSelectGroup: (id: number | null) => void;
  selectedTag: number | null;
  onSelectTag: (id: number | null) => void;
  onOpenGroupManager: () => void;
  onOpenStats: () => void;
  mobile?: boolean;
  onClose?: () => void;
}

export default function AppSidebar({
  selectedGroup,
  onSelectGroup,
  selectedTag,
  onSelectTag,
  onOpenGroupManager,
  onOpenStats,
  mobile,
  onClose,
}: AppSidebarProps) {
  const navigate = useNavigate();
  const { data: groups } = trpc.wordGroup.list.useQuery();
  const { data: tags } = trpc.tag.listWithCount.useQuery();
  const { data: userSettings } = trpc.wordGroup.getSettings.useQuery();

  return (
    <div className="h-full flex flex-col bg-white">
      {/* Mobile header */}
      {mobile && (
        <div className="flex items-center justify-between p-4 border-b border-gray-100">
          <h2 className="font-semibold text-gray-900">导航</h2>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {/* All Words */}
        <div>
          <button
            onClick={() => {
              onSelectGroup(null);
              onSelectTag(null);
            }}
            className={`w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm transition-all ${
              !selectedGroup && !selectedTag
                ? "bg-indigo-50 text-indigo-700 font-medium"
                : "text-gray-600 hover:bg-gray-50"
            }`}
          >
            <LayoutGrid className="w-4 h-4" />
            全部单词
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
          </button>
        </div>

        {/* Groups */}
        <div>
          <div className="flex items-center justify-between px-3 mb-1.5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">分组</h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-gray-400 hover:text-indigo-600"
              onClick={onOpenGroupManager}
            >
              <Settings className="w-3.5 h-3.5" />
            </Button>
          </div>
          <div className="space-y-0.5">
            {groups?.map((group) => {
              const isDefault = userSettings?.defaultGroupId === group.id;
              return (
                <button
                  key={group.id}
                  onClick={() => {
                    onSelectGroup(selectedGroup === group.id ? null : group.id);
                  }}
                  className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm transition-all ${
                    selectedGroup === group.id
                      ? "bg-indigo-50 text-indigo-700 font-medium"
                      : "text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <span className="truncate flex-1 text-left">{group.name}</span>
                  <span className="text-xs opacity-50 shrink-0">{(group as unknown as GroupItem).wordCount ?? 0}</span>
                  {isDefault && (
                    <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                  )}
                </button>
              );
            })}
            {groups?.length === 0 && (
              <p className="text-xs text-gray-400 px-3 py-2">暂无分组</p>
            )}
          </div>
        </div>

        {/* Tags */}
        <div>
          <div className="px-3 mb-1.5">
            <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">标签</h3>
          </div>
          <div className="flex flex-wrap gap-1.5 px-3">
            {tags?.map((tag) => (
              <button
                key={tag.id}
                onClick={() => {
                  onSelectTag(selectedTag === tag.id ? null : tag.id);
                }}
                className={`inline-flex items-center gap-1 px-2.5 py-1 text-xs rounded-full border transition-all ${
                  selectedTag === tag.id
                    ? "bg-indigo-50 text-indigo-600 border-indigo-300 ring-2 ring-offset-1 ring-indigo-200 font-medium"
                    : "bg-gray-50 text-gray-500 border-gray-200 opacity-70 hover:opacity-100"
                }`}
              >
                {tag.name}
                <span className="text-[10px] opacity-60">{tag.wordCount}</span>
              </button>
            ))}
            {tags?.length === 0 && (
              <p className="text-xs text-gray-400">暂无标签</p>
            )}
          </div>
        </div>

        {/* Stats shortcut */}
        <div>
          <button
            onClick={onOpenStats}
            className="w-full flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-all"
          >
            <BarChart3 className="w-4 h-4" />
            学习统计
            <ChevronRight className="w-3.5 h-3.5 ml-auto opacity-50" />
          </button>
        </div>
      </div>
    </div>
  );
}
