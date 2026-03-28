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

// Import removed: knowledge.ts is obsolete, using pgvector now
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
            description: "List all properties owned by the user. (Read-only)",
            parameters: {
                type: "object",
                properties: {}
            }
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
    },
    {
        type: "function",
        function: {
            name: "present_options",
            description: "Present the user with a set of clickable options (buttons) instead of just regular text. Use this when you want to guide the user to select one of several clear actions or paths. (Hebrew: הצג אפשרויות בחירה).",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string", description: "The main question or instruction for the user." },
                    description: { type: "string", description: "Optional supplementary text explaining the choices." },
                    options: {
                        type: "array",
                        description: "The list of buttons to display.",
                        items: {
                            type: "object",
                            properties: {
                                label: { type: "string", description: "The button text shown to the user." },
                                value: { type: "string", description: "The exact text that will be sent back to you when the user clicks this button." },
                                variant: { type: "string", enum: ["default", "outline", "destructive"], description: "Visual style of the button." }
                            },
                            required: ["label", "value"]
                        }
                    }
                },
                required: ["title", "options"]
            }
        }
    },
    {
        type: "function",
        function: {
            name: "search_knowledge_base",
            description: "Search the knowledge base for documentation, guides, or general information. Use this when the user asks a question about how to use the app or needs help.",
            parameters: {
                type: "object",
                properties: {
                    query: { type: "string", description: "The user's question or search term" }
                },
                required: ["query"]
            }
        }
    }
];

// Function implementations
async function searchKnowledgeBase(query: string, userLanguage: string) {
    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        const embedStartTime = Date.now();
        const embedRes = await fetch("https://api.openai.com/v1/embeddings", {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${OPENAI_API_KEY}` },
            body: JSON.stringify({ input: query.replace(/\n/g, ' '), model: "text-embedding-3-small" }),
        });
        const embedData = await embedRes.json();
        
        if (embedData.data && embedData.data[0]) {
            const queryEmbedding = embedData.data[0].embedding;
            const { data: matchedDocs, error: matchError } = await supabase.rpc('match_knowledge', {
                query_embedding: queryEmbedding, match_threshold: 0.25, match_count: 5
            });
            
            if (matchError) {
                console.error("Supabase match_knowledge error:", matchError);
                return { success: false, message: `Database error: ${matchError.message}` };
            } else if (matchedDocs && matchedDocs.length > 0) {
                const langDocs = matchedDocs.filter((d: any) => d.metadata?.language === userLanguage || !d.metadata?.language);
                const finalDocs = langDocs.length > 0 ? langDocs : matchedDocs;
                const knowledgeStr = finalDocs.map((d: any) => `[Source: ${d.metadata?.source || 'Documentation'}]:\n${d.content}`).join("\n\n---\n\n");
                return { success: true, knowledge: knowledgeStr };
            }
        }
        return { success: true, knowledge: "No relevant documentation found." };
    } catch (e: any) {
        console.error("Vector Search Error:", e);
        return { success: false, message: `Vector Search Error: ${e.message}` };
    }
}

async function checkConsent(userId: string, supabase: any, clientConsent?: boolean) {
    if (clientConsent === true) return true;
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

async function searchContracts(query: string, userId: string, hasAiConsent?: boolean) {
    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        const hasConsent = await checkConsent(userId, supabase, hasAiConsent);
        if (!hasConsent) {
            return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
        }

        // Simple search on contracts table only
        const { data, error } = await supabase
            .from('contracts')
            .select('id, start_date, end_date, base_rent, status, property_id, tenants')
            .eq('user_id', userId)
            .limit(10);

        if (error) {
            console.error("Search error:", error);
            return { success: false, message: `Database error: ${error.message}` };
        }

        if (!data || data.length === 0) {
            return { success: false, message: `לא נמצאו חוזים. (No contracts found.)` };
        }

        // Return simplified results
        const results = data.map(contract => ({
            id: contract.id,
            rent: `₪${contract.base_rent}`,
            period: `${contract.start_date} עד ${contract.end_date}`,
            status: contract.status,
            tenants: Array.isArray(contract.tenants) ? contract.tenants.map((t: any) => t.name).join(', ') : 'Unknown'
        }));

        // Log Security Audit
        await supabase.rpc('log_ai_contract_audit', {
            p_user_id: userId,
            p_action: 'AI_SEARCH_CONTRACTS',
            p_details: { query, results_count: results.length }
        });

        return {
            success: true,
            count: results.length,
            message: `נמצאו ${results.length} חוזים`,
            contracts: results
        };
    } catch (err) {
        console.error("Function error:", err);
        return { success: false, message: "שגיאה בחיפוש חוזים" };
    }
}

async function getFinancialSummary(period: string, userId: string, currency: string = 'ILS', hasAiConsent?: boolean) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const hasConsent = await checkConsent(userId, supabase, hasAiConsent);
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
    await supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_FINANCIAL_SUMMARY',
        p_details: { period, currency, total_income: total, transactions: data.length }
    });

    return {
        success: true,
        period,
        currency,
        total_income: total,
        transaction_count: data.length
    };
}

async function checkExpiringContracts(daysThreshold: number, userId: string, hasAiConsent?: boolean) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const hasConsent = await checkConsent(userId, supabase, hasAiConsent);
    if (!hasConsent) {
        return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
    }

    // We want contracts ending between NOW and NOW + threshold
    const today = new Date();
    const futureDate = new Date();
    futureDate.setDate(today.getDate() + daysThreshold);

    const { data, error } = await supabase
        .from('contracts')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .lte('end_date', futureDate.toISOString())
        .gte('end_date', today.toISOString());

    if (error) return { success: false, message: error.message };

    // Log Security Audit
    await supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_CHECK_EXPIRING_CONTRACTS',
        p_details: { days_threshold: daysThreshold, count: data.length }
    });

    return {
        success: true,
        count: data.length,
        expiring_contracts: data.map(c => {
            const tenantNames = Array.isArray(c.tenants) ? c.tenants.map((t: any) => t.name).join(', ') : 'Unknown';
            return {
                id: c.id,
                tenant: tenantNames,
                end_date: c.end_date,
                rent: c.base_rent
            };
        })
    };
}

async function getTenantDetails(nameOrEmail: string, userId: string, hasAiConsent?: boolean) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const hasConsent = await checkConsent(userId, supabase, hasAiConsent);
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
    await supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_GET_TENANT_DETAILS',
        p_details: { name_or_email: nameOrEmail, found: data.length > 0 }
    });

    return {
        success: true,
        tenants: data
    };
}

async function listProperties(userId: string, hasAiConsent?: boolean) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const hasConsent = await checkConsent(userId, supabase, hasAiConsent);
    if (!hasConsent) {
        return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
    }

    const { data, error } = await supabase
        .from('properties')
        .select('id, address')
        .eq('user_id', userId);

    if (error) return { success: false, message: "Database Error: " + error.message };

    if (data && data.length === 0) {
        return { success: true, message: "The user has 0 properties in their account. Tell the user exactly: 'You do not have any properties saved in your account yet. Please add a property first before organizing documents.'", properties: [] };
    }

    return { success: true, properties: data };
}

async function listFolders(propertyId: string, userId: string, hasAiConsent?: boolean) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

    const hasConsent = await checkConsent(userId, supabase, hasAiConsent);
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

async function organizeDocument(args: any, userId: string, hasAiConsent?: boolean) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { property_id, folder_id, storage_path, file_name, category } = args;

    const hasConsent = await checkConsent(userId, supabase, hasAiConsent);
    if (!hasConsent) {
        return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
    }

    // Validation
    if (!property_id) return { success: false, message: "Missing required parameter: property_id. You must ask the user which property this document is for or use list_properties to find the correct ID." };

    const { data: prop, error: propError } = await supabase.from('properties').select('id').eq('id', property_id).eq('user_id', userId).single();
    if (!prop) return { success: false, message: `Tool Error: Could not find property with ID '${property_id}' belonging to this user.` };

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
    await supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_CALCULATE_LINKAGE',
        p_details: { ...args, result: newRent }
    });

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
        .select('*, property:properties(address)')
        .eq('user_id', userId)
        .eq('category', 'maintenance');

    if (property_id) dbQuery = dbQuery.eq('property_id', property_id);
    if (query) dbQuery = dbQuery.or(`description.ilike.%${query}%,vendor_name.ilike.%${query}%,issue_type.ilike.%${query}%`);

    const { data, error } = await dbQuery.order('document_date', { ascending: false }).limit(10);

    if (error) return { success: false, message: error.message };

    const results = data.map(r => ({
        date: r.document_date,
        description: r.description,
        amount: r.amount,
        vendor: r.vendor_name,
        issue: r.issue_type,
        property: r.property?.address
    }));

    // Log Security Audit
    await supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_SEARCH_MAINTENANCE',
        p_details: { query, results_count: results.length }
    });

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

async function debugEntity(args: any, userId: string, hasAiConsent?: boolean) {
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

        const perfMetrics: Record<string, number> = {};

        const logPerf = async (step: string, duration: number, details?: any) => {
            console.log(`[PERF] ${step}: ${duration.toFixed(2)}ms`);
            perfMetrics[step] = Number(duration.toFixed(2));
        };

        if (!OPENAI_API_KEY && !GEMINI_API_KEY) {
            console.error("Critical: AI API Keys missing from environment.");
            throw new Error("Missing AI API Key. Please set OPENAI_API_KEY or GEMINI_API_KEY in Supabase secrets.");
        }

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

        const { messages, conversationId, hasAiConsent, userId: bodyUserId } = body;
        const userContent = messages[messages.length - 1]?.content || '';

        // --- PING TEST (Moved Early) ---
        if (userContent.toLowerCase() === 'ping') {
            console.log("Ping detected, responding with status.");
            const status = [];
            if (OPENAI_API_KEY) status.push("OpenAI: OK");
            if (GEMINI_API_KEY) status.push("Gemini: OK");
            if (status.length === 0) status.push("No keys detected");

            return new Response(
                JSON.stringify({
                    choices: [{ message: { role: "assistant", content: "Pong! " + status.join(" | ") } }]
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        if (userContent.toLowerCase() === 'debug consent') {
            return new Response(
                JSON.stringify({
                    choices: [{ message: { role: "assistant", content: `DEBUG: hasAiConsent received as: ${hasAiConsent}` } }]
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        const internalKey = req.headers.get("x-internal-webhook-key");
        const isInternalCall = internalKey && internalKey === SUPABASE_SERVICE_ROLE_KEY;
        const authHeader = req.headers.get("authorization");
        console.log("Auth header present:", !!authHeader, "Internal call:", isInternalCall);

        // Extract user ID from JWT or internal request
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        // --- PARALLEL INITIALIZATION TASKS ---
        let userId: string | null = null;
        let usageCheckResult: any = null;
        let knowledgeBase = "";
        let activeTools = FUNCTION_TOOLS;
        const pStartTime = Date.now();

        // TASK 1: Auth & Usage Check
        const authTask = async () => {
            if (isInternalCall && bodyUserId) {
                userId = bodyUserId;
                console.log("Extracted userId from internal webhook:", userId);
            } else if (authHeader) {
                const token = authHeader.replace("Bearer ", "");
                const { data: { user }, error: authError } = await supabase.auth.getUser(token);
                if (authError) console.error("Auth error extracting user:", authError);
                userId = user?.id || null;
                console.log("Extracted userId from token:", userId);
                await logPerf("auth_extraction", Date.now() - startTime);
            } else {
                console.log("No authorization header or internal key provided.");
            }
        };

        const authPromise = (async () => {
            await Promise.race([
                authTask(),
                new Promise<void>((resolve) => setTimeout(() => {
                    console.warn("Auth extraction timed out after 5s! Proceeding unauthenticated.");
                    resolve();
                }, 5000))
            ]);
            
            if (userId) {
                const uStart = Date.now();
                const { data: usageCheck, error: usageError } = await supabase.rpc('check_ai_chat_usage', {
                    p_user_id: userId,
                    p_tokens_used: 500 // Estimate
                });
                if (usageError) console.error("Usage check error:", usageError);
                else if (usageCheck) usageCheckResult = usageCheck;
                await logPerf("usage_check_bg", Date.now() - uStart);
            }
        })();

        // Wait for all interleaved tasks to finish simultaneously
        await authPromise;
        await logPerf("parallel_init_total", Date.now() - pStartTime);

        // Usage validation boundary
        if (usageCheckResult && !usageCheckResult.allowed) {
            const errorMessage = usageCheckResult.reason === 'message_limit_exceeded'
                ? `הגעת למגבלת ההודעות החודשית (${usageCheckResult.limit} הודעות). שדרג את המנוי שלך להמשך שימוש. / You've reached your monthly message limit (${usageCheckResult.limit} messages). Please upgrade your subscription.`
                : `הגעת למגבלת הטוקנים החודשית. שדרג את המנוי שלך. / You've reached your monthly token limit. Please upgrade your subscription.`;

            await logPerf("usage_limit_hit", Date.now() - startTime, { reason: usageCheckResult.reason });

            return new Response(
                JSON.stringify({
                    choices: [{ message: { role: "assistant", content: errorMessage } }],
                    perfMetrics: perfMetrics
                }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        // Construct System Prompt
        let systemPrompt = "";
        if (userId) {
            systemPrompt = `You are a helper for property owners using "RentMate". 
                
ROLE & TONE:
- Be extremely kind, empathetic, and polite in all your responses.
- Professional, helpful, and use CLEAR, SIMPLE language. Avoid technical jargon; explain complex terms simply.
- Be concise, direct, and natural. Focus on high readability.
- **FORMATTING**: Use bullet points and bold text to highlight key info. Break long paragraphs into short chunks.
- Expert in RentMate app features and property management.
- LANGUAGE: Respond in the SAME language the user writes in (Hebrew or English).
- **CRITICAL - STRICT SCOPE (APP SUPPORT ONLY)**: Your sole purpose is to help the user navigate and use the RentMate software. You must ONLY answer questions about how to use the app, perform actions in the app, or retrieve the user's data from the app. 
- **STRICT NO-GO ZONES**: You are FORBIDDEN from answering general real estate questions, market data questions (e.g., "what is the average rent in Tel Aviv?"), investment questions, or general knowledge questions. If asked about these topics, you MUST politely refuse and state: "I am an app support assistant and can only help you with using the RentMate platform and managing your saved properties here."
- **CRITICAL - NO ADVICE**: You are strictly prohibited from giving legal, tax, or financial advice.
- **CRITICAL - NO HALLUCINATIONS**: Do not hallucinate or make up information. Base all your answers STRICTLY on the provided tools and knowledge base. If you don't know the answer, politely state that you do not know.
- **PRIVACY & PERMISSIONS**: 
  - You have access to the user's properties, contracts, and tenants ONLY through the provided tools.
  - If a tool returns an error saying "AI access to personal data is disabled", inform the user that they must enable "AI Data Access" in **Settings > Privacy** to proceed.
  - NEVER assume access to data outside what the tools provide.

CAPABILITIES & SOCRATIC LOGIC (CRITICAL):
1. **Adding Contracts / Properties / Payments**: When a user wants to add an entity (e.g. "I signed a new tenant Bob for 5000 NIS" or uploads a contract document), you MUST extract the details.
2. **Socratic Questioning**: If CRITICAL information is missing (like Rent Amount, Property, or Dates for a contract), YOU MUST NOT CALL THE \`prepare_\` TOOL YET. Instead, politely ask the user for the missing details in the chat.
3. **Execution**: ONLY once you have sufficient details, you call the corresponding \`prepare_...\` tool (e.g., \`prepare_add_contract\`). This will instantly open a perfectly pre-filled form for the user to review and save. This provides a magical "Minimum Friction" experience.
4. **Extraction Accuracy**: 
   - When adding a property, ALWAYS split Hebrew addresses into \`city\` (e.g., תל אביב) and \`address\` (street and number, e.g., הרצל 10).
5. **Document Organization**: Move uploaded files to property-specific folders using \`organize_document\` IF requested.

DIRECTIONS:
- **USE THE APP FOR CALCULATIONS:** If the user asks to calculate the CPI index or performs other tasks that have dedicated features in the app, DO NOT perform the calculation or task directly. Instead, refer them to use the app's feature (e.g., "You can easily calculate the CPI index using our built-in Calculator located in the main menu."). Explain briefly where to find it.
- If the user asks about their assets, properties, or adding a bill, ALWAYS start by calling \`list_properties\` to get the available context. This is required even if they have only one asset.
- If a support question has more than 1 possible answer or method (e.g., "how to add a new bill", "how to add a property"), you MUST provide ALL the possibilities (up to 3 methods) in your answer as a clear bulleted list.

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
- **CRITICAL - STRICT SCOPE (SALES & SUPPORT ONLY)**: Your sole purpose is to explain the features of the RentMate app and encourage the user to sign up. 
- **STRICT NO-GO ZONES**: You are FORBIDDEN from answering general real estate questions, market data questions (e.g., "what is the average rent?"), or general knowledge questions. If asked about these topics, you MUST politely refuse and state: "I am the RentMate app assistant. I can only answer questions about how our software can help you manage your properties."

TONE:
- Welcoming, premium, and encouraging.
- Be extremely kind, empathetic, and polite in all your responses.
- Use CLEAR, PLAIN language (Hebrew or English). Avoid being overly formal or robotic.
- Match user's language choice.
- **CRITICAL - NO HALLUCINATIONS**: Do not hallucinate or make up information. Base all your answers STRICTLY on the provided knowledge base. If you don't know the answer, politely state that you do not know.

KEY SELLING POINTS (Use when relevant):
- AI Contract Scanning: Extract data from PDFs automatically.
- CPI Linkage Tracking: Never miscalculate a rent increase again.
- Document Vault: Secure storage for all property deeds and receipts.
- Professional Reports: Ready for your accountant.

KNOWLEDGE BASE:
${knowledgeBase}`;
        }

        // Build messages for OpenAI
        const recentMessages = messages.slice(-10); // Keep last 5 turns to reduce context bloat
        
        // Process messages to inject image URLs for native OCR
        const processedMessages = [];
        for (const msg of recentMessages) {
            let fullText = msg.hiddenContext ? `${msg.content}\n\n${msg.hiddenContext}` : msg.content;
            
            // Check for file storage paths injected by the frontend widget
            const pathRegex = /Storage Path:\s*([^ ]+)/;
            const match = fullText.match(pathRegex);
            
            if (match && match[1]) {
                const storagePath = match[1].replace(/\.$/, ''); // clean trailing dot
                // Generate short-lived signed URL for GPT-4o OCR
                const { data } = await supabase.storage.from('secure_documents').createSignedUrl(storagePath, 3600);
                
                if (data?.signedUrl) {
                    processedMessages.push({
                        role: msg.role,
                        content: [
                            { type: "text", text: fullText },
                            { type: "image_url", image_url: { url: data.signedUrl } }
                        ]
                    });
                    continue; // Skip the standard text push
                }
            }
            
            // Default text-only message
            processedMessages.push({
                role: msg.role,
                content: fullText
            });
        }

        const openaiMessages = [
            {
                role: "system",
                content: systemPrompt
            },
            ...processedMessages
        ];

        // Initial API call with function tools
        let apiUrl = "https://api.openai.com/v1/chat/completions";
        let apiKey = OPENAI_API_KEY;
        let model = "gpt-4o"; // Upgraded to gpt-4o for high-accuracy OCR validation

        if (!OPENAI_API_KEY && GEMINI_API_KEY) {
            apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
            apiKey = GEMINI_API_KEY;
            model = "gemini-1.5-flash";
        }

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
            }),
            signal: AbortSignal.timeout(50000) // 50s timeout
        });

        let result = await response.json();
        await logPerf(`ai_first_turn_${model}`, Date.now() - aiStartTime);

        if (!response.ok) {
            return new Response(
                JSON.stringify({ error: `AI Engine Error (${response.status}): ${result.error?.message || JSON.stringify(result)}` }),
                { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let totalTurnCost = 0;

        // Log initial usage if available (including tool calls prompt)
        if (userId && result.usage) {
            // @ts-ignore EdgeRuntime is provided natively by Deno Deploy/Supabase Edge Functions
            if (typeof EdgeRuntime !== 'undefined') {
                // @ts-ignore
                EdgeRuntime.waitUntil((async () => {
                    try {
                        const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
                        await sb.rpc('log_ai_usage', {
                            p_user_id: userId,
                            p_model: result.model || "gpt-4o-mini",
                            p_feature: 'chat',
                            p_input_tokens: result.usage.prompt_tokens,
                            p_output_tokens: result.usage.completion_tokens
                        });
                    } catch (e) {
                        console.error("BG log usage error", e);
                    }
                })());
            } else {
                try {
                    await supabase.rpc('log_ai_usage', {
                        p_user_id: userId,
                        p_model: result.model || "gpt-4o-mini",
                        p_feature: 'chat',
                        p_input_tokens: result.usage.prompt_tokens,
                        p_output_tokens: result.usage.completion_tokens
                    });
                } catch (e) { console.error(e); }
            }
            totalTurnCost += (result.usage.prompt_tokens / 1000000 * 0.15) + (result.usage.completion_tokens / 1000000 * 0.60);
        }

        // -------------------------------------------------------------
        // --- MULTI-TURN AI TOOL EXECUTION LOOP ---
        // -------------------------------------------------------------
        let turnCount = 1;
        let aiMessage = result.choices?.[0]?.message?.content || "";
        const MAX_TURNS = 3;

        while (result.choices?.[0]?.message?.tool_calls && result.choices[0].message.tool_calls.length > 0 && turnCount <= MAX_TURNS) {
            const toolCalls = result.choices[0].message.tool_calls;
            // Append the assistant's tool-call request to history
            openaiMessages.push(result.choices[0].message);

            // Execute all tools requested in this turn
            for (const toolCall of toolCalls) {
                const functionName = toolCall.function.name;
                const functionArgsRaw = toolCall.function.arguments || "{}";
                let functionArgs = {};
                try {
                    functionArgs = JSON.parse(functionArgsRaw);
                } catch(e) { /* ignore parse error */ }
                
                let functionResult;
                const toolStartTime = Date.now();

                if (!userId) {
                    functionResult = { success: false, message: "User not authenticated. Please log in to use this feature." };
                } else {
                    if (functionName === "search_knowledge_base") {
                        const userLanguage = userContent.match(/[\u0590-\u05FF]/) ? 'he' : 'en';
                        functionResult = await searchKnowledgeBase(functionArgs.query, userLanguage);
                    } else if (functionName === "search_contracts") {
                        functionResult = await searchContracts(functionArgs.query, userId, hasAiConsent);
                    } else if (functionName === "get_financial_summary") {
                        functionResult = await getFinancialSummary(functionArgs.period, userId, functionArgs.currency, hasAiConsent);
                    } else if (functionName === "get_tenant_details") {
                        functionResult = await getTenantDetails(functionArgs.name_or_email, userId, hasAiConsent);
                    } else if (functionName === "list_properties") {
                        functionResult = await listProperties(userId, hasAiConsent);
                    } else if (functionName === "list_folders") {
                        functionResult = await listFolders(functionArgs.property_id, userId, hasAiConsent);
                    } else if (functionName === "trigger_human_support") {
                        return new Response(
                            JSON.stringify({
                                choices: [{ message: { content: "I am connecting you to a human agent now. One moment please...", role: "assistant" } }],
                                uiAction: { action: "TRIGGER_HUMAN", data: { reason: functionArgs.reason } }
                            }),
                            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                        );
                    } else if (functionName === "generate_whatsapp_message") {
                        const { tenant_name, type, amount, property_name } = functionArgs;
                        let text = `שלום ${tenant_name}, `;
                        if (type === 'rent_reminder') text += `רק מזכיר שהגיע מועד תשלום השכירות${property_name ? ` עבור ${property_name}` : ''}${amount ? ` על סך ₪${amount}` : ''}. תודה!`;
                        else if (type === 'linkage_update') text += `מעדכן שבוצעה הצמדה למדד${property_name ? ` בנכס ${property_name}` : ''}. השכירות המעודכנת היא ₪${amount}. המשך יום נעים!`;
                        else if (type === 'maintenance_update') text += `עדכון לגבי התיקון ${property_name ? `בנכס ${property_name}` : ''}: העבודה הושלמה. תודה על הסבלנות!`;
                        else text += `מה שלומך? אשמח לדבר איתך לגבי ${property_name || 'הדירה'}. תודה!`;

                        return new Response(
                            JSON.stringify({
                                choices: [{ message: { content: `הפקתי עבורך הודעת וואטסאפ מוכנה:\n\n"${text}"\n\nאתה יכול להעתיק אותה ולשלוח לשוכר.`, role: "assistant" } }]
                            }),
                            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                        );
                    } else if (functionName.startsWith("prepare_")) {
                        functionResult = { success: true, message: "Form prepared for user", ui_action: "OPEN_MODAL", modal: functionName.replace("prepare_add_", "").replace("prepare_", ""), data: functionArgs };
                    } else if (functionName === "organize_document") {
                        functionResult = await organizeDocument(functionArgs, userId, hasAiConsent);
                    } else if (functionName === "calculate_rent_linkage") {
                        functionResult = await calculateRentLinkage(functionArgs, userId, hasAiConsent);
                    } else if (functionName === "debug_entity") {
                        functionResult = await debugEntity(functionArgs, userId, hasAiConsent);
                    } else if (functionName === "present_options") {
                        functionResult = { success: true, ui_action: "PRESENT_OPTIONS", data: functionArgs };
                    } else {
                        functionResult = { success: false, message: `Tool Error: Unknown function '${functionName}'.` };
                    }
                }
                await logPerf(`tool_${functionName}_t${turnCount}`, Date.now() - toolStartTime);

                // Push tool result back
                openaiMessages.push({
                    role: "tool",
                    tool_call_id: toolCall.id,
                    content: JSON.stringify(functionResult)
                });
            }

            turnCount++;
            if (turnCount > MAX_TURNS) {
                 aiMessage = "I'm sorry, gathering this information required too many steps. Please try simplifying your request.";
                 break;
            }

            // Fetch Next Turn
            const aiTurnStartTime = Date.now();
            try {
                response = await fetch(apiUrl, {
                    method: "POST",
                    headers: { "Authorization": `Bearer ${apiKey}`, "Content-Type": "application/json" },
                    body: JSON.stringify({
                        model: model,
                        messages: openaiMessages,
                        temperature: 0.7,
                        max_tokens: 800,
                        tools: activeTools.length > 0 ? activeTools : undefined
                    }),
                    signal: AbortSignal.timeout(50000)
                });

                const resultRaw = await response.text();
                // Avoid using 0ms precision drops, guarantee >= 1 ms for visibility
                const elapsedStr = Math.max(1, Date.now() - aiTurnStartTime);
                await logPerf(`ai_turn_${turnCount}_${model}`, elapsedStr);

                try {
                    result = JSON.parse(resultRaw);
                } catch(e) {
                    result = { error: { message: "Failed to parse JSON" } };
                }

                if (!response.ok) {
                    return new Response(
                        JSON.stringify({ error: `AI Engine Error (${response.status}): ${result?.error?.message || "Internal failure"}` }),
                        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                }

                // Log Token Usage
                if (userId && result.usage) {
                    try {
                        totalTurnCost += (result.usage.prompt_tokens / 1000000 * 0.15) + (result.usage.completion_tokens / 1000000 * 0.60);
                    } catch(e) {}
                }

                aiMessage = result.choices?.[0]?.message?.content || "";
            } catch (err: any) {
                console.error(`AI Fetch Loop Error Turn ${turnCount}:`, err);
                await logPerf(`ai_error_turn_${turnCount}`, Date.now() - aiTurnStartTime);
                return new Response(
                    JSON.stringify({ error: `Connection failed resolving AI response. Turn ${turnCount}` }),
                    { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
        }

        // Fallback for edge cases where AI generates an empty string
        if (!aiMessage || aiMessage.trim() === "") {
            aiMessage = "I processed your request, but I couldn't formulate a text response. Please check the screen or try phrasing another way.";
        }

        // Persist conversation to Storage if authenticated
        let savedConvId = conversationId;
        if (userId) {
            savedConvId = conversationId || crypto.randomUUID();
            
            const backgroundStorageUpload = async () => {
                try {
                    const fullConversation = [
                        ...messages.map((m: any) => ({ ...m, timestamp: m.timestamp || new Date().toISOString() })),
                        { role: 'assistant', content: aiMessage, timestamp: new Date().toISOString() }
                    ];

                    const filePath = `${userId}/${savedConvId}.json`;
                    const sb = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

                    const { error: storageError } = await sb.storage
                        .from('chat-archives')
                        .upload(filePath, JSON.stringify(fullConversation), { upsert: true });

                    if (storageError) console.error("Error persisting to storage:", storageError);
                } catch (saveError) {
                    console.error("Failed to persist conversation chain:", saveError);
                }
            };

            // @ts-ignore
            if (typeof EdgeRuntime !== 'undefined') {
                // @ts-ignore
                EdgeRuntime.waitUntil(backgroundStorageUpload());
            } else {
                // Fallback for local testing if EdgeRuntime is inexplicably missing
                backgroundStorageUpload().then(() => {});
            }
        }

        // Check if any tool result contained a UI action to pass to frontend
        const toolOutputs = openaiMessages.filter(m => m.role === 'tool').map(m => {
            try { return JSON.parse(m.content); } catch (e) { return null; }
        });
        const uiAction = toolOutputs.find(o => o && o.ui_action && o.ui_action !== "PRESENT_OPTIONS");
        const actionOptions = toolOutputs.find(o => o && o.ui_action === "PRESENT_OPTIONS");

        // Format message with options if present
        let msgOutput = { role: "assistant", content: aiMessage };
        if (actionOptions && actionOptions.data) {
            msgOutput = {
                role: "assistant",
                content: aiMessage,
                type: "action",
                actionData: actionOptions.data
            };
        }

        const totalDuration = Date.now() - startTime;
        await logPerf("total_request_duration", totalDuration);

        return new Response(
            JSON.stringify({
                choices: [{
                    message: msgOutput
                }],
                conversationId: savedConvId,
                uiAction: uiAction ? {
                    action: uiAction.ui_action,
                    modal: uiAction.modal,
                    data: uiAction.data
                } : null,
                perfMetrics: perfMetrics
            }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    } catch (error) {
        console.error("Function Error:", error);
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
