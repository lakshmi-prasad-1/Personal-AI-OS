import {
  Brain,
  Activity,
  Sparkles,
  Network,
  StickyNote,
  Lightbulb,
  Files,
  Clock,
} from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  useBrainDecide,
  useBrainActivity,
  useBrainKnowledgeStats,
  useListNotes,
  useListIdeas,
  useListMemories,
  useListResources,
} from "@workspace/api-client-react";
import { Link } from "wouter";
import { useEffect } from "react";

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

export default function Dashboard() {
  const brainDecide = useBrainDecide();
  const { mutate: fetchDecisions } = brainDecide;
  useEffect(() => {
    fetchDecisions();
  }, [fetchDecisions]);
  const suggestions = brainDecide.data;
  const isDecideLoading = brainDecide.isPending;
  const { data: activity, isLoading: isActivityLoading } = useBrainActivity();
  const { data: stats, isLoading: isStatsLoading } = useBrainKnowledgeStats();
  const { data: notes } = useListNotes();
  const { data: ideas } = useListIdeas();
  const { data: memories } = useListMemories();
  const { data: resources } = useListResources();

  const recentNotes = [...(notes || [])]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  const recentIdeas = [...(ideas || [])]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  const recentMemories = [...(memories || [])]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);
  const recentResources = [...(resources || [])]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 3);

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="space-y-2">
        <h1 className="text-3xl font-serif font-bold text-foreground">Overview</h1>
        <p className="text-muted-foreground text-lg">
          A read-only snapshot of your second brain. Use Chat to create, search, and act.
        </p>
      </header>

      <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card className="bg-card/50">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Network className="w-5 h-5 text-primary" />
            <div className="text-2xl font-semibold">{isStatsLoading ? "…" : stats?.nodeCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Graph Nodes</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Sparkles className="w-5 h-5 text-primary" />
            <div className="text-2xl font-semibold">{isStatsLoading ? "…" : stats?.edgeCount ?? 0}</div>
            <div className="text-xs text-muted-foreground">Connections</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <StickyNote className="w-5 h-5 text-primary" />
            <div className="text-2xl font-semibold">{notes?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Notes</div>
          </CardContent>
        </Card>
        <Card className="bg-card/50">
          <CardContent className="p-4 flex flex-col items-center text-center gap-1">
            <Lightbulb className="w-5 h-5 text-primary" />
            <div className="text-2xl font-semibold">{ideas?.length ?? 0}</div>
            <div className="text-xs text-muted-foreground">Ideas</div>
          </CardContent>
        </Card>
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            AI Suggestions
          </h2>
          {isDecideLoading ? (
            <div className="p-8 text-center text-muted-foreground">Synthesizing...</div>
          ) : suggestions?.decisions?.length ? (
            <div className="grid gap-3">
              {suggestions.decisions.map((decision, i) => (
                <Card key={i} className="bg-card/50 backdrop-blur-sm border">
                  <CardHeader className="p-4 pb-2">
                    <div className="flex items-center justify-between gap-2">
                      <CardTitle className="text-base">{decision.title}</CardTitle>
                      {decision.priority && (
                        <span
                          className={`text-[10px] uppercase tracking-wide px-1.5 py-0.5 rounded shrink-0 ${
                            decision.priority === "high"
                              ? "bg-destructive/15 text-destructive"
                              : decision.priority === "medium"
                                ? "bg-primary/15 text-primary"
                                : "bg-muted text-muted-foreground"
                          }`}
                        >
                          {decision.priority}
                        </span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0 space-y-1">
                    <CardDescription>{decision.description}</CardDescription>
                    {decision.reason && (
                      <p className="text-xs text-muted-foreground italic">Why: {decision.reason}</p>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground bg-muted/50 rounded-lg border border-dashed">
              Nothing to suggest right now. Chat with your assistant to get started.
            </div>
          )}
        </section>

        <section className="space-y-4">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Recent Activity
          </h2>
          {isActivityLoading ? (
            <div className="p-8 text-center text-muted-foreground">Loading activity...</div>
          ) : activity?.actions?.length ? (
            <div className="space-y-2">
              {activity.actions.slice(0, 6).map((action) => (
                <div
                  key={action.id}
                  className="flex items-start justify-between gap-3 p-3 rounded-lg bg-card border text-sm"
                >
                  <div className="min-w-0">
                    <p className="text-foreground truncate">{action.summary}</p>
                    <p className="text-xs text-muted-foreground">{timeAgo(action.createdAt)}</p>
                  </div>
                  <Badge variant={action.status === "success" ? "secondary" : "destructive"} className="shrink-0">
                    {action.status}
                  </Badge>
                </div>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center text-muted-foreground bg-muted/50 rounded-lg border border-dashed">
              No AI activity yet. Everything the assistant does will show up here.
            </div>
          )}
        </section>
      </div>

      <section className="space-y-4">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Recently Updated
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <RecentColumn title="Notes" href="/notes" items={recentNotes.map((n) => ({ id: n.id, label: n.title }))} />
          <RecentColumn title="Ideas" href="/ideas" items={recentIdeas.map((n) => ({ id: n.id, label: n.title }))} />
          <RecentColumn
            title="Memories"
            href="/memories"
            items={recentMemories.map((n) => ({ id: n.id, label: n.title }))}
          />
          <RecentColumn
            title="Resources"
            href="/resources"
            items={recentResources.map((n) => ({ id: n.id, label: n.title }))}
            icon={<Files className="w-4 h-4" />}
          />
        </div>
      </section>
    </div>
  );
}

function RecentColumn({
  title,
  href,
  items,
}: {
  title: string;
  href: string;
  items: { id: string; label: string }[];
  icon?: React.ReactNode;
}) {
  return (
    <Card className="bg-card/50">
      <CardHeader className="p-4 pb-2">
        <CardTitle className="text-sm flex items-center justify-between">
          {title}
          <Link href={href} className="text-xs font-normal text-primary hover:underline">
            View all
          </Link>
        </CardTitle>
      </CardHeader>
      <CardContent className="p-4 pt-0 space-y-1.5">
        {items.length === 0 ? (
          <p className="text-xs text-muted-foreground">Nothing yet</p>
        ) : (
          items.map((item) => (
            <p key={item.id} className="text-xs text-foreground truncate">
              {item.label}
            </p>
          ))
        )}
      </CardContent>
    </Card>
  );
}
