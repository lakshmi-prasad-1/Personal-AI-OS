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
import { useToast } from "@/hooks/use-toast";
import { Plus, Trash2, Sparkles, RotateCcw, Layers } from "lucide-react";

interface Flashcard {
  id: string; front: string; back: string; type: string; difficulty: string;
  source: string; repetitions: number; nextReviewDate?: string;
}

function GenerateFlashcardsDialog() {
  const [open, setOpen] = useState(false);
  const [topic, setTopic] = useState("");
  const [count, setCount] = useState("5");
  const [type, setType] = useState("concept");
  const { toast } = useToast();
  const qc = useQueryClient();

  const generate = useMutation({
    mutationFn: (data: any) => apiPost("/flashcards/generate", data),
    onSuccess: (created: any) => {
      qc.invalidateQueries({ queryKey: ["flashcards"] });
      setOpen(false); setTopic("");
      toast({ title: `Generated ${Array.isArray(created) ? created.length : ""} flashcards` });
    },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm"><Sparkles className="w-4 h-4 mr-1" />Generate with AI</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>Generate Flashcards</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Topic *</Label><Input value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g. Binary Search Trees" /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Count</Label><Input type="number" value={count} onChange={(e) => setCount(e.target.value)} min={1} max={20} /></div>
            <div><Label>Type</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{["definition", "concept", "formula", "programming", "revision"].map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <Button className="w-full" disabled={!topic.trim() || generate.isPending} onClick={() => generate.mutate({ topic, count: Number(count), type })}>
            {generate.isPending ? "Generating…" : "Generate"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function NewFlashcardDialog() {
  const [open, setOpen] = useState(false);
  const [front, setFront] = useState("");
  const [back, setBack] = useState("");
  const { toast } = useToast();
  const qc = useQueryClient();

  const create = useMutation({
    mutationFn: (data: any) => apiPost("/flashcards", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["flashcards"] }); setOpen(false); setFront(""); setBack(""); toast({ title: "Flashcard added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="outline"><Plus className="w-4 h-4 mr-1" />Add manually</Button></DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader><DialogTitle>New Flashcard</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Front *</Label><Input value={front} onChange={(e) => setFront(e.target.value)} placeholder="Question / term" /></div>
          <div><Label>Back *</Label><Input value={back} onChange={(e) => setBack(e.target.value)} placeholder="Answer / definition" /></div>
          <Button className="w-full" disabled={!front.trim() || !back.trim() || create.isPending} onClick={() => create.mutate({ front, back })}>
            {create.isPending ? "Adding…" : "Add Flashcard"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function ReviewCard({ card, onReviewed }: { card: Flashcard; onReviewed: () => void }) {
  const [flipped, setFlipped] = useState(false);
  const { toast } = useToast();
  const qc = useQueryClient();

  const review = useMutation({
    mutationFn: (rating: string) => apiPost(`/flashcards/${card.id}/review`, { rating }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["flashcards"] }); setFlipped(false); onReviewed(); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <Card>
      <CardContent className="p-5">
        <button className="w-full text-left" onClick={() => setFlipped(!flipped)}>
          <p className="text-xs text-muted-foreground mb-2">{flipped ? "Answer" : "Question"} · click to flip</p>
          <p className="font-medium">{flipped ? card.back : card.front}</p>
        </button>
        <div className="flex flex-wrap gap-1.5 mt-3">
          <Badge variant="outline" className="text-xs">{card.type}</Badge>
          {card.source === "ai" && <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">✦ AI</Badge>}
        </div>
        {flipped && (
          <div className="flex gap-2 mt-4">
            {["again", "hard", "good", "easy"].map((r) => (
              <Button key={r} size="sm" variant="outline" disabled={review.isPending} onClick={() => review.mutate(r)} className="flex-1 capitalize">
                {r}
              </Button>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function FlashcardsPage() {
  const [tab, setTab] = useState<"due" | "all">("due");
  const qc = useQueryClient();
  const { toast } = useToast();

  const { data: due = [], isLoading: dueLoading } = useQuery<Flashcard[]>({ queryKey: ["flashcards", "due"], queryFn: () => apiGet("/flashcards/due") });
  const { data: all = [], isLoading: allLoading } = useQuery<Flashcard[]>({ queryKey: ["flashcards", "all"], queryFn: () => apiGet("/flashcards"), enabled: tab === "all" });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/flashcards/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["flashcards"] }),
  });

  const displayed = tab === "due" ? due : all;
  const isLoading = tab === "due" ? dueLoading : allLoading;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <Layers className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Flashcards</h1>
            <p className="text-sm text-muted-foreground">{due.length} due for review today</p>
          </div>
        </div>
        <div className="flex gap-2">
          <NewFlashcardDialog />
          <GenerateFlashcardsDialog />
        </div>
      </div>

      <div className="flex gap-2">
        <Button variant={tab === "due" ? "default" : "outline"} size="sm" onClick={() => setTab("due")}><RotateCcw className="w-3.5 h-3.5 mr-1" />Due Today</Button>
        <Button variant={tab === "all" ? "default" : "outline"} size="sm" onClick={() => setTab("all")}>All Cards</Button>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading flashcards…</div>
      ) : displayed.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <p className="text-4xl mb-3">🎉</p>
          <p>{tab === "due" ? "Nothing due for review right now." : "No flashcards yet. Generate some with AI."}</p>
        </div>
      ) : tab === "due" ? (
        <div className="grid gap-3">
          {displayed.map((c) => <ReviewCard key={c.id} card={c} onReviewed={() => {}} />)}
        </div>
      ) : (
        <div className="space-y-2">
          {displayed.map((c) => (
            <Card key={c.id}>
              <CardContent className="p-4 flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-medium text-sm truncate">{c.front}</p>
                  <p className="text-xs text-muted-foreground truncate">{c.back}</p>
                  <div className="flex gap-1.5 mt-1.5">
                    <Badge variant="outline" className="text-xs">{c.type}</Badge>
                    {c.source === "ai" && <Badge variant="outline" className="text-xs bg-indigo-50 text-indigo-700">✦ AI</Badge>}
                  </div>
                </div>
                <button onClick={() => remove.mutate(c.id)} className="text-muted-foreground hover:text-destructive transition-colors shrink-0">
                  <Trash2 className="w-4 h-4" />
                </button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
