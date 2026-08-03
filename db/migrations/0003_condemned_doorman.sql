CREATE TABLE `devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`platform` text DEFAULT 'unknown' NOT NULL,
	`public_key` text,
	`token_hash` text NOT NULL,
	`master` integer DEFAULT false NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer,
	`revoked_at` integer,
	CONSTRAINT "devices_name_len_check" CHECK(length("devices"."name") BETWEEN 1 AND 60)
);
--> statement-breakpoint
CREATE UNIQUE INDEX `devices_token_hash_uniq` ON `devices` (`token_hash`);--> statement-breakpoint
CREATE INDEX `devices_master_idx` ON `devices` (`master`);--> statement-breakpoint
CREATE INDEX `devices_revoked_idx` ON `devices` (`revoked_at`);--> statement-breakpoint
CREATE TABLE `pairing_codes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`code_hash` text NOT NULL,
	`created_by_device_id` integer NOT NULL,
	`expires_at` integer NOT NULL,
	`used_by_device_id` integer,
	`used_at` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	FOREIGN KEY (`created_by_device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`used_by_device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE set null
);
--> statement-breakpoint
CREATE UNIQUE INDEX `pairing_codes_code_hash_uniq` ON `pairing_codes` (`code_hash`);--> statement-breakpoint
CREATE INDEX `pairing_codes_expires_idx` ON `pairing_codes` (`expires_at`);--> statement-breakpoint
CREATE INDEX `pairing_codes_created_by_idx` ON `pairing_codes` (`created_by_device_id`);--> statement-breakpoint
CREATE TABLE `push_tokens` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`device_id` integer NOT NULL,
	`provider` text NOT NULL,
	`token` text NOT NULL,
	`platform` text NOT NULL,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`last_seen_at` integer,
	`revoked_at` integer,
	FOREIGN KEY (`device_id`) REFERENCES `devices`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `push_tokens_token_uniq` ON `push_tokens` (`token`);--> statement-breakpoint
CREATE INDEX `push_tokens_device_idx` ON `push_tokens` (`device_id`);