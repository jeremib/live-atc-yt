import { pgTable, text, serial, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Define the audio stream schema
export const streams = pgTable("streams", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  url: text("url").notNull(),
  fileName: text("file_name"),
  type: text("type").default("liveatc").notNull(),
  status: text("status").default("disconnected"),
  isPlaying: boolean("is_playing").default(false),
  createdAt: text("created_at").default(new Date().toISOString()),
});

export const insertStreamSchema = createInsertSchema(streams).pick({
  name: true,
  url: true,
  fileName: true,
  type: true,
});

// Schema for validating stream URLs
export const streamUrlSchema = z.object({
  url: z.string().url()
    .or(z.string().regex(/^https?:\/\/.+\.pls$/i))
    .or(z.string().regex(/^https?:\/\/(www\.)?(youtube\.com|youtu\.be)\/.+/i))
    .or(z.string().regex(/^https?:\/\/broadcastify\.cdnstream1\.com\/.+/i))
    .or(z.string().regex(/^https?:\/\/ice\d*\.somafm\.com\/.+/i)),
  type: z.enum(["liveatc", "youtube", "scanner", "noaa", "railroad", "somafm"]).default("liveatc"),
});

export type Stream = typeof streams.$inferSelect;
export type InsertStream = z.infer<typeof insertStreamSchema>;

// Maintain the original user schema for compatibility
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
});

export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  password: true,
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;
