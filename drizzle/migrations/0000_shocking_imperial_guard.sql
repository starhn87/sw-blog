CREATE TABLE `chat_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`session_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `comments` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`author` text NOT NULL,
	`content` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL,
	`parent_id` integer
);
--> statement-breakpoint
CREATE TABLE `likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`slug` text NOT NULL,
	`visitor_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
--> statement-breakpoint
CREATE TABLE `views` (
	`slug` text PRIMARY KEY NOT NULL,
	`count` integer DEFAULT 0 NOT NULL
);
