ALTER TABLE `inv_items` ADD `last_used_at` integer;--> statement-breakpoint
ALTER TABLE `inv_items` ADD `spoil_rate` real;--> statement-breakpoint
ALTER TABLE `inv_items` ADD `avg_shelf_life` real;--> statement-breakpoint
ALTER TABLE `inv_products` ADD `default_best_before_days` integer;--> statement-breakpoint
ALTER TABLE `inv_products` ADD `default_best_before_days_after_open` integer;--> statement-breakpoint
ALTER TABLE `inv_stock_transactions` ADD `spoiled` real DEFAULT 0;
