import os
import re

STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
PROD_PROJECT = "qfvrekvugdjnwhnaucmz"

def project_sync(filename):
    if not os.path.exists(filename):
        return
    
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Replace hardcoded project references
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)
    
    # 2. Fix the specific vault.secrets.value error
    # Target: (SELECT value FROM vault.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1)
    # Replace with: COALESCE(current_setting('app.settings.service_role_key', true), '')
    vault_pattern = r"\(SELECT value FROM vault\.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1\)"
    content = re.sub(vault_pattern, "COALESCE(current_setting('app.settings.service_role_key', true), '')", content)
    
    # Also handle system_settings variants
    system_settings_pattern = r"\(SELECT value FROM system_settings WHERE key = 'supabase_service_role_key'\)"
    content = re.sub(system_settings_pattern, "COALESCE(current_setting('app.settings.service_role_key', true), '')", content)

    # 3. Fix get_supabase_config variants if they exist
    # If get_supabase_config('supabase_service_role_key') is used, it should be fine if it exists, 
    # but we can also use the setting as a fallback
    
    with open(filename, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Project synced and vault fixed in {filename}")

for f in ['stage1_foundation.sql', 'stage3_full_migrations.sql']:
    project_sync(f)
