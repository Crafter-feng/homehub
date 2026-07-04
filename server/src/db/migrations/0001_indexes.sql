CREATE INDEX IF NOT EXISTS idx_inv_items_family_id ON inv_items(family_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_inv_items_location ON inv_items(location_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_inv_items_expiry ON inv_items(expiry_date);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_inv_items_type ON inv_items(family_id, type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_inv_stock_tx_item ON inv_stock_transactions(item_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_hh_list_items_list_status ON hh_list_items(list_id, status);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_hh_list_items_assignee ON hh_list_items(assignee_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_hh_list_items_linked ON hh_list_items(linked_item_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_hh_lists_family_type ON hh_lists(family_id, type);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_md_locations_family ON md_locations(family_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_md_categories_family ON md_categories(family_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_md_brands_family ON md_brands(family_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_md_units_family ON md_units(family_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_md_shops_family ON md_shops(family_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_md_tags_family ON md_tags(family_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_inv_products_family ON inv_products(family_id);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS idx_inv_products_barcode ON inv_products(barcode);