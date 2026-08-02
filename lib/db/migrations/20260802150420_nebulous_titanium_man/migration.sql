CREATE TABLE `admins` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`username` varchar(100) NOT NULL,
	`password_hash` text NOT NULL,
	`role` varchar(20) NOT NULL DEFAULT 'admin',
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `username_unique` UNIQUE INDEX(`username`)
);
--> statement-breakpoint
CREATE TABLE `blocked_slots` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`slot_date` date NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`reason` text,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP)
);
--> statement-breakpoint
CREATE TABLE `booking_days` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`booking_id` int NOT NULL,
	`day_date` date NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `booking_days_unique_day` UNIQUE INDEX(`booking_id`,`day_date`)
);
--> statement-breakpoint
CREATE TABLE `bookings` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`reference` varchar(20) NOT NULL,
	`full_name` text NOT NULL,
	`organisation` text,
	`phone` text NOT NULL,
	`email` text NOT NULL,
	`event_type` text NOT NULL,
	`start_date` date NOT NULL,
	`end_date` date NOT NULL,
	`start_time` time NOT NULL,
	`end_time` time NOT NULL,
	`participants` smallint NOT NULL,
	`extras` json,
	`agreed_to_policy` tinyint NOT NULL DEFAULT 0,
	`status` varchar(20) NOT NULL DEFAULT 'pending',
	`invoice_subtotal` int,
	`invoice_vat` int,
	`invoice_total` int,
	`discount_applied` text,
	`invoice_breakdown` text,
	`notes` text,
	`payment_status` varchar(20) NOT NULL DEFAULT 'unpaid',
	`payment_method` varchar(50),
	`nomba_order_ref` text,
	`nomba_transaction_id` text,
	`checkout_link` text,
	`paid_at` datetime,
	`customer_id` int,
	`reschedule_status` varchar(20) NOT NULL DEFAULT 'none',
	`reschedule_date` date,
	`reschedule_start_time` time,
	`reschedule_end_time` time,
	`reschedule_reason` text,
	`reschedule_requested_at` datetime,
	`invoice_number` text,
	`quote_id` text,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `reference_unique` UNIQUE INDEX(`reference`)
);
--> statement-breakpoint
CREATE TABLE `customers` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`full_name` text NOT NULL,
	`email` varchar(320) NOT NULL,
	`phone` varchar(30),
	`password_hash` text NOT NULL,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `email_unique` UNIQUE INDEX(`email`)
);
--> statement-breakpoint
CREATE TABLE `password_reset_tokens` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`token_hash` varchar(255) NOT NULL,
	`customer_id` int NOT NULL,
	`expires_at` datetime NOT NULL,
	`used` tinyint NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `token_hash_unique` UNIQUE INDEX(`token_hash`)
);
--> statement-breakpoint
CREATE TABLE `pricing_config` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`config` json NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updated_by` text
);
--> statement-breakpoint
CREATE TABLE `quotes` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`quote_id` varchar(255) NOT NULL,
	`input` json NOT NULL,
	`source` varchar(20) NOT NULL,
	`hours` decimal(5,2) NOT NULL,
	`days` int NOT NULL,
	`lines` json NOT NULL,
	`base_subtotal` int NOT NULL,
	`discount_amount` int NOT NULL DEFAULT 0,
	`discount_applied` text,
	`subtotal` int NOT NULL,
	`breakdown` text,
	`vat_rate` decimal(4,2) NOT NULL,
	`vat_amount` int NOT NULL,
	`total` int NOT NULL,
	`extras_priced` tinyint NOT NULL DEFAULT 0,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`expires_at` datetime NOT NULL DEFAULT (DATE_ADD(CURRENT_TIMESTAMP, INTERVAL 24 HOUR)),
	CONSTRAINT `quote_id_unique` UNIQUE INDEX(`quote_id`)
);
--> statement-breakpoint
CREATE TABLE `social_links` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`platform` varchar(50) NOT NULL,
	`url` text NOT NULL DEFAULT (''),
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `platform_unique` UNIQUE INDEX(`platform`)
);
--> statement-breakpoint
CREATE TABLE `venue_hours` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`day_of_week` smallint NOT NULL,
	`is_open` tinyint NOT NULL DEFAULT 1,
	`open_time` time NOT NULL DEFAULT '09:00:00',
	`close_time` time NOT NULL DEFAULT '18:00:00',
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `day_of_week_unique` UNIQUE INDEX(`day_of_week`)
);
--> statement-breakpoint
CREATE TABLE `venue_settings` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`key` varchar(100) NOT NULL,
	`value` text NOT NULL,
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `key_unique` UNIQUE INDEX(`key`)
);
--> statement-breakpoint
CREATE INDEX `idx_blocked_date` ON `blocked_slots` (`slot_date`);--> statement-breakpoint
CREATE INDEX `idx_booking_days_date` ON `booking_days` (`day_date`,`start_time`,`end_time`);--> statement-breakpoint
CREATE INDEX `idx_booking_days_booking` ON `booking_days` (`booking_id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_dates` ON `bookings` (`start_date`,`end_date`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `idx_bookings_customer_id` ON `bookings` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_bookings_email` ON `bookings` (`email`);--> statement-breakpoint
CREATE INDEX `idx_customers_email` ON `customers` (`email`);--> statement-breakpoint
CREATE INDEX `idx_prt_customer` ON `password_reset_tokens` (`customer_id`);--> statement-breakpoint
CREATE INDEX `idx_prt_expires` ON `password_reset_tokens` (`expires_at`);--> statement-breakpoint
CREATE INDEX `idx_quotes_quote_id` ON `quotes` (`quote_id`);--> statement-breakpoint
CREATE INDEX `idx_quotes_expires` ON `quotes` (`expires_at`);