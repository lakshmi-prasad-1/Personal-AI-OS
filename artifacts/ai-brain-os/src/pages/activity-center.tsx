import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Activity } from "lucide-react";

interface AgentAction {
  id: string;
  actionType: string;
  entityType?: string;
  summary: string;
  status: "success" | "failed";
  createdAt: string;
}

function timeAgo(dateStr: string): string {
  const seconds = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  return `${days}d ago`;
}

export default function ActivityCenterPage() {
  const [limit, setLimit] = useState(30);
  const { data, isLoading } = useQuery<{ actions: AgentAction[] } | AgentAction[]>({
    queryKey: ["brain-activity", limit],
    queryFn: () => apiGet(`/brain/activity?limit=${limit}`),
  });

  const actions: AgentAction[] = Array.isArray(data) ? data : (data?.actions ?? []);

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Activity Center</h1>
            <p className="text-sm text-muted-foreground">Every action the AI has taken on your behalf — the audit trail.</p>
          </div>
        </div>
        {actions.length >= limit && (
          <Button size="sm" variant="outline" onClick={() => setLimit((l) => l + 30)}>Load more</Button>
        )}
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : actions.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <Activity className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No AI actions logged yet.</p>
          <p className="text-xs mt-1">Ask the assistant to create a task, note, or plan — it'll show up here.</p>
        </div>
      ) : (
        <div className="space-y-2">
          {actions.map((action) => (
            <Card key={action.id}>
              <CardContent className="p-3 flex items-start gap-3">
                <div className={`w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 ${action.status === "success" ? "bg-green-500" : "bg-red-500"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm">{action.summary}</p>
                  <div className="flex gap-2 mt-1 flex-wrap">
                    <Badge variant="outline" className="text-xs">{action.actionType}</Badge>
                    {action.entityType && <Badge variant="outline" className="text-xs">{action.entityType}</Badge>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground shrink-0">{timeAgo(action.createdAt)}</span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
