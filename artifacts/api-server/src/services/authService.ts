import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { db, usersTable, type User } from "@workspace/db";
import { signToken } from "../lib/auth";

export interface AuthResult {
  token: string;
  user: User;
}

/**
 * All user credential logic (hashing, lookup, token issuance) lives here so
 * route handlers stay pure request/response glue.
 */
export const authService = {
  async register(email: string, password: string): Promise<AuthResult | { error: string }> {
    const [existing] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (existing) return { error: "Email already registered" };

    const passwordHash = await bcrypt.hash(password, 10);
    const [user] = await db.insert(usersTable).values({ email, passwordHash }).returning();
    if (!user) return { error: "Failed to create user" };

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    return { token, user };
  },

  async login(email: string, password: string): Promise<AuthResult | { error: string }> {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));
    if (!user) return { error: "Invalid credentials" };

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) return { error: "Invalid credentials" };

    const token = signToken({ userId: user.id, email: user.email, role: user.role });
    return { token, user };
  },
};
