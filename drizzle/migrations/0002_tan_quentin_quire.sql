CREATE TABLE `comment_likes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`comment_id` integer NOT NULL,
	`visitor_id` text NOT NULL,
	`created_at` text DEFAULT (datetime('now')) NOT NULL
);
