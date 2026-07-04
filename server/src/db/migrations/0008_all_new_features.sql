ALTER TABLE `inv_products` ADD `purchase_unit` text;--> statement-breakpoint
ALTER TABLE `inv_products` ADD `stock_unit` text;--> statement-breakpoint
ALTER TABLE `inv_products` ADD `consume_unit` text;--> statement-breakpoint
ALTER TABLE `inv_products` ADD `price_unit` text;--> statement-breakpoint
ALTER TABLE `inv_products` ADD `purchase_to_stock_factor` real DEFAULT 1;--> statement-breakpoint
ALTER TABLE `inv_products` ADD `stock_to_consume_factor` real DEFAULT 1;--> statement-breakpoint
ALTER TABLE `inv_stock_transactions` ADD `recipe_id` integer;--> statement-breakpoint
ALTER TABLE `hh_lists` ADD `group_by` text DEFAULT 'none';
