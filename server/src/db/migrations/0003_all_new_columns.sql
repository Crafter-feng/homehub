ALTER TABLE `inv_products` ADD `move_on_open_location_id` integer;--> statement-breakpoint
ALTER TABLE `inv_products` ADD `parent_id` integer;--> statement-breakpoint
ALTER TABLE `inv_products` ADD `calories_per_unit` real;--> statement-breakpoint
ALTER TABLE `inv_items` ADD `tare_weight` real;--> statement-breakpoint
ALTER TABLE `inv_items` ADD `calories_per_unit` real;--> statement-breakpoint
ALTER TABLE `md_locations` ADD `type` text DEFAULT 'normal';--> statement-breakpoint
ALTER TABLE `users` ADD `role` text DEFAULT 'editor';--> statement-breakpoint
CREATE TABLE `inv_product_barcodes` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`product_id` integer NOT NULL,
	`barcode` text NOT NULL,
	`is_primary` integer DEFAULT 0,
	`notes` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`product_id`) REFERENCES `inv_products`(`id`) ON UPDATE no action ON DELETE cascade
);
