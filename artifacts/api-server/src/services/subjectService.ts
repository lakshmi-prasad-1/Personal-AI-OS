import { and, desc, eq } from "drizzle-orm";
import { db, subjectsTable, topicsTable, type InsertSubject, type Subject, type InsertTopic, type Topic } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const subjectService = {
  async list(userId: string): Promise<Subject[]> {
    return db.select().from(subjectsTable).where(eq(subjectsTable.userId, userId)).orderBy(desc(subjectsTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<Subject | undefined> {
    const [subject] = await db.select().from(subjectsTable).where(and(eq(subjectsTable.id, id), eq(subjectsTable.userId, userId)));
    return subject;
  },

  async findByName(userId: string, name: string): Promise<Subject | undefined> {
    const subjects = await this.list(userId);
    return subjects.find((s) => s.name.toLowerCase().includes(name.toLowerCase()));
  },

  async create(userId: string, data: Omit<InsertSubject, "userId">): Promise<Subject> {
    const [subject] = await db.insert(subjectsTable).values({ ...data, userId }).returning();
    if (!subject) throw new Error("Failed to create subject");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "subject",
      entityId: subject.id,
      label: subject.name,
      text: `${subject.name} ${subject.code ?? ""} ${subject.category}`,
    });
    return subject;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertSubject, "userId">>): Promise<Subject | undefined> {
    const [subject] = await db.update(subjectsTable).set(data).where(and(eq(subjectsTable.id, id), eq(subjectsTable.userId, userId))).returning();
    return subject;
  },

  async remove(userId: string, id: string): Promise<Subject | undefined> {
    const [subject] = await db.delete(subjectsTable).where(and(eq(subjectsTable.id, id), eq(subjectsTable.userId, userId))).returning();
    return subject;
  },

  // ─── Topics ────────────────────────────────────────────────────────────
  async listTopics(userId: string, subjectId?: string): Promise<Topic[]> {
    if (subjectId) {
      return db.select().from(topicsTable).where(and(eq(topicsTable.userId, userId), eq(topicsTable.subjectId, subjectId))).orderBy(desc(topicsTable.updatedAt));
    }
    return db.select().from(topicsTable).where(eq(topicsTable.userId, userId)).orderBy(desc(topicsTable.updatedAt));
  },

  async getTopic(userId: string, id: string): Promise<Topic | undefined> {
    const [topic] = await db.select().from(topicsTable).where(and(eq(topicsTable.id, id), eq(topicsTable.userId, userId)));
    return topic;
  },

  async findTopicByTitle(userId: string, title: string, subjectId?: string): Promise<Topic | undefined> {
    const topics = await this.listTopics(userId, subjectId);
    return topics.find((t) => t.title.toLowerCase().includes(title.toLowerCase()));
  },

  async createTopic(userId: string, data: Omit<InsertTopic, "userId">): Promise<Topic> {
    const [topic] = await db.insert(topicsTable).values({ ...data, userId }).returning();
    if (!topic) throw new Error("Failed to create topic");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "topic",
      entityId: topic.id,
      label: topic.title,
      text: `${topic.title} ${topic.description}`,
    });
    return topic;
  },

  async updateTopic(userId: string, id: string, data: Partial<Omit<InsertTopic, "userId">>): Promise<Topic | undefined> {
    const updates = { ...data } as Partial<InsertTopic> & { completedAt?: Date | null };
    if (data.status === "completed") updates.completedAt = new Date();
    const [topic] = await db.update(topicsTable).set(updates).where(and(eq(topicsTable.id, id), eq(topicsTable.userId, userId))).returning();
    if (topic) await this._recalcSubjectProgress(userId, topic.subjectId);
    return topic;
  },

  async removeTopic(userId: string, id: string): Promise<Topic | undefined> {
    const [topic] = await db.delete(topicsTable).where(and(eq(topicsTable.id, id), eq(topicsTable.userId, userId))).returning();
    return topic;
  },

  async _recalcSubjectProgress(userId: string, subjectId: string): Promise<void> {
    const topics = await this.listTopics(userId, subjectId);
    if (topics.length === 0) return;
    const completed = topics.filter((t) => t.status === "completed").length;
    const progressPercent = Math.round((completed / topics.length) * 100);
    await db.update(subjectsTable).set({ progressPercent }).where(and(eq(subjectsTable.id, subjectId), eq(subjectsTable.userId, userId)));
  },

  async stats(userId: string) {
    const subjects = await this.list(userId);
    const topics = await this.listTopics(userId);
    const completedTopics = topics.filter((t) => t.status === "completed").length;
    return {
      totalSubjects: subjects.length,
      activeSubjects: subjects.filter((s) => s.isActive === "true").length,
      totalTopics: topics.length,
      completedTopics,
      overallCompletionPercent: topics.length ? Math.round((completedTopics / topics.length) * 100) : 0,
    };
  },
};
