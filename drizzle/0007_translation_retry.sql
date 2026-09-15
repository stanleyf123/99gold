ALTER TABLE `news_candidates` ADD `translation_retry_at` text;--> statement-breakpoint
ALTER TABLE `news_candidates` ADD `translation_attempts` integer DEFAULT 0 NOT NULL;
