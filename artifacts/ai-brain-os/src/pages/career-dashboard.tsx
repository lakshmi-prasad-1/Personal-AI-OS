import { useQuery } from "@tanstack/react-query";
import { apiGet } from "@/lib/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Briefcase, FileText, Star, FolderGit2, Target, Mic, TrendingUp, Lightbulb, Award } from "lucide-react";

interface CareerOverview {
  profile: { degree?: string; university?: string; preferredRoles: string[]; githubUrl?: string; linkedinUrl?: string };
  resumeStatus: { total: number; lastAnalyzedAt: string | null; avgAtsScore: number };
  topSkills: { id: string; name: string; category: string; level: string; confidence: number }[];
  skillGaps: string[];
  totalSkills: number;
  totalProjects: number;
  interviewReadiness: { totalTopics: number; masteredTopics: number; readinessPercent: number };
  careerGoals: { id: string; title: string; progressPercent: number; status: string }[];
  certificates: string[];
  recentImprovements: string[];
}

const LEVEL_COLOR: Record<string, string> = {
  expert: "bg-purple-500",
  advanced: "bg-blue-500",
  intermediate: "bg-green-500",
  beginner: "bg-yellow-500",
};

export default function CareerDashboard() {
  const { data, isLoading } = useQuery<CareerOverview>({
    queryKey: ["career-dashboard"],
    queryFn: () => apiGet<CareerOverview>("/career-dashboard"),
  });

  const { data: recs } = useQuery<{ recommendations: string[] }>({
    queryKey: ["career-recommendations"],
    queryFn: () => apiGet<{ recommendations: string[] }>("/career-recommendations"),
  });

  if (isLoading) return <div className="flex items-center justify-center h-64 text-muted-foreground">Loading career dashboard…</div>;
  if (!data) return null;

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight flex items-center gap-2"><Briefcase className="w-6 h-6 text-primary" />Career OS</h1>
        <p className="text-muted-foreground text-sm mt-1">Your personalised career command centre</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <StatCard icon={<FileText className="w-4 h-4" />} label="Resumes" value={data.resumeStatus.total} sub={data.resumeStatus.avgAtsScore > 0 ? `Avg ATS ${data.resumeStatus.avgAtsScore}%` : "Not yet analyzed"} color="text-blue-500" />
        <StatCard icon={<Star className="w-4 h-4" />} label="Skills" value={data.totalSkills} sub={`${data.topSkills.length} top skills`} color="text-yellow-500" />
        <StatCard icon={<FolderGit2 className="w-4 h-4" />} label="Projects" value={data.totalProjects} sub="in portfolio" color="text-green-500" />
        <StatCard icon={<Mic className="w-4 h-4" />} label="Interview Ready" value={`${data.interviewReadiness.readinessPercent}%`} sub={`${data.interviewReadiness.masteredTopics}/${data.interviewReadiness.totalTopics} mastered`} color="text-purple-500" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Career Goals */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Target className="w-4 h-4 text-primary" />Active Career Goals</CardTitle></CardHeader>
          <CardContent className="space-y-3">
            {data.careerGoals.length === 0 ? (
              <p className="text-sm text-muted-foreground">No active goals. Chat: "Create a career goal"</p>
            ) : data.careerGoals.map((g) => (
              <div key={g.id}>
                <div className="flex justify-between text-sm mb-1"><span className="font-medium truncate">{g.title}</span><span className="text-muted-foreground ml-2 shrink-0">{g.progressPercent}%</span></div>
                <Progress value={g.progressPercent} className="h-1.5" />
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Top Skills */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><TrendingUp className="w-4 h-4 text-primary" />Top Skills</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {data.topSkills.length === 0 ? (
              <p className="text-sm text-muted-foreground">No skills yet. Chat: "I know React and TypeScript"</p>
            ) : data.topSkills.map((s) => (
              <div key={s.id} className="flex items-center gap-2">
                <div className={`w-2 h-2 rounded-full shrink-0 ${LEVEL_COLOR[s.level] ?? "bg-gray-400"}`} />
                <span className="text-sm flex-1 truncate">{s.name}</span>
                <div className="w-20 bg-secondary rounded-full h-1.5"><div className={`h-1.5 rounded-full ${LEVEL_COLOR[s.level] ?? "bg-gray-400"}`} style={{ width: `${s.confidence}%` }} /></div>
                <span className="text-xs text-muted-foreground w-8 text-right">{s.confidence}%</span>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* Skill Gaps */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Award className="w-4 h-4 text-primary" />Skill Gaps (from Goals)</CardTitle></CardHeader>
          <CardContent>
            {data.skillGaps.length === 0 ? (
              <p className="text-sm text-muted-foreground">Set target technologies in a career goal to see gaps.</p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {data.skillGaps.map((gap) => <Badge key={gap} variant="secondary" className="text-xs">{gap}</Badge>)}
              </div>
            )}
          </CardContent>
        </Card>

        {/* AI Recommendations */}
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm flex items-center gap-2"><Lightbulb className="w-4 h-4 text-primary" />AI Career Coach</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {(recs?.recommendations ?? []).map((tip, i) => (
              <div key={i} className="flex gap-2 text-sm"><span className="text-primary shrink-0">→</span><span>{tip}</span></div>
            ))}
          </CardContent>
        </Card>
      </div>

      {/* Certificates */}
      {data.certificates.length > 0 && (
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-sm">Certificates</CardTitle></CardHeader>
          <CardContent className="flex flex-wrap gap-1.5">
            {data.certificates.map((c) => <Badge key={c} variant="outline" className="text-xs">{c}</Badge>)}
          </CardContent>
        </Card>
      )}
    </div>
  );
}

function StatCard({ icon, label, value, sub, color }: { icon: React.ReactNode; label: string; value: string | number; sub: string; color: string }) {
  return (
    <Card>
      <CardContent className="pt-4">
        <div className={`flex items-center gap-2 ${color} mb-1`}>{icon}<span className="text-xs font-semibold uppercase tracking-wide">{label}</span></div>
        <div className="text-2xl font-bold">{value}</div>
        <div className="text-xs text-muted-foreground mt-0.5">{sub}</div>
      </CardContent>
    </Card>
  );
}
