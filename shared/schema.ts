import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// Bot status types
export type BotStatus = 'idle' | 'member' | 'non-member' | 'checking' | 'connected' | 'joining' | 'processing' | 'completed' | 'failed';

export interface Bot {
  id: string;
  name: string;
  token?: string;
  status: BotStatus;
  msgPerm?: boolean;
  micPerm?: boolean;
}

export interface TaskProgress {
  completed: number;
  processing: number;
  failed: number;
  total: number;
}

export interface TaskState {
  status: 'idle' | 'running' | 'stopped';
  progress: TaskProgress;
  bots: Bot[];
}
