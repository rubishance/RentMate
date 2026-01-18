-- Identify duplicates properties (same address, city, user_id)
-- Using array_agg with ORDER BY created_at to keep the oldest record
WITH duplicates AS (
  SELECT
    address,
    city,
    user_id,
    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
    array_agg(id) as all_ids
  FROM properties
  GROUP BY address, city, user_id
  HAVING COUNT(*) > 1
),
busted_duplicates AS (
  SELECT
    keep_id,
    unnest(all_ids) as duplicate_id
  FROM duplicates
)
-- 1. Update Tenants to point to the kept property
UPDATE tenants
SET property_id = bd.keep_id
FROM busted_duplicates bd
WHERE tenants.property_id = bd.duplicate_id
AND tenants.property_id != bd.keep_id;

-- 2. Update Contracts to point to the kept property
-- Re-calculate duplicates for safety in this transaction block step
WITH duplicates AS (
  SELECT
    address,
    city,
    user_id,
    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
    array_agg(id) as all_ids
  FROM properties
  GROUP BY address, city, user_id
  HAVING COUNT(*) > 1
),
busted_duplicates AS (
  SELECT
    keep_id,
    unnest(all_ids) as duplicate_id
  FROM duplicates
)
UPDATE contracts
SET property_id = bd.keep_id
FROM busted_duplicates bd
WHERE contracts.property_id = bd.duplicate_id
AND contracts.property_id != bd.keep_id;

-- 3. Delete the duplicate properties
WITH duplicates AS (
  SELECT
    address,
    city,
    user_id,
    (array_agg(id ORDER BY created_at ASC))[1] as keep_id,
    array_agg(id) as all_ids
  FROM properties
  GROUP BY address, city, user_id
  HAVING COUNT(*) > 1
)
DELETE FROM properties
WHERE id IN (
    SELECT unnest(all_ids) FROM duplicates
) AND id NOT IN (
    SELECT keep_id FROM duplicates
);
