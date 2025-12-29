import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";

if (!process.env.DATABASE_URL) {
  // Ensure DATABASE_URL is set for compatibility, though we use a local file
  process.env.DATABASE_URL = "sqlite.db";
}

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite, { schema });
