import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiGet, apiPost, apiPatch, apiDelete } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { Zap, Play, Trash2, PlusCircle } from "lucide-react";

interface AutomationRule {
  id: string;
  name: string;
  description: string;
  trigger: { type: string; params?: Record<string, unknown> };
  action: { type: string; params?: Record<string, unknown> };
  isEnabled: boolean;
  isBuiltIn: boolean;
  lastTriggeredAt?: string;
}

interface TriggerResult {
  ruleId: string;
  ruleName: string;
  fired: boolean;
  reason: string;
}

export default function AutomationPage() {
  const { toast } = useToast();
  const qc = useQueryClient();
  const [lastRun, setLastRun] = useState<TriggerResult[] | null>(null);

  const { data: rules = [], isLoading } = useQuery<AutomationRule[]>({
    queryKey: ["automation-rules"],
    queryFn: () => apiGet("/automation-rules"),
  });

  const seed = useMutation({
    mutationFn: () => apiPost<AutomationRule[]>("/automation-rules/seed"),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["automation-rules"] }); toast({ title: "Built-in rules added" }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isEnabled }: { id: string; isEnabled: boolean }) => apiPatch(`/automation-rules/${id}`, { isEnabled }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const remove = useMutation({
    mutationFn: (id: string) => apiDelete(`/automation-rules/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["automation-rules"] }),
  });

  const run = useMutation({
    mutationFn: () => apiPost<TriggerResult[]>("/automation-rules/run"),
    onSuccess: (results) => { setLastRun(results); qc.invalidateQueries({ queryKey: ["automation-rules"] }); toast({ title: `Checked ${results.length} rule(s)` }); },
    onError: (e: Error) => toast({ title: "Error", description: e.message, variant: "destructive" }),
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Automation Rules</h1>
            <p className="text-sm text-muted-foreground">Trigger → action pairs the AI checks for you. Nothing here calls a real external service yet — every match is logged as a suggestion.</p>
          </div>
        </div>
      </div>

      <div className="flex gap-2">
        <Button size="sm" onClick={() => run.mutate()} disabled={run.isPending}>
          <Play className="w-4 h-4 mr-1" /> {run.isPending ? "Checking…" : "Check rules now"}
        </Button>
        {rules.length === 0 && (
          <Button size="sm" variant="outline" onClick={() => seed.mutate()} disabled={seed.isPending}>
            <PlusCircle className="w-4 h-4 mr-1" /> Add starter rules
          </Button>
        )}
      </div>

      {lastRun && (
        <Card>
          <CardContent className="p-4 space-y-2">
            <p className="text-sm font-semibold">Last check results</p>
            {lastRun.map((r) => (
              <div key={r.ruleId} className="flex items-center justify-between text-sm gap-2">
                <span>{r.ruleName}</span>
                <Badge variant="outline" className={r.fired ? "bg-orange-50 text-orange-700 border-orange-200" : "bg-green-50 text-green-700 border-green-200"}>
                  {r.fired ? "Fired" : "OK"}
                </Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : rules.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <Zap className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No automation rules yet.</p>
          <p className="text-xs mt-1">Add starter rules, or ask the AI to create one for you.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {rules.map((rule) => (
            <Card key={rule.id}>
              <CardContent className="p-4 flex items-start gap-3">
                <Switch checked={rule.isEnabled} onCheckedChange={(v) => toggle.mutate({ id: rule.id, isEnabled: v })} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium">{rule.name}</p>
                    {rule.isBuiltIn && <Badge variant="outline" className="text-xs">built-in</Badge>}
                  </div>
                  <p className="text-xs text-muted-foreground mt-0.5">{rule.description}</p>
                  <div className="flex gap-2 mt-1.5 text-xs text-muted-foreground">
                    <span>Trigger: {rule.trigger.type}</span>
                    <span>→</span>
                    <span>Action: {rule.action.type}</span>
                  </div>
                  {rule.lastTriggeredAt && (
                    <p className="text-xs text-muted-foreground mt-1">Last fired: {new Date(rule.lastTriggeredAt).toLocaleString()}</p>
                  )}
                </div>
                {!rule.isBuiltIn && (
                  <button onClick={() => remove.mutate(rule.id)} className="text-muted-foreground hover:text-destructive transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
