CREATE TABLE `daily_views` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text DEFAULT (date('now')) NOT NULL,
	`slug` text NOT NULL,
	`visitor_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `daily_views_day_slug_visitor_unique`
ON `daily_views` (`day`, `slug`, `visitor_hash`);
--> statement-breakpoint
CREATE INDEX `daily_views_day_slug_idx`
ON `daily_views` (`day`, `slug`);
--> statement-breakpoint
CREATE TABLE `analytics_events` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`day` text DEFAULT (date('now')) NOT NULL,
	`event` text NOT NULL,
	`slug` text DEFAULT '' NOT NULL,
	`source` text DEFAULT '' NOT NULL,
	`visitor_hash` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `analytics_events_daily_unique`
ON `analytics_events` (`day`, `event`, `slug`, `source`, `visitor_hash`);
--> statement-breakpoint
CREATE INDEX `analytics_events_day_event_idx`
ON `analytics_events` (`day`, `event`);
