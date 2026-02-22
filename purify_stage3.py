filename = 'stage3_full_migrations.sql'
with open(filename, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Stage 3 should start from actual migrations, not re-defining helper functions
# I will remove the foundational block at the start (lines 1 to 106 approx)
new_lines = []
skip = False
for line in lines:
    if "-- STAGE 3: CHRONOLOGICAL MIGRATIONS" in line:
        skip = False
    if line.startswith("-- ============================================") and not skip:
        # Check if this is the start header
        if "TYPE FOUNDATION" in line or "HELPER FUNCTIONS" in line:
            skip = True
            continue
    if not skip:
        new_lines.append(line)

# Add Pre-Flight Schema Check to the top of Stage 3
preflight = """-- ============================================
-- PRE-FLIGHT SCHEMA ENFORCEMENT
-- ============================================
DO $$ 
BEGIN
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS first_name TEXT;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS last_name TEXT;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS phone TEXT;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS marketing_consent BOOLEAN DEFAULT FALSE;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS marketing_consent_at TIMESTAMPTZ;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS deleted_at TIMESTAMPTZ;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS subscription_plan TEXT;
    ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS plan_id TEXT;
EXCEPTION WHEN OTHERS THEN 
    NULL; 
END $$;
"""

with open(filename, 'w', encoding='utf-8') as f:
    f.write(preflight + "\n" + "".join(new_lines))
