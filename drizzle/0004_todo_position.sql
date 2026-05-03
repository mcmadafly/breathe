ALTER TABLE `todos` ADD `position` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
WITH `ranked` AS (
  SELECT `id`, ROW_NUMBER() OVER (PARTITION BY `user_id`, `list_id` ORDER BY `created_at` ASC) - 1 AS `pos`
  FROM `todos`
)
UPDATE `todos` SET `position` = (SELECT `pos` FROM `ranked` WHERE `ranked`.`id` = `todos`.`id`);
