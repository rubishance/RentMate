# RentMate Chat Backend - v1.0

This file describes the internal tools and logic available to the RentMate AI chatbot.

## Core Capabilities
The chatbot is integrated with Supabase and OpenAI, allowing it to perform live database operations on behalf of the user.

## Tool Definitions (FUNCTION_TOOLS)

### 1. search_contracts
- **Description**: Search for rental contracts including tenant names and property addresses.
- **Parameters**: `query` (string)

### 2. get_financial_summary
- **Description**: Get income/expense summary for a period.
- **Periods**: `current_month`, `last_month`, `year_to_date`, `last_year`.

### 3. check_expiring_contracts
- **Description**: Find contracts ending within a specified threshold (default 90 days).

### 4. get_tenant_details
- **Description**: Fetch contact info for a specific tenant.

### 5. list_properties
- **Description**: List all properties owned by the user (IDs and Addresses).

### 6. list_folders
- **Description**: List document folders for a specific property.

### 7. create_folder
- **Description**: Create a new document folder (e.g., "Electricity Bills").

### 8. organize_document
- **Description**: Link an uploaded file path to a property and folder record.

### 9. get_index_rates
- **Description**: Fetch historical values for CPI, Housing, Construction, USD, and EUR.

### 10. calculate_rent_linkage
- **Description**: Automatically calculates rent increases between two dates based on an index.

### 11. search_maintenance_records
- **Description**: Search for past repair history and costs.

### 12. log_maintenance_expense
- **Description**: Manually record a repair cost in the database without requiring a file upload.

## Privacy & Security
- **Consent**: All personal data tools check for `ai_data_consent` in `user_preferences`.
- **Authorization**: Tools use the user's JWT token to ensure they only access their own properties and contracts.
- **Encryption**: Files are stored in the `secure_documents` bucket with RLS policies mapping to the `auth.uid()`.
