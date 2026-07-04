import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Compass, ArrowRight } from "lucide-react";

interface Decision {
  title: string;
  reason: string;
}

interface LifeDecision {
  headline: string;
  reasoning: string;
  topActions: Decision[];
  context: {
    overdueTasks: number;
    dueTodayTasks: number;
    pendingHabits: number;
    dueReminders: number;
    isFocusing: boolean;
    energyPattern: string | null;
  };
}

export default function CommandCenterPage() {
  const { data, isLoading } = useQuery<LifeDecision>({
    queryKey: ["life-decision"],
    queryFn: () => apiGet("/life-decision"),
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Compass className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">Command Center</h1>
          <p className="text-sm text-muted-foreground">The AI's single answer to "what should I do right now?"</p>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="text-center text-muted-foreground py-12">Thinking…</div>
      ) : (
        <>
          <Card className="border-primary/40 bg-primary/5">
            <CardContent className="p-5 space-y-2">
              <p className="text-lg font-bold">{data.headline}</p>
              <p className="text-sm text-muted-foreground">{data.reasoning}</p>
            </CardContent>
          </Card>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            <Badge variant="outline" className={data.context.overdueTasks > 0 ? "bg-red-50 text-red-700 border-red-200" : ""}>
              {data.context.overdueTasks} overdue
            </Badge>
            <Badge variant="outline">{data.context.dueTodayTasks} due today</Badge>
            <Badge variant="outline">{data.context.pendingHabits} habits pending</Badge>
            <Badge variant="outline" className={data.context.dueReminders > 0 ? "bg-orange-50 text-orange-700 border-orange-200" : ""}>
              {data.context.dueReminders} reminders due
            </Badge>
            <Badge variant="outline">{data.context.isFocusing ? "In focus session" : "Not focusing"}</Badge>
            {data.context.energyPattern && <Badge variant="outline">{data.context.energyPattern.replace("_", " ")}</Badge>}
          </div>

          {data.topActions.length > 0 && (
            <Card>
              <CardHeader><CardTitle className="text-base">Top recommendations</CardTitle></CardHeader>
              <CardContent className="space-y-2">
                {data.topActions.map((action, i) => (
                  <div key={i} className="p-3 rounded-lg border bg-muted/30">
                    <p className="text-sm font-medium">{action.title}</p>
                    <p className="text-xs text-muted-foreground mt-0.5">{action.reason}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Link href="/insights">
              <Button variant="outline" className="w-full justify-between">Insights <ArrowRight className="w-4 h-4" /></Button>
            </Link>
            <Link href="/timeline">
              <Button variant="outline" className="w-full justify-between">Timeline <ArrowRight className="w-4 h-4" /></Button>
            </Link>
          </div>
        </>
      )}
    </div>
  );
}
