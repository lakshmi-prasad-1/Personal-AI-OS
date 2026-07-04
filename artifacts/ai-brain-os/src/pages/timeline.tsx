import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";

interface TimelineEntry {
  id: string;
  type: string;
  title: string;
  timestamp: string;
  detail?: string;
}

const TYPE_ICONS: Record<string, string> = {
  task_completed: "✅", goal_completed: "🎯", habit_logged: "🔥", focus_session: "⏱",
  reminder_completed: "🔔", planner_event: "📅", note: "📝", idea: "💡",
  memory: "🧠", resource: "📎", agent_action: "✦",
};

function groupByDay(entries: TimelineEntry[]): Record<string, TimelineEntry[]> {
  const groups: Record<string, TimelineEntry[]> = {};
  for (const e of entries) {
    const day = e.timestamp.slice(0, 10);
    (groups[day] ??= []).push(e);
  }
  return groups;
}

export default function TimelinePage() {
  const [days, setDays] = useState(7);
  const { data: entries = [], isLoading } = useQuery<TimelineEntry[]>({
    queryKey: ["timeline", days],
    queryFn: () => apiGet(`/timeline?days=${days}`),
  });

  const groups = groupByDay(entries);
  const dayKeys = Object.keys(groups).sort((a, b) => b.localeCompare(a));

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-6 h-6 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">Life Timeline</h1>
            <p className="text-sm text-muted-foreground">Everything you've done, in one chronological feed.</p>
          </div>
        </div>
        <div className="flex gap-1">
          {[7, 14, 30].map((d) => (
            <Button key={d} size="sm" variant={days === d ? "default" : "outline"} onClick={() => setDays(d)}>{d}d</Button>
          ))}
        </div>
      </div>

      {isLoading ? (
        <div className="text-center text-muted-foreground py-12">Loading…</div>
      ) : entries.length === 0 ? (
        <div className="text-center text-muted-foreground py-12">
          <History className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <p>No activity in this range yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {dayKeys.map((day) => (
            <div key={day}>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2">
                {new Date(day + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}
              </p>
              <div className="space-y-2">
                {groups[day].map((entry) => (
                  <Card key={entry.id}>
                    <CardContent className="p-3 flex items-start gap-3">
                      <span className="text-lg">{TYPE_ICONS[entry.type] ?? "•"}</span>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium">{entry.title}</p>
                        {entry.detail && <p className="text-xs text-muted-foreground mt-0.5">{entry.detail}</p>}
                      </div>
                      <Badge variant="outline" className="text-xs shrink-0">
                        {new Date(entry.timestamp).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
