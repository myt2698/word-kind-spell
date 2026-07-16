import { LayoutGrid, FolderOpen, Tag, Search } from "lucide-react";
import { useNavigate, useLocation } from "react-router";

interface MobileNavProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

const tabs = [
  { key: "words", label: "单词", icon: LayoutGrid, path: "/" },
  { key: "groups", label: "分组", icon: FolderOpen, path: "/groups" },
  { key: "tags", label: "标签", icon: Tag, path: "/tags" },
  { key: "search", label: "搜索", icon: Search, path: "/search" },
];

export default function MobileNav({ activeTab, onTabChange }: MobileNavProps) {
  const navigate = useNavigate();
  const location = useLocation();

  // Determine active tab from URL if not provided
  const currentPath = location.pathname;
  const currentTab = activeTab ?? (
    currentPath === "/tags" ? "tags" :
    currentPath === "/groups" ? "groups" :
    currentPath === "/search" ? "search" :
    "words"
  );

  const handleTabClick = (tab: typeof tabs[0]) => {
    if (tab.path) {
      navigate(tab.path);
    }
    onTabChange?.(tab.key);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/90 backdrop-blur-lg border-t border-gray-100 safe-area-pb">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto">
        {tabs.map((tab) => {
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
