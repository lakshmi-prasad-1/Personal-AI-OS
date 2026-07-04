import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Compass } from "lucide-react";

interface LifeProfile {
  id: string;
  wakeTime?: string;
  sleepTime?: string;
  breakDurationMinutes?: number;
  exerciseSchedule?: string;
  collegeSchedule?: string;
  workSchedule?: string;
  timezone?: string;
  preferredLearningStyle?: string;
  preferredPlanningStyle?: "relaxed" | "balanced" | "aggressive";
  energyPattern?: string;
  weekendSchedule?: string;
  personalInterests: string[];
  personalPriorities: string[];
  personalValues: string[];
  favoriteTechnologies: string[];
  futureGoals?: string;
  lifeVision?: string;
}

function tagsToText(tags?: string[]) { return (tags ?? []).join(", "); }
function textToTags(text: string) { return text.split(",").map((s) => s.trim()).filter(Boolean); }

export default function LifeProfilePage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: profile, isLoading } = useQuery<LifeProfile>({
    queryKey: ["life-profile"],
    queryFn: () => apiGet("/life-profile"),
  });

  const [form, setForm] = useState<Partial<LifeProfile>>({});
  const [interestsText, setInterestsText] = useState("");
  const [prioritiesText, setPrioritiesText] = useState("");
  const [valuesText, setValuesText] = useState("");
  const [techText, setTechText] = useState("");

  useEffect(() => {
    if (profile) {
      setForm(profile);
      setInterestsText(tagsToText(profile.personalInterests));
      setPrioritiesText(tagsToText(profile.personalPriorities));
      setValuesText(tagsToText(profile.personalValues));
      setTechText(tagsToText(profile.favoriteTechnologies));
    }
  }, [profile]);

  const save = useMutation({
    mutationFn: (data: any) => apiPatch("/life-profile", data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["life-profile"] }); toast({ title: "Life profile saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const handleSave = () => {
    save.mutate({
      wakeTime: form.wakeTime || undefined,
      sleepTime: form.sleepTime || undefined,
      breakDurationMinutes: form.breakDurationMinutes ? Number(form.breakDurationMinutes) : undefined,
      exerciseSchedule: form.exerciseSchedule || undefined,
      collegeSchedule: form.collegeSchedule || undefined,
      workSchedule: form.workSchedule || undefined,
      timezone: form.timezone || undefined,
      preferredLearningStyle: form.preferredLearningStyle || undefined,
      preferredPlanningStyle: form.preferredPlanningStyle || undefined,
      energyPattern: form.energyPattern || undefined,
      weekendSchedule: form.weekendSchedule || undefined,
      personalInterests: textToTags(interestsText),
      personalPriorities: textToTags(prioritiesText),
      personalValues: textToTags(valuesText),
      favoriteTechnologies: textToTags(techText),
      futureGoals: form.futureGoals || undefined,
      lifeVision: form.lifeVision || undefined,
    });
  };

  if (isLoading) return <div className="p-6 text-center text-muted-foreground">Loading profile…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Compass className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Life Profile</h1>
          <p className="text-sm text-muted-foreground">The AI reads this to personalize planning, decisions, and recommendations across every module.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Daily Rhythm</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Wake time</Label><Input type="time" value={form.wakeTime ?? ""} onChange={(e) => setForm({ ...form, wakeTime: e.target.value })} /></div>
            <div><Label>Sleep time</Label><Input type="time" value={form.sleepTime ?? ""} onChange={(e) => setForm({ ...form, sleepTime: e.target.value })} /></div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div><Label>Break duration (minutes)</Label><Input type="number" value={form.breakDurationMinutes ?? ""} onChange={(e) => setForm({ ...form, breakDurationMinutes: Number(e.target.value) })} placeholder="15" /></div>
            <div><Label>Timezone</Label><Input value={form.timezone ?? ""} onChange={(e) => setForm({ ...form, timezone: e.target.value })} placeholder="e.g. Asia/Kolkata" /></div>
          </div>
          <div><Label>Energy pattern</Label>
            <Select value={form.energyPattern ?? ""} onValueChange={(v) => setForm({ ...form, energyPattern: v })}>
              <SelectTrigger><SelectValue placeholder="Select pattern" /></SelectTrigger>
              <SelectContent>
                {["morning_person", "night_owl", "steady", "afternoon_peak"].map((s) => <SelectItem key={s} value={s}>{s.replace("_", " ")}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div><Label>Weekend schedule</Label><Input value={form.weekendSchedule ?? ""} onChange={(e) => setForm({ ...form, weekendSchedule: e.target.value })} placeholder="e.g. relaxed, personal projects" /></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Schedule Context</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Exercise schedule</Label><Input value={form.exerciseSchedule ?? ""} onChange={(e) => setForm({ ...form, exerciseSchedule: e.target.value })} placeholder="e.g. 6-7am gym, Mon/Wed/Fri" /></div>
          <div><Label>College schedule</Label><Input value={form.collegeSchedule ?? ""} onChange={(e) => setForm({ ...form, collegeSchedule: e.target.value })} placeholder="e.g. 9am-3pm weekdays" /></div>
          <div><Label>Work schedule</Label><Input value={form.workSchedule ?? ""} onChange={(e) => setForm({ ...form, workSchedule: e.target.value })} placeholder="e.g. internship 2-6pm" /></div>
          <div><Label>Preferred planning style</Label>
            <Select value={form.preferredPlanningStyle ?? ""} onValueChange={(v) => setForm({ ...form, preferredPlanningStyle: v as any })}>
              <SelectTrigger><SelectValue placeholder="Select style" /></SelectTrigger>
              <SelectContent>
                {["relaxed", "balanced", "aggressive"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Interests, Priorities & Vision</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Personal interests (comma-separated)</Label><Input value={interestsText} onChange={(e) => setInterestsText(e.target.value)} placeholder="Music, hiking, chess" /></div>
          <div><Label>Personal priorities</Label><Input value={prioritiesText} onChange={(e) => setPrioritiesText(e.target.value)} placeholder="Health, career growth, family" /></div>
          <div><Label>Personal values</Label><Input value={valuesText} onChange={(e) => setValuesText(e.target.value)} placeholder="Honesty, discipline, curiosity" /></div>
          <div><Label>Favorite technologies</Label><Input value={techText} onChange={(e) => setTechText(e.target.value)} placeholder="React, Python, AI" /></div>
          <div><Label>Future goals</Label><Textarea value={form.futureGoals ?? ""} onChange={(e) => setForm({ ...form, futureGoals: e.target.value })} placeholder="Where do you want to be in 1-5 years?" /></div>
          <div><Label>Life vision</Label><Textarea value={form.lifeVision ?? ""} onChange={(e) => setForm({ ...form, lifeVision: e.target.value })} placeholder="Your broader life vision" /></div>
        </CardContent>
      </Card>

      <Button className="w-full" disabled={save.isPending} onClick={handleSave}>
        {save.isPending ? "Saving…" : "Save Life Profile"}
      </Button>
    </div>
  );
}
