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
import { FileText, Plus, Trash2, Sparkles, Star, Edit2, Check } from "lucide-react";

interface ResumeAnalysis { atsScore: number; strengths: string[]; weaknesses: string[]; missingSkills: string[]; missingKeywords: string[]; suggestions: string[]; }
interface Resume { id: string; title: string; category: string; version: number; content: string; notes: string; tags: string[]; isActive: string; analysis: ResumeAnalysis | null; analyzedAt: string | null; createdAt: string; updatedAt: string; }

const CATEGORIES = ["general", "frontend", "backend", "ai", "full_stack"];

function ResumeForm({ initial, onSave, onClose }: { initial?: Partial<Resume>; onSave: (d: Partial<Resume>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "general");
  const [content, setContent] = useState(initial?.content ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");
  const [tags, setTags] = useState((initial?.tags ?? []).join(", "));

  return (
    <div className="space-y-3">
      <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Frontend Engineer Resume v2" /></div>
      <div><Label>Category</Label>
        <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Content (paste your resume text)</Label><Textarea value={content} onChange={(e) => setContent(e.target.value)} rows={10} placeholder="Paste full resume text here for AI analysis…" /></div>
      <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Internal notes…" /></div>
      <div><Label>Tags (comma-separated)</Label><Input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="react, typescript, remote" /></div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={!title.trim()} onClick={() => onSave({ title: title.trim(), category, content, notes, tags: tags.split(",").map((t) => t.trim()).filter(Boolean) })}>Save</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function AnalysisPanel({ analysis }: { analysis: ResumeAnalysis }) {
  const score = analysis.atsScore;
  const color = score >= 80 ? "text-green-500" : score >= 60 ? "text-yellow-500" : "text-red-500";
  return (
    <div className="space-y-3 text-sm">
      <div className="flex items-center gap-3"><span className={`text-3xl font-bold ${color}`}>{score}</span><div><div className="font-semibold">ATS Score</div><div className="text-xs text-muted-foreground">out of 100</div></div></div>
      {analysis.strengths.length > 0 && <Section label="✅ Strengths" items={analysis.strengths} />}
      {analysis.weaknesses.length > 0 && <Section label="⚠️ Weaknesses" items={analysis.weaknesses} />}
      {analysis.missingSkills.length > 0 && <Section label="🔴 Missing Skills" items={analysis.missingSkills} />}
      {analysis.missingKeywords.length > 0 && <Section label="🔑 Missing Keywords" items={analysis.missingKeywords} />}
      {analysis.suggestions.length > 0 && <Section label="💡 Suggestions" items={analysis.suggestions} />}
    </div>
  );
}

function Section({ label, items }: { label: string; items: string[] }) {
  return <div><div className="font-semibold mb-1">{label}</div><ul className="space-y-0.5">{items.map((item, i) => <li key={i} className="text-muted-foreground">• {item}</li>)}</ul></div>;
}

export default function Resumes() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editResume, setEditResume] = useState<Resume | null>(null);
  const [viewAnalysis, setViewAnalysis] = useState<Resume | null>(null);

  const { data: resumes = [], isLoading } = useQuery<Resume[]>({ queryKey: ["resumes"], queryFn: () => apiGet<Resume[]>("/resumes") });

  const create = useMutation({
    mutationFn: (d: Partial<Resume>) => apiPost<Resume>("/resumes", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resumes"] }); setCreateOpen(false); toast({ title: "Resume created" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: Partial<Resume> & { id: string }) => apiPatch<Resume>(`/resumes/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resumes"] }); setEditResume(null); toast({ title: "Resume updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/resumes/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["resumes"] }); toast({ title: "Resume deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const analyze = useMutation({
    mutationFn: (id: string) => apiPost<Resume>(`/resumes/${id}/analyze`),
    onSuccess: (r) => { qc.invalidateQueries({ queryKey: ["resumes"] }); setViewAnalysis(r); toast({ title: "Analysis complete" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const setActive = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: string }) => apiPatch<Resume>(`/resumes/${id}`, { isActive }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["resumes"] }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FileText className="w-6 h-6 text-primary" />Resume Manager</h1>
          <p className="text-muted-foreground text-sm">Store, version, and AI-analyze your resumes</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Resume</Button></DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>New Resume</DialogTitle></DialogHeader>
            <ResumeForm onSave={(d) => create.mutate(d)} onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {resumes.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No resumes yet. Click "New Resume" or chat: "Add a resume"</CardContent></Card>
      ) : (
        <div className="grid gap-4">
          {resumes.map((r) => (
            <Card key={r.id} className={r.isActive === "true" ? "border-primary/40" : ""}>
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    {r.isActive === "true" && <Star className="w-4 h-4 text-yellow-500 shrink-0" aria-label="Default resume" />}
                    <CardTitle className="text-base truncate">{r.title}</CardTitle>
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {r.isActive !== "true" && (
                      <Button variant="ghost" size="sm" className="h-7 text-xs" onClick={() => setActive.mutate({ id: r.id, isActive: "true" })}>
                        <Star className="w-3 h-3 mr-1" />Set Default
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditResume(r)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(r.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge variant="secondary" className="text-xs">{r.category}</Badge>
                  <Badge variant="outline" className="text-xs">v{r.version}</Badge>
                  {r.tags.map((t) => <Badge key={t} variant="outline" className="text-xs">{t}</Badge>)}
                  {r.analyzedAt && <Badge className="text-xs bg-green-500/10 text-green-600 border-green-200">ATS {(r.analysis as ResumeAnalysis | null)?.atsScore ?? "?"}%</Badge>}
                </div>
              </CardHeader>
              <CardContent>
                {r.content && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{r.content}</p>}
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" disabled={analyze.isPending} onClick={() => analyze.mutate(r.id)}>
                    <Sparkles className="w-3.5 h-3.5 mr-1" />{analyze.isPending ? "Analyzing…" : "AI Analyze"}
                  </Button>
                  {r.analysis && (
                    <Button size="sm" variant="ghost" onClick={() => setViewAnalysis(r)}>View Analysis</Button>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Edit dialog */}
      <Dialog open={!!editResume} onOpenChange={(o) => { if (!o) setEditResume(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Edit Resume</DialogTitle></DialogHeader>
          {editResume && <ResumeForm initial={editResume} onSave={(d) => update.mutate({ id: editResume.id, ...d })} onClose={() => setEditResume(null)} />}
        </DialogContent>
      </Dialog>

      {/* Analysis dialog */}
      <Dialog open={!!viewAnalysis} onOpenChange={(o) => { if (!o) setViewAnalysis(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader><DialogTitle>Resume Analysis — {viewAnalysis?.title}</DialogTitle></DialogHeader>
          {viewAnalysis?.analysis && <AnalysisPanel analysis={viewAnalysis.analysis as ResumeAnalysis} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
