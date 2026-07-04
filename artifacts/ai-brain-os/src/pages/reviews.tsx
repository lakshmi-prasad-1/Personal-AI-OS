import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { RefreshCw, CheckSquare, Clock, Flame, Target, Brain } from "lucide-react";

interface DailyReview {
  id: string; date: string; tasksCompleted: number; tasksTotal: number;
  focusMinutes: number; habitsCompleted: number; habitsTotal: number;
  goalsProgress: any[]; knowledgeAdded: number; aiReview: string;
  recommendations: any[]; missedWork: any[]; createdAt: string;
}

interface WeeklyReview {
  id: string; weekStart: string; weekEnd: string; tasksCompleted: number;
  focusMinutes: number; habitsCompletionRate: number; goalsProgress: any[];
  achievements: any[]; aiReview: string; recommendations: any[]; createdAt: string;
}

function StatCard({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string | number; sub?: string }) {
  return (
    <Card><CardContent className="p-4 flex items-center gap-3">
      <div className="text-primary">{icon}</div>
      <div><p className="text-xs text-muted-foreground">{label}</p><p className="font-bold text-xl">{value}</p>{sub && <p className="text-xs text-muted-foreground">{sub}</p>}</div>
    </CardContent></Card>
  );
}

export default function ReviewsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const today = new Date().toISOString().slice(0, 10);

  const { data: dailyReview, isLoading: loadingDaily } = useQuery<DailyReview | null>({
    queryKey: ["reviews", "daily", today],
    queryFn: () => apiGet(`/reviews/daily?date=${today}`),
  });

  const { data: weeklyReview, isLoading: loadingWeekly } = useQuery<WeeklyReview | null>({
    queryKey: ["reviews", "weekly"],
    queryFn: () => apiGet("/reviews/weekly"),
  });

  const genDaily = useMutation({
    mutationFn: () => apiPost(`/reviews/daily/generate?date=${today}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reviews"] }); toast({ title: "Daily review generated!" }); },
  });

  const genWeekly = useMutation({
    mutationFn: () => apiPost("/reviews/weekly/generate"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reviews"] }); toast({ title: "Weekly review generated!" }); },
  });

  const taskPct = dailyReview?.tasksTotal ? Math.round((dailyReview.tasksCompleted / dailyReview.tasksTotal) * 100) : 0;
  const habitPct = dailyReview?.habitsTotal ? Math.round((dailyReview.habitsCompleted / dailyReview.habitsTotal) * 100) : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-sm text-muted-foreground">Daily & Weekly productivity summaries</p>
      </div>

      {/* Daily Review */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2"><Brain className="w-5 h-5 text-primary" />Daily Review — {today}</h2>
          <Button size="sm" variant="outline" onClick={() => genDaily.mutate()} disabled={genDaily.isPending}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${genDaily.isPending ? "animate-spin" : ""}`} />
            {dailyReview ? "Refresh" : "Generate"}
          </Button>
        </div>

        {loadingDaily ? (
          <div className="text-center text-muted-foreground py-8">Loading…</div>
        ) : dailyReview ? (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <StatCard icon={<CheckSquare className="w-5 h-5" />} label="Tasks Done" value={`${dailyReview.tasksCompleted}/${dailyReview.tasksTotal}`} sub={`${taskPct}%`} />
              <StatCard icon={<Clock className="w-5 h-5" />} label="Focus Time" value={`${dailyReview.focusMinutes}m`} />
              <StatCard icon={<Flame className="w-5 h-5" />} label="Habits" value={`${dailyReview.habitsCompleted}/${dailyReview.habitsTotal}`} sub={`${habitPct}%`} />
              <StatCard icon={<Target className="w-5 h-5" />} label="Knowledge" value={dailyReview.knowledgeAdded} sub="items added" />
            </div>

            {/* Progress bars */}
            <Card><CardContent className="p-4 space-y-3">
              <div><div className="flex justify-between text-xs mb-1"><span>Tasks</span><span>{taskPct}%</span></div><Progress value={taskPct} className="h-2" /></div>
              <div><div className="flex justify-between text-xs mb-1"><span>Habits</span><span>{habitPct}%</span></div><Progress value={habitPct} className="h-2" /></div>
            </CardContent></Card>

            {dailyReview.aiReview && (
              <Card className="bg-primary/5 border-primary/20"><CardContent className="p-4">
                <p className="text-xs font-semibold text-primary mb-1">AI Summary</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{dailyReview.aiReview}</p>
              </CardContent></Card>
            )}

            {(dailyReview.goalsProgress as any[]).length > 0 && (
              <div>
                <p className="text-sm font-medium mb-2">Goals Progress</p>
                <div className="space-y-2">
                  {(dailyReview.goalsProgress as any[]).map((g: any, i: number) => (
                    <div key={i} className="flex items-center gap-2">
                      <p className="text-sm flex-1">{g.title}</p>
                      <div className="w-24"><Progress value={g.progress} className="h-1.5" /></div>
                      <span className="text-xs text-muted-foreground w-8 text-right">{g.progress}%</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <Card className="border-dashed"><CardContent className="p-8 text-center">
            <Brain className="w-10 h-10 mx-auto mb-3 text-muted-foreground/40" />
            <p className="text-muted-foreground">No daily review yet.</p>
            <p className="text-xs text-muted-foreground mt-1">Generate one to see today's productivity summary.</p>
          </CardContent></Card>
        )}
      </section>

      {/* Weekly Review */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">📅 Weekly Review</h2>
          <Button size="sm" variant="outline" onClick={() => genWeekly.mutate()} disabled={genWeekly.isPending}>
            <RefreshCw className={`w-3.5 h-3.5 mr-1 ${genWeekly.isPending ? "animate-spin" : ""}`} />
            {weeklyReview ? "Refresh" : "Generate"}
          </Button>
        </div>

        {loadingWeekly ? (
          <div className="text-center text-muted-foreground py-8">Loading…</div>
        ) : weeklyReview ? (
          <>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>Week of {weeklyReview.weekStart} → {weeklyReview.weekEnd}</span>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon={<CheckSquare className="w-5 h-5" />} label="Tasks Done" value={weeklyReview.tasksCompleted} />
              <StatCard icon={<Clock className="w-5 h-5" />} label="Focus Time" value={`${weeklyReview.focusMinutes}m`} />
              <StatCard icon={<Flame className="w-5 h-5" />} label="Habit Rate" value={`${weeklyReview.habitsCompletionRate}%`} />
            </div>
            {weeklyReview.aiReview && (
              <Card className="bg-primary/5 border-primary/20"><CardContent className="p-4">
                <p className="text-xs font-semibold text-primary mb-1">Weekly AI Summary</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{weeklyReview.aiReview}</p>
              </CardContent></Card>
            )}
          </>
        ) : (
          <Card className="border-dashed"><CardContent className="p-8 text-center">
            <p className="text-muted-foreground">No weekly review yet. Generate one at end of week.</p>
          </CardContent></Card>
        )}
      </section>
    </div>
  );
}
