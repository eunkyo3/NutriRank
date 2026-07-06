CREATE TABLE `category_agg_snapshot` (
	`snapshot_date` text NOT NULL,
	`category_id` text NOT NULL,
	`product_count` integer,
	`avg_health_score` real,
	`grade_a` integer,
	`grade_b` integer,
	`grade_c` integer,
	`grade_d` integer,
	`grade_e` integer,
	`avg_sugars_g` real,
	`avg_sodium_mg` real,
	`avg_satfat_g` real,
	PRIMARY KEY(`snapshot_date`, `category_id`),
	FOREIGN KEY (`category_id`) REFERENCES `consumer_category`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `category_ranking` (
	`category_id` text NOT NULL,
	`food_code` text NOT NULL,
	`rank` integer NOT NULL,
	`health_score` real NOT NULL,
	`computed_at` text NOT NULL,
	PRIMARY KEY(`category_id`, `food_code`),
	FOREIGN KEY (`category_id`) REFERENCES `consumer_category`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`food_code`) REFERENCES `product`(`food_code`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `idx_ranking_cat_rank` ON `category_ranking` (`category_id`,`rank`);--> statement-breakpoint
CREATE TABLE `consumer_category` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`product_type` text NOT NULL,
	`display_order` integer NOT NULL,
	CONSTRAINT "consumer_category_product_type_check" CHECK("consumer_category"."product_type" IN ('beverage','solid'))
);
--> statement-breakpoint
CREATE TABLE `grade_result` (
	`food_code` text PRIMARY KEY NOT NULL,
	`gradable` integer NOT NULL,
	`ungradable_reason` text,
	`health_score` real,
	`health_grade` text,
	`rationale` text,
	`algorithm_version` text NOT NULL,
	`computed_at` text NOT NULL,
	FOREIGN KEY (`food_code`) REFERENCES `product`(`food_code`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "grade_result_health_grade_check" CHECK("grade_result"."health_grade" IN ('A','B','C','D','E'))
);
--> statement-breakpoint
CREATE INDEX `idx_grade_grade` ON `grade_result` (`health_grade`);--> statement-breakpoint
CREATE TABLE `mfds_category_map` (
	`mfds_level` text NOT NULL,
	`mfds_code` text NOT NULL,
	`mfds_name` text,
	`category_id` text NOT NULL,
	`map_version` integer NOT NULL,
	PRIMARY KEY(`mfds_level`, `mfds_code`),
	FOREIGN KEY (`category_id`) REFERENCES `consumer_category`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "mfds_category_map_level_check" CHECK("mfds_category_map"."mfds_level" IN ('sub','detail'))
);
--> statement-breakpoint
CREATE TABLE `product` (
	`food_code` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`manufacturer` text,
	`reference_raw` text NOT NULL,
	`product_type` text,
	`category_id` text,
	`mfds_l1_code` text,
	`mfds_l1_name` text,
	`mfds_l2_code` text,
	`mfds_l2_name` text,
	`mfds_l3_code` text,
	`mfds_l3_name` text,
	`mfds_l4_code` text,
	`mfds_l4_name` text,
	`serving_ref` text,
	`data_gen_date` text,
	`ingested_at` text NOT NULL,
	FOREIGN KEY (`category_id`) REFERENCES `consumer_category`(`id`) ON UPDATE no action ON DELETE no action,
	CONSTRAINT "product_product_type_check" CHECK("product"."product_type" IN ('beverage','solid'))
);
--> statement-breakpoint
CREATE INDEX `idx_product_category` ON `product` (`category_id`);--> statement-breakpoint
CREATE TABLE `product_nutrient` (
	`food_code` text PRIMARY KEY NOT NULL,
	`energy_kcal` real,
	`sugars_g` real,
	`satfat_g` real,
	`sodium_mg` real,
	`fiber_g` real,
	`protein_g` real,
	FOREIGN KEY (`food_code`) REFERENCES `product`(`food_code`) ON UPDATE no action ON DELETE no action
);
