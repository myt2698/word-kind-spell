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

export default function TagManager({ open, onClose }: TagManagerProps) {
  const utils = trpc.useUtils();
  const { data: tags } = trpc.tag.listWithCount.useQuery();

  const [editingId, setEditingId] = useState<number | null>(null);
  const [form, setForm] = useState({ name: "" });

  const createMutation = trpc.tag.create.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.tag.listWithCount.invalidate();
      setForm({ name: "" });
    },
  });

  const updateMutation = trpc.tag.update.useMutation({
    onSuccess: () => {
      utils.tag.list.invalidate();
      utils.tag.listWithCount.invalidate();
      setEditingId(null);
      setForm({ name: "" });
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
    <Dialog open={open} onOpenChange={() => {}}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Tag className="w-5 h-5 text-emerald-500" />
            标签管理
          </DialogTitle>
        </DialogHeader>

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
          <div className="flex gap-2">
            {editingId && (
              <Button type="button" variant="outline" className="flex-1 h-9" onClick={() => { setEditingId(null); setForm({ name: "" }); }}>
                取消
              </Button>
            )}
            <Button type="submit" className="flex-1 h-9 bg-gradient-to-r from-emerald-500 to-teal-600" disabled={!form.name.trim()}>
              {editingId ? "保存修改" : "创建标签"}
            </Button>
          </div>
        </form>

        <div className="mt-4 space-y-2">
          <p className="text-xs text-gray-400 font-medium">已有标签</p>
          {tags?.length === 0 && <p className="text-sm text-gray-400 text-center py-4">暂无标签</p>}
          {tags?.map((tag) => (
            <div key={tag.id} className="flex items-center gap-2 p-2.5 rounded-lg bg-gray-50 group hover:bg-gray-100 transition-colors">
              <span className="text-sm font-medium text-gray-800 truncate flex-1">{tag.name}</span>
              <span className="text-xs text-gray-400">{tag.wordCount} 词</span>
              <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-indigo-600" onClick={() => { setEditingId(tag.id); setForm({ name: tag.name }); }}>
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => { if (confirm("确定删除？")) deleteMutation.mutate({ id: tag.id }); }}>
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
