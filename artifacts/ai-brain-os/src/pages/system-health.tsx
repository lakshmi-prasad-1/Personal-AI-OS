import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Activity, CheckCircle2, XCircle } from "lucide-react";

interface SystemHealth {
  status: "ok" | "degraded";
  uptimeSeconds: number;
  checks: { database: string; aiChat: string };
  timestamp: string;
}

function formatUptime(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  return `${h}h ${m}m ${s}s`;
}

export default function SystemHealthPage() {
  const { data, isLoading } = useQuery<SystemHealth>({
    queryKey: ["system-health"],
    queryFn: () => apiGet("/system-health"),
    refetchInterval: 30_000,
  });

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-2">
        <Activity className="w-6 h-6 text-primary" />
        <div>
          <h1 className="text-2xl font-bold">System Health</h1>
          <p className="text-sm text-muted-foreground">Live status of the services powering your second brain.</p>
        </div>
      </div>

      {isLoading || !data ? (
        <div className="text-center text-muted-foreground py-12">Checking…</div>
      ) : (
        <>
          <Card>
            <CardContent className="p-5 flex items-center justify-between">
              <div>
                <p className="text-sm text-muted-foreground">Overall status</p>
                <p className="text-lg font-bold capitalize">{data.status}</p>
              </div>
              <Badge variant="outline" className={data.status === "ok" ? "bg-green-50 text-green-700 border-green-200" : "bg-orange-50 text-orange-700 border-orange-200"}>
                {data.status === "ok" ? "Healthy" : "Degraded"}
              </Badge>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm">Database connection</span>
                {data.checks.database === "ok" ? (
                  <span className="flex items-center gap-1 text-sm text-green-600"><CheckCircle2 className="w-4 h-4" /> Connected</span>
                ) : (
                  <span className="flex items-center gap-1 text-sm text-red-600"><XCircle className="w-4 h-4" /> Error</span>
                )}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">AI chat (OpenAI)</span>
                <span className="text-sm text-muted-foreground">{data.checks.aiChat}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm">Server uptime</span>
                <span className="text-sm text-muted-foreground">{formatUptime(data.uptimeSeconds)}</span>
              </div>
            </CardContent>
          </Card>

          <p className="text-xs text-muted-foreground text-center">Last checked {new Date(data.timestamp).toLocaleTimeString()}</p>
        </>
      )}
    </div>
  );
}
