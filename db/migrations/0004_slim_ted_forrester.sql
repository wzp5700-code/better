CREATE TABLE `push_delivery_log` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`habit_id` integer NOT NULL,
	`date_key` integer NOT NULL,
	`push_token_id` integer NOT NULL,
	`sent_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`status` text DEFAULT 'sent' NOT NULL,
	`error_message` text,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`push_token_id`) REFERENCES `push_tokens`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_log_habit_day_uniq` ON `push_delivery_log` (`habit_id`,`date_key`);--> statement-breakpoint
CREATE INDEX `push_log_date_idx` ON `push_delivery_log` (`date_key`);