ALTER TABLE `todos` ADD `body` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `todos` SET `body` = substr(`title`, 257), `title` = substr(`title`, 1, 256) WHERE length(`title`) > 256;