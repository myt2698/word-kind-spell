import { BookOpen, Search, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";

interface EmptyStateProps {
  type?: "no-words" | "no-results" | "no-group";
  onAdd?: () => void;
}

export default function EmptyState({ type = "no-words", onAdd }: EmptyStateProps) {
  const config = {
    "no-words": {
      icon: BookOpen,
      title: "还没有单词",
      description: "开始添加你的第一个单词，开启学习之旅",
      action: onAdd,
      actionLabel: "添加单词",
    },
    "no-results": {
      icon: Search,
      title: "没有找到匹配的单词",
      description: "试试其他搜索关键词或筛选条件",
      action: undefined,
      actionLabel: "",
    },
    "no-group": {
      icon: BookOpen,
      title: "该分组暂无单词",
      description: "向这个分组添加一些单词吧",
      action: onAdd,
      actionLabel: "添加单词",
    },
  };

  const c = config[type];
  const Icon = c.icon;

  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="w-16 h-16 bg-gray-50 rounded-2xl flex items-center justify-center mb-4">
        <Icon className="w-8 h-8 text-gray-300" />
      </div>
      <h3 className="text-lg font-medium text-gray-700 mb-1">{c.title}</h3>
      <p className="text-sm text-gray-400 mb-4 max-w-[240px]">{c.description}</p>
      {c.action && (
        <Button
          onClick={c.action}
          className="bg-gradient-to-r from-indigo-500 to-blue-600 hover:from-indigo-600 hover:to-blue-700"
        >
          <Plus className="w-4 h-4 mr-1" />
          {c.actionLabel}
        </Button>
      )}
    </div>
  );
}
