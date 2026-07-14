import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import {
  BookOpen,
  Target,
  Zap,
  Star,
} from "lucide-react";

const proficiencyConfig = {
  new: { label: "新词", color: "bg-red-500", textColor: "text-red-600" },
  learning: { label: "学习中", color: "bg-yellow-500", textColor: "text-yellow-600" },
  familiar: { label: "熟悉", color: "bg-blue-500", textColor: "text-blue-600" },
  mastered: { label: "已掌握", color: "bg-green-500", textColor: "text-green-600" },
};

export default function StatsPanel() {
  const { data: stats } = trpc.word.stats.useQuery();

  if (!stats) return null;

  const total = stats.total || 1;
  const mastered = stats.byProficiency.find((p) => p.proficiency === "mastered")?.count ?? 0;
  const familiar = stats.byProficiency.find((p) => p.proficiency === "familiar")?.count ?? 0;
  const learning = stats.byProficiency.find((p) => p.proficiency === "learning")?.count ?? 0;
  const newWords = stats.byProficiency.find((p) => p.proficiency === "new")?.count ?? 0;
  const masteryRate = Math.round((mastered / total) * 100);

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span className="text-xs text-gray-500">总单词数</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
          </CardContent>
        </Card>
        <Card className="border-green-100 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">掌握率</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{masteryRate}%</p>
          </CardContent>
        </Card>
        <Card className="border-blue-100 bg-gradient-to-br from-blue-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Zap className="w-4 h-4 text-blue-500" />
              <span className="text-xs text-gray-500">今日新学</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.todayLearned}</p>
          </CardContent>
        </Card>
        <Card className="border-amber-100 bg-gradient-to-br from-amber-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Star className="w-4 h-4 text-amber-500" />
              <span className="text-xs text-gray-500">已掌握</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{mastered}</p>
          </CardContent>
        </Card>
      </div>

      {/* Proficiency Breakdown */}
      <Card>
        <CardContent className="p-4">
          <h3 className="text-sm font-medium text-gray-700 mb-4">熟练度分布</h3>
          <div className="space-y-3">
            {(
              [
                ["new", newWords],
                ["learning", learning],
                ["familiar", familiar],
                ["mastered", mastered],
              ] as const
            ).map(([key, count]) => {
              const config = proficiencyConfig[key];
              const percentage = Math.round((count / total) * 100);
              return (
                <div key={key}>
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs text-gray-600">{config.label}</span>
                    <span className="text-xs font-medium text-gray-700">
                      {count} ({percentage}%)
                    </span>
                  </div>
                  <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full ${config.color} rounded-full transition-all duration-500`}
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
