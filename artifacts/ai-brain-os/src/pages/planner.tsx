import { useState } from "react";
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
import { Plus, Trash2, CheckCircle2, ChevronLeft, ChevronRight, Calendar } from "lucide-react";

interface PlannerEvent {
  id: string; title: string; description: string; type: string;
  date: string; startTime?: string; endTime?: string; durationMinutes?: number;
  isCompleted: boolean; createdByAi: boolean;
}

const TYPE_COLORS: Record<string, string> = {
  study: "bg-blue-100 text-blue-700 border-blue-200",
  coding: "bg-purple-100 text-purple-700 border-purple-200",
  project: "bg-orange-100 text-orange-700 border-orange-200",
  college: "bg-red-100 text-red-700 border-red-200",
  break: "bg-green-100 text-green-700 border-green-200",
  free: "bg-emerald-100 text-emerald-700 border-emerald-200",
  buffer: "bg-gray-100 text-gray-700 border-gray-200",
  custom: "bg-slate-100 text-slate-700 border-slate-200",
};

const TYPE_ICONS: Record<string, string> = {
  study: "📚", coding: "💻", project: "🚀", college: "🏫",
  break: "☕", free: "🌟", buffer: "⏸", custom: "📌",
};

function formatDate(d: Date): string { return d.toISOString().slice(0, 10); }
function displayDate(s: string): string {
  const d = new Date(s + "T12:00:00");
  return d.toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" });
}

function EventCard({ event, onComplete, onDelete }: { event: PlannerEvent; onComplete: (id: string) => void; onDelete: (id: string) => void }) {
  const color = TYPE_COLORS[event.type] ?? TYPE_COLORS.custom;
  const icon = TYPE_ICONS[event.type] ?? "📌";
  return (
    <div className={`flex items-center gap-3 p-3 rounded-lg border ${color} ${event.isCompleted ? "opacity-60" : ""}`}>
      <span className="text-lg">{icon}</span>
      <div className="flex-1 min-w-0">
        <p className={`text-sm font-medium ${event.isCompleted ? "line-through" : ""}`}>{event.title}</p>
        <div className="flex gap-2 mt-0.5 text-xs opacity-75">
          {event.startTime && <span>⏰ {event.startTime}{event.endTime ? `–${event.endTime}` : ""}</span>}
          {event.durationMinutes && !event.startTime && <span>⏱ {event.durationMinutes}m</span>}
          {event.createdByAi && <span>✦ AI</span>}
        </div>
      </div>
      <button onClick={() => onComplete(event.id)} className="hover:scale-110 transition-transform">
        <CheckCircle2 className={`w-4 h-4 ${event.isCompleted ? "text-green-600" : "text-gray-400 hover:text-green-500"}`} />
      </button>
      <button onClick={() => onDelete(event.id)} className="text-current/50 hover:text-red-600 transition-colors"><Trash2 className="w-3.5 h-3.5" /></button>
    </div>
  );
}

function NewEventDialog({ date, onCreated }: { date: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [type, setType] = useState("custom");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [duration, setDuration] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: any) => apiPost("/planner", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["planner"] }); setOpen(false); setTitle(""); setStartTime(""); setEndTime(""); setDuration(""); onCreated(); toast({ title: "Event added!" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Add Event</Button></DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Add to Planner</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Study DBMS, Coding practice…" /></div>
          <div><Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{Object.entries(TYPE_ICONS).map(([t, i]) => <SelectItem key={t} value={t}>{i} {t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Start Time</Label><Input type="time" value={startTime} onChange={(e) => setStartTime(e.target.value)} /></div>
            <div><Label>End Time</Label><Input type="time" value={endTime} onChange={(e) => setEndTime(e.target.value)} /></div>
          </div>
          <div><Label>Duration (min, if no end time)</Label><Input type="number" value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="60" /></div>
          <Button className="w-full" disabled={!title.trim() || create.isPending}
            onClick={() => create.mutate({ title, type, date, startTime: startTime || undefined, endTime: endTime || undefined, durationMinutes: duration ? parseInt(duration) : undefined })}>
            {create.isPending ? "Adding…" : "Add Event"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default function PlannerPage() {
  const [selectedDate, setSelectedDate] = useState(formatDate(new Date()));
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: events = [], isLoading } = useQuery<PlannerEvent[]>({
    queryKey: ["planner", selectedDate],
    queryFn: () => apiGet(`/planner/day/${selectedDate}`),
  });

  const complete = useMutation({ mutationFn: (id: string) => apiPost(`/planner/${id}/complete`), onSuccess: () => qc.invalidateQueries({ queryKey: ["planner"] }) });
  const remove = useMutation({ mutationFn: (id: string) => apiDelete(`/planner/${id}`), onSuccess: () => qc.invalidateQueries({ queryKey: ["planner"] }) });

  const navigate = (delta: number) => {
    const d = new Date(selectedDate + "T12:00:00");
    d.setDate(d.getDate() + delta);
    setSelectedDate(formatDate(d));
  };

  const isToday = selectedDate === formatDate(new Date());
  const completedCount = events.filter((e) => e.isCompleted).length;
  const totalMinutes = events.reduce((s, e) => s + (e.durationMinutes ?? 0), 0);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Planner</h1>
        <NewEventDialog date={selectedDate} onCreated={() => {}} />
      </div>

      {/* Date navigator */}
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}><ChevronLeft className="w-4 h-4" /></Button>
        <div className="flex-1 text-center">
          <p className="font-semibold">{displayDate(selectedDate)}</p>
          {isToday && <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">Today</Badge>}
        </div>
        <Button variant="ghost" size="icon" onClick={() => navigate(1)}><ChevronRight className="w-4 h-4" /></Button>
        {!isToday && <Button variant="ghost" size="sm" className="text-xs" onClick={() => setSelectedDate(formatDate(new Date()))}>Today</Button>}
      </div>

      {/* Summary */}
      {events.length > 0 && (
        <div className="flex gap-4 text-sm text-muted-foreground">
          <span>📋 {events.length} events</span>
          <span>✅ {completedCount} done</span>
          {totalMinutes > 0 && <span>⏱ {totalMinutes}min planned</span>}
        </div>
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : events.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <Calendar className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>Nothing planned for this day.</p>
          <p className="text-xs mt-1">Add an event or ask the AI: "Plan my day" or "Schedule 2 hours of studying."</p>
        </div>
      ) : (
        <div className="space-y-2">
          {[...events].sort((a, b) => (a.startTime ?? "").localeCompare(b.startTime ?? "")).map((event) => (
            <EventCard key={event.id} event={event} onComplete={(id) => complete.mutate(id)} onDelete={(id) => remove.mutate(id)} />
          ))}
        </div>
      )}
    </div>
  );
}
