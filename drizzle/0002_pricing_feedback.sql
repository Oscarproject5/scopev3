-- Add pricing feedback tracking fields to requests table
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "freelancer_modified_price" boolean DEFAULT false;
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "price_modification_reason" text;
ALTER TABLE "requests" ADD COLUMN IF NOT EXISTS "pricing_accuracy_score" numeric(5, 2);
