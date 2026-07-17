import { useState, useRef } from "react";
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
  Tag, BookOpen, Edit3, Trash2, ChevronUp, ChevronDown,
  Star, GripVertical, X, Loader2, Plus, ChevronRight, FolderOpen,
} from "lucide-react";

type ManageTab = "textbooks" | "tags";

export default function ManagePage() {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<ManageTab>("textbooks");

  // Textbook state
  const { data: textbooks, isLoading: textbooksLoading } = trpc.textbook.list.useQuery();
  const [textbookForm, setTextbookForm] = useState({ name: "", description: "" });
  const [editingTextbookId, setEditingTextbookId] = useState<number | null>(null);
  const [expandedTextbookId, setExpandedTextbookId] = useState<number | null>(null);

  // Unit (group) dialog state
  const [unitDialogOpen, setUnitDialogOpen] = useState(false);
  const [unitForm, setUnitForm] = useState({ name: "", description: "", textbookId: null as number | null });
  const [editingUnitId, setEditingUnitId] = useState<number | null>(null);

  // Tag state
  const { data: allTags, isLoading: tagsLoading } = trpc.tag.listWithCount.useQuery();
  const [tagForm, setTagForm] = useState({ name: "", description: "" });
  const [editingTagId, setEditingTagId] = useState<number | null>(null);
  const [tagDialogOpen, setTagDialogOpen] = useState(false);
  const [error, setError] = useState("");
  const [longPressTag, setLongPressTag] = useState<{ id: number; name: string } | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const longPressTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Fetch units for expanded textbook
  const { data: expandedTextbook } = trpc.textbook.getWithGroups.useQuery(
    { id: expandedTextbookId! },
    { enabled: !!expandedTextbookId }
  );

  // Mutations
  const createTextbook = trpc.textbook.create.useMutation({
    onSuccess: () => { utils.textbook.list.invalidate(); setTextbookForm({ name: "", description: "" }); setError(""); },
    onError: (err) => setError(err.message),
  });
  const updateTextbook = trpc.textbook.update.useMutation({
    onSuccess: () => { utils.textbook.list.invalidate(); setEditingTextbookId(null); setError(""); },
    onError: (err) => setError(err.message),
  });
  const deleteTextbook = trpc.textbook.delete.useMutation({
    onSuccess: () => { utils.textbook.list.invalidate(); setExpandedTextbookId(null); },
    onError: (err) => setError(err.message),
  });

  const createUnit = trpc.wordGroup.create.useMutation({
    onSuccess: () => {
      utils.textbook.getWithGroups.invalidate({ id: unitForm.textbookId! });
      utils.textbook.list.invalidate();
      setUnitForm({ name: "", description: "", textbookId: null });
      setEditingUnitId(null);
      setUnitDialogOpen(false);
    },
  });
  const updateUnit = trpc.wordGroup.update.useMutation({
    onSuccess: () => {
      utils.textbook.getWithGroups.invalidate({ id: unitForm.textbookId! });
      utils.textbook.list.invalidate();
      setEditingUnitId(null);
      setUnitDialogOpen(false);
    },
  });
  const deleteUnit = trpc.wordGroup.delete.useMutation({
    onSuccess: () => {
      utils.textbook.getWithGroups.invalidate({ id: expandedTextbookId! });
      utils.textbook.list.invalidate();
    },
  });
  const setDefaultUnit = trpc.wordGroup.setDefault.useMutation({
    onSuccess: () => utils.wordGroup.getSettings.invalidate(),
  });

  const createTag = trpc.tag.create.useMutation({
    onSuccess: () => { utils.tag.list.invalidate(); utils.tag.listWithCount.invalidate(); setTagForm({ name: "", description: "" }); },
  });
  const updateTag = trpc.tag.update.useMutation({
    onSuccess: () => { utils.tag.list.invalidate(); utils.tag.listWithCount.invalidate(); setEditingTagId(null); },
  });
  const deleteTag = trpc.tag.delete.useMutation({
    onSuccess: () => utils.tag.list.invalidate(),
  });

  const openCreateUnitDialog = (textbookId: number) => {
    setEditingUnitId(null);
    setUnitForm({ name: "", description: "", textbookId });
    setUnitDialogOpen(true);
  };

  const openEditUnitDialog = (unit: any) => {
    setEditingUnitId(unit.id);
    setUnitForm({ name: unit.name, description: unit.description || "", textbookId: unit.textbookId || null });
    setUnitDialogOpen(true);
  };

  const handleUnitSubmit = () => {
    if (editingUnitId) {
      updateUnit.mutate({ id: editingUnitId, ...unitForm, textbookId: unitForm.textbookId });
    } else {
      createUnit.mutate({ name: unitForm.name, description: unitForm.description, textbookId: unitForm.textbookId ?? undefined });
    }
  };

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <h1 className="text-xl font-bold text-gray-900 mb-4">管理</h1>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm px-4 py-2.5 rounded-lg mb-4">{error}</div>
        )}

        {/* Tab Switcher: only 2 tabs now */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button onClick={() => setActiveTab("textbooks")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === "textbooks" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <BookOpen className="w-4 h-4" /> 课本 ({textbooks?.length ?? 0})
          </button>
          <button onClick={() => setActiveTab("tags")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === "tags" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Tag className="w-4 h-4" /> 标签 ({allTags?.length ?? 0})
          </button>
        </div>

        {/* ========== TEXTBOOKS + UNITS ========== */}
        {activeTab === "textbooks" && (
          <div className="space-y-4">
            {/* Create textbook form */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <Label className="text-sm">{editingTextbookId ? "编辑课本" : "新建课本"}</Label>
              <Input value={textbookForm.name} onChange={(e) => setTextbookForm((p) => ({ ...p, name: e.target.value }))} placeholder="课本名称" className="h-10" />
              <Input value={textbookForm.description} onChange={(e) => setTextbookForm((p) => ({ ...p, description: e.target.value }))} placeholder="描述（可选）" className="h-10" />
              <div className="flex gap-2">
                {editingTextbookId && (
                  <Button variant="outline" className="h-9" onClick={() => { setEditingTextbookId(null); setTextbookForm({ name: "", description: "" }); }}>
                    <X className="w-3.5 h-3.5 mr-1" />取消
                  </Button>
                )}
                <Button className="h-9 bg-gradient-to-r from-purple-500 to-violet-600" disabled={!textbookForm.name.trim()} onClick={() => {
                  if (editingTextbookId) { updateTextbook.mutate({ id: editingTextbookId, ...textbookForm }); }
                  else { createTextbook.mutate(textbookForm); }
                }}>
                  {editingTextbookId ? "保存" : "创建课本"}
                </Button>
              </div>
            </div>

            {/* Textbook list with expandable units */}
            {textbooksLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /> :
            !textbooks?.length ? <p className="text-center text-gray-400 py-8">暂无课本</p> :
            <div className="space-y-2">
              {textbooks.map((tb) => {
                const isExpanded = expandedTextbookId === tb.id;
                return (
                  <div key={tb.id} className="bg-white rounded-xl border border-gray-100 overflow-hidden">
                    {/* Textbook header */}
                    <div
                      className="flex items-center gap-2 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
                      onClick={() => setExpandedTextbookId(isExpanded ? null : tb.id)}
                    >
                      <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                      <BookOpen className="w-5 h-5 text-purple-400 shrink-0" />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-sm font-medium truncate">{tb.name}</span>
                          <span className="text-xs text-gray-400">{(tb as any).groupCount ?? 0}个单元</span>
                        </div>
                        {tb.description && <p className="text-xs text-gray-400 truncate">{tb.description}</p>}
                      </div>
                      <div className="flex gap-0.5 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTextbookId(tb.id); setTextbookForm({ name: tb.name, description: tb.description || "" }); }}>
                          <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`删除"${tb.name}"？`)) deleteTextbook.mutate({ id: tb.id }); }}>
                          <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                        </Button>
                      </div>
                    </div>

                    {/* Expanded units list */}
                    {isExpanded && (
                      <div className="border-t border-gray-50 px-3 pb-3">
                        <div className="flex items-center justify-between py-2">
                          <span className="text-xs text-gray-400 font-medium">单元列表</span>
                          <Button size="sm" variant="ghost" className="h-7 text-xs text-indigo-600" onClick={() => openCreateUnitDialog(tb.id)}>
                            <Plus className="w-3.5 h-3.5 mr-1" />新建单元
                          </Button>
                        </div>
                        {!expandedTextbook ? <Loader2 className="w-4 h-4 animate-spin text-gray-300" /> :
                        !expandedTextbook.groups?.length ? <p className="text-xs text-gray-400 py-2">暂无单元</p> :
                        <div className="space-y-1">
                          {expandedTextbook.groups.map((unit: any, index: number) => (
                            <div key={unit.id} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50">
                              <GripVertical className="w-3.5 h-3.5 text-gray-300 shrink-0" />
                              <FolderOpen className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="text-sm truncate">{unit.name}</span>
                                  <span className="text-xs text-gray-400">{unit.wordCount ?? 0}词</span>
                                </div>
                              </div>
                              <div className="flex gap-0.5 shrink-0">
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (index > 0) { const newOrder = [...expandedTextbook.groups]; [newOrder[index-1], newOrder[index]] = [newOrder[index], newOrder[index-1]]; } }} disabled={index === 0}>
                                  <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (index < expandedTextbook.groups.length - 1) { const newOrder = [...expandedTextbook.groups]; [newOrder[index], newOrder[index+1]] = [newOrder[index+1], newOrder[index]]; } }} disabled={index === expandedTextbook.groups.length - 1}>
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => openEditUnitDialog(unit)}>
                                  <Edit3 className="w-3 h-3 text-gray-400" />
                                </Button>
                                <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => { if (confirm(`删除"${unit.name}"？`)) deleteUnit.mutate({ id: unit.id }); }}>
                                  <Trash2 className="w-3 h-3 text-gray-400" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>}

            {/* Unit Dialog */}
            <Dialog open={unitDialogOpen} onOpenChange={setUnitDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingUnitId ? "编辑单元" : "新建单元"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-sm">单元名称</Label>
                    <Input value={unitForm.name} onChange={(e) => setUnitForm((p) => ({ ...p, name: e.target.value }))} placeholder="如：Unit 1" className="h-10 mt-1" autoFocus />
                  </div>
                  <div>
                    <Label className="text-sm">描述（可选）</Label>
                    <Input value={unitForm.description} onChange={(e) => setUnitForm((p) => ({ ...p, description: e.target.value }))} placeholder="描述" className="h-10 mt-1" />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 h-10" onClick={() => setUnitDialogOpen(false)}>取消</Button>
                    <Button className="flex-1 h-10 bg-gradient-to-r from-indigo-500 to-blue-600" disabled={!unitForm.name.trim() || createUnit.isPending || updateUnit.isPending} onClick={handleUnitSubmit}>
                      {createUnit.isPending || updateUnit.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingUnitId ? "保存" : "创建"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* ========== TAGS ========== */}
        {activeTab === "tags" && (
          <div className="space-y-4">
            {/* Add button */}
            <Button
              className="w-full h-11 bg-gradient-to-r from-emerald-500 to-teal-600"
              onClick={() => {
                setEditingTagId(null);
                setTagForm({ name: "", description: "" });
                setTagDialogOpen(true);
              }}
            >
              <Plus className="w-4 h-4 mr-1.5" />新建标签
            </Button>

            {/* Tag grid - uniform fixed-width chips */}
            {tagsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /> :
            !allTags?.length ? <p className="text-center text-gray-400 py-8">暂无标签</p> :
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  className="relative flex items-center justify-center h-12 bg-white rounded-xl border border-gray-100 hover:border-emerald-300 hover:shadow-md transition-all active:scale-95 select-none overflow-hidden"
                  onClick={() => {
                    setEditingTagId(tag.id);
                    setTagForm({ name: tag.name, description: tag.description || "" });
                    setTagDialogOpen(true);
                  }}
                  onTouchStart={() => {
                    longPressTimer.current = setTimeout(() => {
                      setLongPressTag({ id: tag.id, name: tag.name });
                      setDeleteDialogOpen(true);
                    }, 600);
                  }}
                  onTouchEnd={() => {
                    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
                  }}
                  onTouchMove={() => {
                    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
                  }}
                  onMouseDown={() => {
                    longPressTimer.current = setTimeout(() => {
                      setLongPressTag({ id: tag.id, name: tag.name });
                      setDeleteDialogOpen(true);
                    }, 600);
                  }}
                  onMouseUp={() => {
                    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
                  }}
                  onMouseLeave={() => {
                    if (longPressTimer.current) { clearTimeout(longPressTimer.current); longPressTimer.current = null; }
                  }}
                >
                  <span className="text-sm font-medium text-gray-700 truncate px-2">{tag.name}</span>
                  {tag.wordCount > 0 && (
                    <span className="absolute top-1 right-1.5 text-[10px] text-gray-300">{tag.wordCount}</span>
                  )}
                </button>
              ))}
            </div>}

            {/* Tag Edit/Create Dialog */}
            <Dialog open={tagDialogOpen} onOpenChange={setTagDialogOpen}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle>{editingTagId ? "编辑标签" : "新建标签"}</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-2">
                  <div>
                    <Label className="text-sm">标签名称</Label>
                    <Input
                      value={tagForm.name}
                      onChange={(e) => setTagForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder="标签名称"
                      className="h-10 mt-1"
                      autoFocus
                    />
                  </div>
                  <div>
                    <Label className="text-sm">备注（可选）</Label>
                    <Textarea
                      value={tagForm.description}
                      onChange={(e) => setTagForm((p) => ({ ...p, description: e.target.value }))}
                      placeholder="备注"
                      className="min-h-[60px] resize-y mt-1"
                    />
                  </div>
                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 h-10" onClick={() => setTagDialogOpen(false)}>
                      取消
                    </Button>
                    <Button
                      className="flex-1 h-10 bg-gradient-to-r from-emerald-500 to-teal-600"
                      disabled={!tagForm.name.trim() || createTag.isPending || updateTag.isPending}
                      onClick={() => {
                        if (editingTagId) {
                          updateTag.mutate({ id: editingTagId, name: tagForm.name, description: tagForm.description || undefined });
                        } else {
                          createTag.mutate({ name: tagForm.name, description: tagForm.description || undefined });
                        }
                      }}
                    >
                      {createTag.isPending || updateTag.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : editingTagId ? "保存" : "创建"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>

            {/* Long-press Delete Confirm Dialog */}
            <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
              <DialogContent className="sm:max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-center">删除标签</DialogTitle>
                </DialogHeader>
                <p className="text-center text-sm text-gray-500 py-2">
                  确定要删除标签 <span className="font-medium text-gray-700">"{longPressTag?.name}"</span> 吗？
                </p>
                <div className="flex gap-3 pt-2">
                  <Button variant="outline" className="flex-1 h-10" onClick={() => setDeleteDialogOpen(false)}>
                    取消
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1 h-10"
                    onClick={() => {
                      if (longPressTag) deleteTag.mutate({ id: longPressTag.id });
                      setDeleteDialogOpen(false);
                      setLongPressTag(null);
                    }}
                  >
                    删除
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>
        )}
      </main>
      <MobileNav activeTab="manage" />
    </div>
  );
}
