import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  LogOut,
  KeyRound,
  BookOpen,
  Target,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Loader2,
  BarChart3,
  Clock,
  Award,
  GraduationCap,
  Pause,
} from "lucide-react";

type ProfileTab = "stats" | "errors" | "settings";

export default function ProfilePage() {
  const { user, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<ProfileTab>("stats");

  const { data: stats, isLoading: statsLoading } = trpc.spelling.getStats.useQuery();
  const { data: errors, isLoading: errorsLoading } = trpc.spelling.getErrorBook.useQuery();

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
                          style={{ width: `${Math.min((b.count / (stats.practicedWords || 1)) * 100, 100)}%` }}
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
                  <div className="flex items-center gap-2 mb-2">
                    <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                    <span className="text-sm font-semibold">{err.word}</span>
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
          <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
            <Button
              variant="outline"
              className="w-full h-11 justify-start gap-2"
              onClick={() => logout()}
            >
              <LogOut className="w-4 h-4 text-red-500" />
              <span className="text-red-500">退出登录</span>
            </Button>
          </div>
        )}
      </main>
      <MobileNav activeTab="profile" />
    </div>
  );
}
