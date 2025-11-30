CREATE TABLE "context_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"content" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "project_rules" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"hourly_rate" numeric(10, 2),
	"currency" text DEFAULT 'USD',
	"deliverables" jsonb DEFAULT '[]'::jsonb,
	"revisions_included" integer DEFAULT 2,
	"revisions_used" integer DEFAULT 0,
	"working_hours" jsonb,
	"excluded_days" jsonb DEFAULT '[]'::jsonb,
	"custom_rules" jsonb DEFAULT '[]'::jsonb,
	"contract_text" text,
	"contract_file_name" text,
	"rules_summary" text,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "projects" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"user_id" uuid NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"description" text,
	"client_name" text,
	"client_email" text,
	"is_active" boolean DEFAULT true,
	"require_approval" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "projects_slug_unique" UNIQUE("slug")
);
--> statement-breakpoint
CREATE TABLE "requests" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"project_id" uuid NOT NULL,
	"client_name" text,
	"client_email" text,
	"request_text" text NOT NULL,
	"status" text DEFAULT 'pending' NOT NULL,
	"is_in_scope" boolean,
	"ai_analysis" jsonb,
	"quoted_price" numeric(10, 2),
	"final_price" numeric(10, 2),
	"stripe_payment_intent_id" text,
	"paid_at" timestamp,
	"freelancer_approved" boolean,
	"freelancer_approved_at" timestamp,
	"client_approved" boolean,
	"client_approved_at" timestamp,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "users" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text,
	"image" text,
	"stripe_account_id" text,
	"stripe_customer_id" text,
	"onboarding_complete" boolean DEFAULT false,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL,
	CONSTRAINT "users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
ALTER TABLE "context_notes" ADD CONSTRAINT "context_notes_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "project_rules" ADD CONSTRAINT "project_rules_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "projects" ADD CONSTRAINT "projects_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "requests" ADD CONSTRAINT "requests_project_id_projects_id_fk" FOREIGN KEY ("project_id") REFERENCES "public"."projects"("id") ON DELETE cascade ON UPDATE no action;