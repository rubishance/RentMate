-- Add 'details' and 'receipt_url' to 'payments' table
ALTER TABLE "public"."payments" ADD COLUMN "details" jsonb;
ALTER TABLE "public"."payments" ADD COLUMN "receipt_url" text;
