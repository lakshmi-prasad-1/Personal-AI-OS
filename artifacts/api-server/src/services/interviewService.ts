import { and, desc, eq } from "drizzle-orm";
import OpenAI from "openai";
import { db, interviewTopicsTable, interviewSessionsTable, type InsertInterviewTopic, type InterviewTopic, type InterviewSession } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";
import { logger } from "../lib/logger";

const openaiApiKey = process.env["OPENAI_API_KEY"];
const openai = openaiApiKey ? new OpenAI({ apiKey: openaiApiKey }) : null;

export interface MockInterviewTurn {
  question: string;
  answer: string;
  feedback: string;
  score: number;
}

export const interviewService = {
  // ─── Topics / Question Bank ───────────────────────────────────────────
  async listTopics(userId: string): Promise<InterviewTopic[]> {
    return db.select().from(interviewTopicsTable).where(eq(interviewTopicsTable.userId, userId)).orderBy(desc(interviewTopicsTable.updatedAt));
  },

  async createTopic(userId: string, data: Omit<InsertInterviewTopic, "userId">): Promise<InterviewTopic> {
    const [topic] = await db.insert(interviewTopicsTable).values({ ...data, userId }).returning();
    if (!topic) throw new Error("Failed to create interview topic");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "interview_topic",
      entityId: topic.id,
      label: topic.title,
      text: `${topic.title} ${topic.category} ${topic.question}`,
    });
    return topic;
  },

  async updateTopic(userId: string, id: string, data: Partial<Omit<InsertInterviewTopic, "userId">>): Promise<InterviewTopic | undefined> {
    const [topic] = await db.update(interviewTopicsTable).set(data).where(and(eq(interviewTopicsTable.id, id), eq(interviewTopicsTable.userId, userId))).returning();
    return topic;
  },

  async removeTopic(userId: string, id: string): Promise<InterviewTopic | undefined> {
    const [topic] = await db.delete(interviewTopicsTable).where(and(eq(interviewTopicsTable.id, id), eq(interviewTopicsTable.userId, userId))).returning();
    return topic;
  },

  async generateTopics(userId: string, category: string, count = 5): Promise<InterviewTopic[]> {
    if (!openai) return [];
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `Generate ${count} realistic ${category} interview questions for a software engineering candidate. Respond ONLY with JSON: { "questions": [{ "title": string, "question": string }] }` },
          { role: "user", content: `Category: ${category}` },
        ],
      });
      const raw = completion.choices[0]?.message.content ?? "{}";
      const parsed = JSON.parse(raw) as { questions: { title: string; question: string }[] };
      const created: InterviewTopic[] = [];
      for (const q of parsed.questions ?? []) {
        created.push(await this.createTopic(userId, { title: q.title, category, question: q.question, idealAnswerNotes: "", revisionStatus: "not_started", confidenceScore: 0, source: "ai" }));
      }
      return created;
    } catch (err) {
      logger.error({ err }, "Interview topic generation failed");
      return [];
    }
  },

  // ─── Mock Interview Sessions ───────────────────────────────────────────
  async listSessions(userId: string): Promise<InterviewSession[]> {
    return db.select().from(interviewSessionsTable).where(eq(interviewSessionsTable.userId, userId)).orderBy(desc(interviewSessionsTable.completedAt));
  },

  /** Runs a single AI-evaluated Q&A turn and stores it as (part of) a mock interview session. */
  async evaluateAnswer(type: string, question: string, answer: string): Promise<{ feedback: string; score: number }> {
    if (!openai) return { feedback: "AI evaluation requires OPENAI_API_KEY to be configured.", score: 0 };
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: `You are a strict but encouraging ${type} interviewer. Evaluate the candidate's answer. Respond ONLY with JSON: { "feedback": string, "score": number (0-100) }.` },
          { role: "user", content: `Question: ${question}\n\nCandidate's answer: ${answer}` },
        ],
      });
      const raw = completion.choices[0]?.message.content ?? "{}";
      return JSON.parse(raw) as { feedback: string; score: number };
    } catch (err) {
      logger.error({ err }, "Mock interview evaluation failed");
      return { feedback: "Evaluation failed — please try again.", score: 0 };
    }
  },

  async generateQuestion(type: string): Promise<string> {
    if (!openai) return "What is your greatest strength? (AI requires OPENAI_API_KEY to generate tailored questions.)";
    try {
      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: [
          { role: "system", content: `Generate a single realistic ${type} interview question for a software engineering candidate. Respond with only the question text, no preamble.` },
          { role: "user", content: `Type: ${type}` },
        ],
      });
      return completion.choices[0]?.message.content?.trim() ?? "Tell me about yourself.";
    } catch (err) {
      logger.error({ err }, "Mock interview question generation failed");
      return "Tell me about yourself.";
    }
  },

  async saveSession(userId: string, type: string, questions: MockInterviewTurn[]): Promise<InterviewSession> {
    const overallScore = questions.length ? Math.round(questions.reduce((sum, q) => sum + q.score, 0) / questions.length) : 0;
    const feedback = questions.map((q) => q.feedback).join(" ");
    const [session] = await db.insert(interviewSessionsTable).values({ userId, type, questions, overallScore, feedback }).returning();
    if (!session) throw new Error("Failed to save interview session");
    return session;
  },

  async stats(userId: string) {
    const topics = await this.listTopics(userId);
    const sessions = await this.listSessions(userId);
    const mastered = topics.filter((t) => t.revisionStatus === "mastered").length;
    return {
      totalTopics: topics.length,
      masteredTopics: mastered,
      readinessPercent: topics.length ? Math.round((mastered / topics.length) * 100) : 0,
      totalSessions: sessions.length,
      avgSessionScore: sessions.length ? Math.round(sessions.reduce((sum, s) => sum + s.overallScore, 0) / sessions.length) : 0,
    };
  },
};
