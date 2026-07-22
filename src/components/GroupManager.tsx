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
import {
  Folder,
  Edit3,
  Trash2,
  ChevronUp,
  ChevronDown,
  Star,
  GripVertical,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";

interface GroupManagerProps {
  open: boolean;
  onClose: () => void;
}

export default function GroupManager({ open, onClose }: GroupManagerProps) {
  const utils = trpc.useUtils();
  const { data: groups } = trpc.wordGroup.list.useQuery();
  const { data: userSettings } = trpc.wordGroup.getSettings.useQuery();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "", description: "" });
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  useEffect(() => {
    if (open) {
      setEditingId(null);
      setForm({ name: "", description: "" });
      setDragIndex(null);
    }
  }, [open]);

  const createMutation = trpc.wordGroup.create.useMutation({
    onSuccess: () => {
      utils.wordGroup.list.invalidate();
      utils.wordGroup.getSettings.invalidate();
      setForm({ name: "", description: "" });
    },
  });

  const updateMutation = trpc.wordGroup.update.useMutation({
    onSuccess: () => {
      utils.wordGroup.list.invalidate();
      setEditingId(null);
    },
  });

  const deleteMutation = trpc.wordGroup.delete.useMutation({
    onSuccess: () => {
      utils.wordGroup.list.invalidate();
      utils.wordGroup.getSettings.invalidate();
    },
  });

  const reorderMutation = trpc.wordGroup.reorder.useMutation({
    onSuccess: () => utils.wordGroup.list.invalidate(),
  });

  const setDefaultMutation = trpc.wordGroup.setDefault.useMutation({
    onSuccess: () => utils.wordGroup.getSettings.invalidate(),
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
    setForm({ name: group.name, description: group.description || "" });
  };

  const moveGroup = (index: number, direction: "up" | "down") => {
    if (!groups || groups.length <= 1) return;
    const newIndex = direction === "up" ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= groups.length) return;
    const newGroups = [...groups];
    const [moved] = newGroups.splice(index, 1);
    newGroups.splice(newIndex, 0, moved);
    const orders = newGroups.map((g, i) => ({ id: g.id, sortOrder: i }));
    reorderMutation.mutate({ orders });
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index || !groups) return;
    const newGroups = [...groups];
    const [moved] = newGroups.splice(dragIndex, 1);
    newGroups.splice(index, 0, moved);
    setDragIndex(index);
    const orders = newGroups.map((g, i) => ({ id: g.id, sortOrder: i }));
    reorderMutation.mutate({ orders });
  };
  const handleDragEnd = () => setDragIndex(null);

  return (
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Folder className="w-5 h-5 text-indigo-500" />
            分组管理
          </DialogTitle>
        </DialogHeader>

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
          <div className="flex gap-2">
            {editingId && (
              <Button
                type="button"
                variant="outline"
                className="flex-1 h-9"
                onClick={() => { setEditingId(null); setForm({ name: "", description: "" }); }}
              >
                <X className="w-3.5 h-3.5 mr-1" />
                取消
              </Button>
            )}
            <Button
              type="submit"
              className="flex-1 h-9 bg-gradient-to-r from-indigo-500 to-blue-600"
              disabled={!form.name.trim()}
            >
              {editingId ? "保存修改" : "创建分组"}
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-1.5">
          <p className="text-xs text-gray-400 font-medium">已有分组（拖拽排序）</p>
          {groups?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-4">暂无分组</p>
          )}
          {groups?.map((group, index) => {
            const isDefault = userSettings?.defaultGroupId === group.id;
            return (
              <div
                key={group.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDragEnd={handleDragEnd}
                className={`flex items-center gap-1.5 p-2 rounded-lg transition-all cursor-grab active:cursor-grabbing ${
                  dragIndex === index ? "bg-indigo-50 ring-2 ring-indigo-200 opacity-80" : "bg-gray-50 hover:bg-gray-100"
                }`}
              >
                <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                <button
                  type="button"
                  onClick={() => setDefaultMutation.mutate({ groupId: isDefault ? null : group.id })}
                  className={`shrink-0 transition-all ${isDefault ? "text-amber-400 hover:text-amber-500" : "text-gray-300 hover:text-amber-400"}`}
                  title={isDefault ? "取消默认" : "设为默认"}
                >
                  <Star className={`w-4 h-4 ${isDefault ? "fill-current" : ""}`} />
                </button>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <p className="text-sm font-medium text-gray-800 truncate">{group.name}</p>
                    <span className="text-xs text-gray-400 shrink-0">{(group as any).wordCount ?? 0}词</span>
                    {isDefault && (
                      <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 py-0.5 rounded-full border border-amber-200 shrink-0">默认</span>
                    )}
                  </div>
                  {group.description && <p className="text-xs text-gray-400 truncate">{group.description}</p>}
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600 disabled:opacity-30" onClick={() => moveGroup(index, "up")} disabled={index === 0}>
                    <ChevronUp className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-gray-600 disabled:opacity-30" onClick={() => moveGroup(index, "down")} disabled={index === (groups?.length ?? 0) - 1}>
                    <ChevronDown className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-indigo-600" onClick={() => startEdit(group)}>
                    <Edit3 className="w-3.5 h-3.5" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => { if (confirm(`确定删除"${group.name}"？`)) deleteMutation.mutate({ id: group.id }); }}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
