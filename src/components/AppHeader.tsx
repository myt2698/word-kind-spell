import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/hooks/useAuth";
import { BookOpen, LogOut, Menu, User } from "lucide-react";
import { useState } from "react";

interface AppHeaderProps {
  onMenuToggle?: () => void;
  searchComponent?: React.ReactNode;
}

export default function AppHeader({ onMenuToggle, searchComponent }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);

  return (
    <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
        {/* Left section */}
        <div className="flex items-center gap-3 shrink-0">
          {onMenuToggle && (
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden h-9 w-9"
              onClick={onMenuToggle}
            >
              <Menu className="h-5 w-5 text-gray-600" />
            </Button>
          )}
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-blue-600 rounded-lg flex items-center justify-center shadow-md">
              <BookOpen className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-lg text-gray-900 hidden sm:block">WordMind</span>
          </div>
        </div>

        {/* Center - Search */}
        {searchComponent && (
          <div className="flex-1 max-w-md">
            {searchComponent}
          </div>
        )}

        {/* Right section */}
        <div className="flex items-center gap-2 shrink-0 relative">
          {user && (
            <>
              <Button
                variant="ghost"
                size="sm"
                className="hidden sm:flex items-center gap-2 text-gray-600 hover:text-gray-900"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                    {user.name?.charAt(0)?.toUpperCase() || <User className="w-3 h-3" />}
                  </AvatarFallback>
                </Avatar>
                <span className="text-sm max-w-[100px] truncate">{user.name || "用户"}</span>
              </Button>

              {/* Mobile avatar */}
              <Button
                variant="ghost"
                size="icon"
                className="sm:hidden h-9 w-9"
                onClick={() => setShowUserMenu(!showUserMenu)}
              >
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-indigo-100 text-indigo-600 text-xs">
                    {user.name?.charAt(0)?.toUpperCase() || <User className="w-3 h-3" />}
                  </AvatarFallback>
                </Avatar>
              </Button>

              {/* User dropdown menu */}
              {showUserMenu && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setShowUserMenu(false)}
                  />
                  <div className="absolute right-0 top-full mt-2 w-48 bg-white rounded-xl shadow-lg border border-gray-100 py-1 z-50">
                    <div className="px-4 py-2 border-b border-gray-50">
                      <p className="text-sm font-medium text-gray-900 truncate">{user.name}</p>
                      <p className="text-xs text-gray-500 truncate">{user.email}</p>
                    </div>
                    <button
                      onClick={() => {
                        logout();
                        setShowUserMenu(false);
                      }}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 transition-colors"
                    >
                      <LogOut className="w-4 h-4" />
                      退出登录
                    </button>
                  </div>
                </>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  );
}
