-- Fix units table: add parent_id, rename ratio -> conversion_factor
ALTER TABLE `units` ADD COLUMN `parent_id` integer;
ALTER TABLE `units` RENAME COLUMN `ratio` TO `conversion_factor`;
