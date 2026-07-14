import { trpc } from "@/providers/trpc";
import { Card, CardContent } from "@/components/ui/card";
import { BookOpen, Target, Zap } from "lucide-react";

export default function StatsPanel() {
  const { data: stats } = trpc.word.stats.useQuery();

  if (!stats) return null;

  return (
    <div className="space-y-4">
      {/* Overview Cards */}
      <div className="grid grid-cols-3 gap-3">
        <Card className="border-indigo-100 bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <BookOpen className="w-4 h-4 text-indigo-500" />
              <span className="text-xs text-gray-500">总单词数</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
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
        <Card className="border-green-100 bg-gradient-to-br from-green-50 to-white">
          <CardContent className="p-4">
            <div className="flex items-center gap-2 mb-2">
              <Target className="w-4 h-4 text-green-500" />
              <span className="text-xs text-gray-500">已掌握</span>
            </div>
            <p className="text-2xl font-bold text-gray-900">
              {stats.byProficiency.find((p) => p.proficiency === "mastered")?.count ?? 0}
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
