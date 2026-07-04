import { careerProfileService } from "./careerProfileService";
import { resumeService } from "./resumeService";
import { skillService } from "./skillService";
import { projectService } from "./projectService";
import { careerGoalService } from "./careerGoalService";
import { interviewService } from "./interviewService";

export const careerAnalyticsService = {
  /** Career Dashboard (Module 9) aggregation — reuses all Career OS services, no duplicated logic. */
  async overview(userId: string) {
    const [profile, resumes, skillStats, projects, goals, interviewStats] = await Promise.all([
      careerProfileService.getOrCreate(userId),
      resumeService.list(userId),
      skillService.stats(userId),
      projectService.list(userId),
      careerGoalService.list(userId),
      interviewService.stats(userId),
    ]);

    const activeGoals = goals.filter((g) => g.status === "active");
    const topSkills = (await skillService.list(userId)).sort((a, b) => b.confidence - a.confidence).slice(0, 5);
    const skillGaps = activeGoals.flatMap((g) => g.targetTechnologies).filter((tech, i, arr) => arr.indexOf(tech) === i).slice(0, 8);

    return {
      profile,
      resumeStatus: {
        total: resumes.length,
        lastAnalyzedAt: resumes.find((r) => r.analyzedAt)?.analyzedAt ?? null,
        avgAtsScore: resumes.length
          ? Math.round(
              resumes.reduce((sum, r) => sum + ((r.analysis as { atsScore?: number } | null)?.atsScore ?? 0), 0) / resumes.length,
            )
          : 0,
      },
      topSkills,
      skillGaps,
      totalSkills: skillStats.total,
      totalProjects: projects.length,
      interviewReadiness: interviewStats,
      careerGoals: activeGoals,
      certificates: profile.certificates,
      recentImprovements: [
        ...resumes.filter((r) => r.analyzedAt).slice(0, 3).map((r) => `Analyzed resume "${r.title}"`),
        ...projects.slice(0, 3).map((p) => `Updated project "${p.title}"`),
      ],
    };
  },

  /** AI Career Coach (Module 13) — answers common career questions using existing data, no separate LLM pipeline. */
  async recommendation(userId: string): Promise<string[]> {
    const overview = await this.overview(userId);
    const tips: string[] = [];
    if (overview.totalSkills === 0) tips.push("Add your skills to your Skill Inventory so the AI can track your growth.");
    if (overview.resumeStatus.total === 0) tips.push("Upload a resume so Resume AI can analyze it and boost your ATS score.");
    else if (overview.resumeStatus.avgAtsScore < 70) tips.push("Your resume's ATS score is below 70 — run an analysis and address the suggestions.");
    if (overview.totalProjects < 3) tips.push("Add more projects to your portfolio — aim for at least 3 strong projects.");
    if (overview.interviewReadiness.totalTopics === 0) tips.push("Start building your interview question bank in Interview Prep.");
    else if (overview.interviewReadiness.readinessPercent < 50) tips.push("Your interview readiness is below 50% — revise more topics or try a mock interview.");
    if (overview.careerGoals.length === 0) tips.push("Set a career goal (target company/role) so the AI can tailor recommendations.");
    if (overview.skillGaps.length > 0) tips.push(`Consider learning: ${overview.skillGaps.slice(0, 3).join(", ")} — these match your career goals.`);
    if (tips.length === 0) tips.push("You're in great shape! Keep refining your resume and practicing mock interviews.");
    return tips;
  },
};
