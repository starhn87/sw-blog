DELETE FROM `likes`
WHERE `id` NOT IN (
	SELECT MIN(`id`) FROM `likes` GROUP BY `slug`, `visitor_id`
);
--> statement-breakpoint
DELETE FROM `comment_likes`
WHERE `id` NOT IN (
	SELECT MIN(`id`) FROM `comment_likes` GROUP BY `comment_id`, `visitor_id`
);
--> statement-breakpoint
CREATE UNIQUE INDEX `likes_slug_visitor_id_unique`
ON `likes` (`slug`, `visitor_id`);
--> statement-breakpoint
CREATE UNIQUE INDEX `comment_likes_comment_id_visitor_id_unique`
ON `comment_likes` (`comment_id`, `visitor_id`);
