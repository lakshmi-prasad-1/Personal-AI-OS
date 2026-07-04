import OpenAI from "openai";
import { skillService } from "./skillService";
import { resumeService } from "./resumeService";
import { logger } from "../lib/logger";

const openaiApiKey = process.env["OPENAI_API_KEY"];
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export interface JobDescriptionAnalysis {
  role: string;
  company: string;
  responsibilities: string[];
  requiredSkills: string[];
  technologies: string[];
  experienceRequired: string;
  educationRequired: string;
  employmentType: string;
  location: string;
  salary: string;
  matchPercent: number;
  matchingSkills: string[];
  missingSkills: string[];
  prioritySkills: string[];
  learningSuggestions: string[];
}

export interface CareerRoadmap {
  targetRole: string;
  currentLevel: string;
  timelineMonths: number;
  phases: {
    name: string;
    durationWeeks: number;
    skills: string[];
    projects: string[];
    certifications: string[];
    weeklyGoals: string[];
    monthlyGoals: string[];
    resources: string[];
  }[];
  totalSkillsNeeded: string[];
  estimatedHoursPerWeek: number;
}

export const jobAnalysisService = {
  async analyzeJobDescription(userId: string, jobDescription: string, company = "", role = ""): Promise<JobDescriptionAnalysis> {
    const [userSkills, resumes] = await Promise.all([
      skillService.list(userId),
      resumeService.list(userId),
    ]);

    const userSkillNames = userSkills.map((s) => s.name.toLowerCase());
    const latestResume = resumes[0];

    if (!openai) {
      return {
        role: role || "Unknown Role",
        company: company || "Unknown Company",
        responsibilities: [],
        requiredSkills: [],
        technologies: [],
        experienceRequired: "N/A",
        educationRequired: "N/A",
        employmentType: "N/A",
        location: "N/A",
        salary: "N/A",
        matchPercent: 0,
        matchingSkills: [],
        missingSkills: [],
        prioritySkills: [],
        learningSuggestions: ["Enable OPENAI_API_KEY for full JD analysis."],
      };
    }

    try {
      const systemPrompt = `You are a career coach and ATS expert. Analyze the job description and respond ONLY with valid JSON matching this exact schema:
{
  "role": string,
  "company": string,
  "responsibilities": string[],
  "requiredSkills": string[],
  "technologies": string[],
  "experienceRequired": string,
  "educationRequired": string,
  "employmentType": string,
  "location": string,
  "salary": string
}`;

      const userMessage = `Job Description:\n${jobDescription}\n\nHints: company="${company}", role="${role}"`;

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [{ role: "system", content: systemPrompt }, { role: "user", content: userMessage }],
      });

      const extracted = JSON.parse(completion.choices[0]?.message.content ?? "{}") as Omit<JobDescriptionAnalysis, "matchPercent" | "matchingSkills" | "missingSkills" | "prioritySkills" | "learningSuggestions">;

      const allRequired = [...(extracted.requiredSkills ?? []), ...(extracted.technologies ?? [])].map((s) => s.toLowerCase());
      const matchingSkills = allRequired.filter((s) => userSkillNames.some((u) => u.includes(s) || s.includes(u)));
      const missingSkills = allRequired.filter((s) => !userSkillNames.some((u) => u.includes(s) || s.includes(u)));
      const matchPercent = allRequired.length > 0 ? Math.round((matchingSkills.length / allRequired.length) * 100) : 0;
      const prioritySkills = (extracted.requiredSkills ?? []).filter((s) => !userSkillNames.some((u) => u.includes(s.toLowerCase())));

      // Generate learning suggestions
      const resumeContext = latestResume ? `Resume: ${latestResume.content.slice(0, 500)}` : "No resume on file.";
      const suggestCompletion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: 'You are a career coach. Given missing skills and resume context, give 3-5 actionable learning suggestions. Respond with JSON: { "suggestions": string[] }' },
          { role: "user", content: `Missing skills: ${missingSkills.slice(0, 8).join(", ")}\n\n${resumeContext}` },
        ],
      });
      const suggestions = (JSON.parse(suggestCompletion.choices[0]?.message.content ?? "{}") as { suggestions?: string[] }).suggestions ?? [];

      return {
        ...extracted,
        matchPercent,
        matchingSkills,
        missingSkills,
        prioritySkills,
        learningSuggestions: suggestions,
      };
    } catch (err) {
      logger.error({ err }, "Job description analysis failed");
      return {
        role: role || "Unknown",
        company: company || "Unknown",
        responsibilities: [],
        requiredSkills: [],
        technologies: [],
        experienceRequired: "N/A",
        educationRequired: "N/A",
        employmentType: "N/A",
        location: "N/A",
        salary: "N/A",
        matchPercent: 0,
        matchingSkills: [],
        missingSkills: [],
        prioritySkills: [],
        learningSuggestions: ["Analysis failed — please try again."],
      };
    }
  },

  async generateRoadmap(userId: string, targetRole: string, currentLevel = "beginner", timelineMonths = 6): Promise<CareerRoadmap> {
    const userSkills = await skillService.list(userId);
    const userSkillNames = userSkills.map((s) => s.name).join(", ") || "None yet";

    if (!openai) {
      return {
        targetRole,
        currentLevel,
        timelineMonths,
        phases: [{ name: "Getting Started", durationWeeks: 4, skills: ["Enable OPENAI_API_KEY for full roadmap"], projects: [], certifications: [], weeklyGoals: [], monthlyGoals: [], resources: [] }],
        totalSkillsNeeded: [],
        estimatedHoursPerWeek: 10,
      };
    }

    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You are a senior tech career coach. Generate a personalized, actionable career roadmap. Respond ONLY with JSON:
{
  "phases": [{ "name": string, "durationWeeks": number, "skills": string[], "projects": string[], "certifications": string[], "weeklyGoals": string[], "monthlyGoals": string[], "resources": string[] }],
  "totalSkillsNeeded": string[],
  "estimatedHoursPerWeek": number
}
Make it realistic and specific to the target role.`,
          },
          {
            role: "user",
            content: `Target Role: ${targetRole}\nCurrent Level: ${currentLevel}\nTimeline: ${timelineMonths} months\nCurrent Skills: ${userSkillNames}`,
          },
        ],
      });

      const raw = JSON.parse(completion.choices[0]?.message.content ?? "{}") as Omit<CareerRoadmap, "targetRole" | "currentLevel" | "timelineMonths">;
      return { targetRole, currentLevel, timelineMonths, ...raw };
    } catch (err) {
      logger.error({ err }, "Career roadmap generation failed");
      return { targetRole, currentLevel, timelineMonths, phases: [], totalSkillsNeeded: [], estimatedHoursPerWeek: 10 };
    }
  },
};
