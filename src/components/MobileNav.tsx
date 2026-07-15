import { LayoutGrid, FolderOpen, Tag, BarChart3, Plus } from "lucide-react";
import { useNavigate, useLocation } from "react-router";

interface MobileNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
  onAdd?: () => void;
}

const tabs = [
  { key: "words", label: "单词", icon: LayoutGrid, path: "/" },
  { key: "groups", label: "分组", icon: FolderOpen, path: "/" },
  { key: "add", label: "添加", icon: Plus, isAction: true },
  { key: "tags", label: "标签", icon: Tag, path: "/tags" },
  { key: "stats", label: "统计", icon: BarChart3, path: "/" },
];

export default function MobileNav({ activeTab, onTabChange, onAdd }: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL if not provided
  const currentPath = location.pathname;
  const currentTab = activeTab ?? (currentPath === "/tags" ? "tags" : "words");

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.isAction) {
      onAdd?.();
      return;
    }

    if (tab.path) {
      navigate(tab.path);
    }

    // Also call onTabChange for backward compat
    onTabChange?.(tab.key);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-100 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
          if (tab.isAction) {
            return (
              <button
                key={tab.key}
                onClick={() => handleTabClick(tab)}
                className="flex flex-col items-center justify-center -mt-4"
              >
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-indigo-500 to-blue-600 flex items-center justify-center shadow-lg shadow-indigo-200">
                  <Plus className="w-5 h-5 text-white" />
                </div>
              </button>
            );
          }

          const Icon = tab.icon;
          const isActive = currentTab === tab.key || currentPath === tab.path;

          return (
            <button
              key={tab.key}
              onClick={() => handleTabClick(tab)}
              className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-all ${
                isActive ? "text-indigo-600" : "text-gray-400"
              }`}
            >
              <Icon className={`w-5 h-5 ${isActive ? "stroke-[2.5px]" : ""}`} />
              <span className={`text-[10px] ${isActive ? "font-medium" : ""}`}>{tab.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
