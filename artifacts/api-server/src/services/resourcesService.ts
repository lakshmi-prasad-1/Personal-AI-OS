import { and, desc, eq } from "drizzle-orm";
import { db, resourcesTable, type InsertResource, type Resource } from "@workspace/db";
import { knowledgeGraphService } from "./knowledgeGraphService";

export const resourcesService = {
  async list(userId: string): Promise<Resource[]> {
    return db
      .select()
      .from(resourcesTable)
      .where(eq(resourcesTable.userId, userId))
      .orderBy(desc(resourcesTable.updatedAt));
  },

  async get(userId: string, id: string): Promise<Resource | undefined> {
    const [resource] = await db
      .select()
      .from(resourcesTable)
      .where(and(eq(resourcesTable.id, id), eq(resourcesTable.userId, userId)));
    return resource;
  },

  async create(userId: string, data: Omit<InsertResource, "userId">): Promise<Resource> {
    const [resource] = await db
      .insert(resourcesTable)
      .values({ ...data, userId })
      .returning();
    if (!resource) throw new Error("Failed to create resource");
    await knowledgeGraphService.autoLink({
      userId,
      entityType: "resource",
      entityId: resource.id,
      label: resource.title,
      text: `${resource.title} ${resource.description ?? ""}`,
    });
    return resource;
  },

  async update(
    userId: string,
    id: string,
    data: Partial<Omit<InsertResource, "userId">>,
  ): Promise<Resource | undefined> {
    const [resource] = await db
      .update(resourcesTable)
      .set(data)
      .where(and(eq(resourcesTable.id, id), eq(resourcesTable.userId, userId)))
      .returning();
    return resource;
  },

  async remove(userId: string, id: string): Promise<Resource | undefined> {
    const [resource] = await db
      .delete(resourcesTable)
      .where(and(eq(resourcesTable.id, id), eq(resourcesTable.userId, userId)))
      .returning();
    return resource;
  },
};
