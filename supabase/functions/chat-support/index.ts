// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const OPENAI_API_KEY = Deno.env.get("OPENAI_API_KEY");
const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { detectLanguage, getKnowledgeBase } from "./knowledge.ts";

// Define available functions for OpenAI
const FUNCTION_TOOLS = [
    {
        type: "function",
        function: {
            name: "search_contracts",
            description: "Search for rental contracts. Returns matching contracts. (Read-only)",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "Search term" }
                },
                required: ["query"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_financial_summary",
            description: "Get income/expenses summary for a period. (Read-only)",
            parameters: {
                type: "object",
                properties: {
                    period: { type: "string", enum: ["current_month", "last_month", "year_to_date", "last_year"] }
                },
                required: ["period"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "get_tenant_details",
            description: "Get details for a specific tenant. (Read-only)",
            parameters: {
                type: "object",
                properties: {
                    name_or_email: { type: "string" }
                },
                required: ["name_or_email"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "list_properties",
            description: "List all properties owned by the user. (Read-only)"
        }
    },
    {
        type: "function",
        function: {
            name: "list_folders",
            description: "List all document folders for a property. (Read-only)",
            parameters: {
                type: "object",
                properties: {
                    property_id: { type: "string" }
                },
                required: ["property_id"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "prepare_add_payment",
            description: "Prepare an 'Add Payment' form for the user to review and save. Use this AFTER user confirms intent. (Hebrew: הכן טופס תשלום).",
            parameters: {
                type: "object",
                properties: {
                    contract_id: { type: "string", description: "The UUID of the contract" },
                    amount: { type: "number" },
                    due_date: { type: "string", description: "YYYY-MM-DD" },
                    status: { type: "string", enum: ["pending", "paid", "overdue"] },
                    desc: { type: "string" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "prepare_add_maintenance",
            description: "Prepare an 'Add Maintenance Expense' form. Use this AFTER user confirms intent. (Hebrew: הכן טופס הוצאת תחזוקה).",
            parameters: {
                type: "object",
                properties: {
                    property_id: { type: "string" },
                    amount: { type: "number" },
                    description: { type: "string" },
                    vendor_name: { type: "string" },
                    issue_type: { type: "string" },
                    date: { type: "string", description: "YYYY-MM-DD" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "prepare_add_property",
            description: "Prepare an 'Add Property' form. (Hebrew: הכן טופס הוספת נכס). Use this to extract property details from natural language.",
            parameters: {
                type: "object",
                properties: {
                    address: { type: "string", description: "The street address and house number (e.g., 'רוטשילד 22')" },
                    city: { type: "string", description: "The city name (e.g., 'תל אביב')" },
                    property_type: { type: "string", enum: ["apartment", "house", "studio", "office", "warehouse", "parking"], description: "The type of asset" },
                    rooms: { type: "number", description: "Number of rooms" },
                    size_sqm: { type: "number", description: "Area in square meters" },
                    has_parking: { type: "boolean" },
                    has_storage: { type: "boolean" },
                    has_balcony: { type: "boolean" },
                    has_safe_room: { type: "boolean" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "prepare_add_tenant",
            description: "Prepare an 'Add Tenant' form. (Hebrew: הכן טופס הוספת שוכר).",
            parameters: {
                type: "object",
                properties: {
                    name: { type: "string" },
                    email: { type: "string" },
                    phone: { type: "string" },
                    property_id: { type: "string" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "prepare_add_contract",
            description: "Prepare the 'Add Contract' wizard. (Hebrew: הכן טופס הוספת חוזה). Use this to extract contract and property details from natural language.",
            parameters: {
                type: "object",
                properties: {
                    property_id: { type: "string", description: "UUID of an existing property if known" },
                    address: { type: "string", description: "The street address and house number (e.g., 'רוטשילד 22')" },
                    city: { type: "string", description: "The city name (e.g., 'תל אביב')" },
                    property_type: { type: "string", enum: ["apartment", "house", "studio", "office", "warehouse", "parking"], description: "The type of asset" },
                    rooms: { type: "number", description: "Number of rooms" },
                    size_sqm: { type: "number", description: "Area in square meters" },
                    has_parking: { type: "boolean" },
                    has_storage: { type: "boolean" },
                    has_balcony: { type: "boolean" },
                    has_safe_room: { type: "boolean" },
                    tenant_name: { type: "string" },
                    monthly_rent: { type: "number" },
                    currency: { type: "string", enum: ["ILS", "USD", "EUR"] },
                    start_date: { type: "string", description: "YYYY-MM-DD" },
                    end_date: { type: "string", description: "YYYY-MM-DD" },
                    signing_date: { type: "string", description: "YYYY-MM-DD" },
                    payment_frequency: { type: "string", enum: ["monthly", "quarterly", "bi_annually", "annually"] },
                    payment_day: { type: "number", description: "1-31" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "prepare_create_folder",
            description: "Prepare a 'Create Folder' form.",
            parameters: {
                type: "object",
                properties: {
                    property_id: { type: "string" },
                    name: { type: "string" },
                    category: { type: "string" }
                },
                required: ["property_id", "name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "calculate_rent_linkage",
            description: "Calculate rent increase based on index. (Read-only calculation, no DB write).",
            parameters: {
                type: "object",
                properties: {
                    base_rent: { type: "number" },
                    linkage_type: { type: "string", enum: ["cpi", "housing", "construction", "usd", "eur"] },
                    base_date: { type: "string", description: "YYYY-MM" },
                    target_date: { type: "string", description: "YYYY-MM" }
                },
                required: ["base_rent", "linkage_type", "base_date", "target_date"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "organize_document",
            description: "Move an uploaded document to a specific property and folder/category. (Hebrew: ארגן מסמך).",
            parameters: {
                type: "object",
                properties: {
                    property_id: { type: "string" },
                    folder_id: { type: "string", description: "Optional folder UUID" },
                    storage_path: { type: "string", description: "The temporary path returned by the upload" },
                    file_name: { type: "string" },
                    category: { type: "string", description: "Target category (e.g., utility_water, maintenance)" }
                },
                required: ["property_id", "storage_path", "file_name"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "trigger_human_support",
            description: "Escalate the conversation to a human support agent. Use this if the user is frustrated, angry, or specifically asks for a real person. (Hebrew: העבר לנציג אנושי).",
            parameters: {
                type: "object",
                properties: {
                    reason: { type: "string", description: "Why are we handing over to a human?" }
                }
            }
        }
    },
    {
        type: "function",
        function: {
            name: "generate_whatsapp_message",
            description: "Generate a professional WhatsApp message for a tenant. Use this for rent reminders, linkage updates, or general property updates. (Hebrew: הפק הודעת וואטסאפ).",
            parameters: {
                type: "object",
                properties: {
                    tenant_name: { type: "string" },
                    type: { type: "string", enum: ["rent_reminder", "linkage_update", "maintenance_update", "general"] },
                    amount: { type: "number", description: "Optional: Amount for rent or linkage" },
                    property_name: { type: "string" }
                },
                required: ["tenant_name", "type"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "debug_entity",
            description: "Diagnostic tool for admins to inspect database records. (Hebrew: כלי אבחון למנהלים).",
            parameters: {
                type: "object",
                properties: {
                    table: { type: "string", enum: ["contracts", "payments", "properties", "user_profiles"] },
                    filter_column: { type: "string" },
                    filter_value: { type: "string" }
                },
                required: ["table", "filter_column", "filter_value"]
            }
        }
    }
];

// Function implementations
// Function implementations
async function checkConsent(userId: string, supabase: any) {
    console.log(`Checking AI consent for user: ${userId}`);

    // EXCEPTION: Admins and Super Admins bypass the consent check for diagnostic/support purposes
    const { data: profile } = await supabase.from('user_profiles').select('role, is_super_admin').eq('id', userId).single();
    if (profile?.role === 'admin' || profile?.is_super_admin === true) {
        console.log(`Admin bypass for user ${userId}`);
        return true;
    }

    const { data: preferences, error } = await supabase
        .from('user_preferences')
        .select('ai_data_consent')
        .eq('user_id', userId)
        .single();

    if (error) {
        console.error(`Error fetching preferences for ${userId}:`, error);
        return false;
    }

    const hasConsent = preferences?.ai_data_consent === true;
    console.log(`Consent result for ${userId}: ${hasConsent}`);

    // Default to false if no record found, requiring explicit consent
    return hasConsent;
}

async function searchContracts(query: string, userId: string) {
    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        const hasConsent = await checkConsent(userId, supabase);
        if (!hasConsent) {
            return { success: false, message: `AI access is disabled. Debug ID: ${userId}. Please enable 'AI Data Access' in Settings > Privacy.` };
        }

        // Timeout wrapper logic
        const searchLogic = async () => {
            // Fetch all active contracts for the user (limit 100 for performance)
            // We fetch more data and filter in-memory to support complex search (JSONB, joins, etc.)
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    id, start_date, end_date, base_rent, status, property_id,
                    properties!inner(address, city, property_type),
                    tenants
                `)
                .eq('user_id', userId)
                .order('start_date', { ascending: false })
                .limit(100);

            if (error) {
                console.error("Search error:", error);
                return { success: false, message: `Database error: ${error.message}` };
            }

            let results = data || [];

            // Apply robust in-memory search if query provided
            if (query && query.trim() !== '') {
                const terms = query.trim().toLowerCase().split(/\s+/);

                results = results.filter((contract: any) => {
                    // Build a searchable string from all relevant fields
                    const address = contract.properties?.address?.toLowerCase() || '';
                    const city = contract.properties?.city?.toLowerCase() || '';
                    const type = contract.properties?.property_type?.toLowerCase() || '';
                    const status = contract.status?.toLowerCase() || '';

                    // Extract tenant names from JSONB
                    let tenantNames = '';
                    if (Array.isArray(contract.tenants)) {
                        tenantNames = contract.tenants.map((t: any) => t.name?.toLowerCase() || '').join(' ');
                    } else if (typeof contract.tenants === 'object' && contract.tenants !== null) {
                        // Handle single object case if schema varies
                        tenantNames = (contract.tenants as any).name?.toLowerCase() || '';
                    }

                    const searchableText = `${address} ${city} ${type} ${status} ${tenantNames}`;

                    // Check if ALL terms match the searchable text (AND logic for terms)
                    return terms.every(term => searchableText.includes(term));
                });
            }

            if (results.length === 0) {
                return { success: false, message: `לא נמצאו חוזים התואמים את החיפוש "${query}".` };
            }

            // Return simplified results (Top 5)
            const mappedResults = results.slice(0, 5).map((contract: any) => ({
                id: contract.id,
                address: `${contract.properties?.address || ''}, ${contract.properties?.city || ''}`,
                type: contract.properties?.property_type,
                rent: `₪${contract.base_rent}`,
                period: `${contract.start_date} עד ${contract.end_date}`,
                status: contract.status,
                tenants: contract.tenants
            }));

            return {
                success: true,
                count: mappedResults.length,
                message: `נמצאו ${mappedResults.length} חוזים`,
                contracts: mappedResults
            };
        };

        const timeoutPromise = new Promise((_, reject) =>
            setTimeout(() => reject(new Error("Search timed out")), 15000)
        );

        const result = await Promise.race([searchLogic(), timeoutPromise]) as any;

        // Log Security Audit
        const auditPromise = supabase.rpc('log_ai_contract_audit', {
            p_user_id: userId,
            p_action: 'AI_SEARCH_CONTRACTS',
            p_details: { query, results_count: result.count || 0 }
        }).then(({ error }) => {
            if (error) console.error("Audit log failed:", error);
        });

        if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
            EdgeRuntime.waitUntil(auditPromise);
        }

        return result;

    } catch (err) {
        console.error("Function error:", err);
        return { success: false, message: "שגיאה בחיפוש חוזים (Timeout or Error)" };
    }
}

async function getFinancialSummary(period: string, userId: string, currency: string = 'ILS') {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const hasConsent = await checkConsent(userId, supabase);
    if (!hasConsent) {
        return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
    }

    const startDate = new Date();
    const endDate = new Date();

    if (period === 'current_month') {
        startDate.setDate(1);
    } else if (period === 'last_month') {
        startDate.setMonth(startDate.getMonth() - 1);
        startDate.setDate(1);
        endDate.setDate(0); // Last day of previous month
    } else if (period === 'year_to_date') {
        startDate.setMonth(0);
        startDate.setDate(1);
    } else if (period === 'last_year') {
        startDate.setFullYear(startDate.getFullYear() - 1);
        startDate.setMonth(0);
        startDate.setDate(1);
        endDate.setFullYear(endDate.getFullYear() - 1);
        endDate.setMonth(11);
        endDate.setDate(31);
    }

    const { data, error } = await supabase
        .from('payments')
        .select('amount, status, payment_date:paid_date')
        // Using a join would be better but requires knowing schema perfectly. 
        // We act on behalf of user, so we filter by contracts belonging to user.
        // Assuming RLS or a join is needed. Let's do a join via contract_id which is cleaner if defined.
        // However, we can also filter by fetching user's contract IDs first.
        .in('contract_id', (await supabase.from('contracts').select('id').eq('user_id', userId)).data?.map(c => c.id) || [])
        .eq('status', 'paid')
        .eq('currency', currency)
        .gte('paid_date', startDate.toISOString())
        .lte('paid_date', endDate.toISOString());

    if (error) return { success: false, message: error.message };

    const total = data.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    // Log Security Audit
    // Log Security Audit (Non-blocking)
    const auditPromise = supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_FINANCIAL_SUMMARY',
        p_details: { period, currency, total_income: total, transactions: data.length }
    }).then(({ error }) => {
        if (error) console.error("Audit log failed:", error);
    });

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(auditPromise);
    }

    return {
        success: true,
        period,
        currency,
        total_income: total,
        transaction_count: data.length
    };
}

async function checkExpiringContracts(daysThreshold: number, userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const hasConsent = await checkConsent(userId, supabase);
    if (!hasConsent) {
        return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
    }

    // We want contracts ending between NOW and NOW + threshold
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysThreshold);

    const { data, error } = await supabase
        .from('contracts')
        .select('*, tenant:tenants(name)') // Assuming relation
        .eq('user_id', userId)
        .eq('status', 'active')
        .lte('end_date', futureDate.toISOString())
        .gte('end_date', today.toISOString());

    if (error) return { success: false, message: error.message };

    // Log Security Audit
    // Log Security Audit (Non-blocking)
    const auditPromise = supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_CHECK_EXPIRING_CONTRACTS',
        p_details: { days_threshold: daysThreshold, count: data.length }
    }).then(({ error }) => {
        if (error) console.error("Audit log failed:", error);
    });

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(auditPromise);
    }

    return {
        success: true,
        count: data.length,
        expiring_contracts: data.map(c => ({
            id: c.id,
            tenant: c.tenant?.name || 'Unknown',
            end_date: c.end_date,
            rent: c.monthly_rent
        }))
    };
}

async function getTenantDetails(nameOrEmail: string, userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const hasConsent = await checkConsent(userId, supabase);
    if (!hasConsent) {
        return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
    }

    // Search in tenants table
    const { data, error } = await supabase
        .from('tenants')
        .select('*')
        // We must filter by user's properties/contracts ideally. 
        // Assuming tenants table has user_id or linked via contracts.
        // Let's assume tenants are global but linked to contracts? 
        // Actually, looking at migrations, tenants might be a separate table or just profiles.
        // Let's safe set only tenants related to USER's contracts.
        .in('id', (
            await supabase.from('contracts').select('tenant_id').eq('user_id', userId)
        ).data?.map(c => c.tenant_id) || [])
        .or(`name.ilike.%${nameOrEmail}%,email.ilike.%${nameOrEmail}%`)
        .limit(5);

    if (error) return { success: false, message: error.message };

    // Log Security Audit
    // Log Security Audit (Non-blocking)
    const auditPromise = supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_GET_TENANT_DETAILS',
        p_details: { name_or_email: nameOrEmail, found: data.length > 0 }
    }).then(({ error }) => {
        if (error) console.error("Audit log failed:", error);
    });

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(auditPromise);
    }

    return {
        success: true,
        tenants: data
    };
}

async function listProperties(userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const hasConsent = await checkConsent(userId, supabase);
    if (!hasConsent) {
        return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
    }

    const { data, error } = await supabase
        .from('properties')
        .select('id, address, title')
        .eq('user_id', userId);

    if (error) return { success: false, message: error.message };
    return { success: true, properties: data };
}

async function listFolders(propertyId: string, userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const hasConsent = await checkConsent(userId, supabase);
    if (!hasConsent) {
        return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
    }

    // Validation: make sure property belongs to user
    const { data: prop } = await supabase.from('properties').select('id').eq('id', propertyId).eq('user_id', userId).single();
    if (!prop) return { success: false, message: "Property not found or access denied." };

    const { data, error } = await supabase
        .from('document_folders')
        .select('id, name, category')
        .eq('property_id', propertyId);

    if (error) return { success: false, message: error.message };
    return { success: true, folders: data };
}

async function createFolder(propertyId: string, name: string, category: string, userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    // Validation
    const { data: prop } = await supabase.from('properties').select('id').eq('id', propertyId).eq('user_id', userId).single();
    if (!prop) return { success: false, message: "Property not found or access denied." };

    const { data, error } = await supabase
        .from('document_folders')
        .insert({ property_id: propertyId, name, category: category || 'other' })
        .select()
        .single();

    if (error) return { success: false, message: error.message };
    return { success: true, folder: data };
}

async function organizeDocument(args: any, userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { property_id, folder_id, storage_path, file_name, category } = args;

    const hasConsent = await checkConsent(userId, supabase);
    if (!hasConsent) {
        return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
    }

    // Validation
    const { data: prop } = await supabase.from('properties').select('id').eq('id', property_id).eq('user_id', userId).single();
    if (!prop) return { success: false, message: "Property not found or access denied." };

    const { data, error } = await supabase
        .from('property_documents')
        .insert({
            user_id: userId,
            property_id,
            folder_id: folder_id || null,
            storage_bucket: 'secure_documents',
            storage_path,
            file_name,
            category: category || 'other',
            document_date: new Date().toISOString().split('T')[0]
        })
        .select()
        .single();

    if (error) return { success: false, message: error.message };
    return { success: true, document: data, message: "Document successfully organized!" };
}

async function getIndexRates(indexType: string, startDate?: string, endDate?: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    let query = supabase
        .from('index_data')
        .select('date, value')
        .eq('index_type', indexType)
        .order('date', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query.limit(24);

    if (error) return { success: false, message: error.message };

    return {
        success: true,
        index_type: indexType,
        rates: data
    };
}

async function calculateRentLinkage(args: any, userId: string | null) {
    const { base_rent, linkage_type, base_date, target_date } = args;
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    // ... fetching index data ...
    // (I'll just replace the whole function block to be safe)

    // Fetch base index
    const { data: baseData } = await supabase
        .from('index_data')
        .select('value')
        .eq('index_type', linkage_type)
        .eq('date', base_date)
        .single();

    // Fetch target index
    const { data: targetData } = await supabase
        .from('index_data')
        .select('value')
        .eq('index_type', linkage_type)
        .eq('date', target_date)
        .single();

    if (!baseData || !targetData) {
        return {
            success: false,
            message: `Could not find index values for the specified dates. (Base: ${baseData ? 'Found' : 'Missing'}, Target: ${targetData ? 'Found' : 'Missing'})`
        };
    }

    const baseVal = Number(baseData.value);
    const targetVal = Number(targetData.value);
    const newRent = (base_rent * (targetVal / baseVal)).toFixed(2);
    const delta = (Number(newRent) - base_rent).toFixed(2);
    const percentage = ((targetVal / baseVal - 1) * 100).toFixed(2);

    // Log Security Audit
    // Log Security Audit (Non-blocking)
    const auditPromise = supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_CALCULATE_LINKAGE',
        p_details: { ...args, result: newRent }
    }).then(({ error }) => {
        if (error) console.error("Audit log failed:", error);
    });

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(auditPromise);
    }

    return {
        success: true,
        base_rent,
        new_rent: Number(newRent),
        increase_amount: Number(delta),
        percentage_increase: `${percentage}%`,
        base_index: baseVal,
        target_index: targetVal
    };
}

async function searchMaintenanceRecords(args: any, userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { property_id, query } = args;

    let dbQuery = supabase
        .from('property_documents')
        .select('*, property:properties(address, title)')
        .eq('user_id', userId)
        .eq('category', 'maintenance');

    if (property_id) dbQuery = dbQuery.eq('property_id', property_id);
    if (query) dbQuery = dbQuery.or(`description.ilike.%${query}%,vendor_name.ilike.%${query}%,issue_type.ilike.%${query}%,title.ilike.%${query}%`);

    const { data, error } = await dbQuery.order('document_date', { ascending: false }).limit(10);

    if (error) return { success: false, message: error.message };

    const results = data.map(r => ({
        date: r.document_date,
        description: r.description || r.title,
        amount: r.amount,
        vendor: r.vendor_name,
        issue: r.issue_type,
        property: r.property?.title || r.property?.address
    }));

    // Log Security Audit
    // Log Security Audit (Non-blocking)
    const auditPromise = supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_SEARCH_MAINTENANCE',
        p_details: { query, results_count: results.length }
    }).then(({ error }) => {
        if (error) console.error("Audit log failed:", error);
    });

    if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
        EdgeRuntime.waitUntil(auditPromise);
    }

    return {
        success: true,
        count: results.length,
        records: results
    };
}

async function logMaintenanceExpense(args: any, userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { property_id, amount, description, vendor_name, issue_type, date } = args;

    // Check property
    const { data: prop } = await supabase.from('properties').select('id').eq('id', property_id).eq('user_id', userId).single();
    if (!prop) return { success: false, message: "Property not found." };

    const { data, error } = await supabase
        .from('property_documents')
        .insert({
            user_id: userId,
            property_id,
            category: 'maintenance',
            amount,
            description,
            vendor_name,
            issue_type,
            document_date: date || new Date().toISOString().split('T')[0],
            storage_bucket: 'secure_documents',
            storage_path: 'manual_entry',
            file_name: 'Manual Entry (No File)'
        })
        .select()
        .single();

    if (error) return { success: false, message: error.message };

    return {
        success: true,
        message: "Maintenance expense logged successfully.",
        record: data
    };
}

async function debugEntity(args: any, userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { table, filter_column, filter_value } = args;

    // SECURITY CHECK: Only admins can use debug tools
    const { data: profile } = await supabase.from('user_profiles').select('role, is_super_admin').eq('id', userId).single();
    const isAdmin = profile?.role === 'admin' || profile?.is_super_admin === true;

    if (!isAdmin) {
        await supabase.from('debug_logs').insert({
            function_name: 'chat-support:debugEntity',
            level: 'error',
            message: `Unauthorized debug attempt on ${table}`,
            details: { userId, args }
        });
        return { success: false, message: "Security Warning: Unauthorized access attempt. Debug tools are for admins only." };
    }

    let query = supabase.from(table).select('*');
    if (filter_column && filter_value) {
        if (filter_value.includes('%')) {
            query = query.ilike(filter_column, filter_value);
        } else {
            query = query.eq(filter_column, filter_value);
        }
    }

    const { data, error } = await query.limit(20);

    if (error) {
        await supabase.from('debug_logs').insert({
            function_name: 'chat-support:debugEntity',
            level: 'error',
            message: `Error querying ${table}`,
            details: { userId, args, error: error.message }
        });
        return { success: false, message: error.message };
    }

    // Log the result for Antigravity's inspection
    await supabase.from('debug_logs').insert({
        function_name: 'chat-support:debugEntity',
        level: 'info',
        message: `Debug results for ${table} (${filter_column}=${filter_value})`,
        details: { userId, args, count: data?.length || 0, results: data }
    });

    return {
        success: true,
        table,
        count: data?.length || 0,
        results: data
    };
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const startTime = Date.now();
        console.log("Chat support function invoked.");

        const logPerf = async (step: string, duration: number, details?: any) => {
            console.log(`[PERF] ${step}: ${duration.toFixed(2)}ms`);
            if (userId) {
                const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
                const logPromise = sb.from('debug_logs').insert({
                    function_name: 'chat-support:perf',
                    level: 'info',
                    message: `Step: ${step}`,
                    details: { ...details, duration, userId }
                }).then(({ error }) => {
                    if (error) console.error("Logging failed:", error);
                }).catch(e => console.error("Logging exception:", e));

                // Use waitUntil to run in background
                if (typeof EdgeRuntime !== 'undefined' && EdgeRuntime.waitUntil) {
                    EdgeRuntime.waitUntil(logPromise);
                } else {
                    // Fallback for local testing or non-Edge environments
                    // We don't await to avoid blocking, but runtime might kill it.
                    // Ideally we await in dev, but for prod speed we fire-and-forget.
                    logPromise;
                }
            }
        };

        // Key check moved after body parsing to allow ping to work without keys

        const body = await req.json().catch(e => {
            console.error("Failed to parse request body:", e);
            return null;
        });

        if (!body || !body.messages) {
            return new Response(JSON.stringify({ error: "Invalid request: messages array is required." }), {
                status: 400,
                headers: { ...corsHeaders, "Content-Type": "application/json" }
            });
        }

        const { messages, conversationId } = body;
        const userContent = messages[messages.length - 1]?.content || '';

        // --- PING TEST (Moved Early) ---
        if (userContent.trim().toLowerCase() === 'ping') {
            console.log("Ping detected, responding with diagnostics.");
            const debugInfo = [];

            // 1. Check AI Keys
            if (OPENAI_API_KEY) debugInfo.push(`OpenAI: OK`);
            else debugInfo.push(`OpenAI: MISSING`);

            if (GEMINI_API_KEY) debugInfo.push(`Gemini: OK`);
            else debugInfo.push(`Gemini: MISSING`);

            if (SUPABASE_SERVICE_ROLE_KEY) debugInfo.push(`Service Role: OK`);
            else debugInfo.push(`Service Role: MISSING`);

            // 2. Check Auth & DB
            try {
                const sbAdmin = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                );

                const authHeader = req.headers.get('Authorization');
                if (authHeader) {
                    const token = authHeader.replace('Bearer ', '');
                    const { data: { user }, error: authError } = await sbAdmin.auth.getUser(token);

                    if (authError) {
                        debugInfo.push(`Auth: Error (${authError.message})`);
                    } else if (user) {
                        debugInfo.push(`User: Found (${user.id.substring(0, 6)}...)`);

                        // 3. Check Preferences Table Access
                        const { data: prefs, error: prefError } = await sbAdmin
                            .from('user_preferences')
                            .select('ai_data_consent')
                            .eq('user_id', user.id)
                            .single();

                        if (prefError) {
                            debugInfo.push(`Prefs DB: Error (${prefError.message}) Code: ${prefError.code}`);
                        } else {
                            debugInfo.push(`Consent Value: ${prefs?.ai_data_consent}`);
                        }
                    } else {
                        debugInfo.push("User: None (Invalid Token?)");
                    }
                } else {
                    debugInfo.push("Auth Header: Missing");
                }
            } catch (e) {
                debugInfo.push(`Exception: ${e.message}`);
            }

            return new Response(
                JSON.stringify({
                    choices: [{ message: { role: "assistant", content: "Pong! Diagnostic Report:\n" + debugInfo.join("\n") } }]
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // --- FORCE CONSENT COMMAND ---
        if (userContent.trim().toLowerCase() === 'force_consent') {
            console.log("Force consent requested.");
            let message = "";
            try {
                const sbAdmin = createClient(
                    Deno.env.get('SUPABASE_URL') ?? '',
                    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
                );
                const authHeader = req.headers.get('Authorization');
                if (authHeader) {
                    const token = authHeader.replace('Bearer ', '');
                    const { data: { user }, error: authError } = await sbAdmin.auth.getUser(token);
                    if (user) {
                        const { error: upsertError } = await sbAdmin
                            .from('user_preferences')
                            .upsert({
                                user_id: user.id,
                                ai_data_consent: true,
                                updated_at: new Date().toISOString()
                            }, { onConflict: 'user_id' });

                        if (upsertError) message = `Failed: ${upsertError.message}`;
                        else message = "Success! AI Consent forced to TRUE.";
                    } else {
                        message = "Error: User not found from token.";
                    }
                } else {
                    message = "Error: No Auth header.";
                }
            } catch (e) {
                message = `Exception: ${e.message}`;
            }

            return new Response(
                JSON.stringify({
                    choices: [{ message: { role: "assistant", content: message } }]
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
            console.error("Critical: AI API Keys missing from environment.");
            throw new Error("Missing AI API Key. Please set OPENAI_API_KEY or GEMINI_API_KEY in Supabase secrets.");
        }

        const authHeader = req.headers.get("authorization");
        console.log("Auth header present:", !!authHeader);

        // Extract user ID from JWT
        let userId = null;
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        if (authHeader) {
            const token = authHeader.replace("Bearer ", "");
            const { data: { user }, error: authError } = await supabase.auth.getUser(token);
            if (authError) {
                console.error("Auth error extracting user:", authError);
            }
            userId = user?.id;
            console.log("Extracted userId from token:", userId);
            await logPerf("auth_extraction", Date.now() - startTime);
        } else {
            console.log("No authorization header provided.");
        }

        // Check usage limits (if user is authenticated)
        if (userId) {
            const { data: usageCheck, error: usageError } = await supabase.rpc('check_ai_chat_usage', {
                p_user_id: userId,
                p_tokens_used: 500 // Estimate, will update after actual usage
            });

            if (usageError) {
                console.error("Usage check error:", usageError);
            } else if (usageCheck && !usageCheck.allowed) {
                // ... message generation ...
                const errorMessage = usageCheck.reason === 'message_limit_exceeded'
                    ? `הגעת למגבלת ההודעות החודשית (${usageCheck.limit} הודעות). שדרג את המנוי שלך להמשך שימוש. / You've reached your monthly message limit (${usageCheck.limit} messages). Please upgrade your subscription.`
                    : `הגעת למגבלת הטוקנים החודשית. שדרג את המנוי שלך. / You've reached your monthly token limit. Please upgrade your subscription.`;

                await logPerf("usage_limit_hit", Date.now() - startTime, { reason: usageCheck.reason });

                return new Response(
                    JSON.stringify({
                        choices: [{
                            message: { role: "assistant", content: errorMessage }
                        }]
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
            await logPerf("usage_check", Date.now() - startTime);
        }

        // Detect user language and load appropriate knowledge base
        const userLanguage = detectLanguage(userContent);
        const knowledgeBase = getKnowledgeBase(userLanguage);

        // Define system prompt based on authentication status
        let systemPrompt = "";

        if (userId) {
            // PRO MODE (Authenticated)
            systemPrompt = `You are a helper for property owners using "RentMate". 
                
ROLE & TONE:
- Professional, helpful, and use CLEAR, SIMPLE language.
- Avoid technical jargon; explain complex property management terms simply.
- Be concise, direct, and natural. Focus on high readability.
- **FORMATTING**: Use bullet points and bold text to highlight key info. Break long paragraphs into short, digestible chunks.
- Expert in RentMate app features and property management.
- LANGUAGE: Respond in the SAME language the user writes in (Hebrew or English).
- **CRITICAL - NO ADVICE**: You are strictly prohibited from giving legal, tax, or financial advice. YOU ARE NOT A LAWYER OR ADVISOR.
- **PRIVACY & PERMISSIONS**: 
  - You have access to the user's properties, contracts, and tenants ONLY through the provided tools.
  - If a tool returns an error saying "AI access to personal data is disabled", inform the user that they must enable "AI Data Access" in **Settings > Privacy** to proceed.
  - NEVER assume access to data outside what the tools provide.

CAPABILITIES:
1. **Knowledge Base**: Answer app-related questions using context.
2. **Data Management**: Search for contracts, summarize financials, and find tenant details using tools.
3. **UI Automation**: Prepare forms for adding properties, tenants, contracts, or payments.
4. **Linkage Calculations**: Calculate rent updates based on Israeli indices.
4. **Extraction Accuracy**: 
   - When adding a property, ALWAYS split Hebrew addresses into \`city\` (e.g., תל אביב) and \`address\` (street and number, e.g., הרצל 10).
   - Extract extra details like rooms (חדרים), size (מ"ר), and features (parking, balcony, etc.) if mentioned.
5. **Clarification Logic**:
   - If the user wants to add a property/contract but CRITICAL information (like city/address or tenant name) is missing, ASK for it before calling the "prepare_" tool.
   - If you have enough to start but some secondary details are missing, call the tool with what you have and tell the user they can finish the rest in the wizard.
6. **Document Organization**: Move uploaded files to property-specific folders using \`organize_document\`.

DIRECTIONS:
- If the user asks about their assets, properties, or adding a bill, ALWAYS start by calling \`list_properties\` to get the available context. This is required even if they have only one asset.

CONTEXT FROM KNOWLEDGE BASE:
${knowledgeBase}`;
        } else {
            // GUEST MODE (Unauthenticated)
            systemPrompt = `You are the RentMate Welcome Assistant. 
            
ROLE:
- You are greeting a potential or new user who is NOT logged in.
- Your ONLY goal is to explain what RentMate does and encourage them to sign up.
- **RESTRICTION**: You cannot see any user data, properties, or contracts.
- **RESTRICTION**: If asked about specific data or to perform actions (like adding a property), politely explain that they need to Sign Up/Login first to use these features.

TONE:
- Welcoming, premium, and encouraging.
- Use CLEAR, PLAIN language (Hebrew or English). Avoid being overly formal or robotic.
- Match user's language choice.

KEY SELLING POINTS (Use when relevant):
- AI Contract Scanning: Extract data from PDFs automatically.
- CPI Linkage Tracking: Never miscalculate a rent increase again.
- Document Vault: Secure storage for all property deeds and receipts.
- Professional Reports: Ready for your accountant.

KNOWLEDGE BASE:
${knowledgeBase}`;
        }

        // Build messages for OpenAI
        const openaiMessages = [
            {
                role: "system",
                content: systemPrompt
            },
            ...messages.map((msg: any) => ({
                role: msg.role,
                content: msg.content
            }))
        ];

        // Only provide tools if user is authenticated
        const activeTools = userId ? FUNCTION_TOOLS : [];

        // Prepare Streaming Response
        const stream = new ReadableStream({
            async start(controller) {
                const send = (data: any) => {
                    controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(data)}\n\n`));
                };

                try {
                    // Initial API call parameters
                    let apiUrl = "https://api.openai.com/v1/chat/completions";
                    let apiKey = OPENAI_API_KEY;
                    let model = "gpt-4o-mini";

                    if (!OPENAI_API_KEY && GEMINI_API_KEY) {
                        apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
                        apiKey = GEMINI_API_KEY;
                        model = "gemini-1.5-flash";
                    }

                    // 1. First Turn: Initial request to AI
                    const aiStartTime = Date.now();
                    let response = await fetch(apiUrl, {
                        method: "POST",
                        headers: {
                            "Authorization": `Bearer ${apiKey}`,
                            "Content-Type": "application/json",
                        },
                        body: JSON.stringify({
                            model: model,
                            messages: openaiMessages,
                            tools: activeTools.length > 0 ? activeTools : undefined,
                            temperature: 0.7,
                            max_tokens: 800,
                            stream: true // ENABLE STREAMING
                        }),
                        signal: AbortSignal.timeout(60000)
                    });

                    if (!response.ok) {
                        const errorText = await response.text();
                        send({ error: `AI Engine Error: ${errorText}` });
                        controller.close();
                        return;
                    }

                    const reader = response.body?.getReader();
                    if (!reader) throw new Error("No response body");

                    let fullContent = "";
                    let currentToolCall: any = null;
                    let lastUsage: any = null;

                    // Stream Processing Loop
                    const decoder = new TextDecoder();
                    while (true) {
                        const { done, value } = await reader.read();
                        if (done) break;

                        const chunk = decoder.decode(value);
                        const lines = chunk.split("\n");

                        for (const line of lines) {
                            if (line.startsWith("data: ") && line !== "data: [DONE]") {
                                try {
                                    const json = JSON.parse(line.substring(6));
                                    const delta = json.choices[0]?.delta;

                                    if (delta?.content) {
                                        fullContent += delta.content;
                                        send({ t: "text", v: delta.content });
                                    }

                                    if (delta?.tool_calls) {
                                        if (!currentToolCall) {
                                            currentToolCall = { id: delta.tool_calls[0].id, name: delta.tool_calls[0].function.name, args: "" };
                                        }
                                        currentToolCall.args += delta.tool_calls[0].function.arguments || "";
                                    }

                                    if (json.usage) lastUsage = json.usage;
                                } catch (e) {
                                    // Ignore partial JSON lines
                                }
                            }
                        }
                    }

                    await logPerf(`ai_first_turn_stream_${model}`, Date.now() - aiStartTime);

                    // 2. Handle Tool Calls if any
                    if (currentToolCall) {
                        const functionName = currentToolCall.name;
                        const functionArgs = JSON.parse(currentToolCall.args || "{}");

                        send({ t: "status", v: `Using tool: ${functionName}...` });

                        let functionResult;
                        const toolStartTime = Date.now();

                        if (!userId) {
                            functionResult = { success: false, message: "Auth required" };
                        } else {
                            // Unified tool execution logic (from old implementation)
                            if (functionName === "search_contracts") functionResult = await searchContracts(functionArgs.query, userId);
                            else if (functionName === "get_financial_summary") functionResult = await getFinancialSummary(functionArgs.period, userId, functionArgs.currency);
                            else if (functionName === "get_tenant_details") functionResult = await getTenantDetails(functionArgs.name_or_email, userId);
                            else if (functionName === "list_properties") functionResult = await listProperties(userId);
                            else if (functionName === "list_folders") functionResult = await listFolders(functionArgs.property_id, userId);
                            else if (functionName === "organize_document") functionResult = await organizeDocument(functionArgs, userId);
                            else if (functionName === "calculate_rent_linkage") functionResult = await calculateRentLinkage(functionArgs, userId);
                            else if (functionName === "debug_entity") functionResult = await debugEntity(functionArgs, userId);
                            else if (functionName === "trigger_human_support") {
                                send({ t: "ui", v: { action: "TRIGGER_HUMAN", data: functionArgs } });
                                send({ t: "text", v: "I am connecting you to a human agent now. One moment please..." });
                                controller.close();
                                return;
                            } else if (functionName === "generate_whatsapp_message") {
                                const { tenant_name, type, amount, property_name } = functionArgs;
                                let text = `שלום ${tenant_name}, `;

                                if (type === 'rent_reminder') {
                                    text += `רק מזכיר שהגיע מועד תשלום השכירות${property_name ? ` עבור ${property_name}` : ''}${amount ? ` על סך ₪${amount}` : ''}. תודה!`;
                                } else if (type === 'linkage_update') {
                                    text += `מעדכן שבוצעה הצמדה למדד${property_name ? ` בנכס ${property_name}` : ''}. השכירות המעודכנת היא ₪${amount}. המשך יום נעים!`;
                                } else if (type === 'maintenance_update') {
                                    text += `עדכון לגבי התיקון ${property_name ? `בנכס ${property_name}` : ''}: העבודה הושלמה. תודה על הסבלנות!`;
                                } else {
                                    text += `מה שלומך? אשמח לדבר איתך לגבי ${property_name || 'הדירה'}. תודה!`;
                                }

                                send({ t: "text", v: `הפקתי עבורך הודעת וואטסאפ מוכנה:\n\n"${text}"\n\nאתה יכול להעתיק אותה ולשלוח לשוכר.` });
                                controller.close();
                                return;
                            }
                            else if (functionName.startsWith("prepare_")) {
                                send({ t: "ui", v: { action: "OPEN_MODAL", modal: functionName.replace("prepare_add_", "").replace("prepare_", ""), data: functionArgs } });
                                // Don't close yet, AI might want to say something
                                functionResult = { success: true, message: "Form prepared" };
                            }
                        }

                        await logPerf(`tool_execution_${functionName}`, Date.now() - toolStartTime);

                        // Second Turn with tool result
                        openaiMessages.push({ role: "assistant", content: null, tool_calls: [{ id: currentToolCall.id, type: "function", function: { name: functionName, arguments: currentToolCall.args } }] });
                        openaiMessages.push({ role: "tool", tool_call_id: currentToolCall.id, content: JSON.stringify(functionResult) });

                        const secondResponse = await fetch(apiUrl, {
                            method: "POST",
                            headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                            body: JSON.stringify({ model, messages: openaiMessages, stream: true }),
                        });

                        const secondReader = secondResponse.body?.getReader();
                        if (secondReader) {
                            while (true) {
                                const { done, value } = await secondReader.read();
                                if (done) break;
                                const chunk = decoder.decode(value);
                                const lines = chunk.split("\n");
                                for (const line of lines) {
                                    if (line.startsWith("data: ") && line !== "data: [DONE]") {
                                        try {
                                            const json = JSON.parse(line.substring(6));
                                            const content = json.choices[0]?.delta?.content;
                                            if (content) {
                                                fullContent += content;
                                                send({ t: "text", v: content });
                                            }
                                        } catch (e) { }
                                    }
                                }
                            }
                        }
                    }

                    // 3. Persist & Finalize
                    let totalTurnCost = 0; // Usage tracking can be added back if needed
                    let savedConvId = conversationId || crypto.randomUUID();

                    if (userId) {
                        const messagesToSave = [
                            { ...messages[messages.length - 1], timestamp: new Date().toISOString() },
                            { role: 'assistant', content: fullContent, timestamp: new Date().toISOString() }
                        ];
                        const { data } = await supabase.rpc('append_ai_messages', {
                            p_conversation_id: savedConvId,
                            p_new_messages: JSON.stringify(messagesToSave),
                            p_user_id: userId,
                            p_cost_usd: 0
                        });
                        if (data) savedConvId = data;
                    }

                    send({ t: "meta", v: { conversationId: savedConvId } });
                    await logPerf("total_request_duration", Date.now() - startTime);
                    controller.close();

                } catch (err) {
                    console.error("Stream error:", err);
                    send({ error: err.message });
                    controller.close();
                }
            }
        });

        return new Response(stream, {
            headers: {
                ...corsHeaders,
                "Content-Type": "text/event-stream",
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
            }
        });
    } catch (error) {
        console.error("Function Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
