CREATE TABLE `gallery_items` (
	`id` int AUTO_INCREMENT PRIMARY KEY,
	`media_type` varchar(10) NOT NULL,
	`src` varchar(500) NOT NULL,
	`storage_key` varchar(255),
	`mime_type` varchar(100),
	`size_bytes` int,
	`caption` varchar(200) NOT NULL DEFAULT '',
	`sort_order` int NOT NULL DEFAULT 0,
	`is_published` tinyint NOT NULL DEFAULT 1,
	`created_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	`updated_at` datetime NOT NULL DEFAULT (CURRENT_TIMESTAMP),
	CONSTRAINT `storage_key_unique` UNIQUE INDEX(`storage_key`)
);
--> statement-breakpoint
CREATE INDEX `idx_gallery_order` ON `gallery_items` (`is_published`,`sort_order`);
--> statement-breakpoint
-- Seed with the items that were hardcoded in components/gallery.tsx, so the
-- homepage looks the same until an admin changes it. These point at bundled
-- /images assets (no storage_key), so deleting one never touches the file.
INSERT INTO `gallery_items` (`media_type`, `src`, `caption`, `sort_order`) VALUES
	('video', '/images/castle-academy-training-space-tour.mp4', 'Full space tour', 0),
	('image', '/images/training-room-classroom-setup.jpeg', 'Classroom setup — 24 seats', 1),
	('image', '/images/training-room-smart-tv-presentation.jpeg', 'Smart TV & presentation wall', 2),
	('image', '/images/training-room-front-perspective.jpeg', 'Bright, focused learning environment', 3),
	('image', '/images/training-room-full-view-back.jpeg', 'Space for strategy sessions', 4),
	('image', '/images/training-room-interactive-display.jpeg', 'Interactive display and premium AV', 5);
