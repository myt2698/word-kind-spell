import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useNavigate } from "react-router";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Shield,
  Tag,
  BookOpen,
  Edit3,
  Trash2,
  Plus,
  Loader2,
  ArrowLeft,
  ChevronRight,
  FolderOpen,
  Layers,
  GraduationCap,
} from "lucide-react";

type AdminTab = "tags" | "textbooks" | "words";

export default function AdminPage() {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const navigate = useNavigate();
  const utils = trpc.useUtils();

  // Redirect non-admin users
  if (!authLoading && user && user.role !== "admin") {
    navigate("/");
    return null;
  }

  const [activeTab, setActiveTab] = useState<AdminTab>("tags");

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />

      <main className="max-w-4xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/")}
            className="h-9 w-9 flex items-center justify-center rounded-lg hover:bg-gray-100"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <h1 className="text-lg font-bold text-gray-900">管理后台</h1>
          </div>
          <span className="text-xs px-2 py-0.5 bg-indigo-50 text-indigo-600 rounded-full">
            {user?.name}
          </span>
        </div>

        {/* Tab Navigation */}
        <div className="flex gap-2 mb-6 bg-white p-1 rounded-xl border border-gray-100">
          {[
            { key: "tags" as AdminTab, label: "标签管理", icon: Tag },
            { key: "textbooks" as AdminTab, label: "课本管理", icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${
                  isActive
                    ? "bg-indigo-50 text-indigo-700"
                    : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Content */}
        {activeTab === "tags" && <TagManager />}
        {activeTab === "textbooks" && <TextbookManager />}
      </main>
    </div>
  );
}

// ========== Tag Manager ==========
function TagManager() {
  const utils = trpc.useUtils();
  const { data: allTags, isLoading } = trpc.tag.listWithCount.useQuery();
  const [tagForm, setTagForm] = useState({ name: "", description: "" });
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const createTag = trpc.tag.create.useMutation({
    onSuccess: () => {
      utils.tag.listWithCount.invalidate();
      setTagForm({ name: "", description: "" });
      setDialogOpen(false);
    },
  });

  const updateTag = trpc.tag.update.useMutation({
    onSuccess: () => {
      utils.tag.listWithCount.invalidate();
      setEditingTagId(null);
      setTagForm({ name: "", description: "" });
      setDialogOpen(false);
    },
  });

  const deleteTag = trpc.tag.delete.useMutation({
    onSuccess: () => utils.tag.listWithCount.invalidate(),
  });

  const handleSubmit = () => {
    if (!tagForm.name.trim()) return;
    if (editingTagId) {
      updateTag.mutate({ id: editingTagId, name: tagForm.name.trim(), description: tagForm.description });
    } else {
      createTag.mutate({ name: tagForm.name.trim(), description: tagForm.description });
    }
  };

  const openCreate = () => {
    setEditingTagId(null);
    setTagForm({ name: "", description: "" });
    setDialogOpen(true);
  };

  const openEdit = (tag: any) => {
    setEditingTagId(tag.id);
    setTagForm({ name: tag.name, description: tag.description || "" });
    setDialogOpen(true);
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-500">
          共 {allTags?.length ?? 0} 个标签
        </h2>
        <Button size="sm" onClick={openCreate} className="gap-1">
          <Plus className="w-4 h-4" />
          新建标签
        </Button>
      </div>

      {/* Tag List */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : allTags?.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            暂无标签，点击上方按钮创建
          </div>
        ) : (
          allTags?.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50 transition-colors"
            >
              <Tag className="w-4 h-4 text-emerald-500 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{tag.name}</p>
                {tag.description && (
                  <p className="text-xs text-gray-400 truncate">{tag.description}</p>
                )}
              </div>
              <span className="text-xs text-gray-400 shrink-0">{tag.wordCount} 词</span>
              <div className="flex items-center gap-1 shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                  onClick={() => openEdit(tag)}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-red-500"
                  onClick={() => {
                    if (confirm(`确定删除标签 "${tag.name}"？`)) {
                      deleteTag.mutate({ id: tag.id });
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingTagId ? "编辑标签" : "新建标签"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>标签名称</Label>
              <Input
                value={tagForm.name}
                onChange={(e) => setTagForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="如：ar/ɑː/"
              />
            </div>
            <div>
              <Label>描述（可选）</Label>
              <Textarea
                value={tagForm.description}
                onChange={(e) => setTagForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="标签的详细说明"
                rows={2}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!tagForm.name.trim() || createTag.isPending || updateTag.isPending}
            >
              {createTag.isPending || updateTag.isPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : editingTagId ? (
                "保存修改"
              ) : (
                "创建标签"
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// ========== Textbook Manager ==========
function TextbookManager() {
  const utils = trpc.useUtils();
  const { data: textbooks, isLoading } = trpc.textbook.list.useQuery();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: "", description: "" });
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  const createTb = trpc.textbook.create.useMutation({
    onSuccess: () => {
      utils.textbook.list.invalidate();
      setForm({ name: "", description: "" });
      setDialogOpen(false);
    },
  });

  const updateTb = trpc.textbook.update.useMutation({
    onSuccess: () => {
      utils.textbook.list.invalidate();
      setEditingId(null);
      setDialogOpen(false);
    },
  });

  const deleteTb = trpc.textbook.delete.useMutation({
    onSuccess: () => utils.textbook.list.invalidate(),
  });

  // Unit (group) mutations
  const createUnit = trpc.wordGroup.create.useMutation({
    onSuccess: () => utils.textbook.list.invalidate(),
  });
  const deleteUnit = trpc.wordGroup.delete.useMutation({
    onSuccess: () => utils.textbook.list.invalidate(),
  });

  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "", textbookId: null as number | null });

  const handleSubmit = () => {
    if (!form.name.trim()) return;
    if (editingId) {
      updateTb.mutate({ id: editingId, name: form.name.trim(), description: form.description });
    } else {
      createTb.mutate({ name: form.name.trim(), description: form.description });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-gray-500">
          共 {textbooks?.length ?? 0} 个课本
        </h2>
        <Button
          size="sm"
          onClick={() => {
            setEditingId(null);
            setForm({ name: "", description: "" });
            setDialogOpen(true);
          }}
          className="gap-1"
        >
          <Plus className="w-4 h-4" />
          新建课本
        </Button>
      </div>

      {/* Textbook List */}
      <div className="bg-white rounded-xl border border-gray-100 divide-y divide-gray-50">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-5 h-5 animate-spin text-gray-400" />
          </div>
        ) : textbooks?.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">
            暂无课本，点击上方按钮创建
          </div>
        ) : (
          textbooks?.map((tb) => (
            <div key={tb.id}>
              {/* Textbook Row */}
              <div className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50/50">
                <BookOpen className="w-4 h-4 text-indigo-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{tb.name}</p>
                  {tb.description && (
                    <p className="text-xs text-gray-400">{tb.description}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-gray-400 hover:text-indigo-600"
                  onClick={() => setExpandedId(expandedId === tb.id ? null : tb.id)}
                >
                  <Layers className="w-3.5 h-3.5 mr-1" />
                  {tb.groups?.length ?? 0} 单元
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                  onClick={() => {
                    setEditingId(tb.id);
                    setForm({ name: tb.name, description: tb.description || "" });
                    setDialogOpen(true);
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 text-gray-400 hover:text-red-500"
                  onClick={() => {
                    if (confirm(`确定删除课本 "${tb.name}"？`)) {
                      deleteTb.mutate({ id: tb.id });
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              {/* Expanded Units */}
              {expandedId === tb.id && (
                <div className="px-4 pb-3 pl-12">
                  <div className="bg-gray-50 rounded-lg p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-medium text-gray-500">单元列表</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 text-xs text-indigo-600 hover:text-indigo-700"
                        onClick={() => {
                          setUnitForm({ name: "", textbookId: tb.id });
                          setUnitDialogOpen(true);
                        }}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        添加单元
                      </Button>
                    </div>
                    {tb.groups?.map((g: any) => (
                      <div
                        key={g.id}
                        className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-white"
                      >
                        <span className="text-sm text-gray-700">{g.name}</span>
                        <span className="text-xs text-gray-400">{g.wordCount} 词</span>
                      </div>
                    )) ?? (
                      <p className="text-xs text-gray-400 py-2">暂无单元</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      {/* Textbook Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{editingId ? "编辑课本" : "新建课本"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>课本名称</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="如：新概念英语"
              />
            </div>
            <div>
              <Label>描述（可选）</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="课本的简要说明"
                rows={2}
              />
            </div>
            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={!form.name.trim() || createTb.isPending || updateTb.isPending}
            >
              {editingId ? "保存修改" : "创建课本"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Unit Dialog */}
      <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>添加单元</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div>
              <Label>单元名称</Label>
              <Input
                value={unitForm.name}
                onChange={(e) => setUnitForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="如：Unit 1"
              />
            </div>
            <Button
              className="w-full"
              onClick={() => {
                if (!unitForm.name.trim() || !unitForm.textbookId) return;
                createUnit.mutate(
                  { name: unitForm.name.trim(), textbookId: unitForm.textbookId },
                  {
                    onSuccess: () => {
                      setUnitDialogOpen(false);
                      setUnitForm({ name: "", textbookId: null });
                    },
                  }
                );
              }}
              disabled={!unitForm.name.trim() || createUnit.isPending}
            >
              添加单元
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
