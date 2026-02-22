import re

def clean_sql(filename, output):
    with open(filename, 'r', encoding='utf-8') as f:
        content = f.read()
    
    # 1. Remove hardcoded production references
    PROD_PROJECT = "qfvrekvugdjnwhnaucmz"
    STAGING_PROJECT = "tipnjnfbbnbskdlodrww"
    content = content.replace(PROD_PROJECT, STAGING_PROJECT)

    # 2. Fix the specific vault.secrets.value error by making it safe
    content = re.sub(r"\(SELECT value FROM vault\.secrets WHERE name = 'SERVICE_ROLE_KEY' LIMIT 1\)", "COALESCE(current_setting('app.settings.service_role_key', true), '')", content)
    
    # 3. Strip massive data inserts (already done by simplified_baseline but being thorough)
    content = re.sub(r"INSERT INTO index_data.*?;", "-- [Indices Data Removed for Brevity]", content, flags=re.DOTALL)
    
    # 4. Remove the broken trigger calls that rely on external vault if not needed for base setup
    # Or just make them safe
    
    with open(output, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f"Cleaned baseline saved to {output}")

clean_sql('simplified_baseline.sql', 'staging_unified_baseline.sql')
