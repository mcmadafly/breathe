ALTER TABLE `todos` ADD `category` text DEFAULT 'work' NOT NULL;--> statement-breakpoint
ALTER TABLE `users` ADD `is_pro` integer DEFAULT false NOT NULL;