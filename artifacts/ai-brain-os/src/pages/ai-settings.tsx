import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPatch } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Settings2 } from "lucide-react";

interface AiSettings {
  id: string;
  planningAggressiveness: "relaxed" | "balanced" | "aggressive";
  recommendationFrequency: "low" | "medium" | "high";
  personality: "neutral" | "encouraging" | "direct" | "playful";
  automationPreferences: "suggest_only" | "auto_apply";
  studyModeEnabled: boolean;
  careerModeEnabled: boolean;
  focusModeEnabled: boolean;
  voiceModeEnabled: boolean;
  proactiveNotificationsEnabled: boolean;
}

function ToggleRow({ label, description, checked, onChange }: { label: string; description: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 py-1">
      <div>
        <p className="text-sm font-medium">{label}</p>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>
      <Switch checked={checked} onCheckedChange={onChange} />
    </div>
  );
}

export default function AiSettingsPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const { data: settings, isLoading } = useQuery<AiSettings>({
    queryKey: ["ai-settings"],
    queryFn: () => apiGet("/ai-settings"),
  });

  const [form, setForm] = useState<Partial<AiSettings>>({});

  useEffect(() => { if (settings) setForm(settings); }, [settings]);

  const save = useMutation({
    mutationFn: (data: Partial<AiSettings>) => apiPatch("/ai-settings", data),
    onSuccess: (data: AiSettings) => { qc.setQueryData(["ai-settings"], data); toast({ title: "AI settings saved" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const update = <K extends keyof AiSettings>(key: K, value: AiSettings[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    save.mutate({ [key]: value } as Partial<AiSettings>);
  };

  if (isLoading || !form) return <div className="p-6 text-center text-muted-foreground">Loading settings…</div>;

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Settings2 className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">AI Settings</h1>
          <p className="text-sm text-muted-foreground">Tune how proactive and how the assistant behaves across the app.</p>
        </div>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Behavior</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><Label>Planning aggressiveness</Label>
            <Select value={form.planningAggressiveness ?? "balanced"} onValueChange={(v) => update("planningAggressiveness", v as AiSettings["planningAggressiveness"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["relaxed", "balanced", "aggressive"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Recommendation frequency</Label>
            <Select value={form.recommendationFrequency ?? "medium"} onValueChange={(v) => update("recommendationFrequency", v as AiSettings["recommendationFrequency"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["low", "medium", "high"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Personality</Label>
            <Select value={form.personality ?? "neutral"} onValueChange={(v) => update("personality", v as AiSettings["personality"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{["neutral", "encouraging", "direct", "playful"].map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Automation preference</Label>
            <Select value={form.automationPreferences ?? "suggest_only"} onValueChange={(v) => update("automationPreferences", v as AiSettings["automationPreferences"])}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="suggest_only">Suggest only</SelectItem>
                <SelectItem value="auto_apply">Auto-apply (still logged for review)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Modules</CardTitle></CardHeader>
        <CardContent className="space-y-1 divide-y">
          <ToggleRow label="Study mode" description="Enable study-related suggestions and context" checked={form.studyModeEnabled ?? true} onChange={(v) => update("studyModeEnabled", v)} />
          <ToggleRow label="Career mode" description="Enable career-related suggestions and context" checked={form.careerModeEnabled ?? true} onChange={(v) => update("careerModeEnabled", v)} />
          <ToggleRow label="Focus mode" description="Enable focus-session related nudges" checked={form.focusModeEnabled ?? true} onChange={(v) => update("focusModeEnabled", v)} />
          <ToggleRow label="Voice mode" description="Enable voice input controls in chat" checked={form.voiceModeEnabled ?? true} onChange={(v) => update("voiceModeEnabled", v)} />
          <ToggleRow label="Proactive notifications" description="Allow the AI to surface suggestions unprompted" checked={form.proactiveNotificationsEnabled ?? true} onChange={(v) => update("proactiveNotificationsEnabled", v)} />
        </CardContent>
      </Card>
    </div>
  );
}
