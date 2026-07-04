import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Target, Plus, Trash2, Edit2, CheckCircle2 } from "lucide-react";

interface Milestone { title: string; done: boolean; }
interface CareerGoal { id: string; title: string; description: string; type: string; targetCompanies: string[]; targetRoles: string[]; targetTechnologies: string[]; milestones: Milestone[]; progressPercent: number; targetDate?: string; status: string; }

const STATUS_COLOR: Record<string, string> = { active: "bg-green-500/10 text-green-600 border-green-200", completed: "bg-blue-500/10 text-blue-600 border-blue-200", abandoned: "bg-gray-500/10 text-gray-500 border-gray-200" };

function GoalForm({ initial, onSave, onClose }: { initial?: Partial<CareerGoal>; onSave: (d: Partial<CareerGoal>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [type, setType] = useState(initial?.type ?? "short_term");
  const [targetCompanies, setTargetCompanies] = useState((initial?.targetCompanies ?? []).join(", "));
  const [targetRoles, setTargetRoles] = useState((initial?.targetRoles ?? []).join(", "));
  const [targetTechnologies, setTargetTechnologies] = useState((initial?.targetTechnologies ?? []).join(", "));
  const [milestoneText, setMilestoneText] = useState((initial?.milestones ?? []).map((m) => m.title).join("\n"));
  const [progressPercent, setProgressPercent] = useState(initial?.progressPercent ?? 0);
  const [targetDate, setTargetDate] = useState(initial?.targetDate ?? "");
  const [status, setStatus] = useState(initial?.status ?? "active");

  return (
    <div className="space-y-3">
      <div><Label>Goal Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Land a job at a top tech company" /></div>
      <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Type</Label>
          <Select value={type} onValueChange={setType}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="short_term">Short Term</SelectItem><SelectItem value="long_term">Long Term</SelectItem></SelectContent>
          </Select>
        </div>
        <div><Label>Status</Label>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="completed">Completed</SelectItem><SelectItem value="abandoned">Abandoned</SelectItem></SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Target Companies (comma-separated)</Label><Input value={targetCompanies} onChange={(e) => setTargetCompanies(e.target.value)} placeholder="Google, Microsoft, Stripe" /></div>
      <div><Label>Target Roles (comma-separated)</Label><Input value={targetRoles} onChange={(e) => setTargetRoles(e.target.value)} placeholder="Frontend Engineer, Full Stack Developer" /></div>
      <div><Label>Target Technologies (comma-separated)</Label><Input value={targetTechnologies} onChange={(e) => setTargetTechnologies(e.target.value)} placeholder="React, TypeScript, Docker" /></div>
      <div><Label>Milestones (one per line)</Label><Textarea value={milestoneText} onChange={(e) => setMilestoneText(e.target.value)} rows={3} placeholder="Complete portfolio project&#10;Get 3 referrals&#10;Pass LeetCode 50 problems" /></div>
      <div>
        <Label>Progress: {progressPercent}%</Label>
        <Slider value={[progressPercent]} onValueChange={([v]) => setProgressPercent(v ?? 0)} min={0} max={100} step={5} className="mt-2" />
      </div>
      <div><Label>Target Date</Label><Input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} /></div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={!title.trim()} onClick={() => onSave({
          title: title.trim(), description, type,
          targetCompanies: targetCompanies.split(",").map((s) => s.trim()).filter(Boolean),
          targetRoles: targetRoles.split(",").map((s) => s.trim()).filter(Boolean),
          targetTechnologies: targetTechnologies.split(",").map((s) => s.trim()).filter(Boolean),
          milestones: milestoneText.split("\n").map((t) => t.trim()).filter(Boolean).map((t) => ({ title: t, done: (initial?.milestones ?? []).find((m) => m.title === t)?.done ?? false })),
          progressPercent, targetDate: targetDate || undefined, status,
        })}>Save</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function CareerGoalsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editGoal, setEditGoal] = useState<CareerGoal | null>(null);

  const { data: goals = [], isLoading } = useQuery<CareerGoal[]>({ queryKey: ["career-goals"], queryFn: () => apiGet<CareerGoal[]>("/career-goals") });

  const create = useMutation({
    mutationFn: (d: Partial<CareerGoal>) => apiPost<CareerGoal>("/career-goals", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["career-goals"] }); setCreateOpen(false); toast({ title: "Goal created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: ({ id, ...d }: Partial<CareerGoal> & { id: string }) => apiPatch<CareerGoal>(`/career-goals/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["career-goals"] }); setEditGoal(null); toast({ title: "Goal updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/career-goals/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["career-goals"] }); toast({ title: "Goal deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const toggleMilestone = (goal: CareerGoal, idx: number) => {
    const milestones = goal.milestones.map((m, i) => i === idx ? { ...m, done: !m.done } : m);
    const done = milestones.filter((m) => m.done).length;
    const progressPercent = milestones.length > 0 ? Math.round((done / milestones.length) * 100) : goal.progressPercent;
    update.mutate({ id: goal.id, milestones, progressPercent });
  };

  const active = goals.filter((g) => g.status === "active");
  const done = goals.filter((g) => g.status !== "active");

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Target className="w-6 h-6 text-primary" />Career Goals</h1>
          <p className="text-muted-foreground text-sm">{active.length} active · {done.length} completed</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Goal</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>New Career Goal</DialogTitle></DialogHeader>
            <GoalForm onSave={(d) => create.mutate(d)} onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {goals.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No career goals yet. Chat: "I want to work at Google as a SWE" or click New Goal</CardContent></Card>
      ) : (
        <div className="space-y-6">
          {active.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Active Goals</h2>
              <div className="grid gap-4">
                {active.map((g) => <GoalCard key={g.id} goal={g} onEdit={setEditGoal} onDelete={(id) => remove.mutate(id)} onToggleMilestone={toggleMilestone} />)}
              </div>
            </section>
          )}
          {done.length > 0 && (
            <section>
              <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide mb-3">Completed / Abandoned</h2>
              <div className="grid gap-4 opacity-70">
                {done.map((g) => <GoalCard key={g.id} goal={g} onEdit={setEditGoal} onDelete={(id) => remove.mutate(id)} onToggleMilestone={toggleMilestone} />)}
              </div>
            </section>
          )}
        </div>
      )}

      <Dialog open={!!editGoal} onOpenChange={(o) => { if (!o) setEditGoal(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Career Goal</DialogTitle></DialogHeader>
          {editGoal && <GoalForm initial={editGoal} onSave={(d) => update.mutate({ id: editGoal.id, ...d })} onClose={() => setEditGoal(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function GoalCard({ goal, onEdit, onDelete, onToggleMilestone }: { goal: CareerGoal; onEdit: (g: CareerGoal) => void; onDelete: (id: string) => void; onToggleMilestone: (g: CareerGoal, i: number) => void }) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <CardTitle className="text-base truncate">{goal.title}</CardTitle>
            <div className="flex items-center gap-1.5 mt-1 flex-wrap">
              <Badge className={`text-xs ${STATUS_COLOR[goal.status] ?? ""}`}>{goal.status}</Badge>
              <Badge variant="outline" className="text-xs">{goal.type.replace("_", " ")}</Badge>
              {goal.targetDate && <span className="text-xs text-muted-foreground">by {goal.targetDate}</span>}
            </div>
          </div>
          <div className="flex gap-1 shrink-0">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onEdit(goal)}><Edit2 className="w-3.5 h-3.5" /></Button>
            <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => onDelete(goal.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {goal.description && <p className="text-sm text-muted-foreground">{goal.description}</p>}
        <div>
          <div className="flex justify-between text-xs text-muted-foreground mb-1"><span>Progress</span><span>{goal.progressPercent}%</span></div>
          <Progress value={goal.progressPercent} className="h-1.5" />
        </div>
        {goal.milestones.length > 0 && (
          <div className="space-y-1">
            {goal.milestones.map((m, i) => (
              <button key={i} onClick={() => onToggleMilestone(goal, i)} className="flex items-center gap-2 w-full text-left text-sm hover:text-foreground transition-colors">
                <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${m.done ? "text-green-500" : "text-muted-foreground"}`} />
                <span className={m.done ? "line-through text-muted-foreground" : ""}>{m.title}</span>
              </button>
            ))}
          </div>
        )}
        <div className="flex flex-wrap gap-2">
          {goal.targetRoles.length > 0 && <div className="text-xs text-muted-foreground">Roles: {goal.targetRoles.join(", ")}</div>}
          {goal.targetCompanies.length > 0 && <div className="text-xs text-muted-foreground">Companies: {goal.targetCompanies.join(", ")}</div>}
        </div>
        {goal.targetTechnologies.length > 0 && (
          <div className="flex flex-wrap gap-1">{goal.targetTechnologies.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
        )}
      </CardContent>
    </Card>
  );
}
