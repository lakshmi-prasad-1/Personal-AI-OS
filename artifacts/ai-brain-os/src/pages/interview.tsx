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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Mic, Plus, Trash2, Sparkles, CheckCircle2, Circle, Star } from "lucide-react";

interface InterviewTopic { id: string; title: string; category: string; question: string; idealAnswerNotes: string; revisionStatus: string; confidenceScore: number; source: string; }
interface InterviewSession { id: string; type: string; overallScore: number; feedback: string; completedAt: string; questions: { question: string; answer: string; feedback: string; score: number }[]; }
interface InterviewStats { totalTopics: number; masteredTopics: number; readinessPercent: number; }

const CAT_COLOR: Record<string, string> = { coding: "bg-blue-500/10 text-blue-600", behavioral: "bg-purple-500/10 text-purple-600", hr: "bg-green-500/10 text-green-600", system_design: "bg-orange-500/10 text-orange-600" };
const STATUS_ICON: Record<string, React.ReactNode> = { mastered: <CheckCircle2 className="w-4 h-4 text-green-500" />, in_progress: <Star className="w-4 h-4 text-yellow-500" />, not_started: <Circle className="w-4 h-4 text-muted-foreground" /> };
const TYPES = ["technical", "behavioral", "hr", "coding", "project_discussion", "resume_discussion"];

function TopicForm({ initial, onSave, onClose }: { initial?: Partial<InterviewTopic>; onSave: (d: Partial<InterviewTopic>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [category, setCategory] = useState(initial?.category ?? "coding");
  const [question, setQuestion] = useState(initial?.question ?? "");
  const [idealAnswerNotes, setIdealAnswerNotes] = useState(initial?.idealAnswerNotes ?? "");
  const [revisionStatus, setRevisionStatus] = useState(initial?.revisionStatus ?? "not_started");
  const [confidenceScore, setConfidenceScore] = useState(initial?.confidenceScore ?? 0);

  return (
    <div className="space-y-3">
      <div><Label>Topic Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Explain React hooks" /></div>
      <div><Label>Category</Label>
        <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent>{["coding", "behavioral", "hr", "system_design"].map((c) => <SelectItem key={c} value={c}>{c.replace("_", " ")}</SelectItem>)}</SelectContent>
        </Select>
      </div>
      <div><Label>Question</Label><Textarea value={question} onChange={(e) => setQuestion(e.target.value)} rows={3} /></div>
      <div><Label>Ideal Answer / Notes</Label><Textarea value={idealAnswerNotes} onChange={(e) => setIdealAnswerNotes(e.target.value)} rows={4} /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Status</Label>
          <Select value={revisionStatus} onValueChange={setRevisionStatus}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["not_started", "in_progress", "mastered"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Confidence (0-100)</Label><Input type="number" min={0} max={100} value={confidenceScore} onChange={(e) => setConfidenceScore(Number(e.target.value))} /></div>
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={!title.trim()} onClick={() => onSave({ title: title.trim(), category, question, idealAnswerNotes, revisionStatus, confidenceScore })}>Save</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

function MockInterviewPanel() {
  const { toast } = useToast();
  const [type, setType] = useState("technical");
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<{ score: number; feedback: string; strengths: string[]; improvements: string[] } | null>(null);
  const [loading, setLoading] = useState(false);

  const getQuestion = async () => {
    setLoading(true);
    setAnswer("");
    setEvaluation(null);
    try {
      const r = await apiPost<{ question: string }>("/interview/question", { type });
      setQuestion(r.question);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally { setLoading(false); }
  };

  const evaluate = async () => {
    if (!answer.trim() || !question) return;
    setLoading(true);
    try {
      const r = await apiPost<{ score: number; feedback: string; strengths: string[]; improvements: string[] }>("/interview/evaluate", { type, question, answer });
      setEvaluation(r);
    } catch (e: unknown) {
      toast({ title: "Error", description: e instanceof Error ? e.message : "Failed", variant: "destructive" });
    } finally { setLoading(false); }
  };

  return (
    <div className="space-y-4">
      <div className="flex gap-2 items-end">
        <div className="flex-1">
          <Label>Interview Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{TYPES.map((t) => <SelectItem key={t} value={t}>{t.replace("_", " ")}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <Button onClick={getQuestion} disabled={loading}><Sparkles className="w-4 h-4 mr-1" />{loading ? "Getting…" : "Get Question"}</Button>
      </div>

      {question && (
        <Card className="border-primary/30 bg-primary/5">
          <CardContent className="pt-4">
            <p className="font-medium text-sm">❓ {question}</p>
          </CardContent>
        </Card>
      )}

      {question && (
        <div className="space-y-2">
          <Label>Your Answer</Label>
          <Textarea value={answer} onChange={(e) => setAnswer(e.target.value)} rows={5} placeholder="Type your answer here…" />
          <Button className="w-full" disabled={!answer.trim() || loading} onClick={evaluate}>{loading ? "Evaluating…" : "Evaluate My Answer"}</Button>
        </div>
      )}

      {evaluation && (
        <Card className="border-green-200 bg-green-50/30">
          <CardHeader className="pb-2"><CardTitle className="text-sm">Score: {evaluation.score}/100</CardTitle></CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-muted-foreground">{evaluation.feedback}</p>
            {evaluation.strengths?.length > 0 && <div><strong>✅ Strengths:</strong><ul className="mt-1 space-y-0.5">{evaluation.strengths.map((s, i) => <li key={i} className="text-muted-foreground">• {s}</li>)}</ul></div>}
            {evaluation.improvements?.length > 0 && <div><strong>💡 Improve:</strong><ul className="mt-1 space-y-0.5">{evaluation.improvements.map((s, i) => <li key={i} className="text-muted-foreground">• {s}</li>)}</ul></div>}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Interview() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editTopic, setEditTopic] = useState<InterviewTopic | null>(null);
  const [catFilter, setCatFilter] = useState("all");

  const { data: topics = [] } = useQuery<InterviewTopic[]>({ queryKey: ["interview-topics"], queryFn: () => apiGet<InterviewTopic[]>("/interview/topics") });
  const { data: stats } = useQuery<InterviewStats>({ queryKey: ["interview-stats"], queryFn: () => apiGet<InterviewStats>("/interview/stats") });
  const { data: sessions = [] } = useQuery<InterviewSession[]>({ queryKey: ["interview-sessions"], queryFn: () => apiGet<InterviewSession[]>("/interview/sessions") });

  const create = useMutation({
    mutationFn: (d: Partial<InterviewTopic>) => apiPost<InterviewTopic>("/interview/topics", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["interview-topics"] }); qc.invalidateQueries({ queryKey: ["interview-stats"] }); setCreateOpen(false); toast({ title: "Topic added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const update = useMutation({
    mutationFn: ({ id, ...d }: Partial<InterviewTopic> & { id: string }) => apiPatch<InterviewTopic>(`/interview/topics/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["interview-topics"] }); qc.invalidateQueries({ queryKey: ["interview-stats"] }); setEditTopic(null); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });
  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/interview/topics/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["interview-topics"] }); qc.invalidateQueries({ queryKey: ["interview-stats"] }); },
  });
  const generate = useMutation({
    mutationFn: ({ category, count }: { category: string; count: number }) => apiPost<InterviewTopic[]>("/interview/topics/generate", { category, count }),
    onSuccess: (newTopics) => { qc.invalidateQueries({ queryKey: ["interview-topics"] }); qc.invalidateQueries({ queryKey: ["interview-stats"] }); toast({ title: `Generated ${newTopics.length} topics` }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const cats = ["all", ...Array.from(new Set(topics.map((t) => t.category)))];
  const filtered = catFilter === "all" ? topics : topics.filter((t) => t.category === catFilter);

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Mic className="w-6 h-6 text-primary" />Interview Prep</h1>
          <p className="text-muted-foreground text-sm">{stats?.masteredTopics ?? 0}/{stats?.totalTopics ?? 0} mastered · {stats?.readinessPercent ?? 0}% ready</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Topic</Button></DialogTrigger>
          <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add Interview Topic</DialogTitle></DialogHeader>
            <TopicForm onSave={(d) => create.mutate(d)} onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      <Tabs defaultValue="bank">
        <TabsList><TabsTrigger value="bank">Question Bank</TabsTrigger><TabsTrigger value="mock">Mock Interview</TabsTrigger><TabsTrigger value="history">History</TabsTrigger></TabsList>

        <TabsContent value="bank" className="space-y-3 mt-4">
          <div className="flex gap-1.5 flex-wrap">
            {cats.map((c) => (
              <button key={c} onClick={() => setCatFilter(c)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${catFilter === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
                {c === "all" ? "All" : c.replace("_", " ")}
              </button>
            ))}
            <Button size="sm" variant="outline" className="ml-auto h-6 text-xs" disabled={generate.isPending} onClick={() => generate.mutate({ category: catFilter === "all" ? "coding" : catFilter, count: 5 })}>
              <Sparkles className="w-3 h-3 mr-1" />{generate.isPending ? "Generating…" : "AI Generate"}
            </Button>
          </div>

          {filtered.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No topics yet. Add one manually or use AI Generate.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {filtered.map((t) => (
                <Card key={t.id} className="hover:border-primary/30 transition-colors">
                  <CardContent className="pt-3 pb-3">
                    <div className="flex items-start gap-2">
                      <button onClick={() => update.mutate({ id: t.id, revisionStatus: t.revisionStatus === "mastered" ? "not_started" : t.revisionStatus === "in_progress" ? "mastered" : "in_progress" })} className="mt-0.5 shrink-0">
                        {STATUS_ICON[t.revisionStatus]}
                      </button>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-medium text-sm">{t.title}</span>
                          <Badge className={`text-xs ${CAT_COLOR[t.category] ?? ""}`}>{t.category.replace("_", " ")}</Badge>
                          {t.source === "ai" && <Badge variant="secondary" className="text-xs">AI</Badge>}
                        </div>
                        {t.question && <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{t.question}</p>}
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditTopic(t)}><span className="text-xs">✏️</span></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove.mutate(t.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="mock" className="mt-4"><MockInterviewPanel /></TabsContent>

        <TabsContent value="history" className="mt-4 space-y-3">
          {sessions.length === 0 ? (
            <Card><CardContent className="py-10 text-center text-muted-foreground text-sm">No sessions yet. Try a mock interview above or chat: "Start a technical interview"</CardContent></Card>
          ) : sessions.map((s) => (
            <Card key={s.id}>
              <CardContent className="pt-3">
                <div className="flex items-center justify-between mb-1">
                  <Badge className="text-xs">{s.type.replace("_", " ")}</Badge>
                  <div className="flex items-center gap-2"><span className="text-sm font-bold">{s.overallScore}/100</span><span className="text-xs text-muted-foreground">{new Date(s.completedAt).toLocaleDateString()}</span></div>
                </div>
                {s.feedback && <p className="text-sm text-muted-foreground">{s.feedback}</p>}
              </CardContent>
            </Card>
          ))}
        </TabsContent>
      </Tabs>

      <Dialog open={!!editTopic} onOpenChange={(o) => { if (!o) setEditTopic(null); }}>
        <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Topic</DialogTitle></DialogHeader>
          {editTopic && <TopicForm initial={editTopic} onSave={(d) => update.mutate({ id: editTopic.id, ...d })} onClose={() => setEditTopic(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
