CREATE TABLE `meal_plans` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`week_start` integer NOT NULL,
	`week_end` integer NOT NULL,
	`created_by` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`),
	FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
--> statement-breakpoint
CREATE TABLE `meal_plan_items` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`plan_id` integer NOT NULL,
	`day_of_week` integer NOT NULL,
	`meal_type` text NOT NULL,
	`recipe_id` integer NOT NULL,
	`note` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`plan_id`) REFERENCES `meal_plans`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`)
);
--> statement-breakpoint
CREATE INDEX `meal_plans_family_id_idx` ON `meal_plans` (`family_id`);
--> statement-breakpoint
CREATE INDEX `meal_plan_items_plan_id_idx` ON `meal_plan_items` (`plan_id`);