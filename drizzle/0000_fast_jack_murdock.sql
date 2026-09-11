CREATE TABLE `daily_news` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`news_day` text NOT NULL,
	`position` integer NOT NULL,
	`title` text NOT NULL,
	`url` text NOT NULL,
	`article_date` text NOT NULL,
	`image` text,
	`fetched_at` text NOT NULL
);
