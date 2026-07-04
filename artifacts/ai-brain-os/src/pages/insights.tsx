import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Sparkles } from "lucide-react";

interface Insight {
  id: string;
  category: "productivity" | "habits" | "goals" | "focus" | "balance";
  title: string;
  detail: string;
  severity: "info" | "positive" | "warning";
}

const SEVERITY_COLORS: Record<string, string> = {
  info: "bg-blue-50 text-blue-700 border-blue-200",
  positive: "bg-green-50 text-green-700 border-green-200",
  warning: "bg-orange-50 text-orange-700 border-orange-200",
};
const CATEGORY_ICONS: Record<string, string> = {
  productivity: "⚡", habits: "🔥", goals: "🎯", focus: "⏱", balance: "⚖️",
};

export default function InsightsPage() {
  const { data: insights = [], isLoading } = useQuery<Insight[]>({
    queryKey: ["insights"],
    queryFn: () => apiGet("/insights"),
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Sparkles className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Insights</h1>
          <p className="text-sm text-muted-foreground">Patterns the AI noticed across your tasks, habits, goals, and focus sessions.</p>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : insights.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <Sparkles className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nothing to flag right now — keep using the app and insights will appear here.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {insights.map((insight) => (
            <Card key={insight.id} className={`border ${SEVERITY_COLORS[insight.severity]}`}>
              <CardContent className="p-4 flex items-start gap-3">
                <span className="text-lg">{CATEGORY_ICONS[insight.category] ?? "•"}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold">{insight.title}</p>
                    <Badge variant="outline" className="text-xs">{insight.category}</Badge>
                  </div>
                  <p className="text-sm mt-1 opacity-90">{insight.detail}</p>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
