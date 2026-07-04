ALTER TABLE `users` ADD `is_admin` integer DEFAULT 0;--> statement-breakpoint
CREATE UNIQUE INDEX `md_locations_family_name_unique` ON `md_locations` (`family_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `md_categories_family_name_unique` ON `md_categories` (`family_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `md_tags_family_name_unique` ON `md_tags` (`family_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `md_item_tags_item_tag_unique` ON `md_item_tags` (`item_id`,`tag_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `md_units_family_name_unique` ON `md_units` (`family_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `md_brands_family_name_unique` ON `md_brands` (`family_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `md_shops_family_name_unique` ON `md_shops` (`family_id`,`name`);--> statement-breakpoint
CREATE UNIQUE INDEX `family_members_user_family_unique` ON `family_members` (`user_id`,`family_id`);
