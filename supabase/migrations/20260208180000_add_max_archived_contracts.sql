-- Add max_archived_contracts column to subscription_plans table
ALTER TABLE subscription_plans ADD COLUMN IF NOT EXISTS max_archived_contracts INTEGER;

-- Update existing plans with new limits
-- Starter Plan (assuming id='starter' or name like '%Starter%')
UPDATE subscription_plans 
SET max_archived_contracts = 3 
WHERE id = 'starter';

-- Pro Plan (assuming id='pro' or name like '%Pro%')
UPDATE subscription_plans 
SET max_archived_contracts = 15 
WHERE id = 'pro';

-- Ensure Free plan is handled (though logic is code-side for total count)
UPDATE subscription_plans 
SET max_archived_contracts = 1 
WHERE id = 'free';
