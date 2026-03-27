-- Migration: Add actual_end_date to contracts table
ALTER TABLE "public"."contracts" ADD COLUMN IF NOT EXISTS "actual_end_date" date;
