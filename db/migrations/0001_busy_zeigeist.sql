CREATE TABLE `journal_categories` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`color` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`archived` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "journal_category_name_len_check" CHECK(length("journal_categories"."name") BETWEEN 1 AND 40)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `journal_category_name_uniq` ON `journal_categories` (`name`);--> statement-breakpoint
CREATE INDEX `journal_category_archived_idx` ON `journal_categories` (`archived`,`sort_order`);--> statement-breakpoint
ALTER TABLE `journal_entries` ADD `category_id` integer;--> statement-breakpoint
CREATE INDEX `journal_category_idx` ON `journal_entries` (`category_id`);