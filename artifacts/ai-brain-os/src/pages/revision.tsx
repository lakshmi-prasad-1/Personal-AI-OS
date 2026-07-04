import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { RefreshCcw, AlertTriangle, GraduationCap, Sparkles } from "lucide-react";

interface DueFlashcard { id: string; front: string; back: string; }
interface RevisionTopic { id: string; title: string; status: string; }
interface RevisionRecommendation {
  dueFlashcards: DueFlashcard[];
  weakTopics: WeakTopic[];
  topicsFlaggedForRevision: RevisionTopic[];
  totalItems: number;
}
interface WeakTopic { id: string; reason: string; weaknessScore: number; resolved: boolean; }

function ExplainDialog() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [mode, setMode] = useState("simple");
  const [explanation, setExplanation] = useState("");
  const { toast } = useToast();

  const explain = useMutation({
    mutationFn: () => apiPost<{ explanation: string }>("/teacher/explain", { topic, mode }),
    onSuccess: (r) => setExplanation(r.explanation),
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) { setExplanation(""); setTopic(""); } }}>
      <DialogTrigger asChild><Button size="sm"><Sparkles className="w-4 h-4 mr-1" />Ask AI Teacher</Button></DialogTrigger>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>AI Teacher</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Topic *</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Explain recursion" /></div>
          <div><Label>Mode</Label>
            <Select value={mode} onValueChange={setMode}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {["simple", "deep", "examples", "interview", "coding", "exam", "step_by_step", "compare", "analogy", "default"].map((m) => <SelectItem key={m} value={m}>{m.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={!topic.trim() || explain.isPending} onClick={() => explain.mutate()}>
            {explain.isPending ? "Thinking…" : "Explain"}
          </Button>
          {explanation && (
            <Textarea readOnly value={explanation} rows={12} className="text-sm" />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function LogSessionDialog() {
  const [open, setOpen] = useState(false);
  const [durationMinutes, setDurationMinutes] = useState("30");
  const [type, setType] = useState("study");
  const { toast } = useToast();
  const qc = useQueryClient();

  const log = useMutation({
    mutationFn: () => apiPost("/study-sessions", { durationMinutes: Number(durationMinutes), type }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["revision-today"] }); setOpen(false); toast({ title: "Session logged" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline">Log Study Session</Button></DialogTrigger>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader><DialogTitle>Log Study Session</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Duration (minutes)</Label><Input type="number" value={durationMinutes} onChange={(e) => setDurationMinutes(e.target.value)} /></div>
          <div><Label>Type</Label>
            <Select value={type} onValueChange={setType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["study", "revision", "practice", "coding"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <Button className="w-full" disabled={log.isPending} onClick={() => log.mutate()}>{log.isPending ? "Logging…" : "Log Session"}</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-slate-100 text-slate-700", medium: "bg-blue-100 text-blue-700", high: "bg-red-100 text-red-700",
};

export default function RevisionPage() {
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: recommendation, isLoading } = useQuery<RevisionRecommendation>({ queryKey: ["revision-today"], queryFn: () => apiGet("/revision/today") });
  const { data: weakTopics = [] } = useQuery<WeakTopic[]>({ queryKey: ["weak-topics"], queryFn: () => apiGet("/revision/weak-topics") });

  const resolveWeak = useMutation({
    mutationFn: (id: string) => apiPost(`/revision/weak-topics/${id}/resolve`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["weak-topics"] }); qc.invalidateQueries({ queryKey: ["revision-today"] }); toast({ title: "Marked as resolved" }); },
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <RefreshCcw className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Revision</h1>
            <p className="text-sm text-muted-foreground">What to revise today, based on due flashcards and weak topics.</p>
          </div>
        </div>
        <div className="flex gap-2">
          <LogSessionDialog />
          <ExplainDialog />
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading recommendations…</div>
      ) : recommendation ? (
        <>
          <div className="grid grid-cols-3 gap-3">
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{recommendation.dueFlashcards.length}</p><p className="text-xs text-muted-foreground">Due flashcards</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{recommendation.weakTopics.length}</p><p className="text-xs text-muted-foreground">Weak topics</p></CardContent></Card>
            <Card><CardContent className="p-4 text-center"><p className="text-2xl font-bold">{recommendation.topicsFlaggedForRevision.length}</p><p className="text-xs text-muted-foreground">Need revision</p></CardContent></Card>
          </div>

          <Card>
            <CardHeader><CardTitle className="text-base flex items-center gap-2"><GraduationCap className="w-4 h-4" />Today's Focus</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {recommendation.totalItems === 0 ? (
                <p className="text-sm text-muted-foreground py-4 text-center">🎉 You're all caught up on revision!</p>
              ) : (
                <>
                  {recommendation.dueFlashcards.slice(0, 5).map((c) => (
                    <div key={c.id} className="flex items-start justify-between gap-2 border rounded-md p-3">
                      <p className="text-sm">{c.front}</p>
                      <Badge variant="outline" className="text-xs shrink-0 bg-blue-50 text-blue-700">Flashcard</Badge>
                    </div>
                  ))}
                  {recommendation.topicsFlaggedForRevision.map((t) => (
                    <div key={t.id} className="flex items-start justify-between gap-2 border rounded-md p-3">
                      <p className="text-sm">{t.title}</p>
                      <Badge variant="outline" className="text-xs shrink-0 bg-orange-50 text-orange-700">Needs revision</Badge>
                    </div>
                  ))}
                </>
              )}
            </CardContent>
          </Card>
        </>
      ) : null}

      <Card>
        <CardHeader><CardTitle className="text-base flex items-center gap-2"><AlertTriangle className="w-4 h-4" />Weak Topics</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {weakTopics.filter((w) => !w.resolved).length === 0 ? (
            <p className="text-sm text-muted-foreground py-4 text-center">No weak topics flagged right now.</p>
          ) : (
            weakTopics.filter((w) => !w.resolved).map((w) => (
              <div key={w.id} className="flex items-center justify-between gap-2 border rounded-md p-3">
                <div>
                  <p className="text-sm">{w.reason}</p>
                  <p className="text-xs text-muted-foreground">Weakness score: {w.weaknessScore}</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => resolveWeak.mutate(w.id)}>Mark resolved</Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
