import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, HelpCircle, CheckCircle2, XCircle } from "lucide-react";

interface QuizQuestion { id: string; question: string; options?: string[]; correctAnswer: string; explanation?: string; }
interface Quiz { id: string; title: string; difficulty: string; source: string; questions: QuizQuestion[]; createdAt: string; }
interface Attempt { id: string; score: number; totalQuestions: number; correctCount: number; }

function GenerateQuizDialog() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [difficulty, setDifficulty] = useState("medium");
  const { toast } = useToast();
  const qc = useQueryClient();

  const generate = useMutation({
    mutationFn: (data: any) => apiPost("/quizzes/generate", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["quizzes"] }); setOpen(false); setTopic(""); toast({ title: "Quiz generated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Generate Quiz</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Generate Quiz</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Topic *</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Operating Systems" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Count</Label><Input type="number" value={count} onChange={(e) => setCount(e.target.value)} min={1} max={20} /></div>
            <div><Label>Difficulty</Label>
              <Select value={difficulty} onValueChange={setDifficulty}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["easy", "medium", "hard", "adaptive"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" disabled={!topic.trim() || generate.isPending} onClick={() => generate.mutate({ topic, count: Number(count), difficulty })}>
            {generate.isPending ? "Generating…" : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TakeQuizDialog({ quiz, onClose }: { quiz: Quiz; onClose: () => void }) {
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [result, setResult] = useState<Attempt | null>(null);
  const { toast } = useToast();
  const qc = useQueryClient();

  const submit = useMutation({
    mutationFn: () => apiPost<Attempt>(`/quizzes/${quiz.id}/attempts`, { answers: Object.entries(answers).map(([questionId, answer]) => ({ questionId, answer })) }),
    onSuccess: (attempt) => { setResult(attempt); qc.invalidateQueries({ queryKey: ["quizzes"] }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{quiz.title}</DialogTitle></DialogHeader>
        {result ? (
          <div className="text-center py-6 space-y-2">
            <p className="text-4xl font-bold">{result.score}%</p>
            <p className="text-muted-foreground">{result.correctCount} / {result.totalQuestions} correct</p>
            <Button className="mt-4" onClick={onClose}>Close</Button>
          </div>
        ) : (
          <div className="space-y-5">
            {quiz.questions.map((q, i) => (
              <div key={q.id}>
                <p className="text-sm font-medium mb-2">{i + 1}. {q.question}</p>
                {q.options?.length ? (
                  <RadioGroup value={answers[q.id] ?? ""} onValueChange={(v) => setAnswers({ ...answers, [q.id]: v })}>
                    {q.options.map((opt) => (
                      <div key={opt} className="flex items-center gap-2 py-0.5">
                        <RadioGroupItem value={opt} id={`${q.id}-${opt}`} />
                        <Label htmlFor={`${q.id}-${opt}`} className="font-normal">{opt}</Label>
                      </div>
                    ))}
                  </RadioGroup>
                ) : (
                  <Input value={answers[q.id] ?? ""} onChange={(e) => setAnswers({ ...answers, [q.id]: e.target.value })} placeholder="Your answer" />
                )}
              </div>
            ))}
            <Button className="w-full" disabled={submit.isPending} onClick={() => submit.mutate()}>
              {submit.isPending ? "Submitting…" : "Submit Answers"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

export default function QuizzesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [activeQuiz, setActiveQuiz] = useState<Quiz | null>(null);

  const { data: quizzes = [], isLoading } = useQuery<Quiz[]>({ queryKey: ["quizzes"], queryFn: () => apiGet("/quizzes") });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/quizzes/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quizzes"] }),
  });

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Quizzes</h1>
            <p className="text-sm text-muted-foreground">{quizzes.length} quiz{quizzes.length !== 1 ? "zes" : ""}</p>
          </div>
        </div>
        <GenerateQuizDialog />
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading quizzes…</div>
      ) : quizzes.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-4xl mb-3">❓</p>
          <p>No quizzes yet. Generate one with AI to test your knowledge.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {quizzes.map((q) => (
            <Card key={q.id}>
              <CardContent className="p-4 flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{q.title}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge variant="outline" className="text-xs">{q.difficulty}</Badge>
                    <Badge variant="outline" className="text-xs">{q.questions.length} questions</Badge>
                    {q.source === "ai" && <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">✦ AI</Badge>}
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Button size="sm" onClick={() => setActiveQuiz(q)}>Take Quiz</Button>
                  <button onClick={() => remove.mutate(q.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {activeQuiz && <TakeQuizDialog quiz={activeQuiz} onClose={() => setActiveQuiz(null)} />}
    </div>
  );
}
