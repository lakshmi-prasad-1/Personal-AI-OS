import { useEffect } from "react";
import { Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { getLocalDateString } from "@/lib/utils";
import { useBrainActivity, useListNotes, useListIdeas } from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import {
  CheckSquare, Target, Flame, Timer, Bell, CalendarDays,
  Activity, Brain, ArrowRight, Circle, CheckCircle2,
  Lightbulb, Clock,
} from "lucide-react";

interface Task { id: string; title: string; priority: string; status: string; dueDate?: string; }
interface HabitStatus { habit: { id: string; name: string; currentStreak: number }; completedToday: boolean; }
interface Goal { id: string; title: string; progressPercent: number; category: string; status: string; }
interface Reminder { id: string; title: string; remindAt: string; }
interface FocusSession { id: string; title: string; type: string; status: string; plannedMinutes: number; }
interface FocusStats { totalMinutes: number; sessions: number; pomodoroCount: number; }
interface PlannerEvent { id: string; title: string; type: string; startTime?: string; isCompleted: boolean; }

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-600",
  medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700",
  urgent: "bg-red-100 text-red-700",
};

function timeAgo(dateStr: string): string {
  const s = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function Dashboard() {
  const today = getLocalDateString();

  const { data: todayTasks = [], isLoading: loadingTasks } = useQuery<Task[]>({
    queryKey: ["tasks", "today", today], queryFn: () => apiGet(`/tasks/today?date=${today}`),
  });
  const { data: habitStatus = [] } = useQuery<HabitStatus[]>({
    queryKey: ["habits", "today"], queryFn: () => apiGet("/habits/today"),
  });
  const { data: goals = [] } = useQuery<Goal[]>({
    queryKey: ["goals"], queryFn: () => apiGet("/goals"),
  });
  const { data: reminders = [] } = useQuery<Reminder[]>({
    queryKey: ["reminders", "upcoming"], queryFn: () => apiGet("/reminders/upcoming"),
  });
  const { data: plannerEvents = [] } = useQuery<PlannerEvent[]>({
    queryKey: ["planner", today], queryFn: () => apiGet(`/planner/day/${today}`),
  });
  const { data: activeFocus } = useQuery<FocusSession | null>({
    queryKey: ["focus", "active"], queryFn: () => apiGet("/focus/active"), refetchInterval: 10000,
  });
  const { data: focusStats } = useQuery<FocusStats>({
    queryKey: ["focus", "stats"], queryFn: () => apiGet("/focus/stats"),
  });
  const { data: activity } = useBrainActivity();
  const { data: notes } = useListNotes();
  const { data: ideas } = useListIdeas();

  const qc = useQueryClient();
  const completeTask = useMutation({
    mutationFn: (id: string) => apiPost(`/tasks/${id}/complete`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const pendingTasks = todayTasks.filter((t) => t.status !== "done");
  const doneTasks = todayTasks.filter((t) => t.status === "done");
  const habitsCompleted = habitStatus.filter((h) => h.completedToday).length;
  const habitsTotal = habitStatus.length;
  const activeGoals = goals.filter((g) => g.status === "active").slice(0, 3);
  const taskPct = todayTasks.length ? Math.round((doneTasks.length / todayTasks.length) * 100) : 0;
  const habitPct = habitsTotal ? Math.round((habitsCompleted / habitsTotal) * 100) : 0;

  const greetingHour = new Date().getHours();
  const greeting = greetingHour < 12 ? "Good morning" : greetingHour < 17 ? "Good afternoon" : "Good evening";

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold">{greeting} 👋</h1>
        <p className="text-sm text-muted-foreground">
          {new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
          {activeFocus && <span className="ml-2 text-primary font-medium">· 🎯 Focus session active</span>}
        </p>
      </div>

      {/* Active Focus Banner */}
      {activeFocus && (activeFocus.status === "active" || activeFocus.status === "paused") && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="p-4 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Timer className="w-5 h-5 text-primary" />
              <div>
                <p className="font-medium text-sm">Focus Session Active</p>
                <p className="text-xs text-muted-foreground">{activeFocus.title} · {activeFocus.plannedMinutes}min {activeFocus.type.replace("_"," ")}</p>
              </div>
            </div>
            <Link href="/focus"><Button size="sm" variant="outline">Open</Button></Link>
          </CardContent>
        </Card>
      )}

      {/* Score cards row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Link href="/tasks">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><CheckSquare className="w-4 h-4 text-blue-600" /><span className="text-xs font-medium text-muted-foreground">Tasks Today</span></div>
              <p className="text-2xl font-bold">{doneTasks.length}/{todayTasks.length}</p>
              <Progress value={taskPct} className="h-1 mt-2" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/habits">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><Flame className="w-4 h-4 text-orange-500" /><span className="text-xs font-medium text-muted-foreground">Habits</span></div>
              <p className="text-2xl font-bold">{habitsCompleted}/{habitsTotal}</p>
              <Progress value={habitPct} className="h-1 mt-2" />
            </CardContent>
          </Card>
        </Link>
        <Link href="/focus">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><Timer className="w-4 h-4 text-purple-600" /><span className="text-xs font-medium text-muted-foreground">Focus Time</span></div>
              <p className="text-2xl font-bold">{focusStats?.totalMinutes ?? 0}<span className="text-sm font-normal text-muted-foreground">m</span></p>
              <p className="text-xs text-muted-foreground mt-1">{focusStats?.sessions ?? 0} sessions</p>
            </CardContent>
          </Card>
        </Link>
        <Link href="/goals">
          <Card className="hover:shadow-md transition-shadow cursor-pointer">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 mb-2"><Target className="w-4 h-4 text-green-600" /><span className="text-xs font-medium text-muted-foreground">Active Goals</span></div>
              <p className="text-2xl font-bold">{activeGoals.length}</p>
              {activeGoals.length > 0 && <p className="text-xs text-muted-foreground mt-1">avg {Math.round(activeGoals.reduce((s, g) => s + g.progressPercent, 0) / activeGoals.length)}%</p>}
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Main content grid */}
      <div className="grid md:grid-cols-2 gap-4">
        {/* Today's Tasks */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><CheckSquare className="w-4 h-4 text-blue-600" />Today's Tasks</CardTitle>
            <Link href="/tasks"><Button variant="ghost" size="sm" className="h-6 text-xs gap-1">All<ArrowRight className="w-3 h-3" /></Button></Link>
          </CardHeader>
          <CardContent>
            {loadingTasks ? <p className="text-sm text-muted-foreground py-2">Loading…</p>
            : todayTasks.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No tasks due today</p>
                <Link href="/tasks"><Button size="sm" variant="outline" className="mt-2 text-xs">Add Task</Button></Link>
              </div>
            ) : (
              <div className="space-y-2">
                {[...pendingTasks, ...doneTasks].slice(0, 6).map((t) => (
                  <div key={t.id} className="flex items-center gap-2">
                    <button
                      onClick={() => t.status !== "done" && completeTask.mutate(t.id)}
                      disabled={t.status === "done" || completeTask.isPending}
                      className="shrink-0"
                    >
                      {t.status === "done" ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Circle className="w-4 h-4 text-gray-400 hover:text-green-500 transition-colors" />}
                    </button>
                    <span className={`text-sm flex-1 truncate ${t.status === "done" ? "line-through text-muted-foreground" : ""}`}>{t.title}</span>
                    <Badge variant="outline" className={`text-xs shrink-0 ${PRIORITY_COLORS[t.priority]}`}>{t.priority}</Badge>
                  </div>
                ))}
                {todayTasks.length > 6 && <p className="text-xs text-muted-foreground">+{todayTasks.length - 6} more</p>}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Habits */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Flame className="w-4 h-4 text-orange-500" />Today's Habits</CardTitle>
            <Link href="/habits"><Button variant="ghost" size="sm" className="h-6 text-xs gap-1">All<ArrowRight className="w-3 h-3" /></Button></Link>
          </CardHeader>
          <CardContent>
            {habitStatus.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No habits yet</p>
                <Link href="/habits"><Button size="sm" variant="outline" className="mt-2 text-xs">Add Habit</Button></Link>
              </div>
            ) : (
              <div className="space-y-2">
                {habitStatus.slice(0, 5).map((s) => (
                  <div key={s.habit.id} className="flex items-center gap-2">
                    {s.completedToday ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" /> : <Circle className="w-4 h-4 text-gray-400 shrink-0" />}
                    <span className={`text-sm flex-1 ${s.completedToday ? "text-muted-foreground" : ""}`}>{s.habit.name}</span>
                    {s.habit.currentStreak > 0 && <span className="text-xs text-orange-600 shrink-0">🔥 {s.habit.currentStreak}d</span>}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Goals */}
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-semibold flex items-center gap-2"><Target className="w-4 h-4 text-green-600" />Active Goals</CardTitle>
            <Link href="/goals"><Button variant="ghost" size="sm" className="h-6 text-xs gap-1">All<ArrowRight className="w-3 h-3" /></Button></Link>
          </CardHeader>
          <CardContent>
            {activeGoals.length === 0 ? (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground">No active goals</p>
                <Link href="/goals"><Button size="sm" variant="outline" className="mt-2 text-xs">Add Goal</Button></Link>
              </div>
            ) : (
              <div className="space-y-3">
                {activeGoals.map((g) => (
                  <div key={g.id}>
                    <div className="flex justify-between text-xs mb-1">
                      <span className="truncate font-medium">{g.title}</span>
                      <span className="text-muted-foreground ml-2 shrink-0">{g.progressPercent}%</span>
                    </div>
                    <Progress value={g.progressPercent} className="h-1.5" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Planner + Reminders */}
        <div className="space-y-4">
          <Card>
            <CardHeader className="pb-2 flex flex-row items-center justify-between">
              <CardTitle className="text-sm font-semibold flex items-center gap-2"><CalendarDays className="w-4 h-4 text-purple-600" />Today's Plan</CardTitle>
              <Link href="/planner"><Button variant="ghost" size="sm" className="h-6 text-xs gap-1">View<ArrowRight className="w-3 h-3" /></Button></Link>
            </CardHeader>
            <CardContent>
              {plannerEvents.length === 0 ? (
                <div className="text-center py-3">
                  <p className="text-sm text-muted-foreground">Nothing scheduled</p>
                  <Link href="/planner"><Button size="sm" variant="outline" className="mt-2 text-xs">Plan Day</Button></Link>
                </div>
              ) : (
                <div className="space-y-1.5">
                  {plannerEvents.slice(0, 4).map((e) => (
                    <div key={e.id} className={`flex items-center gap-2 text-sm ${e.isCompleted ? "opacity-50" : ""}`}>
                      <div className="w-1.5 h-1.5 rounded-full bg-primary shrink-0" />
                      <span className={`flex-1 truncate ${e.isCompleted ? "line-through" : ""}`}>{e.title}</span>
                      {e.startTime && <span className="text-xs text-muted-foreground shrink-0">{e.startTime}</span>}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {reminders.length > 0 && (
            <Card>
              <CardHeader className="pb-2 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold flex items-center gap-2"><Bell className="w-4 h-4 text-indigo-600" />Upcoming Reminders</CardTitle>
                <Link href="/reminders"><Button variant="ghost" size="sm" className="h-6 text-xs gap-1">All<ArrowRight className="w-3 h-3" /></Button></Link>
              </CardHeader>
              <CardContent>
                <div className="space-y-1.5">
                  {reminders.slice(0, 3).map((r) => (
                    <div key={r.id} className="flex items-center gap-2 text-sm">
                      <Bell className="w-3 h-3 text-indigo-500 shrink-0" />
                      <span className="flex-1 truncate">{r.title}</span>
                      <span className="text-xs text-muted-foreground shrink-0">{new Date(r.remindAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Recent Activity */}
      {(() => {
        // useBrainActivity returns { actions: AgentAction[] } or AgentAction[] depending on API version
        const activityList: any[] = Array.isArray(activity)
          ? (activity as any[])
          : (activity as any)?.actions ?? [];
        if (!activityList.length) return null;
        return (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold flex items-center gap-2"><Activity className="w-4 h-4" />Recent Activity</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {activityList.slice(0, 5).map((item: any) => (
                  <div key={item.id} className="flex items-center gap-3 text-sm">
                    <div className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0" />
                    <span className="flex-1 text-muted-foreground">{item.summary}</span>
                    <span className="text-xs text-muted-foreground shrink-0">{timeAgo(item.createdAt)}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })()}

      {/* Quick links to knowledge base */}
      {(notes || ideas) && (
        <div className="grid grid-cols-2 gap-3">
          {notes && (notes as any[]).length > 0 && (
            <Link href="/notes">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-3 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-primary" />
                  <div>
                    <p className="text-sm font-medium">{(notes as any[]).length} Notes</p>
                    <p className="text-xs text-muted-foreground">Knowledge base</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
          {ideas && (ideas as any[]).length > 0 && (
            <Link href="/ideas">
              <Card className="hover:shadow-md transition-shadow cursor-pointer">
                <CardContent className="p-3 flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-yellow-500" />
                  <div>
                    <p className="text-sm font-medium">{(ideas as any[]).length} Ideas</p>
                    <p className="text-xs text-muted-foreground">Captured ideas</p>
                  </div>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
