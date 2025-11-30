ALTER TABLE "requests" ADD COLUMN "freelancer_modified_price" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "price_modification_reason" text;--> statement-breakpoint
ALTER TABLE "requests" ADD COLUMN "pricing_accuracy_score" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_name" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_logo" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_address" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_email" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_phone" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "company_website" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "tax_id" text;