import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";

export const usersService = {
  async getById(userId: string): Promise<User | undefined> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, userId));
    return user;
  },
};
