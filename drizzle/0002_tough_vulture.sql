ALTER TABLE `households` ADD `visitStatus` text DEFAULT '미확인' NOT NULL;--> statement-breakpoint
ALTER TABLE `households` ADD `ownerStatus` text DEFAULT '미확인' NOT NULL;