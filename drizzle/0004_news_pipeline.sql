CREATE TABLE `news_candidates` (
	`id` text PRIMARY KEY NOT NULL,
	`source_id` text NOT NULL,
	`external_id` text NOT NULL,
	`canonical_url` text NOT NULL,
	`title` text NOT NULL,
	`title_hash` text NOT NULL,
	`summary` text,
	`source_name` text NOT NULL,
	`source_language` text DEFAULT 'en' NOT NULL,
	`category` text DEFAULT 'macro' NOT NULL,
	`source_published_at` text NOT NULL,
	`first_seen_at` text NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`scheduled_for` text,
	`reviewed_at` text,
	`reviewed_by` text,
	`published_at` text
);
--> statement-breakpoint
CREATE UNIQUE INDEX `news_candidates_canonical_url_unique` ON `news_candidates` (`canonical_url`);--> statement-breakpoint
CREATE TABLE `news_runs` (
	`id` text PRIMARY KEY NOT NULL,
	`trigger` text NOT NULL,
	`scheduled_for` text NOT NULL,
	`started_at` text NOT NULL,
	`finished_at` text,
	`status` text NOT NULL,
	`sources_checked` integer DEFAULT 0 NOT NULL,
	`items_seen` integer DEFAULT 0 NOT NULL,
	`candidates_added` integer DEFAULT 0 NOT NULL,
	`duplicates_skipped` integer DEFAULT 0 NOT NULL,
	`published_count` integer DEFAULT 0 NOT NULL,
	`error_count` integer DEFAULT 0 NOT NULL,
	`details` text
);
--> statement-breakpoint
CREATE TABLE `news_source_state` (
	`source_id` text PRIMARY KEY NOT NULL,
	`etag` text,
	`last_modified` text,
	`last_attempt_at` text NOT NULL,
	`last_success_at` text,
	`last_error` text,
	`consecutive_errors` integer DEFAULT 0 NOT NULL
);
