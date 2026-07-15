import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { trpc } from "@/providers/trpc";
import AppHeader from "@/components/AppHeader";
import MobileNav from "@/components/MobileNav";
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
  Tag,
  Plus,
  Edit3,
  Trash2,
  Loader2,
} from "lucide-react";

export default function TagsPage() {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();

  const { data: tags, isLoading } = trpc.tag.listWithCount.useQuery();

  const [showForm, setShowForm] = useState(false);
  const [editingTag, setEditingTag] = useState<{
    id: number;
    name: string;
    description: string | null;
  } | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [error, setError] = useState("");

  const createMutation = trpc.tag.create.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.tag.listWithCount.invalidate();
      setForm({ name: "", description: "" });
      setShowForm(false);
      setError("");
    },
    onError: (err) => setError(err.message || "创建失败"),
  });

  const updateMutation = trpc.tag.update.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.tag.listWithCount.invalidate();
      setEditingTag(null);
      setForm({ name: "", description: "" });
      setError("");
    },
    onError: (err) => setError(err.message || "更新失败"),
  });

  const deleteMutation = trpc.tag.delete.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.tag.listWithCount.invalidate();
    },
  });

  const handleSubmit = () => {
    setError("");
    if (!form.name.trim()) {
      setError("请输入标签名称");
      return;
    }
    if (editingTag) {
      updateMutation.mutate({
        id: editingTag.id,
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
    } else {
      createMutation.mutate({
        name: form.name.trim(),
        description: form.description.trim() || undefined,
      });
    }
  };

  const startEdit = (tag: NonNullable<typeof tags>[0]) => {
    setEditingTag({
      id: tag.id,
      name: tag.name,
      description: tag.description,
    });
    setForm({
      name: tag.name,
      description: tag.description || "",
    });
    setError("");
  };

  const openCreate = () => {
    setEditingTag(null);
    setForm({ name: "", description: "" });
    setError("");
    setShowForm(true);
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />

      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900 flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-500" />
              标签管理
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              共 {tags?.length ?? 0} 个标签
            </p>
          </div>
          <Button
            onClick={openCreate}
            className="bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-600 hover:to-teal-700 shadow-lg"
          >
            <Plus className="w-4 h-4 mr-1" />
            新建标签
          </Button>
        </div>

        {/* Tag List */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-6 h-6 animate-spin text-gray-400" />
          </div>
        ) : !tags || tags.length === 0 ? (
          <div className="text-center py-16">
            <Tag className="w-12 h-12 text-gray-200 mx-auto mb-3" />
            <p className="text-gray-500">暂无标签</p>
            <Button
              variant="outline"
              className="mt-3"
              onClick={openCreate}
            >
              <Plus className="w-4 h-4 mr-1" />
              创建第一个标签
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="bg-white rounded-xl border border-gray-100 p-4 hover:shadow-md transition-all"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-semibold text-gray-900">
                        {tag.name}
                      </h3>
                      <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                        {tag.wordCount} 个单词
                      </span>
                    </div>
                    {tag.description && (
                      <p className="text-sm text-gray-500 mt-1.5 whitespace-pre-line">
                        {tag.description}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                      onClick={() => startEdit(tag)}
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-gray-400 hover:text-red-500"
                      onClick={() => {
                        if (confirm(`确定要删除标签"${tag.name}"吗？`)) {
                          deleteMutation.mutate({ id: tag.id });
                        }
                      }}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      <MobileNav activeTab="tags" onTabChange={() => {}} onAdd={openCreate} />

      {/* Create / Edit Dialog */}
      <Dialog
        open={showForm || !!editingTag}
        onOpenChange={(v) => {
          if (!v) {
            setShowForm(false);
            setEditingTag(null);
          }
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-emerald-500" />
              {editingTag ? "编辑标签" : "新建标签"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3">
            {error && (
              <div className="bg-red-50 text-red-600 text-sm px-3 py-2 rounded-lg">
                {error}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-sm">
                标签名称 <span className="text-red-400">*</span>
              </Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="例如：高频词"
                className="h-10"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-sm">标签备注</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                placeholder="添加标签备注说明（可选）"
                className="min-h-[80px] resize-y"
              />
            </div>

            <div className="flex gap-2 pt-1">
              <Button
                variant="outline"
                className="flex-1 h-10"
                onClick={() => {
                  setShowForm(false);
                  setEditingTag(null);
                }}
              >
                取消
              </Button>
              <Button
                className="flex-1 h-10 bg-gradient-to-r from-emerald-500 to-teal-600"
                onClick={handleSubmit}
                disabled={!form.name.trim() || isPending}
              >
                {isPending ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : editingTag ? (
                  "保存"
                ) : (
                  "创建"
                )}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
