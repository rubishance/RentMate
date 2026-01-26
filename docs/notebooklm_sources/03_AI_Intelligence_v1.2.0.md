# RentMate Chat AI Intelligence - v1.2.0

This document outlines the technical tools and logic available to the RentMate AI chatbot.

## Integration Architecture
- **Engine**: OpenAI GPT-4o-mini
- **Channel**: Supabase Edge Functions with secure JWT authentication.
- **Context**: Dynamic knowledge base injection + User-specific database tools.

## Available Agent Tools

### 1. Financial & Tenant Tools
- `search_contracts`: Search active/past rental agreements.
- `get_financial_summary`: Monthly/Yearly income summaries.
- `check_expiring_contracts`: Alerts for upcoming renewals.
- `get_tenant_details`: Fetching contact info for tenants.

### 2. Document & Folder Organization
- `list_properties`: Identification of user assets.
- `list_folders`: Querying existing categories (e.g., 'utility_water').
- `create_folder`: Dynamic creation of new organization units.
- `organize_document`: Metadata linking for uploaded files.

### 3. Economic Index & Math
- `get_index_rates`: Fetches historical CBS values (CPI, Housing, Construction, Exchange Rates).
- `calculate_rent_linkage`: Mathematical engine to determine rent updates based on index fluctuations.

### 4. Maintenance & Operations
- `search_maintenance_records`: Historical search for repair tickets and costs.
- `log_maintenance_expense`: Manual entry of operational costs without a physical file.

## Privacy Guardrails
1. **Implicit Consent**: Tools check for the `ai_data_consent` flag in `user_preferences`.
2. **Data Isolation**: All queries are scoped to the `auth.uid()` of the requester via RLS policies.
3. **Training Opt-Out**: Data sent to the AI is used for real-time inference only and is NOT used for model training.
