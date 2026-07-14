import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Volume2,
  Edit3,
  Trash2,
  Tag,
  Folder,
  ChevronDown,
  ChevronUp,
  Star,
} from "lucide-react";
import { useState } from "react";

interface TagInfo {
  id: number;
  name: string;
  color: string | null;
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
  groupName?: string | null;
  groupColor?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

interface WordCardProps {
  word: WordCardData;
  onEdit: (word: WordCardData) => void;
  onDelete: (id: number) => void;
  onProficiencyChange: (id: number, level: WordCardData["proficiency"]) => void;
}

const proficiencyConfig = {
  new: { label: "新词", color: "bg-red-50 text-red-600 border-red-200", stars: 0 },
  learning: { label: "学习中", color: "bg-yellow-50 text-yellow-600 border-yellow-200", stars: 1 },
  familiar: { label: "熟悉", color: "bg-blue-50 text-blue-600 border-blue-200", stars: 2 },
  mastered: { label: "已掌握", color: "bg-green-50 text-green-600 border-green-200", stars: 3 },
};

export default function WordCard({ word, onEdit, onDelete, onProficiencyChange }: WordCardProps) {
  const [expanded, setExpanded] = useState(false);
  const prof = proficiencyConfig[word.proficiency];

  const handleSpeak = () => {
    if ("speechSynthesis" in window) {
      const utterance = new SpeechSynthesisUtterance(word.word);
      utterance.lang = "en-US";
      window.speechSynthesis.speak(utterance);
    }
  };

  const nextProficiency = (): WordCardData["proficiency"] => {
    const levels: WordCardData["proficiency"][] = ["new", "learning", "familiar", "mastered"];
    const idx = levels.indexOf(word.proficiency);
    return levels[(idx + 1) % levels.length];
  };

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
              </div>

              {/* Definition */}
              <p className="text-sm text-gray-700 mt-1.5 leading-relaxed">{word.definition}</p>

              {/* Tags and Group */}
              <div className="flex flex-wrap items-center gap-1.5 mt-2">
                {/* Proficiency badge */}
                <button
                  onClick={() => onProficiencyChange(word.id, nextProficiency())}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border cursor-pointer transition-all hover:shadow-sm ${prof.color}`}
                  title="点击切换熟练度"
                >
                  <div className="flex">
                    {[1, 2, 3].map((i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${i <= prof.stars ? "fill-current" : ""}`}
                      />
                    ))}
                  </div>
                  {prof.label}
                </button>

                {/* Group */}
                {word.groupName && (
                  <Badge
                    variant="outline"
                    className="text-xs px-2 py-0.5 bg-gray-50 text-gray-500 border-gray-200"
                  >
                    <Folder className="w-3 h-3 mr-1" />
                    {word.groupName}
                  </Badge>
                )}

                {/* Tags */}
                {word.tags.map((tag) => (
                  <Badge
                    key={tag.id}
                    variant="outline"
                    className="text-xs px-2 py-0.5"
                    style={{
                      backgroundColor: (tag.color || "#10b981") + "15",
                      borderColor: (tag.color || "#10b981") + "40",
                      color: tag.color || "#10b981",
                    }}
                  >
                    <Tag className="w-3 h-3 mr-1" />
                    {tag.name}
                  </Badge>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-indigo-600"
                onClick={() => onEdit(word)}
              >
                <Edit3 className="w-4 h-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-gray-400 hover:text-red-500"
                onClick={() => onDelete(word.id)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          </div>

          {/* Expand toggle */}
          {(word.example || word.notes) && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-1 mt-2 text-xs text-gray-400 hover:text-gray-600 transition-colors"
            >
              {expanded ? (
                <>
                  <ChevronUp className="w-3 h-3" /> 收起详情
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" /> 查看详情
                </>
              )}
            </button>
          )}
        </div>

        {/* Expanded content */}
        {expanded && (word.example || word.notes) && (
          <div className="px-4 pb-4 pt-0 space-y-2 border-t border-gray-50">
            {word.example && (
              <div className="mt-3">
                <p className="text-xs text-gray-400 mb-1">例句</p>
                <p className="text-sm text-gray-600 italic bg-gray-50 rounded-lg p-2.5">
                  {word.example}
                </p>
              </div>
            )}
            {word.notes && (
              <div className="mt-2">
                <p className="text-xs text-gray-400 mb-1">备注</p>
                <p className="text-sm text-gray-600 bg-amber-50 rounded-lg p-2.5">
                  {word.notes}
                </p>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
