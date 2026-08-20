import { sql } from "drizzle-orm";
import {
  sqliteTable,
  text,
  integer,
  index,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const views = sqliteTable("views", {
  slug: text("slug").primaryKey(),
  count: integer("count").notNull().default(0),
});

export const dailyViews = sqliteTable(
  "daily_views",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    day: text("day")
      .notNull()
      .default(sql`(date('now'))`),
    slug: text("slug").notNull(),
    visitorHash: text("visitor_hash").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("daily_views_day_slug_visitor_unique").on(
      table.day,
      table.slug,
      table.visitorHash,
    ),
    index("daily_views_day_slug_idx").on(table.day, table.slug),
  ],
);

export const analyticsEvents = sqliteTable(
  "analytics_events",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    day: text("day")
      .notNull()
      .default(sql`(date('now'))`),
    event: text("event").notNull(),
    slug: text("slug").notNull().default(""),
    source: text("source").notNull().default(""),
    visitorHash: text("visitor_hash").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("analytics_events_daily_unique").on(
      table.day,
      table.event,
      table.slug,
      table.source,
      table.visitorHash,
    ),
    index("analytics_events_day_event_idx").on(table.day, table.event),
  ],
);

export const likes = sqliteTable(
  "likes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    slug: text("slug").notNull(),
    visitorId: text("visitor_id").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("likes_slug_visitor_id_unique").on(
      table.slug,
      table.visitorId,
    ),
  ],
);

export const comments = sqliteTable("comments", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  slug: text("slug").notNull(),
  author: text("author").notNull(),
  content: text("content").notNull(),
  password: text("password").notNull(),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
  parentId: integer("parent_id"),
});

export const commentLikes = sqliteTable(
  "comment_likes",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    commentId: integer("comment_id").notNull(),
    visitorId: text("visitor_id").notNull(),
    createdAt: text("created_at")
      .notNull()
      .default(sql`(datetime('now'))`),
  },
  (table) => [
    uniqueIndex("comment_likes_comment_id_visitor_id_unique").on(
      table.commentId,
      table.visitorId,
    ),
  ],
);

export const pushSubscriptions = sqliteTable("push_subscriptions", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  visitorId: text("visitor_id"),
  createdAt: text("created_at")
    .notNull()
    .default(sql`(datetime('now'))`),
});
