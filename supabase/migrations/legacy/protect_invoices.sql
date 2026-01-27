-- ============================================
-- PROTECT INVOICES & DATA RETENTION
-- ============================================

-- 1. Modify Invoices to survive User Deletion
-- We drop the "Cascade" constraint and replace it with "Set Null"
ALTER TABLE invoices
DROP CONSTRAINT invoices_user_id_fkey;

ALTER TABLE invoices
ADD CONSTRAINT invoices_user_id_fkey
FOREIGN KEY (user_id)
REFERENCES user_profiles(id)
ON DELETE SET NULL;

-- 2. Add "Snapshot" fields
-- If the user is deleted, "user_id" becomes NULL.
-- We need these text fields to know who the invoice was for (Tax Law Requirement).
ALTER TABLE invoices
ADD COLUMN IF NOT EXISTS billing_name TEXT,
ADD COLUMN IF NOT EXISTS billing_email TEXT,
ADD COLUMN IF NOT EXISTS billing_address TEXT;

-- 3. Update existing invoices (Backfill)
-- Copy current profile data into the snapshot fields so we don't lose it.
UPDATE invoices i
SET 
  billing_name = p.full_name,
  billing_email = p.email
FROM user_profiles p
WHERE i.user_id = p.id;

-- 4. Automatic Snapshot Trigger
-- Whenever a new invoice is created, automatically copy the user's details 
-- into the billing fields. This ensures data integrity even if the user changes later.
CREATE OR REPLACE FUNCTION snapshot_invoice_details()
RETURNS TRIGGER AS $$
BEGIN
    -- Only update if not provided manually
    IF NEW.billing_name IS NULL OR NEW.billing_email IS NULL THEN
        SELECT full_name, email INTO NEW.billing_name, NEW.billing_email
        FROM user_profiles
        WHERE id = NEW.user_id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS on_invoice_created ON invoices;
CREATE TRIGGER on_invoice_created
    BEFORE INSERT ON invoices
    FOR EACH ROW
    EXECUTE FUNCTION snapshot_invoice_details();
