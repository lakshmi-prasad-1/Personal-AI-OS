import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, ChevronDown, ChevronRight, BookOpen } from "lucide-react";

interface Subject {
  id: string; name: string; code?: string; semester?: string; category: string;
  examDate?: string; priority: string; progressPercent: number; isActive: string;
}
interface Topic {
  id: string; subjectId: string; title: string; description: string; status: string;
  difficulty: string; importance: string; estimatedHours?: number;
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700", medium: "bg-blue-100 text-blue-700", high: "bg-red-100 text-red-700",
};
const STATUS_COLORS: Record<string, string> = {
  not_started: "bg-gray-100 text-gray-700", in_progress: "bg-blue-100 text-blue-700",
  completed: "bg-green-100 text-green-700", revision_needed: "bg-orange-100 text-orange-700",
};

function NewSubjectDialog() {
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [category, setCategory] = useState("core");
  const [examDate, setExamDate] = useState("");
  const [priority, setPriority] = useState("medium");
  const { toast } = useToast();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: any) => apiPost("/subjects", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["subjects"] }); setOpen(false); setName(""); setCode(""); setExamDate(""); toast({ title: "Subject added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />New Subject</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Subject</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Data Structures" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Code</Label><Input value={code} onChange={(e) => setCode(e.target.value)} placeholder="CS301" /></div>
            <div><Label>Category</Label>
              <Select value={category} onValueChange={setCategory}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["core", "elective", "lab", "project"].map((c) => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Exam Date</Label><Input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} /></div>
            <div><Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low", "medium", "high"].map((p) => <SelectItem key={p} value={p}>{p}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" disabled={!name.trim() || create.isPending} onClick={() => create.mutate({ name, code: code || undefined, category, examDate: examDate || undefined, priority })}>
            {create.isPending ? "Creating…" : "Add Subject"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewTopicDialog({ subjectId, onCreated }: { subjectId: string; onCreated: () => void }) {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState("");
  const [difficulty, setDifficulty] = useState("medium");
  const [importance, setImportance] = useState("medium");
  const { toast } = useToast();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: any) => apiPost("/topics", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["topics"] }); qc.invalidateQueries({ queryKey: ["subjects"] }); setOpen(false); setTitle(""); onCreated(); toast({ title: "Topic added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-3.5 h-3.5 mr-1" />Topic</Button></DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>New Topic</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Binary Trees" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["easy", "medium", "hard"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Importance</Label>
              <Select value={importance} onValueChange={setImportance}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["low", "medium", "high"].map((i) => <SelectItem key={i} value={i}>{i}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" disabled={!title.trim() || create.isPending} onClick={() => create.mutate({ subjectId, title, difficulty, importance })}>
            {create.isPending ? "Creating…" : "Add Topic"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function SubjectRow({ subject }: { subject: Subject }) {
  const [expanded, setExpanded] = useState(false);
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: topics = [] } = useQuery<Topic[]>({
    queryKey: ["topics", subject.id],
    queryFn: () => apiGet(`/topics?subjectId=${subject.id}`),
    enabled: expanded,
  });

  const removeSubject = useMutation({
    mutationFn: (id: string) => apiDelete(`/subjects/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["subjects"] }),
  });

  const updateTopicStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => apiPatch(`/topics/${id}`, { status }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["topics", subject.id] }); qc.invalidateQueries({ queryKey: ["subjects"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const removeTopic = useMutation({
    mutationFn: (id: string) => apiDelete(`/topics/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["topics", subject.id] }); qc.invalidateQueries({ queryKey: ["subjects"] }); },
  });

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <button className="flex items-start gap-2 flex-1 min-w-0 text-left" onClick={() => setExpanded(!expanded)}>
            {expanded ? <ChevronDown className="w-4 h-4 mt-0.5 shrink-0" /> : <ChevronRight className="w-4 h-4 mt-0.5 shrink-0" />}
            <div className="min-w-0">
              <p className="font-medium text-sm">{subject.name} {subject.code && <span className="text-muted-foreground font-normal">({subject.code})</span>}</p>
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                <Badge variant="outline" className={`text-xs ${PRIORITY_COLORS[subject.priority]}`}>{subject.priority}</Badge>
                <Badge variant="outline" className="text-xs">{subject.category}</Badge>
                {subject.examDate && <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">📅 {subject.examDate}</Badge>}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <Progress value={subject.progressPercent} className="h-1.5 w-32" />
                <span className="text-xs text-muted-foreground">{subject.progressPercent}%</span>
              </div>
            </div>
          </button>
          <div className="flex items-center gap-1.5 shrink-0">
            <NewTopicDialog subjectId={subject.id} onCreated={() => setExpanded(true)} />
            <button onClick={() => removeSubject.mutate(subject.id)} className="text-muted-foreground hover:text-destructive transition-colors">
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {expanded && (
          <div className="mt-3 pl-6 space-y-2 border-l ml-2">
            {topics.length === 0 ? (
              <p className="text-xs text-muted-foreground py-2">No topics yet.</p>
            ) : (
              topics.map((t) => (
                <div key={t.id} className="flex items-center justify-between gap-2 py-1.5">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm truncate">{t.title}</p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Select value={t.status} onValueChange={(v) => updateTopicStatus.mutate({ id: t.id, status: v })}>
                      <SelectTrigger className={`h-7 text-xs w-36 ${STATUS_COLORS[t.status]}`}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {["not_started", "in_progress", "completed", "revision_needed"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
                      </SelectContent>
                    </Select>
                    <button onClick={() => removeTopic.mutate(t.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function SubjectsPage() {
  const { data: subjects = [], isLoading } = useQuery<Subject[]>({ queryKey: ["subjects"], queryFn: () => apiGet("/subjects") });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Subjects</h1>
            <p className="text-sm text-muted-foreground">{subjects.length} subject{subjects.length !== 1 ? "s" : ""} this semester</p>
          </div>
        </div>
        <NewSubjectDialog />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading subjects…</div>
      ) : subjects.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-4xl mb-3">📚</p>
          <p>No subjects yet. Add one or ask the AI to add subjects for you.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {subjects.map((s) => <SubjectRow key={s.id} subject={s} />)}
        </div>
      )}
    </div>
  );
}
