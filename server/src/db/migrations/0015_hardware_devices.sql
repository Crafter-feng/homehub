CREATE TABLE `sys_hardware_devices` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`name` text NOT NULL,
	`device_type` text NOT NULL,
	`connection_type` text DEFAULT 'virtual',
	`connection_config` text,
	`config` text,
	`is_online` integer DEFAULT 0,
	`last_online_at` integer,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `sys_print_jobs` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`family_id` integer NOT NULL,
	`content` text NOT NULL,
	`output_type` text NOT NULL,
	`copies` integer DEFAULT 1,
	`options` text,
	`status` text DEFAULT 'queued',
	`created_at` integer NOT NULL,
	FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON UPDATE no action ON DELETE no action
);
