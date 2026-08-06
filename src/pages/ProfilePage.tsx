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
import { ScrollArea } from "@/components/ui/scroll-area";
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
  Shield,
  Pencil,
  Trash2,
  ChevronRight,
} from "lucide-react";

type ProfileTab = "stats" | "errors" | "settings";
type ProficiencyLevel = 1 | 2 | 3;
type ProfileStatKind = "learning" | "new" | "review" | "errors";
type ProfileWordSummary = {
  id: number;
  word: string;
  phonetic?: string | null;
  definition?: string | null;
};

const proficiencyLevels: Array<{
  level: ProficiencyLevel;
  label: string;
  textClass: string;
  barClass: string;
}> = [
  { level: 1, label: "陌生 (Lv.1)", textClass: "text-red-500", barClass: "bg-red-400" },
  { level: 2, label: "熟悉 (Lv.2)", textClass: "text-amber-500", barClass: "bg-amber-400" },
  { level: 3, label: "掌握 (Lv.3)", textClass: "text-green-500", barClass: "bg-green-400" },
];

export default function ProfilePage() {
  const { user, logout, isLoading: authLoading } = useAuth({
    redirectOnUnauthenticated: true,
  });
  const navigate = useNavigate();
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<ProfileTab>("stats");
  const [showNicknameDialog, setShowNicknameDialog] = useState(false);
  const [showPasswordDialog, setShowPasswordDialog] = useState(false);
  const [showClearDialog, setShowClearDialog] = useState(false);
  const [nickname, setNickname] = useState("");
  const [settingsMessage, setSettingsMessage] = useState("");
  const [settingsError, setSettingsError] = useState("");
  const [selectedLevel, setSelectedLevel] = useState<ProficiencyLevel | null>(null);
  const [selectedStat, setSelectedStat] = useState<ProfileStatKind | null>(null);

  const { data: stats, isLoading: statsLoading } = trpc.spelling.getStats.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: errors, isLoading: errorsLoading } = trpc.spelling.getErrorBook.useQuery(undefined, {
    enabled: !!user,
  });
  const { data: learningQueue, isLoading: levelWordsLoading } =
    trpc.spelling.getLearningQueue.useQuery(undefined, {
      enabled: !!user && (
        selectedLevel !== null || (
          selectedStat !== null && selectedStat !== "errors"
        )
      ),
    });
  const { data: errorWords, isLoading: errorWordsLoading } =
    trpc.spelling.getErrorWords.useQuery(undefined, {
      enabled: !!user && selectedStat === "errors",
    });
  const practicedWords = stats?.byLevel?.reduce((sum, item) => sum + Number(item.count), 0) ?? 0;
  const selectedLevelWords = selectedLevel === null
    ? []
    : (learningQueue ?? []).filter((word) => word.level === selectedLevel);
  const selectedLevelLabel = proficiencyLevels.find(
    (item) => item.level === selectedLevel,
  )?.label;
  const statDialogData: {
    title: string;
    words: ProfileWordSummary[];
    loading: boolean;
    emptyText: string;
  } = (() => {
    switch (selectedStat) {
      case "learning":
        return {
          title: "学习中的单词",
          words: learningQueue ?? [],
          loading: levelWordsLoading,
          emptyText: "暂无学习中的单词",
        };
      case "new":
        return {
          title: "新学单词",
          words: (learningQueue ?? []).filter(
            (word) => word.source === "manual" && word.totalAttempts === 0,
          ),
          loading: levelWordsLoading,
          emptyText: "暂无新学单词",
        };
      case "review":
        return {
          title: "待复习队列",
          words: (learningQueue ?? []).filter(
            (word) => new Date(word.nextReviewAt).getTime() <= Date.now(),
          ),
          loading: levelWordsLoading,
          emptyText: "暂无待复习单词",
        };
      case "errors":
        return {
          title: "错题本",
          words: errorWords ?? [],
          loading: errorWordsLoading,
          emptyText: "暂无错题",
        };
      default:
        return { title: "", words: [], loading: false, emptyText: "" };
    }
  })();

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

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50/50">
        <div className="flex flex-col items-center gap-3 text-sm text-gray-500">
          <Loader2 className="h-7 w-7 animate-spin text-indigo-500" />
          <span>{authLoading ? "正在加载个人页面" : "正在返回登录页"}</span>
        </div>
      </div>
    );
  }

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
            <div className="grid grid-cols-4 gap-3">
              <button
                type="button"
                onClick={() => setSelectedStat("learning")}
                className="rounded-xl border border-gray-100 bg-white p-3 text-center transition-all hover:border-emerald-200 hover:shadow-md"
              >
                <p className="text-2xl font-bold text-emerald-600">{stats?.learningWords ?? 0}</p>
                <p className="text-xs text-gray-500">学习中</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStat("new")}
                className="rounded-xl border border-gray-100 bg-white p-3 text-center transition-all hover:border-indigo-200 hover:shadow-md"
              >
                <p className="text-2xl font-bold text-indigo-600">{stats?.manualDue ?? 0}</p>
                <p className="text-xs text-gray-500">新学单词</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStat("review")}
                className="rounded-xl border border-gray-100 bg-white p-3 text-center transition-all hover:border-amber-200 hover:shadow-md"
              >
                <p className="text-2xl font-bold text-amber-600">{stats?.dueForReview ?? 0}</p>
                <p className="text-xs text-gray-500">总待复习</p>
              </button>
              <button
                type="button"
                onClick={() => setSelectedStat("errors")}
                className="rounded-xl border border-gray-100 bg-white p-3 text-center transition-all hover:border-rose-200 hover:shadow-md"
              >
                <p className="text-2xl font-bold text-rose-600">{stats?.totalErrors ?? 0}</p>
                <p className="text-xs text-gray-500">错题</p>
              </button>
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
                  {proficiencyLevels.map((item) => {
                    const count = Number(
                      stats.byLevel.find((entry) => entry.level === item.level)?.count ?? 0,
                    );
                    return (
                      <button
                        key={item.level}
                        type="button"
                        onClick={() => setSelectedLevel(item.level)}
                        className="w-full rounded-lg p-2 text-left transition-colors hover:bg-gray-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400"
                        aria-label={`查看${item.label}的单词列表，共${count}词`}
                      >
                        <div className="flex justify-between text-xs mb-1">
                          <span className={item.textClass}>
                            {item.label}
                          </span>
                          <span className="flex items-center gap-1 text-gray-500">
                            {count} 词
                            <ChevronRight className="h-3.5 w-3.5" />
                          </span>
                        </div>
                        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${item.barClass}`}
                            style={{ width: `${Math.min((count / (practicedWords || 1)) * 100, 100)}%` }}
                          />
                        </div>
                      </button>
                    );
                  })}
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
        open={selectedLevel !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedLevel(null);
        }}
      >
        <DialogContent className="max-h-[75vh] max-w-md overflow-hidden p-0">
          <DialogHeader className="border-b border-gray-100 p-5 pb-3">
            <DialogTitle className="text-base font-semibold">
              {selectedLevelLabel ?? "熟练度"}单词
              {!levelWordsLoading && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({selectedLevelWords.length} 个)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {levelWordsLoading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : selectedLevelWords.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">该等级暂无单词</p>
          ) : (
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-2 p-3">
                {selectedLevelWords.map((word) => (
                  <div
                    key={word.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-gray-900">{word.word}</span>
                      {word.phonetic && (
                        <span className="shrink-0 font-mono text-xs text-gray-400">
                          {word.phonetic}
                        </span>
                      )}
                    </div>
                    {word.definition && (
                      <p className="mt-1 text-xs text-gray-500">{word.definition}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

      <Dialog
        open={selectedStat !== null}
        onOpenChange={(open) => {
          if (!open) setSelectedStat(null);
        }}
      >
        <DialogContent className="max-h-[75vh] max-w-md overflow-hidden p-0">
          <DialogHeader className="border-b border-gray-100 p-5 pb-3">
            <DialogTitle className="text-base font-semibold">
              {statDialogData.title}
              {!statDialogData.loading && (
                <span className="ml-2 text-xs font-normal text-gray-400">
                  ({statDialogData.words.length} 个)
                </span>
              )}
            </DialogTitle>
          </DialogHeader>

          {statDialogData.loading ? (
            <div className="flex justify-center py-10">
              <Loader2 className="h-6 w-6 animate-spin text-indigo-500" />
            </div>
          ) : statDialogData.words.length === 0 ? (
            <p className="py-10 text-center text-sm text-gray-400">
              {statDialogData.emptyText}
            </p>
          ) : (
            <ScrollArea className="max-h-[55vh]">
              <div className="space-y-2 p-3">
                {statDialogData.words.map((word) => (
                  <div
                    key={word.id}
                    className="rounded-xl border border-gray-100 bg-gray-50 px-3 py-2.5"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="font-medium text-gray-900">{word.word}</span>
                      {word.phonetic && (
                        <span className="shrink-0 font-mono text-xs text-gray-400">
                          {word.phonetic}
                        </span>
                      )}
                    </div>
                    {word.definition && (
                      <p className="mt-1 text-xs text-gray-500">{word.definition}</p>
                    )}
                  </div>
                ))}
              </div>
            </ScrollArea>
          )}
        </DialogContent>
      </Dialog>

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
