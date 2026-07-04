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
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, CheckCircle2, Circle, ChevronDown, ChevronUp, Filter } from "lucide-react";

interface Task {
  id: string; title: string; description: string; priority: string; category: string;
  status: string; dueDate?: string; estimatedMinutes?: number; tags: string[];
  difficulty: string; createdByAi: boolean; parentId?: string; createdAt: string;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700", medium: "bg-blue-100 text-blue-700",
  high: "bg-orange-100 text-orange-700", urgent: "bg-red-100 text-red-700",
};
const STATUS_COLORS: Record<string, string> = {
  todo: "bg-gray-100 text-gray-700", in_progress: "bg-blue-100 text-blue-700",
  done: "bg-green-100 text-green-700", archived: "bg-slate-100 text-slate-500",
};

function TaskCard({ task, onComplete, onDelete, onStatusChange }: {
  task: Task; onComplete: (id: string) => void; onDelete: (id: string) => void;
  onStatusChange: (id: string, status: string) => void;
}) {
  const isDone = task.status === "done";
  return (
    <Card className={`transition-opacity ${isDone ? "opacity-60" : ""}`}>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <button onClick={() => !isDone && onComplete(task.id)} className="mt-0.5 flex-shrink-0">
            {isDone ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <Circle className="w-5 h-5 text-gray-400 hover:text-green-500 transition-colors" />}
          </button>
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <p className={`font-medium text-sm leading-tight ${isDone ? "line-through text-muted-foreground" : ""}`}>{task.title}</p>
              <button onClick={() => onDelete(task.id)} className="text-muted-foreground hover:text-destructive transition-colors flex-shrink-0">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
            {task.description && <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{task.description}</p>}
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[task.priority]}`}>{task.priority}</Badge>
              <Badge variant="outline" className={`text-xs ${STATUS_COLORS[task.status]}`}>{task.status.replace("_", " ")}</Badge>
              {task.dueDate && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">📅 {task.dueDate}</Badge>}
              {task.estimatedMinutes && <Badge variant="outline" className="text-xs">⏱ {task.estimatedMinutes}m</Badge>}
              {task.createdByAi && <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">✦ AI</Badge>}
              {task.category !== "general" && <Badge variant="outline" className="text-xs">{task.category}</Badge>}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function NewTaskDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [priority, setPriority] = useState("medium");
  const [category, setCategory] = useState("general");
  const [dueDate, setDueDate] = useState("");
  const [estimatedMinutes, setEstimatedMinutes] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: any) => apiPost("/tasks", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); setOpen(false); setTitle(""); setDescription(""); setDueDate(""); setEstimatedMinutes(""); onCreated(); toast({ title: "Task created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm"><Plus className="w-4 h-4 mr-1" />New Task</Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Task</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What needs to be done?" /></div>
          <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Details..." rows={2} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["low","medium","high","urgent"].map(p => <SelectItem key={p} value={p}>{p}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div><Label>Category</Label><Input value={category} onChange={(e) => setCategory(e.target.value)} placeholder="general" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Due Date</Label><Input type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} /></div>
            <div><Label>Est. Minutes</Label><Input type="number" value={estimatedMinutes} onChange={(e) => setEstimatedMinutes(e.target.value)} placeholder="30" /></div>
          </div>
          <Button className="w-full" disabled={!title.trim() || create.isPending} onClick={() => create.mutate({ title, description, priority, category, dueDate: dueDate || undefined, estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes) : undefined })}>
            {create.isPending ? "Creating…" : "Create Task"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function TasksPage() {
  const [filter, setFilter] = useState<"all" | "today" | "upcoming">("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["tasks", filter],
    queryFn: () => filter === "today" ? apiGet("/tasks/today") : filter === "upcoming" ? apiGet("/tasks/upcoming") : apiGet("/tasks"),
  });

  const complete = useMutation({
    mutationFn: (id: string) => apiPost(`/tasks/${id}/complete`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["tasks"] }); toast({ title: "Task completed! 🎉" }); },
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/tasks/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const changeStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiPatch(`/tasks/${id}`, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tasks"] }),
  });

  const displayed = statusFilter === "all" ? tasks : tasks.filter((t) => t.status === statusFilter);
  const stats = { total: tasks.length, done: tasks.filter((t) => t.status === "done").length, inProgress: tasks.filter((t) => t.status === "in_progress").length };

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Tasks</h1>
          <p className="text-sm text-muted-foreground">{stats.done} done · {stats.inProgress} in progress · {stats.total - stats.done} remaining</p>
        </div>
        <NewTaskDialog onCreated={() => {}} />
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        {(["all","today","upcoming"] as const).map((f) => (
          <Button key={f} variant={filter === f ? "default" : "outline"} size="sm" onClick={() => setFilter(f)}>{f === "all" ? "All" : f === "today" ? "📅 Today" : "🔜 Upcoming"}</Button>
        ))}
        <div className="ml-auto">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="h-8 text-xs"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              {["all","todo","in_progress","done"].map((s) => <SelectItem key={s} value={s}>{s.replace("_"," ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading tasks…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-4xl mb-3">✅</p>
          <p>No tasks here. Create one or ask the AI to create tasks for you.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((task) => (
            <TaskCard key={task.id} task={task}
              onComplete={(id) => complete.mutate(id)}
              onDelete={(id) => remove.mutate(id)}
              onStatusChange={(id, status) => changeStatus.mutate({ id, status })}
            />
          ))}
        </div>
      )}
    </div>
  );
}
