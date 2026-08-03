PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_journal_entries` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entry_date` integer NOT NULL,
	`content` text DEFAULT '' NOT NULL,
	`content_html` text,
	`mood_score` integer,
	`mood_label` text,
	`category_id` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `journal_categories`(`id`) ON UPDATE no action ON DELETE set null,
	CONSTRAINT "journal_mood_score_check" CHECK("__new_journal_entries"."mood_score" IS NULL OR ("__new_journal_entries"."mood_score" BETWEEN 1 AND 5)),
	CONSTRAINT "journal_mood_pair_check" CHECK(("__new_journal_entries"."mood_score" IS NULL AND "__new_journal_entries"."mood_label" IS NULL) OR ("__new_journal_entries"."mood_score" IS NOT NULL AND "__new_journal_entries"."mood_label" IS NOT NULL)),
	CONSTRAINT "journal_entry_date_range_check" CHECK("__new_journal_entries"."entry_date" BETWEEN 19000101 AND 29991231)
);
--> statement-breakpoint
INSERT INTO `__new_journal_entries`("id", "entry_date", "content", "content_html", "mood_score", "mood_label", "category_id", "created_at", "updated_at") SELECT "id", "entry_date", "content", "content_html", "mood_score", "mood_label", "category_id", "created_at", "updated_at" FROM `journal_entries`;--> statement-breakpoint
DROP TABLE `journal_entries`;--> statement-breakpoint
ALTER TABLE `__new_journal_entries` RENAME TO `journal_entries`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `journal_entry_date_idx` ON `journal_entries` (`entry_date`,`created_at`);--> statement-breakpoint
CREATE INDEX `journal_updated_idx` ON `journal_entries` (`updated_at`);--> statement-breakpoint
CREATE INDEX `journal_category_idx` ON `journal_entries` (`category_id`);