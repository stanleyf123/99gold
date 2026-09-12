CREATE TABLE `news_articles` (
	`id` text PRIMARY KEY NOT NULL,
	`locale` text NOT NULL,
	`title` text NOT NULL,
	`body` text NOT NULL,
	`source_url` text NOT NULL,
	`published_at` text NOT NULL,
	`fetched_at` text NOT NULL
);
