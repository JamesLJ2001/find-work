CREATE TABLE `attempts` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`external_id` text NOT NULL,
	`problem_id` integer NOT NULL,
	`attempted_on` text NOT NULL,
	`recorded_title` text NOT NULL,
	`recorded_topic` text NOT NULL,
	`recorded_difficulty` text NOT NULL,
	`status` text NOT NULL,
	`independent_write` integer DEFAULT false NOT NULL,
	`error_reason` text DEFAULT '' NOT NULL,
	`is_review` integer DEFAULT false NOT NULL,
	`review_date` text,
	`notes` text DEFAULT '' NOT NULL,
	`source_row` integer,
	`is_void` integer DEFAULT false NOT NULL,
	`supersedes_attempt_id` integer,
	`correction_reason` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`problem_id`) REFERENCES `problems`(`id`) ON UPDATE no action ON DELETE restrict
);
--> statement-breakpoint
CREATE UNIQUE INDEX `attempts_external_id_uidx` ON `attempts` (`external_id`);--> statement-breakpoint
CREATE INDEX `attempts_problem_date_idx` ON `attempts` (`problem_id`,`attempted_on`);--> statement-breakpoint
CREATE INDEX `attempts_date_idx` ON `attempts` (`attempted_on`);--> statement-breakpoint
CREATE INDEX `attempts_status_idx` ON `attempts` (`status`);--> statement-breakpoint
CREATE TABLE `problems` (
	`id` integer PRIMARY KEY NOT NULL,
	`title` text NOT NULL,
	`title_slug` text NOT NULL,
	`url` text NOT NULL,
	`topic` text NOT NULL,
	`difficulty` text NOT NULL,
	`plan_date` text NOT NULL,
	`phase` text NOT NULL,
	`sort_order` integer NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `problems_sort_order_uidx` ON `problems` (`sort_order`);--> statement-breakpoint
CREATE INDEX `problems_plan_date_idx` ON `problems` (`plan_date`);--> statement-breakpoint
CREATE INDEX `problems_topic_idx` ON `problems` (`topic`);