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
            description: "Prepare an 'Add Property' form. (Hebrew: הכן טופס הוספת נכס).",
            parameters: {
                type: "object",
                properties: {
                    title: { type: "string" },
                    address: { type: "string" }
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
            description: "Prepare the 'Add Contract' wizard. (Hebrew: הכן טופס הוספת חוזה).",
            parameters: {
                type: "object",
                properties: {
                    property_id: { type: "string" },
                    tenant_name: { type: "string" },
                    monthly_rent: { type: "number" }
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
    }
];

// Function implementations
// Function implementations
async function checkConsent(userId: string, supabase: any) {
    const { data: preferences } = await supabase
        .from('user_preferences')
        .select('ai_data_consent')
        .eq('user_id', userId)
        .single();

    // Default to false if no record found, requiring explicit consent
    return preferences?.ai_data_consent === true;
}

async function searchContracts(query: string, userId: string) {
    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        const hasConsent = await checkConsent(userId, supabase);
        if (!hasConsent) {
            return { success: false, message: "AI access to personal data is disabled. Please enable 'AI Data Access' in Settings > Privacy." };
        }

        // Simple search on contracts table only
        const { data, error } = await supabase
            .from('contracts')
            .select('id, start_date, end_date, monthly_rent, status, property_id, tenant_id')
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
            rent: `₪${contract.monthly_rent}`,
            period: `${contract.start_date} עד ${contract.end_date}`,
            status: contract.status
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
    await supabase.rpc('log_ai_contract_audit', {
        p_user_id: userId,
        p_action: 'AI_CHECK_EXPIRING_CONTRACTS',
        p_details: { days_threshold: daysThreshold, count: data.length }
    });

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

async function listProperties(userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
    const { data, error } = await supabase
        .from('properties')
        .select('id, address, title')
        .eq('user_id', userId);

    if (error) return { success: false, message: error.message };
    return { success: true, properties: data };
}

async function listFolders(propertyId: string, userId: string) {
    const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
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

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        console.log("Chat support function invoked.");

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

        const { messages, conversationId } = body;
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

        const authHeader = req.headers.get("authorization");
        console.log("Auth header present:", !!authHeader);

        // Extract user ID from JWT
        let userId = null;
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        if (authHeader) {
            const token = authHeader.replace("Bearer ", "");
            const { data: { user } } = await supabase.auth.getUser(token);
            userId = user?.id;
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
                const errorMessage = usageCheck.reason === 'message_limit_exceeded'
                    ? `הגעת למגבלת ההודעות החודשית (${usageCheck.limit} הודעות). שדרג את המנוי שלך להמשך שימוש. / You've reached your monthly message limit (${usageCheck.limit} messages). Please upgrade your subscription.`
                    : `הגעת למגבלת הטוקנים החודשית. שדרג את המנוי שלך. / You've reached your monthly token limit. Please upgrade your subscription.`;

                return new Response(
                    JSON.stringify({
                        choices: [{
                            message: { role: "assistant", content: errorMessage }
                        }]
                    }),
                    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                );
            }
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
  - Never use words like "should", "recommend", "it's better to".
  - If asked for advice, say: "I am an AI, not a professional advisor. I can show you your data, but I cannot recommend actions."
  - Present raw data only.

DOUBLE-GATE PROTOCOL (FOR ACTIONS):
1. **GATE 1: CONFIRMATION**: For any action that modifies data, DESCRIBE what you will do and ASK FOR CONFIRMATION first.
2. **GATE 2: MANUAL SAVE**: The tools will open forms. Tell the user to review and click Save.

CAPABILITIES:
1. **Knowledge Base**: Answer app-related questions using context.
2. **Contracts**: Search for contracts.
3. **Finance**: Summarize income.
4. **Tenants**: Find contact info.
5. **UI Automation**: Prepare forms with pre-filled details.
6. **Calculations**: Calculate rent linkage.

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

        // Initial API call with function tools
        let apiUrl = "https://api.openai.com/v1/chat/completions";
        let apiKey = OPENAI_API_KEY;
        let model = "gpt-4o-mini";

        if (!OPENAI_API_KEY && GEMINI_API_KEY) {
            apiUrl = "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";
            apiKey = GEMINI_API_KEY;
            model = "gemini-1.5-flash";
        }

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
        });

        let result = await response.json();

        if (!response.ok) {
            return new Response(
                JSON.stringify({ error: `AI Engine Error (${response.status}): ${result.error?.message || JSON.stringify(result)}` }),
                { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        let totalTurnCost = 0;

        // Log initial usage if available (including tool calls prompt)
        if (userId && result.usage) {
            try {
                await supabase.rpc('log_ai_usage', {
                    p_user_id: userId,
                    p_model: result.model || "gpt-4o-mini",
                    p_feature: 'chat',
                    p_input_tokens: result.usage.prompt_tokens,
                    p_output_tokens: result.usage.completion_tokens
                });
                totalTurnCost += (result.usage.prompt_tokens / 1000000 * 0.15) + (result.usage.completion_tokens / 1000000 * 0.60);
            } catch (logError) {
                console.error("Failed to log initial AI usage:", logError);
            }
        }

        // Check if OpenAI wants to call a function
        const toolCalls = result.choices?.[0]?.message?.tool_calls;

        if (toolCalls && toolCalls.length > 0) {
            const toolCall = toolCalls[0];
            const functionName = toolCall.function.name;
            const functionArgs = JSON.parse(toolCall.function.arguments);

            let functionResult;

            // Execute the function
            if (!userId) {
                functionResult = { success: false, message: "User not authenticated. Please log in to use this feature." };
            } else {
                if (functionName === "search_contracts") {
                    functionResult = await searchContracts(functionArgs.query, userId);
                } else if (functionName === "get_financial_summary") {
                    functionResult = await getFinancialSummary(functionArgs.period, userId, functionArgs.currency);
                } else if (functionName === "get_tenant_details") {
                    functionResult = await getTenantDetails(functionArgs.name_or_email, userId);
                } else if (functionName === "list_properties") {
                    functionResult = await listProperties(userId);
                } else if (functionName === "list_folders") {
                    functionResult = await listFolders(functionArgs.property_id, userId);
                } else if (functionName === "trigger_human_support") {
                    // ESCALATE TO HUMAN
                    return new Response(
                        JSON.stringify({
                            choices: [{
                                message: {
                                    content: "I am connecting you to a human agent now. One moment please...",
                                    role: "assistant"
                                }
                            }],
                            uiAction: {
                                action: "TRIGGER_HUMAN",
                                data: { reason: functionArgs.reason }
                            }
                        }),
                        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                } else if (functionName === "generate_whatsapp_message") {
                    // GENERATE WHATSAPP MESSAGE (No DB Write)
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

                    return new Response(
                        JSON.stringify({
                            choices: [{
                                message: {
                                    content: `הפקתי עבורך הודעת וואטסאפ מוכנה:\n\n"${text}"\n\nאתה יכול להעתיק אותה ולשלוח לשוכר.`,
                                    role: "assistant"
                                }
                            }]
                        }),
                        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
                    );
                } else if (functionName.startsWith("prepare_")) {
                    // UI PREPARATION TOOLS (No DB Write)
                    functionResult = {
                        success: true,
                        message: "Form prepared for user",
                        ui_action: "OPEN_MODAL",
                        modal: functionName.replace("prepare_add_", "").replace("prepare_", ""),
                        data: functionArgs
                    };
                } else if (functionName === "calculate_rent_linkage") {
                    functionResult = await calculateRentLinkage(functionArgs, userId);
                } else {
                    functionResult = { success: false, message: "Unknown function" };
                }
            }

            // Send function result back to OpenAI
            openaiMessages.push(result.choices[0].message);
            openaiMessages.push({
                role: "tool",
                tool_call_id: toolCall.id,
                content: JSON.stringify(functionResult)
            });

            // Get final response from AI
            response = await fetch(apiUrl, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    model: model,
                    messages: openaiMessages,
                    temperature: 0.7,
                    max_tokens: 800,
                }),
            });

            result = await response.json();

            // Log final usage if authentication and usage info are present
            if (userId && result.usage) {
                try {
                    await supabase.rpc('log_ai_usage', {
                        p_user_id: userId,
                        p_model: result.model || "gpt-4o-mini",
                        p_feature: 'chat',
                        p_input_tokens: result.usage.prompt_tokens,
                        p_output_tokens: result.usage.completion_tokens
                    });
                    totalTurnCost += (result.usage.prompt_tokens / 1000000 * 0.15) + (result.usage.completion_tokens / 1000000 * 0.60);
                } catch (logError) {
                    console.error("Failed to log final AI usage:", logError);
                }
            }
        }

        const aiMessage = result.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

        // Persist conversation to DB if authenticated
        let savedConvId = conversationId;
        if (userId) {
            try {
                // If no conversationId exists, we create one (the RPC handles this via generate_uuid default if we pass null, 
                // but let's be explicit and generate one in the hook or handle it here).
                // Actually the RPC 'append_ai_messages' requires p_conversation_id.
                // If it's the first message, conversationId from client might be null.
                const conversation_id = conversationId || crypto.randomUUID();

                const messagesToSave = [
                    { ...messages[messages.length - 1], timestamp: new Date().toISOString() },
                    { role: 'assistant', content: aiMessage, timestamp: new Date().toISOString() }
                ];

                const { data: convData, error: convError } = await supabase.rpc('append_ai_messages', {
                    p_conversation_id: conversation_id,
                    p_new_messages: JSON.stringify(messagesToSave),
                    p_user_id: userId, // Pass explicitly since Service Role is used
                    p_cost_usd: totalTurnCost
                });

                if (convError) console.error("Error persisting conversation:", convError);
                else savedConvId = convData;
            } catch (saveError) {
                console.error("Failed to persist conversation chain:", saveError);
            }
        }

        // Check if any tool result contained a UI action to pass to frontend
        const toolOutputs = openaiMessages.filter(m => m.role === 'tool').map(m => {
            try { return JSON.parse(m.content); } catch (e) { return null; }
        });
        const uiAction = toolOutputs.find(o => o && o.ui_action);

        return new Response(
            JSON.stringify({
                choices: [{
                    message: { role: "assistant", content: aiMessage }
                }],
                conversationId: savedConvId,
                uiAction: uiAction ? {
                    action: uiAction.ui_action,
                    modal: uiAction.modal,
                    data: uiAction.data
                } : null
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
