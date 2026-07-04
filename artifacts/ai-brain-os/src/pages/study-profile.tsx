import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { GraduationCap } from "lucide-react";

interface StudyProfile {
  id: string;
  semester?: string;
  branch?: string;
  dailyStudyGoalMinutes?: number;
  weeklyStudyGoalMinutes?: number;
  preferredStudyTime?: string;
  preferredLearningStyle?: string;
  preferredRevisionStyle?: string;
  weakSubjects: string[];
  strongSubjects: string[];
  programmingLanguages: string[];
  currentSkills: string[];
  targetSkills: string[];
}

function tagsToText(tags?: string[]) { return (tags ?? []).join(", "); }
function textToTags(text: string) { return text.split(",").map((s) => s.trim()).filter(Boolean); }

export default function StudyProfilePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery<StudyProfile>({
    queryKey: ["study-profile"],
    queryFn: () => apiGet("/study-profile"),
  });

  const [form, setForm] = useState<Partial<StudyProfile>>({});
  const [weakText, setWeakText] = useState("");
  const [strongText, setStrongText] = useState("");
  const [langText, setLangText] = useState("");
  const [currentSkillsText, setCurrentSkillsText] = useState("");
  const [targetSkillsText, setTargetSkillsText] = useState("");

  useEffect(() => {
    if (profile) {
      setForm(profile);
      setWeakText(tagsToText(profile.weakSubjects));
      setStrongText(tagsToText(profile.strongSubjects));
      setLangText(tagsToText(profile.programmingLanguages));
      setCurrentSkillsText(tagsToText(profile.currentSkills));
      setTargetSkillsText(tagsToText(profile.targetSkills));
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: (data: any) => apiPatch("/study-profile", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["study-profile"] }); toast({ title: "Study profile saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    save.mutate({
      semester: form.semester || undefined,
      branch: form.branch || undefined,
      dailyStudyGoalMinutes: form.dailyStudyGoalMinutes ? Number(form.dailyStudyGoalMinutes) : undefined,
      weeklyStudyGoalMinutes: form.weeklyStudyGoalMinutes ? Number(form.weeklyStudyGoalMinutes) : undefined,
      preferredStudyTime: form.preferredStudyTime || undefined,
      preferredLearningStyle: form.preferredLearningStyle || undefined,
      preferredRevisionStyle: form.preferredRevisionStyle || undefined,
      weakSubjects: textToTags(weakText),
      strongSubjects: textToTags(strongText),
      programmingLanguages: textToTags(langText),
      currentSkills: textToTags(currentSkillsText),
      targetSkills: textToTags(targetSkillsText),
    });
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading profile…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <GraduationCap className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Study Profile</h1>
          <p className="text-sm text-muted-foreground">Tell the AI about your academics so it can personalize plans, flashcards, and recommendations.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Academics</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Semester</Label><Input value={form.semester ?? ""} onChange={(e) => setForm({ ...form, semester: e.target.value })} placeholder="e.g. 5th" /></div>
            <div><Label>Branch</Label><Input value={form.branch ?? ""} onChange={(e) => setForm({ ...form, branch: e.target.value })} placeholder="e.g. CSE" /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Daily study goal (minutes)</Label><Input type="number" value={form.dailyStudyGoalMinutes ?? ""} onChange={(e) => setForm({ ...form, dailyStudyGoalMinutes: Number(e.target.value) })} placeholder="120" /></div>
            <div><Label>Weekly study goal (minutes)</Label><Input type="number" value={form.weeklyStudyGoalMinutes ?? ""} onChange={(e) => setForm({ ...form, weeklyStudyGoalMinutes: Number(e.target.value) })} placeholder="700" /></div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Preferences</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Preferred study time</Label><Input value={form.preferredStudyTime ?? ""} onChange={(e) => setForm({ ...form, preferredStudyTime: e.target.value })} placeholder="e.g. early morning" /></div>
          <div><Label>Preferred learning style</Label>
            <Select value={form.preferredLearningStyle ?? ""} onValueChange={(v) => setForm({ ...form, preferredLearningStyle: v })}>
              <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
              <SelectContent>
                {["visual", "reading", "practice", "teaching", "mixed"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Preferred revision style</Label>
            <Select value={form.preferredRevisionStyle ?? ""} onValueChange={(v) => setForm({ ...form, preferredRevisionStyle: v })}>
              <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
              <SelectContent>
                {["flashcards", "quizzes", "summaries", "teaching_back", "mixed"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Subjects & Skills</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Weak subjects (comma-separated)</Label><Input value={weakText} onChange={(e) => setWeakText(e.target.value)} placeholder="Thermodynamics, DBMS" /></div>
          <div><Label>Strong subjects (comma-separated)</Label><Input value={strongText} onChange={(e) => setStrongText(e.target.value)} placeholder="DSA, Maths" /></div>
          <div><Label>Programming languages</Label><Input value={langText} onChange={(e) => setLangText(e.target.value)} placeholder="Python, C++" /></div>
          <div><Label>Current skills</Label><Input value={currentSkillsText} onChange={(e) => setCurrentSkillsText(e.target.value)} placeholder="React, SQL" /></div>
          <div><Label>Target skills</Label><Input value={targetSkillsText} onChange={(e) => setTargetSkillsText(e.target.value)} placeholder="System design, ML" /></div>
        </CardContent>
      </Card>

      <Button className="w-full" disabled={save.isPending} onClick={handleSave}>
        {save.isPending ? "Saving…" : "Save Study Profile"}
      </Button>
    </div>
  );
}
