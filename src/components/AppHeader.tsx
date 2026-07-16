import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BookOpen,
  LogOut,
  User,
  KeyRound,
  Eye,
  EyeOff,
  Loader2,
} from "lucide-react";
import { useState } from "react";

interface AppHeaderProps {
  searchComponent?: React.ReactNode;
}

function ChangePasswordDialog({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const [oldPassword, setOldPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showOld, setShowOld] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const mutation = trpc.auth.changePassword.useMutation({
    onSuccess: (data) => {
      if (data.success) {
        setSuccess("密码修改成功");
        setOldPassword("");
        setNewPassword("");
        setConfirmPassword("");
        setTimeout(() => {
          setSuccess("");
          onClose();
        }, 1500);
      } else {
        setError(data.message || "修改失败");
      }
    },
    onError: (err) => setError(err.message || "修改失败"),
  });

  const handleSubmit = () => {
    setError("");
    setSuccess("");
    if (!oldPassword) {
      setError("请输入原密码");
      return;
    }
    if (newPassword.length < 6) {
      setError("新密码至少6位字符");
      return;
    }
    if (newPassword !== confirmPassword) {
      setError("两次输入的新密码不一致");
      return;
    }
    mutation.mutate({ oldPassword, newPassword });
  };

  const handleClose = () => {
    setOldPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError("");
    setSuccess("");
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-indigo-500" />
            修改密码
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          {error && (
            <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 text-green-600 text-sm px-3 py-2 rounded-lg">{success}</div>
          )}

          <div className="space-y-1.5">
            <Label className="text-sm">原密码</Label>
            <div className="relative">
              <Input
                type={showOld ? "text" : "password"}
                value={oldPassword}
                onChange={(e) => setOldPassword(e.target.value)}
                placeholder="请输入原密码"
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowOld(!showOld)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showOld ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">新密码</Label>
            <div className="relative">
              <Input
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="至少6位字符"
                className="h-10 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowNew(!showNew)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-sm">确认新密码</Label>
            <Input
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="再次输入新密码"
              className="h-10"
            />
          </div>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1 h-10" onClick={handleClose}>
              取消
            </Button>
            <Button
              className="flex-1 h-10 bg-gradient-to-r from-indigo-500 to-blue-600"
              onClick={handleSubmit}
              disabled={mutation.isPending}
            >
              {mutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : "确认修改"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function AppHeader({ searchComponent }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between gap-3">
          {/* Left section */}
          <div className="flex items-center gap-3 shrink-0">
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
                        <p className="text-xs text-gray-500 truncate">{user.phone}</p>
                      </div>
                      <button
                        onClick={() => {
                          setShowChangePassword(true);
                          setShowUserMenu(false);
                        }}
                        className="w-full flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 transition-colors"
                      >
                        <KeyRound className="w-4 h-4" />
                        修改密码
                      </button>
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

      <ChangePasswordDialog
        open={showChangePassword}
        onClose={() => setShowChangePassword(false)}
      />
    </>
  );
}
