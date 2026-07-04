import { and, asc, eq } from "drizzle-orm";
import { db, plannerEventsTable, type InsertPlannerEvent, type PlannerEvent } from "@workspace/db";

export const plannerService = {
  async getDay(userId: string, date: string): Promise<PlannerEvent[]> {
    return db
      .select()
      .from(plannerEventsTable)
      .where(and(eq(plannerEventsTable.userId, userId), eq(plannerEventsTable.date, date)))
      .orderBy(asc(plannerEventsTable.startTime));
  },

  async getWeek(userId: string, weekStart: string): Promise<PlannerEvent[]> {
    // weekStart is YYYY-MM-DD (Monday); return 7 days
    const start = new Date(weekStart);
    const days: string[] = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d.toISOString().slice(0, 10));
    }
    const allEvents: PlannerEvent[] = [];
    for (const day of days) {
      const events = await this.getDay(userId, day);
      allEvents.push(...events);
    }
    return allEvents;
  },

  async get(userId: string, id: string): Promise<PlannerEvent | undefined> {
    const [event] = await db
      .select()
      .from(plannerEventsTable)
      .where(and(eq(plannerEventsTable.id, id), eq(plannerEventsTable.userId, userId)));
    return event;
  },

  async create(userId: string, data: Omit<InsertPlannerEvent, "userId">): Promise<PlannerEvent> {
    const [event] = await db
      .insert(plannerEventsTable)
      .values({ ...data, userId })
      .returning();
    if (!event) throw new Error("Failed to create planner event");
    return event;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertPlannerEvent, "userId">>): Promise<PlannerEvent | undefined> {
    const [event] = await db
      .update(plannerEventsTable)
      .set(data)
      .where(and(eq(plannerEventsTable.id, id), eq(plannerEventsTable.userId, userId)))
      .returning();
    return event;
  },

  async complete(userId: string, id: string): Promise<PlannerEvent | undefined> {
    const [event] = await db
      .update(plannerEventsTable)
      .set({ isCompleted: true })
      .where(and(eq(plannerEventsTable.id, id), eq(plannerEventsTable.userId, userId)))
      .returning();
    return event;
  },

  async remove(userId: string, id: string): Promise<PlannerEvent | undefined> {
    const [event] = await db
      .delete(plannerEventsTable)
      .where(and(eq(plannerEventsTable.id, id), eq(plannerEventsTable.userId, userId)))
      .returning();
    return event;
  },
};
