CREATE TABLE `audit` (
	`id` text PRIMARY KEY NOT NULL,
	`entity` text NOT NULL,
	`before` text,
	`after` text NOT NULL,
	`at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `households` (
	`id` text PRIMARY KEY NOT NULL,
	`parcel` text NOT NULL,
	`building` text NOT NULL,
	`unit` text NOT NULL,
	`status` text DEFAULT '미조사' NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `household_identity` ON `households` (`parcel`,`building`,`unit`);--> statement-breakpoint
CREATE TABLE `lookups` (
	`parcel` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`updated` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `surveys` (
	`parcel` text PRIMARY KEY NOT NULL,
	`payload` text NOT NULL,
	`revision` integer DEFAULT 1 NOT NULL,
	`updated` text NOT NULL
);
