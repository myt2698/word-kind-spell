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
import { Folder, Edit3, Trash2, GripVertical } from "lucide-react";
import { useState } from "react";

interface GroupManagerProps {
  open: boolean;
  onClose: () => void;
}

const PRESET_COLORS = [
  "#3b82f6", "#10b981", "#f59e0b", "#ef4444",
  "#8b5cf6", "#ec4899", "#06b6d4", "#6366f1",
];

export default function GroupManager({ open, onClose }: GroupManagerProps) {
  const utils = trpc.useUtils();
  const { data: groups } = trpc.wordGroup.list.useQuery();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "", color: "#3b82f6" });

  const createMutation = trpc.wordGroup.create.useMutation({
    onSuccess: () => {
      utils.wordGroup.list.invalidate();
      setForm({ name: "", description: "", color: "#3b82f6" });
    },
  });

  const updateMutation = trpc.wordGroup.update.useMutation({
    onSuccess: () => {
      utils.wordGroup.list.invalidate();
      setEditingId(null);
      setForm({ name: "", description: "", color: "#3b82f6" });
    },
  });

  const deleteMutation = trpc.wordGroup.delete.useMutation({
    onSuccess: () => utils.wordGroup.list.invalidate(),
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

  const startEdit = (group: NonNullable<typeof groups>[0]) => {
    setEditingId(group.id);
    setForm({
      name: group.name,
      description: group.description || "",
      color: group.color || "#3b82f6",
    });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setForm({ name: "", description: "", color: "#3b82f6" });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-500" />
            分组管理
          </DialogTitle>
        </DialogHeader>

        {/* Create/Edit Form */}
        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <Label className="text-sm">分组名称</Label>
            <Input
              value={form.name}
              onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
              placeholder="例如：四级词汇"
              className="h-9 mt-1"
              required
            />
          </div>
          <div>
            <Label className="text-sm">描述（可选）</Label>
            <Input
              value={form.description}
              onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
              placeholder="分组描述"
              className="h-9 mt-1"
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
              <Button type="button" variant="outline" className="flex-1 h-9" onClick={cancelEdit}>
                取消
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1 h-9 bg-gradient-to-r from-indigo-500 to-blue-600"
              disabled={!form.name.trim() || createMutation.isPending || updateMutation.isPending}
            >
              {editingId ? "保存修改" : "创建分组"}
            </Button>
          </div>
        </form>

        {/* Group List */}
        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-400 font-medium">已有分组</p>
          {groups?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">暂无分组，创建一个吧</p>
          )}
          {groups?.map((group) => (
            <div
              key={group.id}
              className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 group hover:bg-gray-100 transition-colors"
            >
              <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
              <div
                className="w-3 h-3 rounded-full shrink-0"
                style={{ backgroundColor: group.color || "#3b82f6" }}
              />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{group.name}</p>
                {group.description && (
                  <p className="text-xs text-gray-400 truncate">{group.description}</p>
                )}
              </div>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-indigo-600"
                  onClick={() => startEdit(group)}
                >
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-gray-400 hover:text-red-500"
                  onClick={() => {
                    if (confirm("确定要删除这个分组吗？分组内的单词将变为未分组状态。")) {
                      deleteMutation.mutate({ id: group.id });
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
