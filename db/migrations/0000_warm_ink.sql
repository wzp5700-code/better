CREATE TABLE `habit_completions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`habit_id` integer NOT NULL,
	`completed_on` integer NOT NULL,
	`value` real DEFAULT 1 NOT NULL,
	`note` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "completion_day_range_check" CHECK("habit_completions"."completed_on" BETWEEN 19000101 AND 29991231)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `habit_day_uniq` ON `habit_completions` (`habit_id`,`completed_on`);--> statement-breakpoint
CREATE INDEX `completion_habit_date_idx` ON `habit_completions` (`habit_id`,`completed_on`);--> statement-breakpoint
CREATE INDEX `completion_date_idx` ON `habit_completions` (`completed_on`);--> statement-breakpoint
CREATE TABLE `habit_streaks` (
	`habit_id` integer PRIMARY KEY NOT NULL,
	`current_streak` integer DEFAULT 0 NOT NULL,
	`longest_streak` integer DEFAULT 0 NOT NULL,
	`last_check_on` integer,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`habit_id`) REFERENCES `habits`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `habits` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`icon` text,
	`color` text,
	`frequency_type` text NOT NULL,
	`weekly_days_mask` integer DEFAULT 0 NOT NULL,
	`interval_days` integer,
	`times_per_period` integer,
	`period_days` integer,
	`target_value` real,
	`target_unit` text,
	`reminder_time` text,
	`reminder_days_mask` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`paused_until` integer,
	`start_date` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "habits_frequency_type_check" CHECK("habits"."frequency_type" IN ('daily','weekly','interval')),
	CONSTRAINT "habits_status_check" CHECK("habits"."status" IN ('active','paused','archived')),
	CONSTRAINT "habits_weekly_mask_check" CHECK(("habits"."frequency_type" != 'weekly') OR ("habits"."weekly_days_mask" > 0)),
	CONSTRAINT "habits_interval_check" CHECK(("habits"."frequency_type" != 'interval') OR ("habits"."interval_days" IS NOT NULL AND "habits"."interval_days" > 0)),
	CONSTRAINT "habits_target_value_check" CHECK("habits"."target_value" IS NULL OR "habits"."target_value" > 0)
);
--> statement-breakpoint
CREATE INDEX `habits_status_idx` ON `habits` (`status`,`created_at`);--> statement-breakpoint
CREATE TABLE `journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_date` integer NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`content_html` text,
	`mood_score` integer,
	`mood_label` text,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "journal_mood_score_check" CHECK("journal_entries"."mood_score" IS NULL OR ("journal_entries"."mood_score" BETWEEN 1 AND 5)),
	CONSTRAINT "journal_mood_pair_check" CHECK(("journal_entries"."mood_score" IS NULL AND "journal_entries"."mood_label" IS NULL) OR ("journal_entries"."mood_score" IS NOT NULL AND "journal_entries"."mood_label" IS NOT NULL)),
	CONSTRAINT "journal_entry_date_range_check" CHECK("journal_entries"."entry_date" BETWEEN 19000101 AND 29991231)
);
--> statement-breakpoint
CREATE INDEX `journal_entry_date_idx` ON `journal_entries` (`entry_date`,`created_at`);--> statement-breakpoint
CREATE INDEX `journal_updated_idx` ON `journal_entries` (`updated_at`);--> statement-breakpoint
CREATE TABLE `journal_links` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`from_entry_id` integer NOT NULL,
	`to_entry_id` integer,
	`to_target` text NOT NULL,
	`position` integer NOT NULL,
	FOREIGN KEY (`from_entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "journal_link_position_check" CHECK("journal_links"."position" >= 0),
	CONSTRAINT "journal_link_target_check" CHECK(length("journal_links"."to_target") > 0)
);
--> statement-breakpoint
CREATE INDEX `journal_link_from_idx` ON `journal_links` (`from_entry_id`,`position`);--> statement-breakpoint
CREATE INDEX `journal_link_to_idx` ON `journal_links` (`to_entry_id`);--> statement-breakpoint
CREATE INDEX `journal_link_target_idx` ON `journal_links` (`to_target`);--> statement-breakpoint
CREATE UNIQUE INDEX `journal_link_uniq` ON `journal_links` (`from_entry_id`,`to_target`,`position`);--> statement-breakpoint
CREATE TABLE `journal_tags` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_id` integer NOT NULL,
	`tag` text NOT NULL,
	FOREIGN KEY (`entry_id`) REFERENCES `journal_entries`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `entry_tag_uniq` ON `journal_tags` (`entry_id`,`tag`);--> statement-breakpoint
CREATE INDEX `journal_tag_idx` ON `journal_tags` (`tag`);