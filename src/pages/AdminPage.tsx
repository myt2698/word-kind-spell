import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  BookOpen, Tag, Hash, GraduationCap, Folder, Plus,
  Edit3, Trash2, X, ChevronDown, ChevronUp, ArrowLeft,
  BookMarked, Layers, Loader2, Volume2,
} from "lucide-react";
import WordForm from "@/components/WordForm";

// ========== Login Screen ==========
function AdminLogin({ onLogin }: { onLogin: (token: string) => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    if (!password.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/trpc/admin.login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ json: { password } }),
      });
      const data = await res.json();
      if (data.result?.data?.json?.success && data.result?.data?.json?.token) {
        const token = data.result.data.json.token;
        localStorage.setItem("admin_token", token);
        onLogin(token);
      } else {
        setError("密码错误");
      }
    } catch (err) {
      setError("网络错误，请重试");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-lg p-6 space-y-4">
        <div className="text-center">
          <div className="w-14 h-14 rounded-xl bg-gradient-to-r from-indigo-500 to-blue-600 flex items-center justify-center mx-auto mb-3">
            <BookOpen className="w-7 h-7 text-white" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">管理后台</h1>
          <p className="text-sm text-gray-500 mt-1">WordMind 数据管理中心</p>
        </div>
        {error && <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg">{error}</div>}
        <div className="space-y-3">
          <Label>管理密码</Label>
          <Input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="输入管理密码"
            onKeyDown={(e) => e.key === "Enter" && handleLogin()}
          />
          <Button className="w-full bg-gradient-to-r from-indigo-500 to-blue-600" onClick={handleLogin} disabled={loading}>
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "登录"}
          </Button>
        </div>
        <Button variant="ghost" className="w-full text-gray-400" onClick={() => window.location.href = "/"}>
          <ArrowLeft className="w-4 h-4 mr-1" /> 返回首页
        </Button>
      </div>
    </div>
  );
}

// ========== Stats Cards ==========
function StatsCards() {
  const { data: stats } = trpc.admin.stats.useQuery();
  const cards = [
    { label: "单词总数", value: stats?.words ?? 0, icon: BookMarked, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "标签数量", value: stats?.tags ?? 0, icon: Tag, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "课本数量", value: stats?.textbooks ?? 0, icon: Layers, color: "text-purple-600", bg: "bg-purple-50" },
    { label: "单元数量", value: stats?.groups ?? 0, icon: Folder, color: "text-amber-600", bg: "bg-amber-50" },
  ];
  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {cards.map((c) => (
        <div key={c.label} className="bg-white rounded-xl p-4 border border-gray-100">
          <div className={`w-8 h-8 rounded-lg ${c.bg} flex items-center justify-center mb-2`}>
            <c.icon className={`w-4 h-4 ${c.color}`} />
          </div>
          <p className="text-2xl font-bold text-gray-900">{c.value}</p>
          <p className="text-xs text-gray-500">{c.label}</p>
        </div>
      ))}
    </div>
  );
}

// ========== Word Management ==========
function WordManager() {
  const { data: words, isLoading } = trpc.word.list.useQuery();
  const utils = trpc.useUtils();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [editingWord, setEditingWord] = useState<any>(null);
  const deleteWord = trpc.word.delete.useMutation({ onSuccess: () => utils.word.list.invalidate() });

  const filtered = words?.filter((w: any) =>
    !search || w.word.toLowerCase().includes(search.toLowerCase()) || w.definition.includes(search)
  ) ?? [];

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <Input placeholder="搜索单词..." value={search} onChange={(e) => setSearch(e.target.value)} className="flex-1" />
        <Button className="bg-gradient-to-r from-indigo-500 to-blue-600" onClick={() => { setEditingWord(null); setShowForm(true); }}>
          <Plus className="w-4 h-4 mr-1" /> 新建
        </Button>
      </div>
      {isLoading ? (
        <div className="text-center py-10 text-gray-400"><Loader2 className="w-6 h-6 animate-spin mx-auto" /></div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-10 text-gray-400">暂无单词</div>
      ) : (
        <ScrollArea className="h-[calc(100vh-300px)]">
          <div className="space-y-2">
            {filtered.map((w: any) => (
              <div key={w.id} className="flex items-center gap-3 p-3 bg-white rounded-xl border border-gray-100 hover:shadow-sm transition-all">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-gray-900">{w.word}</span>
                    {w.phonetic && <span className="text-xs text-gray-400 font-mono">{w.phonetic}</span>}
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-1">{w.definition}</p>
                  <div className="flex gap-1 mt-1">
                    {w.groupName && <Badge variant="outline" className="text-[10px]"><Folder className="w-2.5 h-2.5 mr-0.5" />{w.groupName}</Badge>}
                    {w.tags.map((t: any) => <Badge key={t.id} className="text-[10px] bg-indigo-50 text-indigo-600">{t.name}</Badge>)}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingWord(w); setShowForm(true); }}><Edit3 className="w-3.5 h-3.5" /></Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => { if (confirm(`删除 "${w.word}"？`)) deleteWord.mutate({ id: w.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
              </div>
            ))}
          </div>
        </ScrollArea>
      )}
      {showForm && (
        <WordForm open={showForm} onClose={() => setShowForm(false)} onSubmit={(data) => {
          if (editingWord) {
            trpc.word.update.useMutation().mutate({ id: editingWord.id, ...data });
          } else {
            trpc.word.create.useMutation().mutate(data as any);
          }
          setShowForm(false);
          utils.word.list.invalidate();
        }} editWord={editingWord} />
      )}
    </div>
  );
}

// ========== Tag Management ==========
function TagManager() {
  const { data: tags } = trpc.tag.listWithCount.useQuery();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const createTag = trpc.tag.create.useMutation({ onSuccess: () => { utils.tag.list.invalidate(); utils.tag.listWithCount.invalidate(); setDialogOpen(false); setForm({ name: "", description: "" }); } });
  const updateTag = trpc.tag.update.useMutation({ onSuccess: () => { utils.tag.list.invalidate(); utils.tag.listWithCount.invalidate(); setDialogOpen(false); setEditingId(null); } });
  const deleteTag = trpc.tag.delete.useMutation({ onSuccess: () => utils.tag.listWithCount.invalidate() });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button className="bg-gradient-to-r from-emerald-500 to-teal-600" onClick={() => { setEditingId(null); setForm({ name: "", description: "" }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> 新建标签
        </Button>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
        {(tags ?? []).sort((a: any, b: any) => a.name.localeCompare(b.name, "zh-CN")).map((tag: any) => (
          <div key={tag.id} className="bg-white rounded-xl border border-gray-100 p-3 flex flex-col items-center text-center gap-1.5 hover:shadow-md transition-all cursor-pointer relative group"
            onClick={() => { setEditingId(tag.id); setForm({ name: tag.name, description: tag.description || "" }); setDialogOpen(true); }}>
            <Hash className="w-5 h-5 text-emerald-500" />
            <span className="text-sm font-medium text-gray-900 truncate w-full">{tag.name}</span>
            <span className="text-xs text-gray-400">{tag.wordCount} 词</span>
            <button className="absolute top-1 right-1 p-1 rounded hover:bg-red-50 text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" onClick={(e) => { e.stopPropagation(); if (confirm(`删除标签 "${tag.name}"？`)) deleteTag.mutate({ id: tag.id }); }}>
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingId ? "编辑标签" : "新建标签"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>名称</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="标签名称" /></div>
            <div><Label>备注</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="备注（可选）" className="min-h-[60px]" /></div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button className="flex-1 bg-gradient-to-r from-emerald-500 to-teal-600" onClick={() => {
                if (editingId) updateTag.mutate({ id: editingId, ...form });
                else createTag.mutate(form);
              }}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Textbook Management ==========
function TextbookManager() {
  const { data: textbooks } = trpc.textbook.list.useQuery();
  const utils = trpc.useUtils();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const createTb = trpc.textbook.create.useMutation({ onSuccess: () => { utils.textbook.list.invalidate(); setDialogOpen(false); setForm({ name: "", description: "" }); } });
  const updateTb = trpc.textbook.update.useMutation({ onSuccess: () => { utils.textbook.list.invalidate(); setDialogOpen(false); setEditingId(null); } });
  const deleteTb = trpc.textbook.delete.useMutation({ onSuccess: () => utils.textbook.list.invalidate() });

  return (
    <div>
      <div className="flex justify-end mb-4">
        <Button className="bg-gradient-to-r from-purple-500 to-violet-600" onClick={() => { setEditingId(null); setForm({ name: "", description: "" }); setDialogOpen(true); }}>
          <Plus className="w-4 h-4 mr-1" /> 新建课本
        </Button>
      </div>
      <div className="space-y-2">
        {(textbooks ?? []).map((tb: any) => (
          <div key={tb.id} className="bg-white rounded-xl border border-gray-100 p-4 flex items-center gap-3 hover:shadow-sm transition-all">
            <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center"><BookOpen className="w-5 h-5 text-purple-500" /></div>
            <div className="flex-1 min-w-0">
              <p className="font-medium text-gray-900">{tb.name}</p>
              <p className="text-xs text-gray-400">{tb.groupCount} 个单元 {tb.description ? `· ${tb.description}` : ""}</p>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => { setEditingId(tb.id); setForm({ name: tb.name, description: tb.description || "" }); setDialogOpen(true); }}><Edit3 className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8 text-red-400" onClick={() => { if (confirm(`删除课本 "${tb.name}"？\n课本下的单元会被删除，但单词会保留。`)) deleteTb.mutate({ id: tb.id }); }}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        ))}
      </div>
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-sm">
          <DialogHeader><DialogTitle>{editingId ? "编辑课本" : "新建课本"}</DialogTitle></DialogHeader>
          <div className="space-y-3 pt-2">
            <div><Label>名称</Label><Input value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="课本名称" /></div>
            <div><Label>备注</Label><Textarea value={form.description} onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))} placeholder="备注（可选）" className="min-h-[60px]" /></div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => setDialogOpen(false)}>取消</Button>
              <Button className="flex-1 bg-gradient-to-r from-purple-500 to-violet-600" onClick={() => { if (editingId) updateTb.mutate({ id: editingId, ...form }); else createTb.mutate(form); }}>保存</Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Main Admin Page ==========
export default function AdminPage() {
  const [token, setToken] = useState(localStorage.getItem("admin_token"));
  const { data: checkResult, isLoading: checkLoading } = trpc.admin.check.useQuery({ token: token || "" }, { enabled: !!token });
  const [activeTab, setActiveTab] = useState<"words" | "tags" | "textbooks">("words");

  const isValid = checkResult?.valid;

  // Show loading while checking token validity
  if (token && checkLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!token || !isValid) {
    return <AdminLogin onLogin={(t) => setToken(t)} />;
  }

  const tabs = [
    { key: "words" as const, label: "单词", icon: BookMarked },
    { key: "tags" as const, label: "标签", icon: Tag },
    { key: "textbooks" as const, label: "课本", icon: Layers },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-100 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gradient-to-r from-indigo-500 to-blue-600 flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-gray-900">管理后台</h1>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="text-gray-500" onClick={() => window.location.href = "/"}>
            <ArrowLeft className="w-4 h-4 mr-1" /> 返回首页
          </Button>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6">
        {/* Stats */}
        <StatsCards />

        {/* Tabs */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setActiveTab(t.key)} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === t.key ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
              <t.icon className="w-4 h-4" /> {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        {activeTab === "words" && <WordManager />}
        {activeTab === "tags" && <TagManager />}
        {activeTab === "textbooks" && <TextbookManager />}
      </div>
    </div>
  );
}
