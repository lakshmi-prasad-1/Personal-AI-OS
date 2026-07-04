import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LineChart } from "lucide-react";

interface ProductivityAnalytics {
  rangeDays: number;
  trend: { date: string; tasksCompleted: number; focusMinutes: number; habitsCompleted: number }[];
  totals: { tasksCompleted: number; focusMinutes: number; habitsCompleted: number };
  averages: { tasksPerDay: number; focusMinutesPerDay: number; habitsPerDay: number };
  mostProductiveDay: string | null;
  taskCompletionRate: number;
  activeGoalsCount: number;
  streakSummary: { longestCurrentStreak: number };
}

function Stat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="p-3 rounded-lg border bg-muted/30">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-xl font-bold mt-0.5">{value}</p>
    </div>
  );
}

export default function AnalyticsPage() {
  const [days, setDays] = useState(30);
  const { data, isLoading } = useQuery<ProductivityAnalytics>({
    queryKey: ["analytics", days],
    queryFn: () => apiGet(`/analytics/productivity?days=${days}`),
  });

  const maxValue = data ? Math.max(1, ...data.trend.map((t) => t.tasksCompleted + t.habitsCompleted)) : 1;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <LineChart className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Productivity Analytics</h1>
            <p className="text-sm text-muted-foreground">Trends across tasks, focus, and habits.</p>
          </div>
        </div>
        <div className="flex gap-1">
          {[7, 30, 90].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d}d</Button>
          ))}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Tasks completed" value={data.totals.tasksCompleted} />
            <Stat label="Focus minutes" value={data.totals.focusMinutes} />
            <Stat label="Habits completed" value={data.totals.habitsCompleted} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Stat label="Tasks/day avg" value={data.averages.tasksPerDay} />
            <Stat label="Focus min/day avg" value={data.averages.focusMinutesPerDay} />
            <Stat label="Task completion" value={`${Math.round(data.taskCompletionRate * 100)}%`} />
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base">Daily activity (tasks + habits)</CardTitle></CardHeader>
            <CardContent>
              <div className="flex items-end gap-1 h-28">
                {data.trend.map((t) => {
                  const value = t.tasksCompleted + t.habitsCompleted;
                  const height = Math.max(4, Math.round((value / maxValue) * 100));
                  return (
                    <div key={t.date} className="flex-1 flex flex-col items-center justify-end h-full" title={`${t.date}: ${value}`}>
                      <div className="w-full rounded-t bg-primary/70" style={{ height: `${height}%` }} />
                    </div>
                  );
                })}
              </div>
              <div className="flex justify-between text-xs text-muted-foreground mt-2">
                <span>{data.trend[0]?.date}</span>
                <span>{data.trend[data.trend.length - 1]?.date}</span>
              </div>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 gap-3">
            <Stat label="Most productive day" value={data.mostProductiveDay ?? "—"} />
            <Stat label="Active goals" value={data.activeGoalsCount} />
          </div>
        </>
      )}
    </div>
  );
}
