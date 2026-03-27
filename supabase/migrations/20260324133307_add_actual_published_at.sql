-- Add exact date publication tracking
ALTER TABLE "public"."index_data"
ADD COLUMN "actual_published_at" timestamp with time zone NULL;

COMMENT ON COLUMN "public"."index_data"."actual_published_at" is 'The exact time this index was officially published by the CBS (e.g. 2024-04-14 18:30:00). Used to calculate Known Index precisely, bypassing the 15th-of-the-month hardcoded fallback.';
