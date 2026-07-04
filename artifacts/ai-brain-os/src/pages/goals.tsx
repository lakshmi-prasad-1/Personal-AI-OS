import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Slider } from "@/components/ui/slider";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Trophy, Target, TrendingUp } from "lucide-react";

interface Goal {
  id: string; title: string; description: string; category: string; type: string;
  priority: string; status: string; progressPercent: number; targetDate?: string;
  completedAt?: string; milestones: any[]; createdAt: string;
}

const CATEGORY_ICONS: Record<string, string> = {
  career: "💼", learning: "📚", health: "💪", project: "🚀", finance: "💰", personal: "🌟", other: "🎯",
};
const STATUS_COLORS: Record<string, string> = {
  active: "bg-blue-100 text-blue-700", completed: "bg-green-100 text-green-700",
  paused: "bg-yellow-100 text-yellow-700", abandoned: "bg-gray-100 text-gray-500",
};

function GoalCard({ goal, onDelete, onProgressUpdate, onComplete }: {
  goal: Goal; onDelete: (id: string) => void;
  onProgressUpdate: (id: string, p: number) => void;
  onComplete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [progress, setProgress] = useState(goal.progressPercent);
  const icon = CATEGORY_ICONS[goal.category] ?? "🎯";
  const isDone = goal.status === "completed";

  return (
    <Card className={isDone ? "opacity-70" : ""}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{icon}</span>
            <div>
              <p className="font-semibold leading-tight">{goal.title}</p>
              <div className="flex gap-1.5 mt-1">
                <Badge variant="outline" className={`text-xs ${STATUS_COLORS[goal.status]}`}>{goal.status}</Badge>
                <Badge variant="outline" className="text-xs">{goal.type.replace("_"," ")}</Badge>
                <Badge variant="outline" className="text-xs">{goal.priority}</Badge>
                {goal.targetDate && <Badge variant="outline" className="text-xs">🗓 {goal.targetDate}</Badge>}
              </div>
            </div>
          </div>
          <div className="flex gap-1">
            {!isDone && <Button size="sm" variant="ghost" className="h-7 text-green-600 hover:text-green-700 text-xs" onClick={() => onComplete(goal.id)}>Complete</Button>}
            <button onClick={() => onDelete(goal.id)} className="text-muted-foreground hover:text-destructive p-1"><Trash2 className="w-4 h-4" /></button>
          </div>
        </div>
        {goal.description && <p className="text-sm text-muted-foreground mt-2">{goal.description}</p>}
        <div className="mt-4 space-y-2">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>Progress</span>
            <span>{goal.progressPercent}%</span>
          </div>
          <Progress value={goal.progressPercent} className="h-2" />
          {!isDone && (
            editing ? (
              <div className="space-y-2 pt-1">
                <Slider value={[progress]} onValueChange={([v]) => setProgress(v)} min={0} max={100} step={5} />
                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-7 text-xs" onClick={() => { onProgressUpdate(goal.id, progress); setEditing(false); }}>Save {progress}%</Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => { setProgress(goal.progressPercent); setEditing(false); }}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="ghost" size="sm" className="h-6 text-xs w-full" onClick={() => setEditing(true)}>Update Progress</Button>
            )
          )}
        </div>
        {goal.milestones?.length > 0 && (
          <div className="mt-3 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Milestones</p>
            {(goal.milestones as any[]).map((m: any, i: number) => (
              <div key={i} className="flex items-center gap-2 text-xs">
                <span>{m.done ? "✅" : "⭕"}</span>
                <span className={m.done ? "line-through text-muted-foreground" : ""}>{m.title}</span>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function NewGoalDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("personal");
  const [type, setType] = useState("long_term");
  const [priority, setPriority] = useState("medium");
  const [targetDate, setTargetDate] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: any) => apiPost("/goals", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); setOpen(false); setTitle(""); setDescription(""); setTargetDate(""); onCreated(); toast({ title: "Goal created! 🎯" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Goal</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Goal</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to achieve?" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Why is this important?" rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["career","learning","health","project","finance","personal","other"].map(c => <SelectItem key={c} value={c}>{CATEGORY_ICONS[c]} {c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="short_term">Short term</SelectItem><SelectItem value="long_term">Long term</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low","medium","high"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Target Date</Label><Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></div>
          </div>
          <Button className="w-full" disabled={!title.trim() || create.isPending} onClick={() => create.mutate({ title, description, category, type, priority, targetDate: targetDate || undefined })}>
            {create.isPending ? "Creating…" : "Create Goal"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function GoalsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: goals = [], isLoading } = useQuery<Goal[]>({ queryKey: ["goals"], queryFn: () => apiGet("/goals") });

  const remove = useMutation({ mutationFn: (id: string) => apiDelete(`/goals/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["goals"] }) });
  const updateProgress = useMutation({ mutationFn: ({ id, p }: { id: string; p: number }) => apiPatch(`/goals/${id}/progress`, { progressPercent: p }), onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast({ title: "Progress updated!" }); } });
  const complete = useMutation({ mutationFn: (id: string) => apiPost(`/goals/${id}/complete`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["goals"] }); toast({ title: "Goal completed! 🏆" }); } });

  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status === "completed");
  const avgProgress = active.length ? Math.round(active.reduce((s, g) => s + g.progressPercent, 0) / active.length) : 0;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Goals</h1>
          <p className="text-sm text-muted-foreground">{active.length} active · {done.length} completed · avg {avgProgress}% progress</p>
        </div>
        <NewGoalDialog onCreated={() => {}} />
      </div>

      {/* Stats */}
      {goals.length > 0 && (
        <div className="grid grid-cols-3 gap-3">
          {[{ icon: <Target className="w-5 h-5" />, label: "Active", value: active.length, color: "text-blue-600" },
            { icon: <Trophy className="w-5 h-5" />, label: "Completed", value: done.length, color: "text-green-600" },
            { icon: <TrendingUp className="w-5 h-5" />, label: "Avg Progress", value: `${avgProgress}%`, color: "text-purple-600" }
          ].map((s) => (
            <Card key={s.label}><CardContent className="p-3 flex items-center gap-3">
              <div className={s.color}>{s.icon}</div>
              <div><p className="text-xs text-muted-foreground">{s.label}</p><p className="font-bold text-lg">{s.value}</p></div>
            </CardContent></Card>
          ))}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading goals…</div>
      ) : goals.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-4xl mb-3">🎯</p>
          <p>No goals yet. Create one or tell the AI about something you want to achieve.</p>
        </div>
      ) : (
        <>
          {active.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Active</h2>
              {active.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onDelete={(id) => remove.mutate(id)} onProgressUpdate={(id, p) => updateProgress.mutate({ id, p })} onComplete={(id) => complete.mutate(id)} />
              ))}
            </div>
          )}
          {done.length > 0 && (
            <div className="space-y-3">
              <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Completed</h2>
              {done.map((goal) => (
                <GoalCard key={goal.id} goal={goal} onDelete={(id) => remove.mutate(id)} onProgressUpdate={(id, p) => updateProgress.mutate({ id, p })} onComplete={(id) => complete.mutate(id)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
