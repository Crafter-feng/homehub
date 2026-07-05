-- ═══════════════════════════════════════════════════════
-- HomeHub 完整 Schema（库存管理重设计版）
-- ═══════════════════════════════════════════════════════

-- ── 认证 ──
CREATE TABLE IF NOT EXISTS `users` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `email` text NOT NULL,
  `name` text NOT NULL,
  `password_hash` text NOT NULL,
  `avatar` text,
  `role` text DEFAULT 'editor',
  `is_admin` integer DEFAULT 0,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `users_email_unique` ON `users` (`email`);

CREATE TABLE IF NOT EXISTS `families` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `invite_code` text NOT NULL,
  `created_at` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `families_invite_code_unique` ON `families` (`invite_code`);

CREATE TABLE IF NOT EXISTS `family_members` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL,
  `family_id` integer NOT NULL,
  `role` text DEFAULT 'editor' NOT NULL,
  `joined_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`) ON DELETE cascade,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`) ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `family_members_user_family_unique` ON `family_members` (`user_id`,`family_id`);

CREATE TABLE IF NOT EXISTS `refresh_tokens` (
  `id` text PRIMARY KEY NOT NULL,
  `user_id` integer NOT NULL,
  `expires_at` integer NOT NULL,
  `is_revoked` integer DEFAULT false NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

CREATE TABLE IF NOT EXISTS `api_tokens` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `user_id` integer NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `token_hash` text NOT NULL,
  `token_prefix` text NOT NULL,
  `permissions` text NOT NULL,
  `expires_at` integer,
  `last_used_at` integer,
  `is_revoked` integer DEFAULT false NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `api_tokens_token_hash_unique` ON `api_tokens` (`token_hash`);

-- ── 主数据 ──
CREATE TABLE IF NOT EXISTS `md_locations` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `parent_id` integer,
  `level` integer DEFAULT 1 NOT NULL,
  `type` text DEFAULT 'normal',
  `image` text,
  `notes` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `md_locations_family_name_unique` ON `md_locations` (`family_id`,`name`);
CREATE INDEX IF NOT EXISTS `idx_md_locations_family` ON `md_locations`(`family_id`);

CREATE TABLE IF NOT EXISTS `md_categories` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `icon` text,
  `notes` text,
  `parent_id` integer,
  `sort_order` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `md_categories_family_name_unique` ON `md_categories` (`family_id`,`name`);
CREATE INDEX IF NOT EXISTS `idx_md_categories_family` ON `md_categories`(`family_id`);

CREATE TABLE IF NOT EXISTS `md_units` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `parent_id` integer,
  `conversion_factor` real DEFAULT 1 NOT NULL,
  `notes` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `md_units_family_name_unique` ON `md_units` (`family_id`,`name`);
CREATE INDEX IF NOT EXISTS `idx_md_units_family` ON `md_units`(`family_id`);

CREATE TABLE IF NOT EXISTS `md_brands` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `notes` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `md_brands_family_name_unique` ON `md_brands` (`family_id`,`name`);
CREATE INDEX IF NOT EXISTS `idx_md_brands_family` ON `md_brands`(`family_id`);

CREATE TABLE IF NOT EXISTS `md_shops` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `icon` text,
  `address` text,
  `area` text,
  `notes` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `md_shops_family_name_unique` ON `md_shops` (`family_id`,`name`);
CREATE INDEX IF NOT EXISTS `idx_md_shops_family` ON `md_shops`(`family_id`);

CREATE TABLE IF NOT EXISTS `md_tags` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `icon` text,
  `color` text DEFAULT '#409EFF',
  `notes` text,
  `sort_order` integer DEFAULT 0 NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `md_tags_family_name_unique` ON `md_tags` (`family_id`,`name`);
CREATE INDEX IF NOT EXISTS `idx_md_tags_family` ON `md_tags`(`family_id`);

CREATE TABLE IF NOT EXISTS `md_item_tags` (
  `item_id` integer NOT NULL,
  `tag_id` integer NOT NULL,
  FOREIGN KEY (`tag_id`) REFERENCES `md_tags`(`id`) ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `md_item_tags_item_tag_unique` ON `md_item_tags` (`item_id`,`tag_id`);

-- ── 库存：产品 ──
CREATE TABLE IF NOT EXISTS `inv_products` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `barcode` text,
  `category_id` integer REFERENCES `md_categories`(`id`),
  `unit` text DEFAULT '个' NOT NULL,
  `brand` text,
  `image` text,
  `location_id` integer REFERENCES `md_locations`(`id`),
  `min_stock` real DEFAULT 0,
  `shop` text,
  `default_price` real,
  `default_best_before_days` integer,
  `default_best_before_days_after_open` integer,
  `move_on_open_location_id` integer,
  `parent_id` integer,
  `calories_per_unit` real,
  `tare_weight` real,
  `purchase_unit` text,
  `stock_unit` text,
  `consume_unit` text,
  `price_unit` text,
  `purchase_to_stock_factor` real DEFAULT 1,
  `stock_to_consume_factor` real DEFAULT 1,
  `spec` text,
  `notes` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`),
  FOREIGN KEY (`category_id`) REFERENCES `md_categories`(`id`)
);
CREATE INDEX IF NOT EXISTS `idx_inv_products_family` ON `inv_products`(`family_id`);
CREATE INDEX IF NOT EXISTS `idx_inv_products_barcode` ON `inv_products`(`barcode`);

-- ── 库存：批次 ──
CREATE TABLE IF NOT EXISTS `inv_batches` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `product_id` integer NOT NULL REFERENCES `inv_products`(`id`) ON DELETE CASCADE,
  `batch_number` text,
  `quantity` real NOT NULL,
  `unit` text NOT NULL,
  `purchase_date` integer,
  `expiry_date` integer,
  `location_id` integer REFERENCES `md_locations`(`id`),
  `shop` text,
  `price` real,
  `open` integer DEFAULT 0,
  `opened_date` integer,
  `created_at` integer NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_inv_batches_product` ON `inv_batches`(`product_id`);

-- ── 库存：流水 ──
CREATE TABLE IF NOT EXISTS `inv_stock_log` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `product_id` integer NOT NULL REFERENCES `inv_products`(`id`),
  `batch_id` integer REFERENCES `inv_batches`(`id`),
  `recipe_id` integer,
  `type` text NOT NULL,
  `quantity` real NOT NULL,
  `unit` text NOT NULL,
  `spoiled` real DEFAULT 0,
  `from_location_id` integer REFERENCES `md_locations`(`id`),
  `to_location_id` integer REFERENCES `md_locations`(`id`),
  `user_id` integer NOT NULL,
  `source` text DEFAULT 'manual' NOT NULL,
  `note` text,
  `price` real,
  `shop` text,
  `spec` text,
  `created_at` integer NOT NULL
);
CREATE INDEX IF NOT EXISTS `idx_inv_stock_log_product` ON `inv_stock_log`(`product_id`);

-- ── 产品条码 ──
CREATE TABLE IF NOT EXISTS `inv_product_barcodes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `product_id` integer NOT NULL REFERENCES `inv_products`(`id`) ON DELETE CASCADE,
  `barcode` text NOT NULL,
  `is_primary` integer DEFAULT 0,
  `notes` text,
  `created_at` integer NOT NULL
);

-- ── 产品文档 ──
CREATE TABLE IF NOT EXISTS `inv_documents` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `product_id` integer REFERENCES `inv_products`(`id`) ON DELETE SET NULL,
  `name` text NOT NULL,
  `file_path` text NOT NULL,
  `mime_type` text NOT NULL,
  `file_size` integer NOT NULL,
  `category` text DEFAULT 'other' NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

-- ── 清单 ──
CREATE TABLE IF NOT EXISTS `hh_lists` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `type` text DEFAULT 'shopping' NOT NULL,
  `notes` text,
  `config` text,
  `group_by` text DEFAULT 'none',
  `created_by` integer,
  `is_archived` integer DEFAULT false NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);
CREATE INDEX IF NOT EXISTS `idx_hh_lists_family_type` ON `hh_lists`(`family_id`, `type`);

CREATE TABLE IF NOT EXISTS `hh_list_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `list_id` integer NOT NULL,
  `content` text NOT NULL,
  `notes` text,
  `status` text DEFAULT 'pending' NOT NULL,
  `completed_by` integer,
  `completed_at` integer,
  `assignee_id` integer,
  `quantity` real,
  `unit` text,
  `linked_product_id` integer,
  `linked_recipe_id` integer,
  `due_at` integer,
  `last_reset_at` integer,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`list_id`) REFERENCES `hh_lists`(`id`) ON DELETE cascade,
  FOREIGN KEY (`completed_by`) REFERENCES `users`(`id`),
  FOREIGN KEY (`assignee_id`) REFERENCES `users`(`id`),
  FOREIGN KEY (`linked_product_id`) REFERENCES `inv_products`(`id`)
);
CREATE INDEX IF NOT EXISTS `idx_hh_list_items_list_status` ON `hh_list_items`(`list_id`, `status`);

CREATE TABLE IF NOT EXISTS `hh_list_item_comments` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `list_item_id` integer NOT NULL,
  `user_id` integer NOT NULL,
  `content` text NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`list_item_id`) REFERENCES `hh_list_items`(`id`) ON DELETE cascade,
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

-- ── 食谱 ──
CREATE TABLE IF NOT EXISTS `hh_recipes` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `description` text,
  `notes` text,
  `ingredients` text NOT NULL,
  `steps` text NOT NULL,
  `prep_time` integer,
  `cook_time` integer,
  `servings` integer,
  `image` text,
  `source` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

CREATE TABLE IF NOT EXISTS `hh_meal_plans` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `week_start` integer NOT NULL,
  `week_end` integer NOT NULL,
  `created_by` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`),
  FOREIGN KEY (`created_by`) REFERENCES `users`(`id`)
);

CREATE TABLE IF NOT EXISTS `hh_meal_plan_items` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `plan_id` integer NOT NULL,
  `day_of_week` integer NOT NULL,
  `meal_type` text NOT NULL,
  `recipe_id` integer NOT NULL,
  `note` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`plan_id`) REFERENCES `hh_meal_plans`(`id`) ON DELETE cascade,
  FOREIGN KEY (`recipe_id`) REFERENCES `hh_recipes`(`id`)
);

-- ── 预算 ──
CREATE TABLE IF NOT EXISTS `hh_budget_categories` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `icon` text,
  `color` text,
  `parent_id` integer,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

CREATE TABLE IF NOT EXISTS `hh_budget_entries` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `type` text NOT NULL,
  `amount` real NOT NULL,
  `currency` text DEFAULT 'CNY' NOT NULL,
  `category` text NOT NULL,
  `description` text,
  `date` integer NOT NULL,
  `is_recurring` integer DEFAULT false NOT NULL,
  `recurring_config` text,
  `mdTags` text,
  `related_item_id` integer,
  `notes` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

CREATE TABLE IF NOT EXISTS `hh_budget_subscriptions` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `amount` real NOT NULL,
  `currency` text DEFAULT 'CNY' NOT NULL,
  `category` text NOT NULL,
  `billing_cycle` text NOT NULL,
  `next_billing_date` integer NOT NULL,
  `start_date` integer NOT NULL,
  `end_date` integer,
  `notes` text,
  `is_enabled` integer DEFAULT true NOT NULL,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

-- ── 日历 ──
CREATE TABLE IF NOT EXISTS `hh_calendar_events` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `title` text NOT NULL,
  `description` text,
  `date` text NOT NULL,
  `end_date` text,
  `all_day` integer DEFAULT true NOT NULL,
  `category` text DEFAULT 'custom' NOT NULL,
  `color` text,
  `recurrence` text DEFAULT 'none' NOT NULL,
  `reminder_minutes` integer,
  `related_type` text,
  `related_id` integer,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

CREATE TABLE IF NOT EXISTS `hh_holiday_templates` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `name` text NOT NULL,
  `type` text NOT NULL,
  `invProducts` text,
  `is_preset` integer DEFAULT false NOT NULL,
  `created_at` integer NOT NULL
);

-- ── 系统 ──
CREATE TABLE IF NOT EXISTS `sys_automation_triggers` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `notes` text,
  `trigger_type` text NOT NULL,
  `trigger_config` text,
  `action_type` text NOT NULL,
  `action_config` text,
  `enabled` integer DEFAULT true NOT NULL,
  `sort_order` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

CREATE TABLE IF NOT EXISTS `sys_encoder_jobs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `output_type` text NOT NULL,
  `target_type` text NOT NULL,
  `target_ids` text,
  `generated_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

CREATE TABLE IF NOT EXISTS `sys_nfc_tag_state` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `tag_uid` text NOT NULL,
  `ndef_written` integer DEFAULT false NOT NULL,
  `ndef_written_at` integer,
  `last_read_at` integer,
  `read_count` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `sys_nfc_tag_state_tag_uid_unique` ON `sys_nfc_tag_state` (`tag_uid`);

CREATE TABLE IF NOT EXISTS `sys_notification_rules` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `notes` text,
  `trigger_type` text NOT NULL,
  `config` text,
  `channel` text DEFAULT 'in_app' NOT NULL,
  `channel_config` text,
  `enabled` integer DEFAULT true NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

CREATE TABLE IF NOT EXISTS `sys_notifications` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `user_id` integer,
  `title` text NOT NULL,
  `message` text NOT NULL,
  `type` text NOT NULL,
  `is_read` integer DEFAULT false NOT NULL,
  `related_type` text,
  `related_id` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`),
  FOREIGN KEY (`user_id`) REFERENCES `users`(`id`)
);

CREATE TABLE IF NOT EXISTS `sys_plugin_data` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `plugin_id` text NOT NULL,
  `key` text NOT NULL,
  `value` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS `sys_plugin_data_plugin_id_key_unique` ON `sys_plugin_data` (`plugin_id`,`key`);

CREATE TABLE IF NOT EXISTS `sys_rfid_readers` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `name` text NOT NULL,
  `location_id` integer,
  `reader_type` text DEFAULT 'hf' NOT NULL,
  `device_id` text NOT NULL,
  `config` text,
  `hardware_device_id` integer,
  `last_online_at` integer,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`),
  FOREIGN KEY (`location_id`) REFERENCES `md_locations`(`id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `sys_rfid_readers_device_id_unique` ON `sys_rfid_readers` (`device_id`);

CREATE TABLE IF NOT EXISTS `sys_rfid_zones` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `reader_id` integer NOT NULL,
  `tag_pattern` text,
  `location_id` integer,
  `notes` text,
  FOREIGN KEY (`reader_id`) REFERENCES `sys_rfid_readers`(`id`),
  FOREIGN KEY (`location_id`) REFERENCES `md_locations`(`id`)
);

CREATE TABLE IF NOT EXISTS `sys_tigger_logs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `user_id` integer,
  `scan_type` text NOT NULL,
  `code` text NOT NULL,
  `action` text NOT NULL,
  `context` text,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
CREATE INDEX IF NOT EXISTS `idx_sys_tigger_logs_family` ON `sys_tigger_logs`(`family_id`);

CREATE TABLE IF NOT EXISTS `sys_trigger_bindings` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `code` text NOT NULL,
  `code_type` text NOT NULL,
  `target_type` text NOT NULL,
  `target_id` integer NOT NULL,
  `action_override` text,
  `label` text,
  `notes` text,
  `last_read_at` integer,
  `read_count` integer DEFAULT 0 NOT NULL,
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

CREATE TABLE IF NOT EXISTS `sys_custom_fields` (
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
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
CREATE UNIQUE INDEX IF NOT EXISTS `sys_custom_fields_family_entity_unique` ON `sys_custom_fields` (`family_id`,`entity_type`,`field_name`);

CREATE TABLE IF NOT EXISTS `sys_custom_values` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `entity_type` text NOT NULL,
  `entity_id` integer NOT NULL,
  `field_id` integer NOT NULL,
  `value` text,
  `created_at` integer NOT NULL,
  `updated_at` integer NOT NULL,
  FOREIGN KEY (`field_id`) REFERENCES `sys_custom_fields`(`id`) ON DELETE cascade
);
CREATE UNIQUE INDEX IF NOT EXISTS `sys_custom_values_entity_field_unique` ON `sys_custom_values` (`entity_type`,`entity_id`,`field_id`);

CREATE TABLE IF NOT EXISTS `sys_hardware_devices` (
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
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);

CREATE TABLE IF NOT EXISTS `sys_print_jobs` (
  `id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
  `family_id` integer NOT NULL,
  `content` text NOT NULL,
  `output_type` text NOT NULL,
  `copies` integer DEFAULT 1,
  `options` text,
  `status` text DEFAULT 'queued',
  `created_at` integer NOT NULL,
  FOREIGN KEY (`family_id`) REFERENCES `families`(`id`)
);
