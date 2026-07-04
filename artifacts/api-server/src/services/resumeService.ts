import { and, desc, eq } from "drizzle-orm";
import OpenAI from "openai";
import { db, resumesTable, type InsertResume, type Resume } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";
import { logger } from "../lib/logger";

const openaiApiKey = process.env["OPENAI_API_KEY"];
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export interface ResumeAnalysis {
  atsScore: number;
  strengths: string[];
  weaknesses: string[];
  missingSkills: string[];
  missingKeywords: string[];
  suggestions: string[];
}

export const resumeService = {
  async list(userId: string): Promise<Resume[]> {
    return db.select().from(resumesTable).where(eq(resumesTable.userId, userId)).orderBy(desc(resumesTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<Resume | undefined> {
    const [resume] = await db.select().from(resumesTable).where(and(eq(resumesTable.id, id), eq(resumesTable.userId, userId)));
    return resume;
  },

  async create(userId: string, data: Omit<InsertResume, "userId">): Promise<Resume> {
    const [resume] = await db.insert(resumesTable).values({ ...data, userId }).returning();
    if (!resume) throw new Error("Failed to create resume");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "resume",
      entityId: resume.id,
      label: resume.title,
      text: `${resume.title} ${resume.category} ${resume.content.slice(0, 500)}`,
      tags: resume.tags,
    });
    return resume;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertResume, "userId">>): Promise<Resume | undefined> {
    const [resume] = await db.update(resumesTable).set(data).where(and(eq(resumesTable.id, id), eq(resumesTable.userId, userId))).returning();
    return resume;
  },

  async remove(userId: string, id: string): Promise<Resume | undefined> {
    const [resume] = await db.delete(resumesTable).where(and(eq(resumesTable.id, id), eq(resumesTable.userId, userId))).returning();
    return resume;
  },

  /**
   * Resume AI: analyzes resume content, never overwrites the resume itself —
   * only stores the analysis result alongside it (Module 3 requirement).
   */
  async analyze(userId: string, id: string): Promise<Resume | undefined> {
    const resume = await this.get(userId, id);
    if (!resume) return undefined;

    let analysis: ResumeAnalysis;
    if (!openai) {
      analysis = {
        atsScore: 0,
        strengths: [],
        weaknesses: ["AI analysis requires OPENAI_API_KEY to be configured."],
        missingSkills: [],
        missingKeywords: [],
        suggestions: [],
      };
    } else {
      try {
        const completion = await openai.chat.completions.create({
          model: "gpt-4o-mini",
          response_format: { type: "json_object" },
          messages: [
            {
              role: "system",
              content:
                'You are an expert resume reviewer and ATS specialist. Analyze the resume text and respond ONLY with JSON: { "atsScore": number (0-100), "strengths": string[], "weaknesses": string[], "missingSkills": string[], "missingKeywords": string[], "suggestions": string[] }. Be specific and actionable. Never rewrite the resume, only critique it.',
            },
            { role: "user", content: `Resume category: ${resume.category}\n\nResume content:\n${resume.content || "(empty — no content provided)"}` },
          ],
        });
        const raw = completion.choices[0]?.message.content ?? "{}";
        analysis = JSON.parse(raw) as ResumeAnalysis;
      } catch (err) {
        logger.error({ err }, "Resume AI analysis failed");
        analysis = { atsScore: 0, strengths: [], weaknesses: ["Analysis failed — please try again."], missingSkills: [], missingKeywords: [], suggestions: [] };
      }
    }

    const [updated] = await db
      .update(resumesTable)
      .set({ analysis, analyzedAt: new Date() })
      .where(and(eq(resumesTable.id, id), eq(resumesTable.userId, userId)))
      .returning();
    return updated;
  },
};
