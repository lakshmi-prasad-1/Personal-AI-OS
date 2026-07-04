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
import { useToast } from "@/hooks/use-toast";
import { ClipboardList, Plus, Trash2, Edit2, ExternalLink } from "lucide-react";

interface JobApplication {
  id: string; company: string; role: string; appliedDate: string; deadline?: string;
  status: string; jobUrl?: string; notes: string; salary?: string; location?: string;
  workType?: string; contactName?: string; contactEmail?: string; reminderDate?: string;
  timeline: { date: string; event: string; notes: string }[];
}

const STATUSES = ["applied", "screening", "interview", "assessment", "offer", "rejected", "withdrawn"];
const STATUS_COLOR: Record<string, string> = {
  applied: "bg-blue-500/10 text-blue-600 border-blue-200",
  screening: "bg-yellow-500/10 text-yellow-600 border-yellow-200",
  interview: "bg-purple-500/10 text-purple-600 border-purple-200",
  assessment: "bg-orange-500/10 text-orange-600 border-orange-200",
  offer: "bg-green-500/10 text-green-600 border-green-200",
  rejected: "bg-red-500/10 text-red-600 border-red-200",
  withdrawn: "bg-gray-500/10 text-gray-500 border-gray-200",
};

function AppForm({ initial, onSave, onClose }: { initial?: Partial<JobApplication>; onSave: (d: Partial<JobApplication>) => void; onClose: () => void }) {
  const [company, setCompany] = useState(initial?.company ?? "");
  const [role, setRole] = useState(initial?.role ?? "");
  const [appliedDate, setAppliedDate] = useState(initial?.appliedDate ?? new Date().toISOString().slice(0, 10));
  const [deadline, setDeadline] = useState(initial?.deadline ?? "");
  const [status, setStatus] = useState(initial?.status ?? "applied");
  const [jobUrl, setJobUrl] = useState(initial?.jobUrl ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [salary, setSalary] = useState(initial?.salary ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [workType, setWorkType] = useState(initial?.workType ?? "");
  const [contactName, setContactName] = useState(initial?.contactName ?? "");
  const [contactEmail, setContactEmail] = useState(initial?.contactEmail ?? "");

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Company *</Label><Input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="Google" /></div>
        <div><Label>Role *</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="Software Engineer" /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Applied Date</Label><Input type="date" value={appliedDate} onChange={(e) => setAppliedDate(e.target.value)} /></div>
        <div><Label>Deadline</Label><Input type="date" value={deadline} onChange={(e) => setDeadline(e.target.value)} /></div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Status</Label>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Work Type</Label>
          <Select value={workType || "none"} onValueChange={(v) => setWorkType(v === "none" ? "" : v)}><SelectTrigger><SelectValue placeholder="Select…" /></SelectTrigger>
            <SelectContent><SelectItem value="none">—</SelectItem>{["remote", "hybrid", "onsite"].map((w) => <SelectItem key={w} value={w}>{w}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco, CA" /></div>
        <div><Label>Salary</Label><Input value={salary} onChange={(e) => setSalary(e.target.value)} placeholder="$120k–$150k" /></div>
      </div>
      <div><Label>Job URL</Label><Input value={jobUrl} onChange={(e) => setJobUrl(e.target.value)} placeholder="https://…" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Contact Name</Label><Input value={contactName} onChange={(e) => setContactName(e.target.value)} /></div>
        <div><Label>Contact Email</Label><Input value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></div>
      </div>
      <div><Label>Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Recruiter details, interview rounds, follow-ups…" /></div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={!company.trim() || !role.trim()} onClick={() => onSave({
          company: company.trim(), role: role.trim(), appliedDate, deadline: deadline || undefined,
          status, jobUrl: jobUrl || undefined, notes, salary: salary || undefined,
          location: location || undefined, workType: workType || undefined,
          contactName: contactName || undefined, contactEmail: contactEmail || undefined,
        })}>Save</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function Applications() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editApp, setEditApp] = useState<JobApplication | null>(null);
  const [filter, setFilter] = useState("all");

  const { data: apps = [], isLoading } = useQuery<JobApplication[]>({ queryKey: ["applications"], queryFn: () => apiGet<JobApplication[]>("/applications") });

  const create = useMutation({
    mutationFn: (d: Partial<JobApplication>) => apiPost<JobApplication>("/applications", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); setCreateOpen(false); toast({ title: "Application tracked" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: ({ id, ...d }: Partial<JobApplication> & { id: string }) => apiPatch<JobApplication>(`/applications/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); setEditApp(null); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/applications/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["applications"] }); toast({ title: "Removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const filtered = filter === "all" ? apps : apps.filter((a) => a.status === filter);
  const counts = apps.reduce<Record<string, number>>((acc, a) => { acc[a.status] = (acc[a.status] ?? 0) + 1; return acc; }, {});

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><ClipboardList className="w-6 h-6 text-primary" />Application Tracker</h1>
          <p className="text-muted-foreground text-sm">{apps.length} total · {apps.filter((a) => !["rejected", "withdrawn"].includes(a.status)).length} active</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Track Application</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Track Application</DialogTitle></DialogHeader>
            <AppForm onSave={(d) => create.mutate(d)} onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Status filter tabs */}
      <div className="flex gap-1.5 flex-wrap">
        <button onClick={() => setFilter("all")} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filter === "all" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
          All ({apps.length})
        </button>
        {STATUSES.filter((s) => counts[s]).map((s) => (
          <button key={s} onClick={() => setFilter(s)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filter === s ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {apps.length === 0 ? 'No applications tracked yet. Chat: "I applied to Google for SWE role" or click Track Application' : 'No applications match this filter.'}
        </CardContent></Card>
      ) : (
        <div className="space-y-2">
          {filtered.map((a) => (
            <Card key={a.id} className="hover:border-primary/30 transition-colors">
              <CardContent className="pt-3 pb-3">
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm">{a.role}</span>
                      <span className="text-sm text-muted-foreground">@</span>
                      <span className="font-medium text-sm">{a.company}</span>
                      <Badge className={`text-xs ${STATUS_COLOR[a.status] ?? ""}`}>{a.status}</Badge>
                      {a.workType && <Badge variant="outline" className="text-xs">{a.workType}</Badge>}
                    </div>
                    <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground flex-wrap">
                      {a.appliedDate && <span>Applied: {a.appliedDate}</span>}
                      {a.deadline && <span>Deadline: {a.deadline}</span>}
                      {a.location && <span>📍 {a.location}</span>}
                      {a.salary && <span>💰 {a.salary}</span>}
                    </div>
                    {a.notes && <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{a.notes}</p>}
                  </div>
                  <div className="flex gap-1 shrink-0 items-center">
                    {a.jobUrl && <a href={a.jobUrl} target="_blank" rel="noopener noreferrer" className="p-1 rounded hover:bg-secondary transition-colors"><ExternalLink className="w-3.5 h-3.5 text-muted-foreground" /></a>}
                    <Select value={a.status} onValueChange={(v) => update.mutate({ id: a.id, status: v })}>
                      <SelectTrigger className="h-7 w-28 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s} className="text-xs">{s}</SelectItem>)}</SelectContent>
                    </Select>
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditApp(a)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(a.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                {/* Timeline */}
                {a.timeline.length > 0 && (
                  <div className="mt-2 pt-2 border-t flex gap-2 overflow-x-auto">
                    {a.timeline.slice(-3).map((t, i) => (
                      <span key={i} className="text-xs bg-secondary px-2 py-0.5 rounded-full shrink-0">{t.date}: {t.event}</span>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editApp} onOpenChange={(o) => { if (!o) setEditApp(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Application</DialogTitle></DialogHeader>
          {editApp && <AppForm initial={editApp} onSave={(d) => update.mutate({ id: editApp.id, ...d })} onClose={() => setEditApp(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
