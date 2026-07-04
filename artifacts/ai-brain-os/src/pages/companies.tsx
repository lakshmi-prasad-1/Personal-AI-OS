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
import { Building2, Plus, Trash2, Edit2, ExternalLink, Star } from "lucide-react";

interface Company {
  id: string; name: string; website?: string; careerPage?: string; industry?: string;
  size?: string; location?: string; priority: string; hiringProcess: string;
  interviewRounds?: number; culture: string; benefits: string; notes: string;
  status: string; aiSummary?: string;
}

const PRIORITY_COLOR: Record<string, string> = {
  dream: "bg-purple-500/10 text-purple-600 border-purple-200",
  high: "bg-red-500/10 text-red-600 border-red-200",
  medium: "bg-blue-500/10 text-blue-600 border-blue-200",
  low: "bg-gray-500/10 text-gray-500 border-gray-200",
};
const STATUS_COLOR: Record<string, string> = {
  researching: "bg-yellow-500/10 text-yellow-600",
  applied: "bg-blue-500/10 text-blue-600",
  interviewing: "bg-purple-500/10 text-purple-600",
  offer: "bg-green-500/10 text-green-600",
  rejected: "bg-red-500/10 text-red-600",
  not_interested: "bg-gray-500/10 text-gray-500",
};

function CompanyForm({ initial, onSave, onClose }: { initial?: Partial<Company>; onSave: (d: Partial<Company>) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [website, setWebsite] = useState(initial?.website ?? "");
  const [careerPage, setCareerPage] = useState(initial?.careerPage ?? "");
  const [industry, setIndustry] = useState(initial?.industry ?? "");
  const [size, setSize] = useState(initial?.size ?? "");
  const [location, setLocation] = useState(initial?.location ?? "");
  const [priority, setPriority] = useState(initial?.priority ?? "medium");
  const [status, setStatus] = useState(initial?.status ?? "researching");
  const [hiringProcess, setHiringProcess] = useState(initial?.hiringProcess ?? "");
  const [interviewRounds, setInterviewRounds] = useState<string>(initial?.interviewRounds?.toString() ?? "");
  const [culture, setCulture] = useState(initial?.culture ?? "");
  const [benefits, setBenefits] = useState(initial?.benefits ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <div className="space-y-3">
      <div><Label>Company Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Stripe" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Priority</Label>
          <Select value={priority} onValueChange={setPriority}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["dream", "high", "medium", "low"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Status</Label>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["researching", "applied", "interviewing", "offer", "rejected", "not_interested"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Industry</Label><Input value={industry} onChange={(e) => setIndustry(e.target.value)} placeholder="FinTech, SaaS…" /></div>
        <div><Label>Company Size</Label><Input value={size} onChange={(e) => setSize(e.target.value)} placeholder="1–50, 500+…" /></div>
      </div>
      <div><Label>Location</Label><Input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="San Francisco, Remote…" /></div>
      <div><Label>Website</Label><Input value={website} onChange={(e) => setWebsite(e.target.value)} placeholder="https://…" /></div>
      <div><Label>Career Page</Label><Input value={careerPage} onChange={(e) => setCareerPage(e.target.value)} placeholder="https://…/careers" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Hiring Process</Label><Input value={hiringProcess} onChange={(e) => setHiringProcess(e.target.value)} placeholder="OA → Phone → Onsite" /></div>
        <div><Label>Interview Rounds</Label><Input type="number" min={0} value={interviewRounds} onChange={(e) => setInterviewRounds(e.target.value)} placeholder="3" /></div>
      </div>
      <div><Label>Culture</Label><Textarea value={culture} onChange={(e) => setCulture(e.target.value)} rows={2} placeholder="Work-life balance, remote-first…" /></div>
      <div><Label>Benefits</Label><Textarea value={benefits} onChange={(e) => setBenefits(e.target.value)} rows={2} placeholder="Stock options, health insurance…" /></div>
      <div><Label>Research Notes</Label><Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Glassdoor reviews, LeetCode difficulty, interview experience…" /></div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={!name.trim()} onClick={() => onSave({
          name: name.trim(), website: website || undefined, careerPage: careerPage || undefined,
          industry: industry || undefined, size: size || undefined, location: location || undefined,
          priority, status, hiringProcess, notes, culture, benefits,
          interviewRounds: interviewRounds ? Number(interviewRounds) : undefined,
        })}>Save</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function Companies() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editCompany, setEditCompany] = useState<Company | null>(null);
  const [filter, setFilter] = useState("all");

  const { data: companies = [], isLoading } = useQuery<Company[]>({ queryKey: ["companies"], queryFn: () => apiGet<Company[]>("/companies") });

  const create = useMutation({
    mutationFn: (d: Partial<Company>) => apiPost<Company>("/companies", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); setCreateOpen(false); toast({ title: "Company added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: ({ id, ...d }: Partial<Company> & { id: string }) => apiPatch<Company>(`/companies/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); setEditCompany(null); toast({ title: "Updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/companies/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["companies"] }); toast({ title: "Removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const priorities = ["all", ...Array.from(new Set(companies.map((c) => c.priority)))];
  const filtered = filter === "all" ? companies : companies.filter((c) => c.priority === filter);
  const dreamCount = companies.filter((c) => c.priority === "dream").length;

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Building2 className="w-6 h-6 text-primary" />Company Tracker</h1>
          <p className="text-muted-foreground text-sm">{companies.length} companies · {dreamCount} dream</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Company</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add Company</DialogTitle></DialogHeader>
            <CompanyForm onSave={(d) => create.mutate(d)} onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-1.5 flex-wrap">
        {priorities.map((p) => (
          <button key={p} onClick={() => setFilter(p)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filter === p ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            {p === "all" ? "All" : p}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">
          {companies.length === 0 ? 'No companies yet. Chat: "I want to work at Stripe" or click Add Company' : 'No companies match this filter.'}
        </CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filtered.map((c) => (
            <Card key={c.id} className={c.priority === "dream" ? "border-purple-300" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {c.priority === "dream" && <Star className="w-4 h-4 text-purple-500 shrink-0" />}
                    <CardTitle className="text-base truncate">{c.name}</CardTitle>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditCompany(c)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(c.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className={`text-xs ${PRIORITY_COLOR[c.priority] ?? ""}`}>{c.priority}</Badge>
                  <Badge className={`text-xs ${STATUS_COLOR[c.status] ?? ""}`}>{c.status.replace("_", " ")}</Badge>
                  {c.industry && <span className="text-xs text-muted-foreground">{c.industry}</span>}
                  {c.location && <span className="text-xs text-muted-foreground">📍 {c.location}</span>}
                </div>
              </CardHeader>
              <CardContent className="space-y-2">
                {c.hiringProcess && <p className="text-xs text-muted-foreground">Process: {c.hiringProcess}{c.interviewRounds ? ` (${c.interviewRounds} rounds)` : ""}</p>}
                {c.notes && <p className="text-sm text-muted-foreground line-clamp-2">{c.notes}</p>}
                {c.aiSummary && <p className="text-xs text-primary border-l-2 border-primary pl-2">{c.aiSummary}</p>}
                <div className="flex gap-2">
                  {c.website && <a href={c.website} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ExternalLink className="w-3 h-3" />Website</a>}
                  {c.careerPage && <a href={c.careerPage} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ExternalLink className="w-3 h-3" />Careers</a>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editCompany} onOpenChange={(o) => { if (!o) setEditCompany(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Company</DialogTitle></DialogHeader>
          {editCompany && <CompanyForm initial={editCompany} onSave={(d) => update.mutate({ id: editCompany.id, ...d })} onClose={() => setEditCompany(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
