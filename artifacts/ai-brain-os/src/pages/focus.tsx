import { useState, useEffect, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Play, Pause, Square, Plus, Timer, Flame } from "lucide-react";

interface FocusSession {
  id: string; title: string; type: string; status: string;
  plannedMinutes: number; breakMinutes: number; actualMinutes?: number;
  startedAt?: string; pausedAt?: string; completedAt?: string;
  pomodoroCount: number; notes: string; createdAt: string;
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ActiveTimer({ session, onStop, onPause, onResume }: {
  session: FocusSession; onStop: () => void; onPause: () => void; onResume: () => void;
}) {
  const [elapsed, setElapsed] = useState(0);
  const isPaused = session.status === "paused";

  useEffect(() => {
    if (isPaused) return;
    const start = session.startedAt ? new Date(session.startedAt).getTime() : Date.now();
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [session.startedAt, isPaused]);

  const totalSecs = session.plannedMinutes * 60;
  const remaining = Math.max(0, totalSecs - elapsed);
  const progress = Math.min(100, (elapsed / totalSecs) * 100);

  return (
    <Card className="border-2 border-primary/20 bg-primary/5">
      <CardContent className="p-6 text-center space-y-4">
        <div className="space-y-1">
          <Badge>{session.type.replace("_", " ")}</Badge>
          <p className="font-semibold text-lg mt-2">{session.title}</p>
        </div>

        {/* Circular progress */}
        <div className="relative w-40 h-40 mx-auto">
          <svg className="w-40 h-40 -rotate-90" viewBox="0 0 160 160">
            <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
            <circle cx="80" cy="80" r="68" fill="none" stroke="currentColor" strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 68}`}
              strokeDashoffset={`${2 * Math.PI * 68 * (1 - progress / 100)}`}
              className={`transition-all ${isPaused ? "text-yellow-500" : "text-primary"}`}
              strokeLinecap="round" />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-mono font-bold">{formatTime(remaining)}</span>
            <span className="text-xs text-muted-foreground">{isPaused ? "paused" : "remaining"}</span>
          </div>
        </div>

        <div className="flex justify-center gap-2">
          {isPaused
            ? <Button onClick={onResume} className="gap-2"><Play className="w-4 h-4" />Resume</Button>
            : <Button variant="outline" onClick={onPause} className="gap-2"><Pause className="w-4 h-4" />Pause</Button>}
          <Button variant="destructive" onClick={onStop} className="gap-2"><Square className="w-4 h-4" />Stop</Button>
        </div>

        <p className="text-xs text-muted-foreground">{session.plannedMinutes}min {session.type} session</p>
      </CardContent>
    </Card>
  );
}

function NewSessionDialog({ onCreated }: { onCreated: (id: string) => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("pomodoro");
  const [minutes, setMinutes] = useState("25");
  const { toast } = useToast();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: any) => apiPost("/focus", data),
    onSuccess: async (session: FocusSession) => {
      const started = await apiPost<FocusSession>(`/focus/${session.id}/start`);
      qc.invalidateQueries({ queryKey: ["focus"] });
      setOpen(false); setTitle("");
      onCreated(session.id);
      toast({ title: "Focus session started! 🎯" });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const PRESETS = [
    { label: "Pomodoro 25m", type: "pomodoro", minutes: 25 },
    { label: "Deep Work 50m", type: "deep_work", minutes: 50 },
    { label: "Study 45m", type: "study", minutes: 45 },
    { label: "Quick 15m", type: "pomodoro", minutes: 15 },
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button><Play className="w-4 h-4 mr-1" />Start Session</Button></DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Start Focus Session</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            {PRESETS.map((p) => (
              <Button key={p.label} variant={type === p.type && parseInt(minutes) === p.minutes ? "default" : "outline"} size="sm" className="text-xs h-8"
                onClick={() => { setType(p.type); setMinutes(String(p.minutes)); }}>
                {p.label}
              </Button>
            ))}
          </div>
          <div><Label>Session Name *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What are you working on?" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["pomodoro","deep_work","study","coding"].map(t => <SelectItem key={t} value={t}>{t.replace("_"," ")}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Minutes</Label><Input type="number" value={minutes} onChange={(e) => setMinutes(e.target.value)} min={1} max={180} /></div>
          </div>
          <Button className="w-full" disabled={!title.trim() || create.isPending} onClick={() => create.mutate({ title, type, plannedMinutes: parseInt(minutes) || 25 })}>
            {create.isPending ? "Starting…" : "Start Session"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function FocusPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: active, isLoading: loadingActive } = useQuery<FocusSession | null>({
    queryKey: ["focus", "active"],
    queryFn: () => apiGet("/focus/active"),
    refetchInterval: 5000,
  });

  const { data: sessions = [], isLoading: loadingSessions } = useQuery<FocusSession[]>({
    queryKey: ["focus", "list"],
    queryFn: () => apiGet("/focus"),
  });

  const { data: stats } = useQuery({ queryKey: ["focus","stats"], queryFn: () => apiGet<{totalMinutes:number;sessions:number;pomodoroCount:number}>("/focus/stats") });

  const pause = useMutation({ mutationFn: (id: string) => apiPost(`/focus/${id}/pause`), onSuccess: () => qc.invalidateQueries({ queryKey: ["focus"] }) });
  const resume = useMutation({ mutationFn: (id: string) => apiPost(`/focus/${id}/resume`), onSuccess: () => qc.invalidateQueries({ queryKey: ["focus"] }) });
  const stop = useMutation({
    mutationFn: (id: string) => apiPost(`/focus/${id}/stop`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["focus"] }); toast({ title: "Session complete! Great work! 🏆" }); },
  });

  const recentCompleted = sessions.filter((s) => s.status === "completed").slice(0, 5);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Focus Mode</h1>
          <p className="text-sm text-muted-foreground">Pomodoro · Deep Work · Study Sessions</p>
        </div>
        {!active && <NewSessionDialog onCreated={() => qc.invalidateQueries({ queryKey: ["focus"] })} />}
      </div>

      {/* Stats */}
      {stats && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Today's Focus", value: `${stats.totalMinutes}m`, icon: "⏱" },
            { label: "Sessions", value: stats.sessions, icon: "🎯" },
            { label: "Pomodoros", value: stats.pomodoroCount, icon: "🍅" },
          ].map((s) => (
            <Card key={s.label}><CardContent className="p-3 text-center">
              <p className="text-2xl">{s.icon}</p>
              <p className="font-bold text-xl">{s.value}</p>
              <p className="text-xs text-muted-foreground">{s.label}</p>
            </CardContent></Card>
          ))}
        </div>
      )}

      {/* Active Session */}
      {active && (active.status === "active" || active.status === "paused") ? (
        <ActiveTimer session={active} onStop={() => stop.mutate(active.id)} onPause={() => pause.mutate(active.id)} onResume={() => resume.mutate(active.id)} />
      ) : (
        <Card className="border-dashed">
          <CardContent className="p-8 text-center space-y-3">
            <Timer className="w-12 h-12 mx-auto text-muted-foreground/50" />
            <p className="font-medium">No active session</p>
            <p className="text-sm text-muted-foreground">Start a focus session to track your work time.</p>
            <NewSessionDialog onCreated={() => qc.invalidateQueries({ queryKey: ["focus"] })} />
          </CardContent>
        </Card>
      )}

      {/* Recent sessions */}
      {recentCompleted.length > 0 && (
        <div className="space-y-2">
          <h2 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Recent Sessions</h2>
          {recentCompleted.map((s) => (
            <Card key={s.id}><CardContent className="p-3 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.type.replace("_"," ")} · {s.actualMinutes ?? s.plannedMinutes}min</p>
              </div>
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">✓ done</Badge>
            </CardContent></Card>
          ))}
        </div>
      )}
    </div>
  );
}
