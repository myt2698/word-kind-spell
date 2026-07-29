import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import AppHeader, { ChangePasswordDialog } from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  LogOut,
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
  Clock,
  Award,
  GraduationCap,
  Pause,
  Shield,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react";

type ProfileTab = "stats" | "errors" | "settings";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<ProfileTab>("stats");
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [nickname, setNickname] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");

  const { data: stats, isLoading: statsLoading } = trpc.spelling.getStats.useQuery();
  const { data: errors, isLoading: errorsLoading } = trpc.spelling.getErrorBook.useQuery();
  const practicedWords = stats?.byLevel?.reduce((sum, item) => sum + Number(item.count), 0) ?? 0;

  const updateName = trpc.auth.updateName.useMutation({
    onSuccess: async (data) => {
      if (!data.success) {
        setSettingsError(data.message || "昵称修改失败");
        return;
      }
      await utils.auth.me.invalidate();
      setShowNicknameDialog(false);
      setSettingsError("");
      setSettingsMessage("昵称修改成功，下次请使用新昵称登录");
    },
    onError: (error) => setSettingsError(error.message || "昵称修改失败"),
  });

  const clearLearningRecords = trpc.spelling.clearLearningRecords.useMutation({
    onSuccess: async (data) => {
      await utils.spelling.invalidate();
      await utils.word.list.invalidate();
      setShowClearDialog(false);
      setSettingsError("");
      setSettingsMessage(data.message || "学习记录已清空");
    },
    onError: (error) => setSettingsError(error.message || "清空失败"),
  });

  const submitNickname = () => {
    const nextName = nickname.trim();
    setSettingsError("");
    setSettingsMessage("");
    if (!nextName) {
      setSettingsError("请输入昵称");
      return;
    }
    if (nextName.length > 20) {
      setSettingsError("昵称最多20个字符");
      return;
    }
    if (nextName === user?.name) {
      setSettingsError("昵称没有变化");
      return;
    }
    updateName.mutate({ name: nextName });
  };

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* User Card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 mb-6">
          <div className="flex items-center gap-3">
            <Avatar className="h-12 w-12">
              <AvatarFallback className="bg-indigo-100 text-indigo-600 text-lg font-bold">
                {user.name?.charAt(0)?.toUpperCase() || "U"}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="text-base font-semibold text-gray-900 truncate">{user.name || "用户"}</p>
              <p className="text-xs text-gray-500">{user.phone}</p>
            </div>
            {/* Admin entry - only for admin users */}
            {user.role === "admin" && (
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
                onClick={() => navigate("/admin")}
              >
                <Shield className="w-3.5 h-3.5" />
                管理后台
              </Button>
            )}
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          {[
            { key: "stats" as ProfileTab, label: "统计", icon: BarChart3 },
            { key: "errors" as ProfileTab, label: "错题本", icon: AlertTriangle },
            { key: "settings" as ProfileTab, label: "设置", icon: KeyRound },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-md text-sm font-medium transition-all ${
                activeTab === tab.key ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
              {tab.key === "errors" && errors && errors.length > 0 && (
                <span className="text-[10px] bg-red-100 text-red-600 px-1.5 py-0.5 rounded-full">{errors.length}</span>
              )}
            </button>
          ))}
        </div>

        {activeTab === "stats" && (
          <div className="space-y-4">
            {/* Learning Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <GraduationCap className="w-6 h-6 text-emerald-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats?.learningWords ?? 0}</p>
                <p className="text-xs text-gray-500">学习中</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <Pause className="w-6 h-6 text-amber-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats?.pausedWords ?? 0}</p>
                <p className="text-xs text-gray-500">已暂停</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <Clock className="w-6 h-6 text-indigo-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats?.manualDue ?? 0}</p>
                <p className="text-xs text-gray-500">新学待复习</p>
              </div>
              <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
                <Award className="w-6 h-6 text-rose-500 mx-auto mb-1" />
                <p className="text-2xl font-bold text-gray-900">{stats?.totalErrors ?? 0}</p>
                <p className="text-xs text-gray-500">累计错题</p>
              </div>
            </div>

            {/* Level Distribution */}
            <div className="bg-white rounded-xl border border-gray-100 p-4">
              <h3 className="text-sm font-semibold text-gray-700 mb-3">熟练度分布</h3>
              {statsLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-gray-400 mx-auto" />
              ) : !stats?.byLevel?.length ? (
                <p className="text-sm text-gray-400 text-center py-4">暂无练习数据</p>
              ) : (
                <div className="space-y-3">
                  {stats.byLevel.map((b) => (
                    <div key={b.level}>
                      <div className="flex justify-between text-xs mb-1">
                        <span className={b.level === 1 ? "text-red-500" : b.level === 2 ? "text-amber-500" : "text-green-500"}>
                          {b.level === 1 ? "陌生 (Lv.1)" : b.level === 2 ? "熟悉 (Lv.2)" : "掌握 (Lv.3)"}
                        </span>
                        <span className="text-gray-500">{b.count} 词</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            b.level === 1 ? "bg-red-400" : b.level === 2 ? "bg-amber-400" : "bg-green-400"
                          }`}
                          style={{ width: `${Math.min((Number(b.count) / (practicedWords || 1)) * 100, 100)}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "errors" && (
          <div className="space-y-3">
            {errorsLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" />
            ) : !errors?.length ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-green-200 mx-auto mb-3" />
                <p className="text-sm text-gray-500">太棒了！还没有错题</p>
              </div>
            ) : (
              errors.map((err) => (
                <div key={err.id} className="bg-white rounded-xl border border-gray-100 p-4">
                  <div className="mb-2 flex flex-wrap items-center gap-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm font-semibold">{err.word}</span>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                        err.level === 1
                          ? "bg-red-100 text-red-600"
                          : err.level === 2
                            ? "bg-amber-100 text-amber-700"
                            : "bg-emerald-100 text-emerald-700"
                      }`}
                    >
                      {err.level === 1
                        ? "Lv.1 陌生"
                        : err.level === 2
                          ? "Lv.2 熟悉"
                          : "Lv.3 掌握"}
                    </span>
                    <span className="text-xs text-red-500 bg-red-50 px-2 py-0.5 rounded-full">你写的：{err.userInput}</span>
                  </div>
                  {err.phonetic && <p className="text-xs text-gray-400 font-mono mb-1">{err.phonetic}</p>}
                  {err.definition && <p className="text-xs text-gray-500">{err.definition}</p>}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === "settings" && (
          <div className="space-y-3">
            {settingsMessage && (
              <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                {settingsMessage}
              </div>
            )}
            {settingsError && (
              <div className="rounded-xl border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-600">
                {settingsError}
              </div>
            )}
            <div className="overflow-hidden rounded-xl border border-gray-100 bg-white">
              <SettingsRow
                icon={Pencil}
                title="修改昵称"
                description={`当前昵称：${user.name}`}
                onClick={() => {
                  setNickname(user.name || "");
                  setSettingsError("");
                  setSettingsMessage("");
                  setShowNicknameDialog(true);
                }}
              />
              <SettingsRow
                icon={KeyRound}
                title="修改密码"
                description="使用原密码设置新密码"
                onClick={() => {
                  setSettingsError("");
                  setSettingsMessage("");
                  setShowPasswordDialog(true);
                }}
              />
              <SettingsRow
                icon={Trash2}
                title="清空学习记录"
                description="清除当前账号的进度、错题与练习记录"
                danger
                onClick={() => {
                  setSettingsError("");
                  setSettingsMessage("");
                  setShowClearDialog(true);
                }}
              />
              <SettingsRow
                icon={LogOut}
                title="退出登录"
                description="退出当前账号"
                danger
                onClick={() => logout()}
              />
            </div>
          </div>
        )}
      </main>
      <MobileNav activeTab="profile" />

      <Dialog
        open={showNicknameDialog}
        onOpenChange={(open) => {
          if (!updateName.isPending) setShowNicknameDialog(open);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>修改昵称</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-gray-500">昵称也是登录账号，修改后请使用新昵称登录。</p>
          {settingsError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{settingsError}</div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="profile-nickname">昵称</Label>
            <Input
              id="profile-nickname"
              value={nickname}
              maxLength={20}
              autoFocus
              disabled={updateName.isPending}
              onChange={(event) => {
                setNickname(event.target.value);
                setSettingsError("");
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") submitNickname();
              }}
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={updateName.isPending}
              onClick={() => setShowNicknameDialog(false)}
            >
              取消
            </Button>
            <Button disabled={updateName.isPending} onClick={submitNickname}>
              {updateName.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "保存"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ChangePasswordDialog
        open={showPasswordDialog}
        onClose={() => setShowPasswordDialog(false)}
        onChanged={() => setSettingsMessage("密码修改成功")}
      />

      <AlertDialog open={showClearDialog} onOpenChange={setShowClearDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>清空学习记录？</AlertDialogTitle>
            <AlertDialogDescription className="space-y-2">
              <span className="block">
                将清空当前账号的学习队列、复习进度、错题、练习场次和今日选词。
              </span>
              <span className="block font-medium text-gray-700">
                共享单词、课本和其他账号的数据不会删除。
              </span>
            </AlertDialogDescription>
          </AlertDialogHeader>
          {settingsError && (
            <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-600">{settingsError}</div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={clearLearningRecords.isPending}>取消</AlertDialogCancel>
            <AlertDialogAction
              disabled={clearLearningRecords.isPending}
              className="bg-red-600 text-white hover:bg-red-700"
              onClick={(event) => {
                event.preventDefault();
                clearLearningRecords.mutate();
              }}
            >
              {clearLearningRecords.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "确认清空"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function SettingsRow({
  icon: Icon,
  title,
  description,
  danger = false,
  onClick,
}: {
  icon: typeof Pencil;
  title: string;
  description: string;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className="flex w-full items-center gap-3 border-b border-gray-100 px-4 py-3.5 text-left transition-colors last:border-b-0 hover:bg-gray-50"
      onClick={onClick}
    >
      <span
        className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
          danger ? "bg-red-50 text-red-500" : "bg-indigo-50 text-indigo-600"
        }`}
      >
        <Icon className="h-4.5 w-4.5" />
      </span>
      <span className="min-w-0 flex-1">
        <span className={`block text-sm font-medium ${danger ? "text-red-600" : "text-gray-900"}`}>
          {title}
        </span>
        <span className="block truncate text-xs text-gray-500">{description}</span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-gray-300" />
    </button>
  );
}
