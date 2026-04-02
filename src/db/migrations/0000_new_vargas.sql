CREATE TYPE "public"."access_level" AS ENUM('read', 'write');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('super_admin', 'admin');--> statement-breakpoint
CREATE TYPE "public"."booking_type" AS ENUM('accommodation', 'meal', 'transfer', 'registration', 'custom');--> statement-breakpoint
CREATE TYPE "public"."match_event_type" AS ENUM('goal', 'own_goal', 'yellow', 'red', 'yellow_red', 'penalty_scored', 'penalty_missed', 'substitution_in', 'substitution_out', 'injury');--> statement-breakpoint
CREATE TYPE "public"."match_result_type" AS ENUM('regular', 'extra_time', 'penalties', 'walkover', 'technical');--> statement-breakpoint
CREATE TYPE "public"."match_status" AS ENUM('scheduled', 'live', 'finished', 'postponed', 'cancelled', 'walkover');--> statement-breakpoint
CREATE TYPE "public"."org_plan" AS ENUM('free', 'basic', 'premium');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('bank_transfer', 'stripe', 'cash');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'received', 'refunded');--> statement-breakpoint
CREATE TYPE "public"."person_type" AS ENUM('player', 'staff', 'accompanying');--> statement-breakpoint
CREATE TYPE "public"."pricing_mode" AS ENUM('per_person', 'per_player', 'per_staff', 'per_accompanying', 'per_team', 'per_person_per_day', 'per_unit', 'flat');--> statement-breakpoint
CREATE TYPE "public"."service_type" AS ENUM('accommodation', 'meal', 'transfer', 'registration');--> statement-breakpoint
CREATE TYPE "public"."stage_status" AS ENUM('pending', 'active', 'finished');--> statement-breakpoint
CREATE TYPE "public"."stage_type" AS ENUM('group', 'knockout', 'league', 'swiss', 'double_elim');--> statement-breakpoint
CREATE TYPE "public"."team_status" AS ENUM('draft', 'open', 'confirmed', 'cancelled');--> statement-breakpoint
CREATE TABLE "accommodation_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"name_ru" text,
	"name_et" text,
	"check_in" timestamp,
	"check_out" timestamp,
	"price_per_player" numeric(10, 2) NOT NULL,
	"price_per_staff" numeric(10, 2) NOT NULL,
	"price_per_accompanying" numeric(10, 2) DEFAULT '0' NOT NULL,
	"included_meals" integer DEFAULT 0 NOT NULL,
	"meal_note" text,
	"meal_note_ru" text,
	"meal_note_et" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'admin' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "club_users" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_id" integer NOT NULL,
	"team_id" integer,
	"email" text NOT NULL,
	"name" text,
	"password_hash" text,
	"access_level" "access_level" DEFAULT 'write' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "clubs" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"country" text,
	"city" text,
	"badge_url" text,
	"contact_name" text,
	"contact_email" text,
	"contact_phone" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "extra_meal_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"name_ru" text,
	"name_et" text,
	"description" text,
	"description_ru" text,
	"description_et" text,
	"price_per_person" numeric(10, 2) NOT NULL,
	"per_day" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "group_teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"seed_number" integer
);
--> statement-breakpoint
CREATE TABLE "inbox_messages" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"sent_by" integer NOT NULL,
	"send_to_all" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_events" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"tournament_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"person_id" integer,
	"event_type" "match_event_type" NOT NULL,
	"minute" integer NOT NULL,
	"minute_extra" integer,
	"assist_person_id" integer,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_lineup" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"person_id" integer NOT NULL,
	"is_starting" boolean DEFAULT true NOT NULL,
	"shirt_number" integer,
	"position" varchar(30),
	"rating" numeric(3, 1)
);
--> statement-breakpoint
CREATE TABLE "match_result_log" (
	"id" serial PRIMARY KEY NOT NULL,
	"match_id" integer NOT NULL,
	"changed_by" integer,
	"old_home_score" integer,
	"old_away_score" integer,
	"new_home_score" integer,
	"new_away_score" integer,
	"old_status" "match_status",
	"new_status" "match_status",
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "match_rounds" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_id" integer NOT NULL,
	"name" varchar(50) NOT NULL,
	"name_ru" varchar(50),
	"name_et" varchar(50),
	"short_name" varchar(10),
	"order" integer NOT NULL,
	"match_count" integer DEFAULT 1 NOT NULL,
	"is_two_legged" boolean DEFAULT false NOT NULL,
	"has_third_place" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "matches" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"stage_id" integer NOT NULL,
	"group_id" integer,
	"round_id" integer,
	"match_number" integer,
	"home_team_id" integer,
	"away_team_id" integer,
	"field_id" integer,
	"scheduled_at" timestamp,
	"started_at" timestamp,
	"finished_at" timestamp,
	"status" "match_status" DEFAULT 'scheduled' NOT NULL,
	"home_score" integer,
	"away_score" integer,
	"home_extra_score" integer,
	"away_extra_score" integer,
	"home_penalties" integer,
	"away_penalties" integer,
	"winner_id" integer,
	"result_type" "match_result_type",
	"is_public" boolean DEFAULT true NOT NULL,
	"notes" text,
	"version" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	"deleted_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "message_recipients" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"team_id" integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE "orders" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"quantity" integer DEFAULT 0 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "organizations" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" varchar(255) NOT NULL,
	"slug" varchar(100) NOT NULL,
	"logo" text,
	"country" varchar(100),
	"city" varchar(100),
	"timezone" varchar(50) DEFAULT 'Europe/Tallinn' NOT NULL,
	"default_locale" varchar(5) DEFAULT 'en' NOT NULL,
	"currency" varchar(3) DEFAULT 'EUR' NOT NULL,
	"plan" "org_plan" DEFAULT 'free' NOT NULL,
	"contact_email" text,
	"contact_phone" text,
	"website" text,
	"brand_color" varchar(20) DEFAULT '#272D2D',
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "organizations_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "package_assignments" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"package_id" integer NOT NULL,
	"assigned_at" timestamp DEFAULT now() NOT NULL,
	"assigned_by" integer,
	"is_published" boolean DEFAULT false NOT NULL,
	"free_players_count" integer DEFAULT 0 NOT NULL,
	"free_staff_count" integer DEFAULT 0 NOT NULL,
	"free_accompanying_count" integer DEFAULT 0 NOT NULL,
	"meals_count_override" integer,
	CONSTRAINT "package_assignments_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "package_items" (
	"id" serial PRIMARY KEY NOT NULL,
	"package_id" integer NOT NULL,
	"service_id" integer NOT NULL,
	"details" text,
	"details_ru" text,
	"details_et" text,
	"date_from" date,
	"date_to" date,
	"image_url" text,
	"note" text,
	"note_ru" text,
	"note_et" text,
	"pricing_mode" "pricing_mode" DEFAULT 'per_person' NOT NULL,
	"price" numeric(10, 2) DEFAULT '0' NOT NULL,
	"days" integer,
	"quantity" integer,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"method" "payment_method" DEFAULT 'bank_transfer' NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"reference" text,
	"notes" text,
	"received_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "people" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"person_type" "person_type" NOT NULL,
	"first_name" text NOT NULL,
	"last_name" text NOT NULL,
	"email" text,
	"phone" text,
	"date_of_birth" timestamp,
	"shirt_number" integer,
	"position" text,
	"role" text,
	"is_responsible_on_site" boolean DEFAULT false NOT NULL,
	"allergies" text,
	"dietary_requirements" text,
	"medical_notes" text,
	"medical_document_url" text,
	"needs_hotel" boolean DEFAULT false NOT NULL,
	"needs_transfer" boolean DEFAULT false NOT NULL,
	"show_publicly" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "qualification_rules" (
	"id" serial PRIMARY KEY NOT NULL,
	"from_stage_id" integer NOT NULL,
	"target_stage_id" integer NOT NULL,
	"from_rank" integer NOT NULL,
	"to_rank" integer NOT NULL,
	"target_slot" varchar(50),
	"condition" jsonb DEFAULT '{}'::jsonb
);
--> statement-breakpoint
CREATE TABLE "registration_attempts" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_name" text,
	"contact_email" text,
	"contact_name" text,
	"country" text,
	"city" text,
	"teams_count" integer,
	"teams_json" text,
	"has_logo" boolean DEFAULT false,
	"status" text NOT NULL,
	"fail_reason" text,
	"club_id" integer,
	"ip" text,
	"user_agent" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "registration_fees" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text DEFAULT 'Registration fee' NOT NULL,
	"name_ru" text,
	"name_et" text,
	"price" numeric(10, 2) NOT NULL,
	"is_required" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "service_packages" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"name_ru" text,
	"name_et" text,
	"description" text,
	"description_ru" text,
	"description_et" text,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "services" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"name_ru" text,
	"name_et" text,
	"icon" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_groups" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_id" integer NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" varchar(20) NOT NULL,
	"order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "stage_slots" (
	"id" serial PRIMARY KEY NOT NULL,
	"stage_id" integer NOT NULL,
	"group_id" integer,
	"round_id" integer,
	"slot_label" varchar(100),
	"slot_label_ru" varchar(100),
	"slot_label_et" varchar(100),
	"slot_position" varchar(10),
	"filled_by_team_id" integer,
	"order" integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE "standings" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"tournament_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"played" integer DEFAULT 0 NOT NULL,
	"won" integer DEFAULT 0 NOT NULL,
	"drawn" integer DEFAULT 0 NOT NULL,
	"lost" integer DEFAULT 0 NOT NULL,
	"goals_for" integer DEFAULT 0 NOT NULL,
	"goals_against" integer DEFAULT 0 NOT NULL,
	"goal_diff" integer DEFAULT 0 NOT NULL,
	"points" integer DEFAULT 0 NOT NULL,
	"position" integer,
	"form" jsonb DEFAULT '[]'::jsonb,
	"head_to_head" jsonb DEFAULT '{}'::jsonb,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_bookings" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"booking_type" "booking_type" NOT NULL,
	"service_id" integer NOT NULL,
	"quantity" integer DEFAULT 1 NOT NULL,
	"unit_price" numeric(10, 2) NOT NULL,
	"total" numeric(10, 2) NOT NULL,
	"notes" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_invites" (
	"id" serial PRIMARY KEY NOT NULL,
	"club_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"token" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"expires_at" timestamp NOT NULL,
	"used_at" timestamp,
	CONSTRAINT "team_invites_token_unique" UNIQUE("token")
);
--> statement-breakpoint
CREATE TABLE "team_message_reads" (
	"id" serial PRIMARY KEY NOT NULL,
	"message_id" integer NOT NULL,
	"team_id" integer NOT NULL,
	"read_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_package_item_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"package_item_id" integer NOT NULL,
	"custom_price" numeric(10, 2),
	"custom_quantity" integer,
	"is_disabled" boolean DEFAULT false NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_price_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"product_id" integer NOT NULL,
	"custom_price" numeric(10, 2) NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_questions" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"tournament_id" integer NOT NULL,
	"subject" text NOT NULL,
	"body" text NOT NULL,
	"sent_at" timestamp DEFAULT now() NOT NULL,
	"reply_body" text,
	"replied_at" timestamp,
	"replied_by" integer,
	"is_read" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_service_overrides" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"service_type" "service_type" NOT NULL,
	"service_id" integer NOT NULL,
	"custom_price" numeric(10, 2),
	"is_disabled" boolean DEFAULT false NOT NULL,
	"reason" text,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "team_travel" (
	"id" serial PRIMARY KEY NOT NULL,
	"team_id" integer NOT NULL,
	"arrival_type" text,
	"arrival_date" timestamp,
	"arrival_time" text,
	"arrival_details" text,
	"departure_type" text,
	"departure_date" timestamp,
	"departure_time" text,
	"departure_details" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "team_travel_team_id_unique" UNIQUE("team_id")
);
--> statement-breakpoint
CREATE TABLE "teams" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"club_id" integer,
	"class_id" integer,
	"name" text,
	"status" "team_status" DEFAULT 'draft' NOT NULL,
	"reg_number" integer NOT NULL,
	"notes" text,
	"hotel_id" integer,
	"accom_players" integer DEFAULT 0,
	"accom_staff" integer DEFAULT 0,
	"accom_accompanying" integer DEFAULT 0,
	"accom_check_in" text,
	"accom_check_out" text,
	"accom_notes" text,
	"accom_declined" boolean DEFAULT false NOT NULL,
	"accom_confirmed" boolean DEFAULT false NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_classes" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"format" text,
	"min_birth_year" integer,
	"max_birth_year" integer,
	"max_players" integer DEFAULT 25,
	"max_staff" integer DEFAULT 5,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_documents" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"name_ru" text,
	"name_et" text,
	"file_url" text NOT NULL,
	"file_size" text,
	"uploaded_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_fields" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"map_url" text,
	"schedule_url" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_hotels" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"address" text,
	"contact_name" text,
	"contact_phone" text,
	"contact_email" text,
	"notes" text,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_info" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"schedule_url" text,
	"schedule_description" text,
	"hotel_name" text,
	"hotel_address" text,
	"hotel_check_in" text,
	"hotel_check_out" text,
	"hotel_notes" text,
	"venue_name" text,
	"venue_address" text,
	"venue_map_url" text,
	"meal_times" text,
	"meal_location" text,
	"meal_notes" text,
	"emergency_contact" text,
	"emergency_phone" text,
	"additional_notes" text,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "tournament_info_tournament_id_unique" UNIQUE("tournament_id")
);
--> statement-breakpoint
CREATE TABLE "tournament_products" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"name_ru" text,
	"name_et" text,
	"description" text,
	"description_ru" text,
	"description_et" text,
	"price" numeric(10, 2) NOT NULL,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"category" text NOT NULL,
	"is_required" boolean DEFAULT false NOT NULL,
	"included_quantity" integer DEFAULT 0 NOT NULL,
	"per_person" boolean DEFAULT false NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournament_stages" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"organization_id" integer NOT NULL,
	"name" varchar(100) NOT NULL,
	"name_ru" varchar(100),
	"name_et" varchar(100),
	"type" "stage_type" NOT NULL,
	"order" integer NOT NULL,
	"status" "stage_status" DEFAULT 'pending' NOT NULL,
	"settings" jsonb DEFAULT '{}'::jsonb,
	"tiebreakers" jsonb DEFAULT '["head_to_head_points","head_to_head_goal_diff","goal_diff","goals_scored","fair_play"]'::jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "tournaments" (
	"id" serial PRIMARY KEY NOT NULL,
	"organization_id" integer NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"year" integer NOT NULL,
	"description" text,
	"logo_url" text,
	"registration_open" boolean DEFAULT false NOT NULL,
	"registration_deadline" timestamp,
	"start_date" timestamp,
	"end_date" timestamp,
	"currency" text DEFAULT 'EUR' NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "transfer_options" (
	"id" serial PRIMARY KEY NOT NULL,
	"tournament_id" integer NOT NULL,
	"name" text NOT NULL,
	"name_ru" text,
	"name_et" text,
	"description" text,
	"description_ru" text,
	"description_et" text,
	"price_per_person" numeric(10, 2) NOT NULL,
	"sort_order" integer DEFAULT 0 NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "accommodation_options" ADD CONSTRAINT "accommodation_options_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "admin_users" ADD CONSTRAINT "admin_users_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "club_users" ADD CONSTRAINT "club_users_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clubs" ADD CONSTRAINT "clubs_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "extra_meal_options" ADD CONSTRAINT "extra_meal_options_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_group_id_stage_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."stage_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "group_teams" ADD CONSTRAINT "group_teams_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "inbox_messages" ADD CONSTRAINT "inbox_messages_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_events" ADD CONSTRAINT "match_events_assist_person_id_people_id_fk" FOREIGN KEY ("assist_person_id") REFERENCES "public"."people"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineup" ADD CONSTRAINT "match_lineup_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineup" ADD CONSTRAINT "match_lineup_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_lineup" ADD CONSTRAINT "match_lineup_person_id_people_id_fk" FOREIGN KEY ("person_id") REFERENCES "public"."people"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_result_log" ADD CONSTRAINT "match_result_log_match_id_matches_id_fk" FOREIGN KEY ("match_id") REFERENCES "public"."matches"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_result_log" ADD CONSTRAINT "match_result_log_changed_by_admin_users_id_fk" FOREIGN KEY ("changed_by") REFERENCES "public"."admin_users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "match_rounds" ADD CONSTRAINT "match_rounds_stage_id_tournament_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."tournament_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_stage_id_tournament_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."tournament_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_group_id_stage_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."stage_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_round_id_match_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."match_rounds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_home_team_id_teams_id_fk" FOREIGN KEY ("home_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_away_team_id_teams_id_fk" FOREIGN KEY ("away_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_field_id_tournament_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."tournament_fields"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "matches" ADD CONSTRAINT "matches_winner_id_teams_id_fk" FOREIGN KEY ("winner_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_message_id_inbox_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."inbox_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "message_recipients" ADD CONSTRAINT "message_recipients_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "orders" ADD CONSTRAINT "orders_product_id_tournament_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."tournament_products"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_assignments" ADD CONSTRAINT "package_assignments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_assignments" ADD CONSTRAINT "package_assignments_package_id_service_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."service_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_package_id_service_packages_id_fk" FOREIGN KEY ("package_id") REFERENCES "public"."service_packages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "package_items" ADD CONSTRAINT "package_items_service_id_services_id_fk" FOREIGN KEY ("service_id") REFERENCES "public"."services"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "people" ADD CONSTRAINT "people_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_rules" ADD CONSTRAINT "qualification_rules_from_stage_id_tournament_stages_id_fk" FOREIGN KEY ("from_stage_id") REFERENCES "public"."tournament_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "qualification_rules" ADD CONSTRAINT "qualification_rules_target_stage_id_tournament_stages_id_fk" FOREIGN KEY ("target_stage_id") REFERENCES "public"."tournament_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "registration_fees" ADD CONSTRAINT "registration_fees_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "service_packages" ADD CONSTRAINT "service_packages_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_groups" ADD CONSTRAINT "stage_groups_stage_id_tournament_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."tournament_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_groups" ADD CONSTRAINT "stage_groups_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_slots" ADD CONSTRAINT "stage_slots_stage_id_tournament_stages_id_fk" FOREIGN KEY ("stage_id") REFERENCES "public"."tournament_stages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_slots" ADD CONSTRAINT "stage_slots_group_id_stage_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."stage_groups"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_slots" ADD CONSTRAINT "stage_slots_round_id_match_rounds_id_fk" FOREIGN KEY ("round_id") REFERENCES "public"."match_rounds"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "stage_slots" ADD CONSTRAINT "stage_slots_filled_by_team_id_teams_id_fk" FOREIGN KEY ("filled_by_team_id") REFERENCES "public"."teams"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_group_id_stage_groups_id_fk" FOREIGN KEY ("group_id") REFERENCES "public"."stage_groups"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "standings" ADD CONSTRAINT "standings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_bookings" ADD CONSTRAINT "team_bookings_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_invites" ADD CONSTRAINT "team_invites_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_message_reads" ADD CONSTRAINT "team_message_reads_message_id_inbox_messages_id_fk" FOREIGN KEY ("message_id") REFERENCES "public"."inbox_messages"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_message_reads" ADD CONSTRAINT "team_message_reads_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_package_item_overrides" ADD CONSTRAINT "team_package_item_overrides_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_package_item_overrides" ADD CONSTRAINT "team_package_item_overrides_package_item_id_package_items_id_fk" FOREIGN KEY ("package_item_id") REFERENCES "public"."package_items"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_price_overrides" ADD CONSTRAINT "team_price_overrides_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_price_overrides" ADD CONSTRAINT "team_price_overrides_product_id_tournament_products_id_fk" FOREIGN KEY ("product_id") REFERENCES "public"."tournament_products"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_questions" ADD CONSTRAINT "team_questions_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_questions" ADD CONSTRAINT "team_questions_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_service_overrides" ADD CONSTRAINT "team_service_overrides_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "team_travel" ADD CONSTRAINT "team_travel_team_id_teams_id_fk" FOREIGN KEY ("team_id") REFERENCES "public"."teams"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_club_id_clubs_id_fk" FOREIGN KEY ("club_id") REFERENCES "public"."clubs"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "teams" ADD CONSTRAINT "teams_class_id_tournament_classes_id_fk" FOREIGN KEY ("class_id") REFERENCES "public"."tournament_classes"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_classes" ADD CONSTRAINT "tournament_classes_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_documents" ADD CONSTRAINT "tournament_documents_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_fields" ADD CONSTRAINT "tournament_fields_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_hotels" ADD CONSTRAINT "tournament_hotels_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_info" ADD CONSTRAINT "tournament_info_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_products" ADD CONSTRAINT "tournament_products_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_stages" ADD CONSTRAINT "tournament_stages_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournament_stages" ADD CONSTRAINT "tournament_stages_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tournaments" ADD CONSTRAINT "tournaments_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transfer_options" ADD CONSTRAINT "transfer_options_tournament_id_tournaments_id_fk" FOREIGN KEY ("tournament_id") REFERENCES "public"."tournaments"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_group_teams_unique" ON "group_teams" USING btree ("group_id","team_id");--> statement-breakpoint
CREATE INDEX "idx_match_events_match" ON "match_events" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "idx_match_events_tournament" ON "match_events" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "idx_match_events_person" ON "match_events" USING btree ("person_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_match_lineup_unique" ON "match_lineup" USING btree ("match_id","person_id");--> statement-breakpoint
CREATE INDEX "idx_match_lineup_match" ON "match_lineup" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "idx_result_log_match" ON "match_result_log" USING btree ("match_id");--> statement-breakpoint
CREATE INDEX "idx_match_rounds_stage" ON "match_rounds" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_matches_tournament_status" ON "matches" USING btree ("tournament_id","status");--> statement-breakpoint
CREATE INDEX "idx_matches_org_scheduled" ON "matches" USING btree ("organization_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_matches_home_team" ON "matches" USING btree ("home_team_id");--> statement-breakpoint
CREATE INDEX "idx_matches_away_team" ON "matches" USING btree ("away_team_id");--> statement-breakpoint
CREATE INDEX "idx_matches_field_time" ON "matches" USING btree ("field_id","scheduled_at");--> statement-breakpoint
CREATE INDEX "idx_matches_stage" ON "matches" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_matches_group" ON "matches" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "idx_stage_groups_stage" ON "stage_groups" USING btree ("stage_id");--> statement-breakpoint
CREATE INDEX "idx_stage_slots_stage" ON "stage_slots" USING btree ("stage_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_standings_group_team" ON "standings" USING btree ("group_id","team_id");--> statement-breakpoint
CREATE INDEX "idx_standings_tournament" ON "standings" USING btree ("tournament_id");--> statement-breakpoint
CREATE UNIQUE INDEX "teams_tournament_reg_idx" ON "teams" USING btree ("tournament_id","reg_number");--> statement-breakpoint
CREATE INDEX "idx_stages_tournament" ON "tournament_stages" USING btree ("tournament_id");--> statement-breakpoint
CREATE INDEX "idx_stages_organization" ON "tournament_stages" USING btree ("organization_id");--> statement-breakpoint
CREATE UNIQUE INDEX "tournaments_org_slug_idx" ON "tournaments" USING btree ("organization_id","slug");