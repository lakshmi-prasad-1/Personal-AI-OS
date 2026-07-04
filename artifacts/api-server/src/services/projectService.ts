import { and, desc, eq } from "drizzle-orm";
import { db, projectsTable, type InsertProject, type Project } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const projectService = {
  async list(userId: string): Promise<Project[]> {
    return db.select().from(projectsTable).where(eq(projectsTable.userId, userId)).orderBy(desc(projectsTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<Project | undefined> {
    const [project] = await db.select().from(projectsTable).where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId)));
    return project;
  },

  async create(userId: string, data: Omit<InsertProject, "userId">): Promise<Project> {
    const [project] = await db.insert(projectsTable).values({ ...data, userId }).returning();
    if (!project) throw new Error("Failed to create project");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "project",
      entityId: project.id,
      label: project.title,
      text: `${project.title} ${project.description} ${project.techStack.join(" ")}`,
      tags: project.techStack,
    });
    return project;
  },

  async update(userId: string, id: string, data: Partial<Omit<InsertProject, "userId">>): Promise<Project | undefined> {
    const [project] = await db.update(projectsTable).set(data).where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId))).returning();
    return project;
  },

  async remove(userId: string, id: string): Promise<Project | undefined> {
    const [project] = await db.delete(projectsTable).where(and(eq(projectsTable.id, id), eq(projectsTable.userId, userId))).returning();
    return project;
  },
};
