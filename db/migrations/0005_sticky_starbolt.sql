CREATE TABLE `books` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`start_date` integer,
	`progress` integer,
	`finish_date` integer,
	`created_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	`updated_at` integer DEFAULT (unixepoch() * 1000) NOT NULL,
	CONSTRAINT "books_name_len_check" CHECK(length("books"."name") BETWEEN 1 AND 200),
	CONSTRAINT "books_progress_range_check" CHECK("books"."progress" IS NULL OR ("books"."progress" BETWEEN 0 AND 100)),
	CONSTRAINT "books_start_date_range_check" CHECK("books"."start_date" IS NULL OR ("books"."start_date" BETWEEN 19000101 AND 29991231)),
	CONSTRAINT "books_finish_date_range_check" CHECK("books"."finish_date" IS NULL OR ("books"."finish_date" BETWEEN 19000101 AND 29991231))
);
