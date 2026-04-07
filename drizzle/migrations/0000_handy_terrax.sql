CREATE TYPE "public"."contract_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."currency" AS ENUM('ILS', 'USD', 'EUR');--> statement-breakpoint
CREATE TYPE "public"."linkage_type" AS ENUM('cpi', 'housing', 'construction', 'usd', 'eur', 'none');--> statement-breakpoint
CREATE TYPE "public"."payment_frequency" AS ENUM('monthly', 'quarterly', 'annually');--> statement-breakpoint
CREATE TYPE "public"."payment_method_enum" AS ENUM('transfer', 'checks', 'cash', 'bit', 'paybox', 'other');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('paid', 'pending', 'overdue', 'cancelled');--> statement-breakpoint
CREATE TYPE "public"."property_status" AS ENUM('Occupied', 'Vacant');--> statement-breakpoint
CREATE TABLE "contracts" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"property_id" uuid NOT NULL,
	"status" "contract_status" DEFAULT 'active' NOT NULL,
	"signing_date" timestamp NOT NULL,
	"start_date" timestamp NOT NULL,
	"end_date" timestamp NOT NULL,
	"base_rent" numeric(10, 2) NOT NULL,
	"currency" "currency" DEFAULT 'ILS' NOT NULL,
	"payment_frequency" "payment_frequency" DEFAULT 'monthly' NOT NULL,
	"payment_day" integer DEFAULT 1 NOT NULL,
	"linkage_type" "linkage_type" DEFAULT 'none' NOT NULL,
	"base_index_date" text,
	"base_index_value" numeric(10, 2),
	"linkage_sub_type" text,
	"linkage_ceiling" numeric(5, 2),
	"linkage_floor" numeric(5, 2),
	"security_deposit_amount" numeric(10, 2) DEFAULT '0',
	"ai_extracted" boolean DEFAULT false,
	"ai_extraction_data" jsonb,
	"contract_file_url" text,
	"contract_file_name" text,
	"needs_painting" boolean DEFAULT false,
	"notice_period_days" integer,
	"option_periods" jsonb,
	"rent_periods" jsonb,
	"tenants" jsonb,
	"payment_method" "payment_method_enum",
	"pets_allowed" boolean DEFAULT true,
	"special_clauses" text,
	"guarantees" text,
	"guarantors_info" text,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "index_data" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"index_type" "linkage_type" NOT NULL,
	"date" text NOT NULL,
	"value" numeric(10, 4) NOT NULL,
	"source" text DEFAULT 'cbs',
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"contract_id" uuid NOT NULL,
	"amount" numeric(10, 2) NOT NULL,
	"currency" "currency" DEFAULT 'ILS' NOT NULL,
	"due_date" timestamp NOT NULL,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"paid_date" timestamp,
	"payment_method" "payment_method_enum",
	"reference" text,
	"details" jsonb,
	"receipt_url" text,
	"created_at" timestamp DEFAULT now()
);
--> statement-breakpoint
CREATE TABLE "properties" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"address" text NOT NULL,
	"city" text NOT NULL,
	"rooms" integer NOT NULL,
	"size_sqm" integer NOT NULL,
	"image_url" text,
	"has_parking" boolean DEFAULT false,
	"has_storage" boolean DEFAULT false,
	"has_balcony" boolean DEFAULT false,
	"has_safe_room" boolean DEFAULT false,
	"has_elevator" boolean DEFAULT false,
	"is_accessible" boolean DEFAULT false,
	"property_type" text DEFAULT 'apartment',
	"status" "property_status" DEFAULT 'Vacant' NOT NULL,
	"user_id" uuid NOT NULL,
	"created_at" timestamp DEFAULT now(),
	"updated_at" timestamp DEFAULT now()
);
--> statement-breakpoint
ALTER TABLE "contracts" ADD CONSTRAINT "contracts_property_id_properties_id_fk" FOREIGN KEY ("property_id") REFERENCES "public"."properties"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_contract_id_contracts_id_fk" FOREIGN KEY ("contract_id") REFERENCES "public"."contracts"("id") ON DELETE cascade ON UPDATE no action;