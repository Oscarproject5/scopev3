CREATE TABLE "actual_costs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"request_id" uuid NOT NULL,
	"actual_hours" numeric(10, 2),
	"actual_labor_cost" numeric(10, 2),
	"actual_material_cost" numeric(10, 2),
	"actual_total_cost" numeric(10, 2) NOT NULL,
	"estimated_cost" numeric(10, 2) NOT NULL,
	"variance" numeric(10, 4),
	"variance_reason" text,
	"was_buffer_sufficient" boolean,
	"buffer_utilization" numeric(5, 4),
	"completed_at" timestamp DEFAULT now() NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "actual_costs_request_id_unique" UNIQUE("request_id")
);
--> statement-breakpoint
CREATE TABLE "document_uploads" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"filename" text NOT NULL,
	"file_type" text NOT NULL,
	"file_size" integer NOT NULL,
	"storage_url" text NOT NULL,
	"extracted_data" jsonb,
	"extraction_confidence" numeric(5, 4),
	"linked_project_id" uuid,
	"uploaded_at" timestamp DEFAULT now() NOT NULL,
	"processed_at" timestamp
);
--> statement-breakpoint
CREATE TABLE "industry_templates" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"industry" text NOT NULL,
	"default_overhead" numeric(5, 4) NOT NULL,
	"default_profit_margin" numeric(5, 4) NOT NULL,
	"base_buffer" numeric(5, 4) NOT NULL,
	"simple_buffer" numeric(5, 4) NOT NULL,
	"moderate_buffer" numeric(5, 4) NOT NULL,
	"complex_buffer" numeric(5, 4) NOT NULL,
	"complexity_indicators" jsonb,
	"typical_hourly_rates" jsonb,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "industry_templates_industry_unique" UNIQUE("industry")
);
--> statement-breakpoint
CREATE TABLE "pricing_accuracy_logs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"projects_completed" integer NOT NULL,
	"tier" integer NOT NULL,
	"average_variance" numeric(10, 4),
	"underestimate_rate" numeric(5, 4),
	"overestimate_rate" numeric(5, 4),
	"acceptance_rate" numeric(5, 4),
	"buffer_sufficiency_rate" numeric(5, 4),
	"calculated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "project_rules" ADD COLUMN "original_contract_price" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "project_rules" ADD COLUMN "project_type" text;--> statement-breakpoint
ALTER TABLE "project_rules" ADD COLUMN "client_location" text;--> statement-breakpoint
ALTER TABLE "project_rules" ADD COLUMN "project_timeline" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "pricing_reasoning" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "market_research_data" jsonb;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "pricing_context_used" jsonb;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "estimated_hours" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "labor_cost" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "overhead_cost" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "profit_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "base_subtotal" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "buffer_percentage" numeric(5, 4);--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "buffer_amount" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "buffer_reasoning" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "tier_at_quote" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "current_tier" integer DEFAULT 1;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "projects_completed" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "pricing_accuracy" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "hourly_rate" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "industry" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "overhead" numeric(5, 4) DEFAULT '0.2000';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "profit_margin" numeric(5, 4) DEFAULT '0.1500';--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "custom_buffers" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "location" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "specializations" jsonb;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "typical_contract_value" numeric(10, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "competitive_positioning" text DEFAULT 'mid-market';--> statement-breakpoint
ALTER TABLE "actual_costs" ADD CONSTRAINT "actual_costs_request_id_requests_id_fk" FOREIGN KEY ("request_id") REFERENCES "public"."requests"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "document_uploads" ADD CONSTRAINT "document_uploads_linked_project_id_projects_id_fk" FOREIGN KEY ("linked_project_id") REFERENCES "public"."projects"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "pricing_accuracy_logs" ADD CONSTRAINT "pricing_accuracy_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;