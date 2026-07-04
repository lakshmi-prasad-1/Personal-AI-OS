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
import { useToast } from "@/hooks/use-toast";
import { Star, Plus, Trash2, Edit2 } from "lucide-react";

interface Skill { id: string; name: string; category: string; level: string; confidence: number; experience: string; projectsUsed: string[]; learningProgress: number; notes: string; }
interface SkillStats { total: number; byCategory: Record<string, number>; byLevel: Record<string, number>; avgConfidence: number; }

const CATEGORIES = ["programming_language", "framework", "library", "database", "cloud", "devops", "ai_ml", "dsa", "system_design", "soft_skill", "other"];
const LEVELS = ["beginner", "intermediate", "advanced", "expert"];
const LEVEL_COLOR: Record<string, string> = { expert: "bg-purple-500 text-white", advanced: "bg-blue-500 text-white", intermediate: "bg-green-500 text-white", beginner: "bg-yellow-500 text-white" };
const CAT_LABEL: Record<string, string> = { programming_language: "Languages", framework: "Frameworks", library: "Libraries", database: "Databases", cloud: "Cloud", devops: "DevOps", ai_ml: "AI/ML", dsa: "DSA", system_design: "System Design", soft_skill: "Soft Skills", other: "Other" };

function SkillForm({ initial, onSave, onClose }: { initial?: Partial<Skill>; onSave: (d: Partial<Skill>) => void; onClose: () => void }) {
  const [name, setName] = useState(initial?.name ?? "");
  const [category, setCategory] = useState(initial?.category ?? "other");
  const [level, setLevel] = useState(initial?.level ?? "beginner");
  const [confidence, setConfidence] = useState(initial?.confidence ?? 50);
  const [experience, setExperience] = useState(initial?.experience ?? "");
  const [notes, setNotes] = useState(initial?.notes ?? "");

  return (
    <div className="space-y-3">
      <div><Label>Skill Name *</Label><Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. React, Docker, Python" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Category</Label>
          <Select value={category} onValueChange={setCategory}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{CATEGORIES.map((c) => <SelectItem key={c} value={c}>{CAT_LABEL[c] ?? c}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div><Label>Level</Label>
          <Select value={level} onValueChange={setLevel}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{LEVELS.map((l) => <SelectItem key={l} value={l}>{l}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Confidence: {confidence}%</Label>
        <Slider value={[confidence]} onValueChange={([v]) => setConfidence(v ?? 50)} min={0} max={100} step={5} className="mt-2" />
      </div>
      <div><Label>Experience</Label><Textarea value={experience} onChange={(e) => setExperience(e.target.value)} rows={2} placeholder="How have you used this skill?" /></div>
      <div><Label>Notes</Label><Input value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Any additional notes…" /></div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={!name.trim()} onClick={() => onSave({ name: name.trim(), category, level, confidence, experience, notes })}>Save</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function Skills() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editSkill, setEditSkill] = useState<Skill | null>(null);
  const [filter, setFilter] = useState("all");

  const { data: skills = [], isLoading } = useQuery<Skill[]>({ queryKey: ["skills"], queryFn: () => apiGet<Skill[]>("/skills") });
  const { data: stats } = useQuery<SkillStats>({ queryKey: ["skills-stats"], queryFn: () => apiGet<SkillStats>("/skills/stats") });

  const create = useMutation({
    mutationFn: (d: Partial<Skill>) => apiPost<Skill>("/skills", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); qc.invalidateQueries({ queryKey: ["skills-stats"] }); setCreateOpen(false); toast({ title: "Skill added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: Partial<Skill> & { id: string }) => apiPatch<Skill>(`/skills/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); qc.invalidateQueries({ queryKey: ["skills-stats"] }); setEditSkill(null); toast({ title: "Skill updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/skills/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["skills"] }); qc.invalidateQueries({ queryKey: ["skills-stats"] }); toast({ title: "Skill removed" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const categories = ["all", ...Array.from(new Set(skills.map((s) => s.category)))];
  const filtered = filter === "all" ? skills : skills.filter((s) => s.category === filter);
  const grouped = filtered.reduce<Record<string, Skill[]>>((acc, s) => { (acc[s.category] ??= []).push(s); return acc; }, {});

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Star className="w-6 h-6 text-primary" />Skill Inventory</h1>
          <p className="text-muted-foreground text-sm">{stats?.total ?? 0} skills · avg confidence {stats?.avgConfidence ?? 0}%</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Skill</Button></DialogTrigger>
          <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Add Skill</DialogTitle></DialogHeader>
            <SkillForm onSave={(d) => create.mutate(d)} onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {/* Category filter */}
      <div className="flex gap-1.5 flex-wrap">
        {categories.map((c) => (
          <button key={c} onClick={() => setFilter(c)} className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${filter === c ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground hover:bg-secondary/80"}`}>
            {c === "all" ? "All" : (CAT_LABEL[c] ?? c)}
          </button>
        ))}
      </div>

      {skills.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No skills yet. Chat: "I know React" or click Add Skill</CardContent></Card>
      ) : (
        <div className="space-y-4">
          {Object.entries(grouped).map(([cat, catSkills]) => (
            <Card key={cat}>
              <CardHeader className="pb-2"><CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">{CAT_LABEL[cat] ?? cat}</CardTitle></CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {catSkills.map((s) => (
                    <div key={s.id} className="flex items-center gap-2 p-2 rounded-md border">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-medium text-sm truncate">{s.name}</span>
                          <Badge className={`text-xs px-1.5 py-0 ${LEVEL_COLOR[s.level] ?? "bg-gray-400 text-white"}`}>{s.level}</Badge>
                        </div>
                        <div className="flex items-center gap-1 mt-1">
                          <div className="flex-1 bg-secondary rounded-full h-1"><div className="h-1 rounded-full bg-primary" style={{ width: `${s.confidence}%` }} /></div>
                          <span className="text-xs text-muted-foreground w-8">{s.confidence}%</span>
                        </div>
                      </div>
                      <div className="flex gap-1 shrink-0">
                        <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => setEditSkill(s)}><Edit2 className="w-3 h-3" /></Button>
                        <Button variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove.mutate(s.id)}><Trash2 className="w-3 h-3" /></Button>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editSkill} onOpenChange={(o) => { if (!o) setEditSkill(null); }}>
        <DialogContent className="sm:max-w-md"><DialogHeader><DialogTitle>Edit Skill</DialogTitle></DialogHeader>
          {editSkill && <SkillForm initial={editSkill} onSave={(d) => update.mutate({ id: editSkill.id, ...d })} onClose={() => setEditSkill(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
