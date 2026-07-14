import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trpc } from "@/providers/trpc";
import { Tag, Edit3, Trash2 } from "lucide-react";
import { useState } from "react";

interface TagManagerProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#10b981", "#3b82f6", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#6366f1",
];

export default function TagManager({ open, onClose }: TagManagerProps) {
  const utils = trpc.useUtils();
  const { data: tags } = trpc.tag.listWithCount.useQuery();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", color: "#10b981" });

  const createMutation = trpc.tag.create.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.tag.listWithCount.invalidate();
      setForm({ name: "", color: "#10b981" });
    },
  });

  const updateMutation = trpc.tag.update.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.tag.listWithCount.invalidate();
      setEditingId(null);
      setForm({ name: "", color: "#10b981" });
    },
  });

  const deleteMutation = trpc.tag.delete.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.tag.listWithCount.invalidate();
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) return;

    if (editingId) {
      updateMutation.mutate({ id: editingId, ...form });
    } else {
      createMutation.mutate(form);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-500" />
            标签管理
          </DialogTitle>
        </DialogHeader>

        {/* Create/Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-sm">标签名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="例如：高频词"
              className="h-9 mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-sm">颜色</Label>
            <div className="flex gap-2 mt-1 flex-wrap">
              {PRESET_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setForm((p) => ({ ...p, color: c }))}
                  className={`w-7 h-7 rounded-full transition-all ${
                    form.color === c ? "ring-2 ring-offset-2 ring-gray-400 scale-110" : "hover:scale-105"
                  }`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>
          </div>
          <div className="flex gap-2">
            {editingId && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9"
                onClick={() => {
                  setEditingId(null);
                  setForm({ name: "", color: "#10b981" });
                }}
              >
                取消
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1 h-9 bg-gradient-to-r from-emerald-500 to-teal-600"
              disabled={!form.name.trim()}
            >
              {editingId ? "保存修改" : "创建标签"}
            </Button>
          </div>
        </form>

        {/* Tag List */}
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-400 font-medium">已有标签</p>
          {tags?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">暂无标签，创建一个吧</p>
          )}
          {tags?.map((tag) => (
            <div
              key={tag.id}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 group hover:bg-gray-100 transition-colors"
            >
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: tag.color || "#10b981" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{tag.name}</p>
              </div>
              <span className="text-xs text-gray-400">{tag.wordCount} 词</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-indigo-600"
                  onClick={() => {
                    setEditingId(tag.id);
                    setForm({ name: tag.name, color: tag.color || "#10b981" });
                  }}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-red-500"
                  onClick={() => {
                    if (confirm("确定要删除这个标签吗？")) {
                      deleteMutation.mutate({ id: tag.id });
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
