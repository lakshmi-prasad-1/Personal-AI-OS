import { and, desc, eq, gte } from "drizzle-orm";
import { db, studySessionsTable, type InsertStudySession, type StudySession } from "@workspace/db";
import { subjectService } from "./subjectService";
import { flashcardService } from "./flashcardService";
import { quizService } from "./quizService";
import { revisionService } from "./revisionService";

export const studyAnalyticsService = {
  async logSession(userId: string, data: Omit<InsertStudySession, "userId">): Promise<StudySession> {
    const [session] = await db.insert(studySessionsTable).values({ ...data, userId }).returning();
    if (!session) throw new Error("Failed to log study session");
    return session;
  },

  async listSessions(userId: string, days = 30): Promise<StudySession[]> {
    const since = new Date();
    since.setDate(since.getDate() - days);
    const sinceStr = since.toISOString().slice(0, 10);
    return db
      .select()
      .from(studySessionsTable)
      .where(and(eq(studySessionsTable.userId, userId), gte(studySessionsTable.date, sinceStr)))
      .orderBy(desc(studySessionsTable.date));
  },

  async progressOverview(userId: string) {
    const [sessions, subjectStats, flashcardStats, quizStats, revisionSessions] = await Promise.all([
      this.listSessions(userId, 7),
      subjectService.stats(userId),
      flashcardService.stats(userId),
      quizService.stats(userId),
      revisionService.list(userId),
    ]);

    const totalMinutesThisWeek = sessions.reduce((s, sess) => s + sess.durationMinutes, 0);
    const today = new Date().toISOString().slice(0, 10);
    const todayMinutes = sessions.filter((s) => s.date === today).reduce((s, sess) => s + sess.durationMinutes, 0);

    const byType: Record<string, number> = {};
    for (const s of sessions) byType[s.type] = (byType[s.type] ?? 0) + s.durationMinutes;

    return {
      studyHours: { today: Math.round((todayMinutes / 60) * 10) / 10, thisWeek: Math.round((totalMinutesThisWeek / 60) * 10) / 10 },
      minutesByType: byType,
      subjects: subjectStats,
      flashcards: flashcardStats,
      quizzes: quizStats,
      revisionSessionsCount: revisionSessions.length,
      completionPercent: subjectStats.overallCompletionPercent,
    };
  },
};
