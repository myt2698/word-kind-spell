import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/providers/trpc";
import {
  Volume2,
  Edit3,
  Trash2,
  Tag,
  Folder,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Pause,
  CheckCircle2,
} from "lucide-react";
import { useState } from "react";

interface TagInfo {
  id: number;
  name: string;
}

export interface WordCardData {
  id: number;
  word: string;
  phonetic?: string | null;
  definition: string;
  example?: string | null;
  notes?: string | null;
  proficiency: "new" | "learning" | "familiar" | "mastered";
  tags: TagInfo[];
  groupId?: number | null;
  groupName?: string | null;
  createdAt: Date;
  updatedAt: Date;
  learningStatus?: "idle" | "active" | "paused";
}

interface WordCardProps {
  word: WordCardData;
  onEdit: (word: WordCardData) => void;
  onDelete: (id: number) => void;
}

export default function WordCard({ word, onEdit, onDelete }: WordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [localStatus, setLocalStatus] = useState(word.learningStatus || "idle");

  const utils = trpc.useUtils();

  const addToLearning = trpc.spelling.addToLearning.useMutation({
    onSuccess: () => {
      setLocalStatus("active");
      utils.spelling.getStats.invalidate();
      utils.spelling.getLearningQueue.invalidate();
      utils.word.list.invalidate();
    },
  });

  const removeFromLearning = trpc.spelling.removeFromLearning.useMutation({
    onSuccess: () => {
      setLocalStatus("idle");
      utils.spelling.getStats.invalidate();
      utils.spelling.getLearningQueue.invalidate();
      utils.word.list.invalidate();
    },
  });

  const pauseLearning = trpc.spelling.pauseLearning.useMutation({
    onSuccess: () => {
      setLocalStatus("paused");
      utils.spelling.getStats.invalidate();
      utils.word.list.invalidate();
    },
  });

  const handleSpeak = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const isActive = localStatus === "active";
  const isPaused = localStatus === "paused";
  const isIdle = localStatus === "idle";

  return (
    <Card className="group hover:shadow-lg transition-all duration-300 border-gray-100 overflow-hidden">
      <CardContent className="p-0">
        {/* Main row */}
        <div className="p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex-1 min-w-0">
              {/* Word and phonetic */}
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-lg font-bold text-gray-900">{word.word}</h3>
                {word.phonetic && (
                  <span className="text-sm text-gray-400 font-mono">{word.phonetic}</span>
                )}
                <button
                  onClick={handleSpeak}
                  className="p-1 rounded-md hover:bg-gray-100 text-gray-400 hover:text-indigo-500 transition-colors"
                >
                  <Volume2 className="w-4 h-4" />
                </button>

                {/* Learning status badge */}
                {isActive && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-emerald-50 text-emerald-600 border-emerald-200 hover:bg-emerald-50">
                    <CheckCircle2 className="w-2.5 h-2.5 mr-0.5" />学习中
                  </Badge>
                )}
                {isPaused && (
                  <Badge className="text-[10px] px-1.5 py-0 bg-amber-50 text-amber-600 border-amber-200 hover:bg-amber-50">
                    <Pause className="w-2.5 h-2.5 mr-0.5" />暂停
                  </Badge>
                )}
              </div>

              {/* Definition */}
              <p className="text-sm text-gray-700 mt-1.5 leading-relaxed whitespace-pre-line">{word.definition}</p>

              {/* Tags and Group */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {word.groupName && (
                  <Badge variant="outline" className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 border-gray-200">
                    <Folder className="w-3 h-3 mr-1" />
                    {word.groupName}
                  </Badge>
                )}
                {word.tags.map((tag) => (
                  <Badge key={tag.id} variant="outline" className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 border-gray-200">
                    <Tag className="w-3 h-3 mr-1" />
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex flex-col items-end gap-1 shrink-0">
              {/* Learning button */}
              {isIdle ? (
                <Button
                  variant="outline"
                  size="sm"
                  className="h-7 px-2 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50 hover:text-emerald-700"
                  onClick={() => addToLearning.mutate({ wordId: word.id })}
                  disabled={addToLearning.isPending}
                >
                  <GraduationCap className="w-3.5 h-3.5 mr-1" />
                  {addToLearning.isPending ? "..." : "加入学习"}
                </Button>
              ) : isActive ? (
                <div className="flex gap-1">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-amber-500 hover:text-amber-600 hover:bg-amber-50"
                    onClick={() => pauseLearning.mutate({ wordId: word.id })}
                  >
                    <Pause className="w-3 h-3 mr-0.5" />暂停
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-gray-400 hover:text-red-500"
                    onClick={() => {
                      if (confirm("确定移除这个单词的学习状态？")) {
                        removeFromLearning.mutate({ wordId: word.id });
                      }
                    }}
                  >
                    移除
                  </Button>
                </div>
              ) : (
                <div className="flex gap-1">
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-7 px-2 text-xs border-emerald-200 text-emerald-600 hover:bg-emerald-50"
                    onClick={() => addToLearning.mutate({ wordId: word.id })}
                  >
                    继续学习
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 text-xs text-gray-400 hover:text-red-500"
                    onClick={() => removeFromLearning.mutate({ wordId: word.id })}
                  >
                    移除
                  </Button>
                </div>
              )}

              {/* Edit/Delete buttons */}
              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-indigo-600" onClick={() => onEdit(word)}>
                  <Edit3 className="w-3.5 h-3.5" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-gray-400 hover:text-red-500" onClick={() => onDelete(word.id)}>
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>
            </div>
          </div>

          {/* Expand toggle */}
          {(word.example || word.notes) && (
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-1 mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors">
              {expanded ? <><ChevronUp className="w-3 h-3" /> 收起详情</> : <><ChevronDown className="w-3 h-3" /> 查看详情</>}
            </button>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (word.example || word.notes) && (
          <div className="px-4 pb-4 pt-0 space-y-2 border-t border-gray-50">
            {word.example && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">例句</p>
                <p className="text-sm text-gray-600 italic bg-gray-50 rounded-lg p-2.5 whitespace-pre-line">{word.example}</p>
              </div>
            )}
            {word.notes && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">备注</p>
                <p className="text-sm text-gray-600 bg-amber-50 rounded-lg p-2.5 whitespace-pre-line">{word.notes}</p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
