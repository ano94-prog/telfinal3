import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from "@shared/schema";
import path from 'path';

// Use DATABASE_URL from environment or default to sqlite.db in project root
const dbPath = process.env.DATABASE_URL || 'sqlite.db';

// Ensure we use absolute path for production reliability
const absoluteDbPath = path.isAbsolute(dbPath) ? dbPath : path.join(process.cwd(), dbPath);

// Create database connection with WAL mode for better concurrent performance
const sqlite = new Database(absoluteDbPath);
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite, { schema });
