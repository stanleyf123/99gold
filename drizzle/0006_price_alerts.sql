CREATE TABLE `price_alert_subscriptions` (
	`id` integer PRIMARY KEY NOT NULL,
	`market` text NOT NULL,
	`target` real NOT NULL,
	`direction` text NOT NULL,
	`locale` text DEFAULT 'zh' NOT NULL,
	`notify_email` integer DEFAULT 0 NOT NULL,
	`notify_line` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL,
	`last_notified_at` text
);
