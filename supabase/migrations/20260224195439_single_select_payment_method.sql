-- Convert existing invalid or old values
UPDATE "payments" SET payment_method = 'transfer' WHERE payment_method = 'bank_transfer';
UPDATE "payments" SET payment_method = 'checks' WHERE payment_method = 'check';

UPDATE "contracts" SET payment_method = 'transfer' WHERE payment_method = 'bank_transfer';
UPDATE "contracts" SET payment_method = 'checks' WHERE payment_method = 'check';

-- Default unknown values to 'other'
UPDATE "payments" SET payment_method = 'other' WHERE payment_method NOT IN ('transfer', 'checks', 'cash', 'bit', 'paybox', 'other') AND payment_method IS NOT NULL;
UPDATE "contracts" SET payment_method = 'other' WHERE payment_method NOT IN ('transfer', 'checks', 'cash', 'bit', 'paybox', 'other') AND payment_method IS NOT NULL;

-- Create the ENUM type if it doesn't exist
DO $$ BEGIN
    CREATE TYPE "public"."payment_method_enum" AS ENUM('transfer', 'checks', 'cash', 'bit', 'paybox', 'other');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Alter columns to use the new ENUM
ALTER TABLE "contracts" ALTER COLUMN "payment_method" TYPE "public"."payment_method_enum" USING "payment_method"::"public"."payment_method_enum";
ALTER TABLE "payments" ALTER COLUMN "payment_method" TYPE "public"."payment_method_enum" USING "payment_method"::"public"."payment_method_enum";
