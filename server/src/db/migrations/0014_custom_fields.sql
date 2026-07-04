CREATE TABLE `sys_custom_fields` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`entity_type` text NOT NULL,
	`field_name` text NOT NULL,
	`field_label` text NOT NULL,
	`field_type` text NOT NULL,
	`field_config` text,
	`is_required` integer DEFAULT 0,
	`sort_order` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sys_custom_fields_family_entity_unique` ON `sys_custom_fields` (`family_id`,`entity_type`,`field_name`);
--> statement-breakpoint
CREATE TABLE `sys_custom_values` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`entity_type` text NOT NULL,
	`entity_id` integer NOT NULL,
	`field_id` integer NOT NULL,
	`value` text,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	FOREIGN KEY (`field_id`) REFERENCES `sys_custom_fields`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sys_custom_values_entity_field_unique` ON `sys_custom_values` (`entity_type`,`entity_id`,`field_id`);
