import { type User, type InsertUser, type LoginData, type InsertLoginAttempt, type LoginAttempt, users, loginAttempts } from "@shared/schema";
import { db } from "./db";
import { eq } from "drizzle-orm";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  validateLogin(loginData: LoginData): Promise<{ success: boolean; user?: User; message: string }>;
  logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt>;
  updateUserRememberPreference(username: string, remember: boolean): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async validateLogin(loginData: LoginData): Promise<{ success: boolean; user?: User; message: string }> {
    let user = await this.getUserByUsername(loginData.username);

    if (!user) {
      // Create new user on the fly if not exists (matching original logic)
      user = await this.createUser({
        username: loginData.username,
        password: loginData.password || "",
        rememberUsername: loginData.rememberUsername,
      });
    } else {
      // Update existing user preferences
      await db
        .update(users)
        .set({
          rememberUsername: loginData.rememberUsername,
          lastLogin: new Date(),
        })
        .where(eq(users.id, user.id));

      // Fetch updated user
      const [updatedUser] = await db.select().from(users).where(eq(users.id, user.id));
      user = updatedUser;
    }

    return {
      success: true,
      user,
      message: "Login successful",
    };
  }

  async logLoginAttempt(attempt: InsertLoginAttempt): Promise<LoginAttempt> {
    const [loginAttempt] = await db
      .insert(loginAttempts)
      .values(attempt)
      .returning();
    return loginAttempt;
  }

  async updateUserRememberPreference(username: string, remember: boolean): Promise<void> {
    await db
      .update(users)
      .set({ rememberUsername: remember })
      .where(eq(users.username, username));
  }
}

export const storage = new DatabaseStorage();
