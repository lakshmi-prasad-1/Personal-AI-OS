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
import { FolderGit2, Plus, Trash2, Edit2, ExternalLink, Github } from "lucide-react";

interface Project { id: string; title: string; description: string; techStack: string[]; githubUrl?: string; demoUrl?: string; status: string; difficulty: string; role: string; achievements: string[]; challenges: string; lessonsLearned: string; skillsUsed: string[]; usedInResume: string; }

const STATUS_COLOR: Record<string, string> = { completed: "bg-green-500/10 text-green-600 border-green-200", in_progress: "bg-blue-500/10 text-blue-600 border-blue-200", planning: "bg-yellow-500/10 text-yellow-600 border-yellow-200", archived: "bg-gray-500/10 text-gray-600 border-gray-200" };
const DIFF_COLOR: Record<string, string> = { hard: "text-red-500", medium: "text-yellow-500", easy: "text-green-500" };

function ProjectForm({ initial, onSave, onClose }: { initial?: Partial<Project>; onSave: (d: Partial<Project>) => void; onClose: () => void }) {
  const [title, setTitle] = useState(initial?.title ?? "");
  const [description, setDescription] = useState(initial?.description ?? "");
  const [techStack, setTechStack] = useState((initial?.techStack ?? []).join(", "));
  const [githubUrl, setGithubUrl] = useState(initial?.githubUrl ?? "");
  const [demoUrl, setDemoUrl] = useState(initial?.demoUrl ?? "");
  const [status, setStatus] = useState(initial?.status ?? "in_progress");
  const [difficulty, setDifficulty] = useState(initial?.difficulty ?? "medium");
  const [role, setRole] = useState(initial?.role ?? "");
  const [achievements, setAchievements] = useState((initial?.achievements ?? []).join("\n"));
  const [challenges, setChallenges] = useState(initial?.challenges ?? "");
  const [lessonsLearned, setLessonsLearned] = useState(initial?.lessonsLearned ?? "");
  const [skillsUsed, setSkillsUsed] = useState((initial?.skillsUsed ?? []).join(", "));
  const [usedInResume, setUsedInResume] = useState(initial?.usedInResume ?? "false");

  return (
    <div className="space-y-3">
      <div><Label>Project Title *</Label><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. E-Commerce Platform" /></div>
      <div><Label>Description</Label><Textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} placeholder="What does this project do?" /></div>
      <div><Label>Tech Stack (comma-separated)</Label><Input value={techStack} onChange={(e) => setTechStack(e.target.value)} placeholder="React, Node.js, PostgreSQL" /></div>
      <div className="grid grid-cols-2 gap-3">
        <div><Label>Status</Label>
          <Select value={status} onValueChange={setStatus}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["planning", "in_progress", "completed", "archived"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div><Label>Difficulty</Label>
          <Select value={difficulty} onValueChange={setDifficulty}><SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>{["easy", "medium", "hard"].map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>
      <div><Label>Your Role</Label><Input value={role} onChange={(e) => setRole(e.target.value)} placeholder="e.g. Full Stack Developer, Team Lead" /></div>
      <div><Label>GitHub URL</Label><Input value={githubUrl} onChange={(e) => setGithubUrl(e.target.value)} placeholder="https://github.com/…" /></div>
      <div><Label>Demo URL</Label><Input value={demoUrl} onChange={(e) => setDemoUrl(e.target.value)} placeholder="https://…" /></div>
      <div><Label>Achievements (one per line)</Label><Textarea value={achievements} onChange={(e) => setAchievements(e.target.value)} rows={3} placeholder="Improved load time by 40%&#10;Added authentication…" /></div>
      <div><Label>Challenges Faced</Label><Textarea value={challenges} onChange={(e) => setChallenges(e.target.value)} rows={2} /></div>
      <div><Label>Lessons Learned</Label><Textarea value={lessonsLearned} onChange={(e) => setLessonsLearned(e.target.value)} rows={2} /></div>
      <div><Label>Skills Used (comma-separated)</Label><Input value={skillsUsed} onChange={(e) => setSkillsUsed(e.target.value)} placeholder="React, TypeScript, REST APIs" /></div>
      <div><Label>Used in Resume?</Label>
        <Select value={usedInResume} onValueChange={setUsedInResume}><SelectTrigger><SelectValue /></SelectTrigger>
          <SelectContent><SelectItem value="true">Yes</SelectItem><SelectItem value="false">No</SelectItem></SelectContent>
        </Select>
      </div>
      <div className="flex gap-2 pt-2">
        <Button className="flex-1" disabled={!title.trim()} onClick={() => onSave({
          title: title.trim(), description, techStack: techStack.split(",").map((t) => t.trim()).filter(Boolean),
          githubUrl: githubUrl || undefined, demoUrl: demoUrl || undefined, status, difficulty, role,
          achievements: achievements.split("\n").map((a) => a.trim()).filter(Boolean),
          challenges, lessonsLearned,
          skillsUsed: skillsUsed.split(",").map((s) => s.trim()).filter(Boolean),
          usedInResume,
        })}>Save</Button>
        <Button variant="outline" onClick={onClose}>Cancel</Button>
      </div>
    </div>
  );
}

export default function CareerProjects() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [createOpen, setCreateOpen] = useState(false);
  const [editProject, setEditProject] = useState<Project | null>(null);

  const { data: projects = [], isLoading } = useQuery<Project[]>({ queryKey: ["career-projects"], queryFn: () => apiGet<Project[]>("/projects") });

  const create = useMutation({
    mutationFn: (d: Partial<Project>) => apiPost<Project>("/projects", d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["career-projects"] }); setCreateOpen(false); toast({ title: "Project added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: ({ id, ...d }: Partial<Project> & { id: string }) => apiPatch<Project>(`/projects/${id}`, d),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["career-projects"] }); setEditProject(null); toast({ title: "Project updated" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["career-projects"] }); toast({ title: "Project deleted" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading…</div>;

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><FolderGit2 className="w-6 h-6 text-primary" />Projects Portfolio</h1>
          <p className="text-muted-foreground text-sm">{projects.length} project{projects.length !== 1 ? "s" : ""} · {projects.filter((p) => p.status === "completed").length} completed</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild><Button size="sm"><Plus className="w-4 h-4 mr-1" />Add Project</Button></DialogTrigger>
          <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Add Project</DialogTitle></DialogHeader>
            <ProjectForm onSave={(d) => create.mutate(d)} onClose={() => setCreateOpen(false)} />
          </DialogContent>
        </Dialog>
      </div>

      {projects.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">No projects yet. Chat: "I built a todo app with React" or click Add Project</CardContent></Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.id} className="flex flex-col">
              <CardHeader className="pb-2">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-base leading-tight">{p.title}</CardTitle>
                  <div className="flex gap-1 shrink-0">
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditProject(p)}><Edit2 className="w-3.5 h-3.5" /></Button>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive" onClick={() => remove.mutate(p.id)}><Trash2 className="w-3.5 h-3.5" /></Button>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 flex-wrap">
                  <Badge className={`text-xs ${STATUS_COLOR[p.status] ?? ""}`}>{p.status.replace("_", " ")}</Badge>
                  <span className={`text-xs font-medium ${DIFF_COLOR[p.difficulty] ?? ""}`}>{p.difficulty}</span>
                  {p.usedInResume === "true" && <Badge variant="outline" className="text-xs border-purple-300 text-purple-600">In Resume</Badge>}
                </div>
              </CardHeader>
              <CardContent className="flex-1 space-y-2">
                {p.description && <p className="text-sm text-muted-foreground line-clamp-2">{p.description}</p>}
                {p.techStack.length > 0 && (
                  <div className="flex flex-wrap gap-1">{p.techStack.map((t) => <Badge key={t} variant="secondary" className="text-xs">{t}</Badge>)}</div>
                )}
                {p.role && <p className="text-xs text-muted-foreground">Role: {p.role}</p>}
                {p.achievements.length > 0 && (
                  <ul className="text-xs text-muted-foreground space-y-0.5">{p.achievements.slice(0, 2).map((a, i) => <li key={i}>✅ {a}</li>)}</ul>
                )}
                <div className="flex gap-2 pt-1">
                  {p.githubUrl && <a href={p.githubUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><Github className="w-3.5 h-3.5" />GitHub</a>}
                  {p.demoUrl && <a href={p.demoUrl} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"><ExternalLink className="w-3.5 h-3.5" />Demo</a>}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!editProject} onOpenChange={(o) => { if (!o) setEditProject(null); }}>
        <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto"><DialogHeader><DialogTitle>Edit Project</DialogTitle></DialogHeader>
          {editProject && <ProjectForm initial={editProject} onSave={(d) => update.mutate({ id: editProject.id, ...d })} onClose={() => setEditProject(null)} />}
        </DialogContent>
      </Dialog>
    </div>
  );
}
