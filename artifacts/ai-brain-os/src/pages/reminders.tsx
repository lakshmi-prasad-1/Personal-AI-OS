import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Bell, BellOff, CheckCircle2 } from "lucide-react";

interface Reminder {
  id: string; title: string; body: string; remindAt: string;
  isRecurring: boolean; recurringPattern?: string; isCompleted: boolean;
  isSnoozed: boolean; createdByAi: boolean; createdAt: string;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

function isOverdue(iso: string): boolean { return new Date(iso) < new Date(); }

function ReminderCard({ reminder, onComplete, onDelete }: { reminder: Reminder; onComplete: (id: string) => void; onDelete: (id: string) => void }) {
  const overdue = !reminder.isCompleted && isOverdue(reminder.remindAt);
  return (
    <Card className={`${reminder.isCompleted ? "opacity-60" : ""} ${overdue ? "border-red-200" : ""}`}>
      <CardContent className="p-4 flex items-start gap-3">
        <button onClick={() => !reminder.isCompleted && onComplete(reminder.id)} className="mt-0.5 flex-shrink-0">
          {reminder.isCompleted
            ? <CheckCircle2 className="w-5 h-5 text-green-500" />
            : <Bell className={`w-5 h-5 ${overdue ? "text-red-500" : "text-blue-500"} hover:scale-110 transition-transform`} />}
        </button>
        <div className="flex-1 min-w-0">
          <p className={`font-medium text-sm ${reminder.isCompleted ? "line-through text-muted-foreground" : ""}`}>{reminder.title}</p>
          {reminder.body && <p className="text-xs text-muted-foreground mt-0.5">{reminder.body}</p>}
          <div className="flex flex-wrap gap-1.5 mt-1.5">
            <Badge variant="outline" className={`text-xs ${overdue && !reminder.isCompleted ? "bg-red-50 text-red-700" : "bg-purple-50 text-purple-700"}`}>
              🕐 {formatDate(reminder.remindAt)}
            </Badge>
            {reminder.isRecurring && reminder.recurringPattern && (
              <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">↻ {reminder.recurringPattern}</Badge>
            )}
            {reminder.createdByAi && <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">✦ AI</Badge>}
            {overdue && !reminder.isCompleted && <Badge variant="outline" className="text-xs bg-red-50 text-red-700">Overdue</Badge>}
          </div>
        </div>
        <button onClick={() => onDelete(reminder.id)} className="text-muted-foreground hover:text-destructive p-1 flex-shrink-0"><Trash2 className="w-4 h-4" /></button>
      </CardContent>
    </Card>
  );
}

function NewReminderDialog({ onCreated }: { onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [remindAt, setRemindAt] = useState("");
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringPattern, setRecurringPattern] = useState("daily");
  const { toast } = useToast();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: any) => apiPost("/reminders", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["reminders"] }); setOpen(false); setTitle(""); setBody(""); setRemindAt(""); onCreated(); toast({ title: "Reminder set! 🔔" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  // Quick-set shortcuts
  const setQuick = (hoursFromNow: number) => {
    const d = new Date(Date.now() + hoursFromNow * 3600000);
    setRemindAt(d.toISOString().slice(0, 16));
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Reminder</Button></DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Set Reminder</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="What do you want to remember?" /></div>
          <div><Label>Details</Label><Textarea value={body} onChange={(e) => setBody(e.target.value)} placeholder="Additional details…" rows={2} /></div>
          <div>
            <Label>When</Label>
            <div className="flex gap-1 mt-1 mb-2">
              {[["1h", 1], ["3h", 3], ["Tomorrow", 24], ["2 days", 48]].map(([label, h]) => (
                <Button key={label as string} variant="outline" size="sm" className="text-xs h-7" onClick={() => setQuick(h as number)}>{label}</Button>
              ))}
            </div>
            <Input type="datetime-local" value={remindAt} onChange={(e) => setRemindAt(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <Switch id="recurring" checked={isRecurring} onCheckedChange={setIsRecurring} />
            <Label htmlFor="recurring" className="cursor-pointer">Recurring</Label>
          </div>
          {isRecurring && (
            <Select value={recurringPattern} onValueChange={setRecurringPattern}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent><SelectItem value="daily">Daily</SelectItem><SelectItem value="weekly">Weekly</SelectItem><SelectItem value="monthly">Monthly</SelectItem></SelectContent>
            </Select>
          )}
          <Button className="w-full" disabled={!title.trim() || !remindAt || create.isPending}
            onClick={() => create.mutate({ title, body, remindAt: new Date(remindAt).toISOString(), isRecurring, ...(isRecurring ? { recurringPattern } : {}) })}>
            {create.isPending ? "Setting…" : "Set Reminder"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function RemindersPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: reminders = [], isLoading } = useQuery<Reminder[]>({ queryKey: ["reminders"], queryFn: () => apiGet("/reminders") });

  const complete = useMutation({ mutationFn: (id: string) => apiPost(`/reminders/${id}/complete`), onSuccess: () => { qc.invalidateQueries({ queryKey: ["reminders"] }); toast({ title: "Reminder dismissed ✓" }); } });
  const remove = useMutation({ mutationFn: (id: string) => apiDelete(`/reminders/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["reminders"] }) });

  const overdue = reminders.filter((r) => !r.isCompleted && isOverdue(r.remindAt));
  const upcoming = reminders.filter((r) => !r.isCompleted && !isOverdue(r.remindAt));

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Reminders</h1>
          <p className="text-sm text-muted-foreground">{upcoming.length} upcoming{overdue.length > 0 ? ` · ${overdue.length} overdue` : ""}</p>
        </div>
        <NewReminderDialog onCreated={() => {}} />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading reminders…</div>
      ) : reminders.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-4xl mb-3">🔔</p>
          <p>No reminders. Set one or ask the AI — "Remind me tomorrow at 6pm to check emails."</p>
        </div>
      ) : (
        <div className="space-y-4">
          {overdue.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-red-600 uppercase tracking-wide">⚠ Overdue</h2>
              {overdue.map((r) => <ReminderCard key={r.id} reminder={r} onComplete={(id) => complete.mutate(id)} onDelete={(id) => remove.mutate(id)} />)}
            </div>
          )}
          {upcoming.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">Upcoming</h2>
              {upcoming.map((r) => <ReminderCard key={r.id} reminder={r} onComplete={(id) => complete.mutate(id)} onDelete={(id) => remove.mutate(id)} />)}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
