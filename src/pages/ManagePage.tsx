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
  FolderOpen, Tag, BookOpen, Edit3, Trash2, ChevronUp, ChevronDown,
  Star, GripVertical, X, Loader2,
} from "lucide-react";

type ManageTab = "textbooks" | "groups" | "tags";

export default function ManagePage() {
  const { user, isLoading: authLoading } = useAuth({ redirectOnUnauthenticated: true });
  const utils = trpc.useUtils();
  const [activeTab, setActiveTab] = useState<ManageTab>("textbooks");

  // Textbook state
  const { data: textbooks, isLoading: textbooksLoading } = trpc.textbook.list.useQuery();
  const [textbookForm, setTextbookForm] = useState({ name: "", description: "" });
  const [editingTextbookId, setEditingTextbookId] = useState<number | null>(null);
  const [selectedTextbookId, setSelectedTextbookId] = useState<number | null>(null);

  // Group state
  const { data: groups, isLoading: groupsLoading } = trpc.wordGroup.list.useQuery(
    selectedTextbookId ? { textbookId: selectedTextbookId } : undefined
  );
  const { data: userSettings } = trpc.wordGroup.getSettings.useQuery();
  const [groupForm, setGroupForm] = useState({ name: "", description: "", textbookId: null as number | null });
  const [editingGroupId, setEditingGroupId] = useState<number | null>(null);

  // Tag state
  const { data: allTags, isLoading: tagsLoading } = trpc.tag.listWithCount.useQuery();
  const [tagForm, setTagForm] = useState({ name: "", description: "" });
  const [editingTagId, setEditingTagId] = useState<number | null>(null);

  // Mutations
  const createTextbook = trpc.textbook.create.useMutation({
    onSuccess: () => { utils.textbook.list.invalidate(); setTextbookForm({ name: "", description: "" }); },
  });
  const updateTextbook = trpc.textbook.update.useMutation({
    onSuccess: () => { utils.textbook.list.invalidate(); setEditingTextbookId(null); },
  });
  const deleteTextbook = trpc.textbook.delete.useMutation({
    onSuccess: () => utils.textbook.list.invalidate(),
  });

  const createGroup = trpc.wordGroup.create.useMutation({
    onSuccess: () => { utils.wordGroup.list.invalidate(); setGroupForm({ name: "", description: "", textbookId: null }); },
  });
  const updateGroup = trpc.wordGroup.update.useMutation({
    onSuccess: () => { utils.wordGroup.list.invalidate(); setEditingGroupId(null); },
  });
  const deleteGroup = trpc.wordGroup.delete.useMutation({
    onSuccess: () => utils.wordGroup.list.invalidate(),
  });
  const reorderGroup = trpc.wordGroup.reorder.useMutation({
    onSuccess: () => utils.wordGroup.list.invalidate(),
  });
  const setDefaultGroup = trpc.wordGroup.setDefault.useMutation({
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

  if (authLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-indigo-500" /></div>;
  }
  if (!user) return null;

  return (
    <div className="min-h-screen bg-gray-50/50">
      <AppHeader />
      <main className="max-w-3xl mx-auto px-4 py-6 pb-24">
        <h1 className="text-xl font-bold text-gray-900 mb-4">管理</h1>

        {/* Tab Switcher */}
        <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-6">
          <button onClick={() => setActiveTab("textbooks")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === "textbooks" ? "bg-white text-purple-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <BookOpen className="w-4 h-4" /> 课本 ({textbooks?.length ?? 0})
          </button>
          <button onClick={() => setActiveTab("groups")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === "groups" ? "bg-white text-indigo-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <FolderOpen className="w-4 h-4" /> 分组 ({groups?.length ?? 0})
          </button>
          <button onClick={() => setActiveTab("tags")} className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-sm font-medium transition-all ${activeTab === "tags" ? "bg-white text-emerald-600 shadow-sm" : "text-gray-500 hover:text-gray-700"}`}>
            <Tag className="w-4 h-4" /> 标签 ({allTags?.length ?? 0})
          </button>
        </div>

        {/* ========== TEXTBOOKS ========== */}
        {activeTab === "textbooks" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <Label className="text-sm">{editingTextbookId ? "编辑课本" : "新建课本"}</Label>
              <Input value={textbookForm.name} onChange={(e) => setTextbookForm((p) => ({ ...p, name: e.target.value }))} placeholder="课本名称，如：新概念英语第一册" className="h-10" />
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

            {textbooksLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /> :
            !textbooks?.length ? <p className="text-center text-gray-400 py-8">暂无课本</p> :
            <div className="space-y-2">
              {textbooks.map((tb) => (
                <div key={tb.id} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-100">
                  <BookOpen className="w-5 h-5 text-purple-400 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium truncate">{tb.name}</span>
                      <span className="text-xs text-gray-400">{(tb as any).groupCount ?? 0}个单元</span>
                    </div>
                    {tb.description && <p className="text-xs text-gray-400 truncate">{tb.description}</p>}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTextbookId(tb.id); setTextbookForm({ name: tb.name, description: tb.description || "" }); }}>
                      <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`删除"${tb.name}"？其下分组将变为未关联`)) deleteTextbook.mutate({ id: tb.id }); }}>
                      <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>}
          </div>
        )}

        {/* ========== GROUPS ========== */}
        {activeTab === "groups" && (
          <div className="space-y-4">
            {/* Textbook filter */}
            <div className="flex gap-2 overflow-x-auto pb-1">
              <button onClick={() => setSelectedTextbookId(null)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${!selectedTextbookId ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                全部课本
              </button>
              {textbooks?.map((tb) => (
                <button key={tb.id} onClick={() => setSelectedTextbookId(tb.id)} className={`shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedTextbookId === tb.id ? "bg-indigo-100 text-indigo-600" : "bg-gray-100 text-gray-500"}`}>
                  {tb.name}
                </button>
              ))}
            </div>

            {/* Group Form */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <Label className="text-sm">{editingGroupId ? "编辑分组" : "新建分组"}</Label>
              <Input value={groupForm.name} onChange={(e) => setGroupForm((p) => ({ ...p, name: e.target.value }))} placeholder="分组名称，如：Unit 1" className="h-10" />
              <Input value={groupForm.description} onChange={(e) => setGroupForm((p) => ({ ...p, description: e.target.value }))} placeholder="描述（可选）" className="h-10" />
              {/* Textbook selector */}
              <select
                value={groupForm.textbookId ?? ""}
                onChange={(e) => setGroupForm((p) => ({ ...p, textbookId: e.target.value ? Number(e.target.value) : null }))}
                className="w-full h-10 px-3 rounded-md border border-gray-200 text-sm bg-white"
              >
                <option value="">选择课本（可选）</option>
                {textbooks?.map((tb) => (
                  <option key={tb.id} value={tb.id}>{tb.name}</option>
                ))}
              </select>
              <div className="flex gap-2">
                {editingGroupId && (
                  <Button variant="outline" className="h-9" onClick={() => { setEditingGroupId(null); setGroupForm({ name: "", description: "", textbookId: null }); }}>
                    <X className="w-3.5 h-3.5 mr-1" />取消
                  </Button>
                )}
                <Button className="h-9 bg-gradient-to-r from-indigo-500 to-blue-600" disabled={!groupForm.name.trim()} onClick={() => {
                  if (editingGroupId) { updateGroup.mutate({ id: editingGroupId, ...groupForm, textbookId: groupForm.textbookId }); }
                  else { createGroup.mutate({ name: groupForm.name, description: groupForm.description, textbookId: groupForm.textbookId ?? undefined }); }
                }}>
                  {editingGroupId ? "保存" : "创建分组"}
                </Button>
              </div>
            </div>

            {/* Group List */}
            {groupsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /> :
            !groups?.length ? <p className="text-center text-gray-400 py-8">暂无分组</p> :
            <div className="space-y-2">
              {groups.map((group, index) => {
                const isDefault = userSettings?.defaultGroupId === group.id;
                return (
                  <div key={group.id} className="flex items-center gap-2 p-3 bg-white rounded-xl border border-gray-100">
                    <GripVertical className="w-4 h-4 text-gray-300 shrink-0" />
                    <button onClick={() => setDefaultGroup.mutate({ groupId: isDefault ? null : group.id })} className={`shrink-0 ${isDefault ? "text-amber-400" : "text-gray-300"}`}>
                      <Star className={`w-4 h-4 ${isDefault ? "fill-current" : ""}`} />
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm font-medium truncate">{group.name}</span>
                        <span className="text-xs text-gray-400">{(group as any).wordCount ?? 0}词</span>
                        {isDefault && <span className="text-[10px] bg-amber-50 text-amber-600 px-1.5 rounded border border-amber-200">默认</span>}
                      </div>
                    </div>
                    <div className="flex gap-0.5 shrink-0">
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (index > 0) { const newOrder = [...groups]; [newOrder[index-1], newOrder[index]] = [newOrder[index], newOrder[index-1]]; reorderGroup.mutate({ orders: newOrder.map((g,i) => ({ id: g.id, sortOrder: i })) }); } }} disabled={index === 0}>
                        <ChevronUp className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (index < groups.length - 1) { const newOrder = [...groups]; [newOrder[index], newOrder[index+1]] = [newOrder[index+1], newOrder[index]]; reorderGroup.mutate({ orders: newOrder.map((g,i) => ({ id: g.id, sortOrder: i })) }); } }} disabled={index === groups.length - 1}>
                        <ChevronDown className="w-4 h-4 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingGroupId(group.id); setGroupForm({ name: group.name, description: group.description || "", textbookId: (group as any).textbookId }); }}>
                        <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`删除"${group.name}"？`)) deleteGroup.mutate({ id: group.id }); }}>
                        <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>}
          </div>
        )}

        {/* ========== TAGS ========== */}
        {activeTab === "tags" && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 space-y-3">
              <Label className="text-sm">{editingTagId ? "编辑标签" : "新建标签"}</Label>
              <Input value={tagForm.name} onChange={(e) => setTagForm((p) => ({ ...p, name: e.target.value }))} placeholder="标签名称" className="h-10" />
              <Textarea value={tagForm.description} onChange={(e) => setTagForm((p) => ({ ...p, description: e.target.value }))} placeholder="备注（可选）" className="min-h-[60px] resize-y" />
              <div className="flex gap-2">
                {editingTagId && (
                  <Button variant="outline" className="h-9" onClick={() => { setEditingTagId(null); setTagForm({ name: "", description: "" }); }}>
                    <X className="w-3.5 h-3.5 mr-1" />取消
                  </Button>
                )}
                <Button className="h-9 bg-gradient-to-r from-emerald-500 to-teal-600" disabled={!tagForm.name.trim()} onClick={() => {
                  if (editingTagId) { updateTag.mutate({ id: editingTagId, name: tagForm.name, description: tagForm.description || undefined }); }
                  else { createTag.mutate({ name: tagForm.name, description: tagForm.description || undefined }); }
                }}>
                  {editingTagId ? "保存" : "创建标签"}
                </Button>
              </div>
            </div>

            {tagsLoading ? <Loader2 className="w-6 h-6 animate-spin text-gray-400 mx-auto" /> :
            !allTags?.length ? <p className="text-center text-gray-400 py-8">暂无标签</p> :
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <div key={tag.id} className="inline-flex items-center gap-2 px-3 py-2 bg-white rounded-xl border border-gray-100">
                  <div className="flex flex-col">
                    <span className="text-sm font-medium">{tag.name}</span>
                    <span className="text-xs text-gray-400">{tag.wordCount} 个单词</span>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingTagId(tag.id); setTagForm({ name: tag.name, description: tag.description || "" }); }}>
                    <Edit3 className="w-3.5 h-3.5 text-gray-400" />
                  </Button>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { if (confirm(`删除"${tag.name}"？`)) deleteTag.mutate({ id: tag.id }); }}>
                    <Trash2 className="w-3.5 h-3.5 text-gray-400" />
                  </Button>
                </div>
              ))}
            </div>}
          </div>
        )}
      </main>
      <MobileNav activeTab="manage" />
    </div>
  );
}
