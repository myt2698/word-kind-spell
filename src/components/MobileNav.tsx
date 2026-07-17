import { Link, useLocation } from "react-router";
import { BookOpen, PenLine } from "lucide-react";

export default function MobileNav() {
  const location = useLocation();
  const isActive = (path: string) => location.pathname === path;

  const tabs = [
    { path: "/", label: "单词", icon: BookOpen },
    { path: "/spelling", label: "拼写", icon: PenLine },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white/80 backdrop-blur-xl border-t border-gray-100 z-50 safe-area-pb">
      <div className="max-w-lg mx-auto flex items-center justify-around h-14">
        {tabs.map((tab) => (
          <Link
            key={tab.path}
            to={tab.path}
            className={`flex flex-col items-center justify-center gap-0.5 w-16 h-full transition-colors ${
              isActive(tab.path)
                ? "text-indigo-600"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            <tab.icon className="w-5 h-5" />
            <span className="text-[10px] font-medium">{tab.label}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
