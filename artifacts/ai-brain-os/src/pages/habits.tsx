import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Flame, CheckCircle2, Circle } from "lucide-react";

interface Habit { id: string; name: string; description: string; category: string; frequency: string; currentStreak: number; longestStreak: number; isActive: boolean; }
interface HabitStatus { habit: Habit; completedToday: boolean; }

const HABIT_EMOJIS: Record<string, string> = {
  study: "📚", coding: "💻", gym: "🏋️", meditation: "🧘", reading: "📖",
  sleep: "😴", general: "✅", health: "💪", work: "💼", project: "🚀",
};

function HabitCard({ status, onLog, onDelete }: { status: HabitStatus; onLog: (id: string, done: boolean) => void; onDelete: (id: string) => void }) {
  const { habit, completedToday } = status;
  const emoji = HABIT_EMOJIS[habit.category] ?? "✅";
  return (
    <Card className={`transition-all ${completedToday ? "border-green-200 bg-green-50/50" : ""}`}>
      <CardContent className="p-4 flex items-center gap-3">
        <button onClick={() => onLog(habit.id, !completedToday)} className="flex-shrink-0">
          {completedToday
            ? <CheckCircle2 className="w-6 h-6 text-green-500" />
            : <Circle className="w-6 h-6 text-gray-400 hover:text-green-500 transition-colors" />}
        </button>
        <span className="text-xl">{emoji}</span>
        <div className="flex-1">
          <p className={`font-medium ${completedToday ? "text-green-700" : ""}`}>{habit.name}</p>
          <div className="flex items-center gap-2 mt-0.5">
            {habit.currentStreak > 0 && (
              <span className="flex items-center gap-0.5 text-xs text-orange-600 font-medium">
                <Flame className="w-3 h-3" />{habit.currentStreak}d streak
              </span>
            )}
            <Badge variant="outline" className="text-xs">{habit.frequency}</Badge>
            {habit.category !== "general" && <Badge variant="outline" className="text-xs">{habit.category}</Badge>}
          </div>
        </div>
        <button onClick={() => onDelete(habit.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
      </CardContent>
    </Card>
  );
}

function NewHabitDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("general");
  const [frequency, setFrequency] = useState("daily");
  const { toast } = useToast();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: any) => apiPost("/habits", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["habits"] }); setOpen(false); setName(""); onCreated(); toast({ title: "Habit created! Keep the streak! 🔥" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Habit</Button></DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>New Habit</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Habit Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Morning coding, Gym, Reading" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.keys(HABIT_EMOJIS).map(c => <SelectItem key={c} value={c}>{HABIT_EMOJIS[c]} {c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Frequency</Label>
              <Select value={frequency} onValueChange={setFrequency}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" disabled={!name.trim() || create.isPending} onClick={() => create.mutate({ name, category, frequency })}>
            {create.isPending ? "Creating…" : "Create Habit"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function HabitsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: habitStatus = [], isLoading } = useQuery<HabitStatus[]>({ queryKey: ["habits", "today"], queryFn: () => apiGet("/habits/today") });

  const log = useMutation({
    mutationFn: ({ id, completed }: { id: string; completed: boolean }) => apiPost(`/habits/${id}/log`, { completed }),
    onSuccess: (_, vars) => { qc.invalidateQueries({ queryKey: ["habits"] }); if (vars.completed) toast({ title: "Habit logged! 🔥" }); },
  });

  const remove = useMutation({ mutationFn: (id: string) => apiDelete(`/habits/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["habits"] }) });

  const completed = habitStatus.filter((s) => s.completedToday).length;
  const total = habitStatus.length;
  const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Habits</h1>
          <p className="text-sm text-muted-foreground">{completed}/{total} done today · {pct}% completion</p>
        </div>
        <NewHabitDialog onCreated={() => {}} />
      </div>

      {/* Progress ring summary */}
      {total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="relative w-16 h-16">
                <svg className="w-16 h-16 -rotate-90" viewBox="0 0 64 64">
                  <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                  <circle cx="32" cy="32" r="26" fill="none" stroke="currentColor" strokeWidth="6" strokeDasharray={`${2 * Math.PI * 26}`} strokeDashoffset={`${2 * Math.PI * 26 * (1 - pct / 100)}`} className="text-green-500 transition-all duration-500" strokeLinecap="round" />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">{pct}%</span>
              </div>
              <div>
                <p className="font-semibold">Today's Habits</p>
                <p className="text-sm text-muted-foreground">{completed} of {total} completed</p>
                {completed === total && total > 0 && <p className="text-xs text-green-600 font-medium mt-0.5">🎉 All done! Perfect day!</p>}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading habits…</div>
      ) : habitStatus.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-4xl mb-3">🔥</p>
          <p>No habits yet. Create one or ask the AI to set up habits for you.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {/* Pending first */}
          {[...habitStatus.filter((s) => !s.completedToday), ...habitStatus.filter((s) => s.completedToday)].map((s) => (
            <HabitCard key={s.habit.id} status={s}
              onLog={(id, done) => log.mutate({ id, completed: done })}
              onDelete={(id) => remove.mutate(id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
