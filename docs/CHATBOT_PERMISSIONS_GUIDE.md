# Chatbot Permissions & Capabilities Guide

## Overview

The RentMate chatbot's behavior is controlled through **three main mechanisms**:

1. **System Prompt** - Defines personality, behavior, and guidelines
2. **Function Tools** - Defines what actions the bot can perform
3. **Security Controls** - Authentication, usage limits, and data access

---

## 1. System Prompt (Personality & Behavior)

**Location:** `supabase/functions/chat-support/index.ts` (lines 133-145)

### What It Controls:
- Bot's personality and tone
- Language behavior (Hebrew/English)
- What the bot should/shouldn't do
- Knowledge base access

### Current Configuration:

```typescript
{
    role: "system",
    content: `You are a helpful customer support assistant for "RentMate", a property management app in Israel.

LANGUAGE: Respond in the SAME language the user writes in (Hebrew or English). Most users speak Hebrew.

You can help users by:
1. Answering questions based on the Knowledge Base
2. Searching for their contracts when they ask (in Hebrew: "חפש חוזה", "מצא חוזה", "הראה חוזים")

Always be helpful and conversational.

Knowledge Base:
${knowledgeBase}`
}
```

### How to Modify:

**Example: Make bot more formal**
```typescript
content: `You are a professional customer support representative for "RentMate".

TONE: Use formal, professional language. Address users respectfully.
LANGUAGE: Respond in the SAME language the user writes in.

You can help users by:
1. Answering questions based on the Knowledge Base
2. Searching for their contracts when they ask

Always maintain professionalism and accuracy.

Knowledge Base:
${knowledgeBase}`
```

**Example: Add restrictions**
```typescript
content: `You are a helpful customer support assistant for "RentMate".

LANGUAGE: Respond in the SAME language the user writes in.

You can help users by:
1. Answering questions based on the Knowledge Base
2. Searching for their contracts when they ask

RESTRICTIONS:
- Do NOT provide legal advice. Refer users to consult a lawyer for legal matters.
- Do NOT make promises about future features.
- Do NOT share user data or contract details without authentication.
- Do NOT discuss pricing or billing (refer to support team).

Always be helpful and conversational.

Knowledge Base:
${knowledgeBase}`
```

---

## 2. Function Tools (Actions & Capabilities)

**Location:** `supabase/functions/chat-support/index.ts` (lines 17-35)

### What It Controls:
- What actions the bot can perform
- What data the bot can access
- When functions should be called

### Current Configuration:

```typescript
const FUNCTION_TOOLS = [
    {
        type: "function",
        function: {
            name: "search_contracts",
            description: "Search for rental contracts. Returns matching contracts with key information. Use when user asks to find, search, or show contracts (Hebrew: חפש/מצא/הראה חוזים).",
            parameters: {
                type: "object",
                properties: {
                    query: {
                        type: "string",
                        description: "Search term (tenant name, property address, or any contract detail)"
                    }
                },
                required: ["query"]
            }
        }
    }
];
```

### How to Add New Functions:

**Example: Add "create_reminder" function**

```typescript
const FUNCTION_TOOLS = [
    {
        type: "function",
        function: {
            name: "search_contracts",
            description: "Search for rental contracts...",
            parameters: { /* ... */ }
        }
    },
    {
        type: "function",
        function: {
            name: "create_reminder",
            description: "Create a payment reminder for a tenant. Use when user asks to set a reminder or send a payment notice.",
            parameters: {
                type: "object",
                properties: {
                    contract_id: {
                        type: "string",
                        description: "The contract ID to create reminder for"
                    },
                    reminder_date: {
                        type: "string",
                        description: "Date for the reminder (YYYY-MM-DD format)"
                    },
                    message: {
                        type: "string",
                        description: "Custom message for the reminder (optional)"
                    }
                },
                required: ["contract_id", "reminder_date"]
            }
        }
    }
];
```

**Then implement the function:**

```typescript
async function createReminder(contractId: string, reminderDate: string, message: string, userId: string) {
    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        
        const { data, error } = await supabase
            .from('reminders')
            .insert({
                user_id: userId,
                contract_id: contractId,
                reminder_date: reminderDate,
                message: message || 'Payment reminder',
                created_at: new Date().toISOString()
            });
        
        if (error) {
            return { success: false, message: `Error: ${error.message}` };
        }
        
        return {
            success: true,
            message: `תזכורת נוצרה בהצלחה ל-${reminderDate}`,
            reminder: data
        };
    } catch (err) {
        return { success: false, message: "שגיאה ביצירת תזכורת" };
    }
}
```

**And add to function execution logic (around line 180):**

```typescript
if (functionName === "search_contracts") {
    if (!userId) {
        functionResult = { success: false, message: "User not authenticated." };
    } else {
        functionResult = await searchContracts(functionArgs.query, userId);
    }
} else if (functionName === "create_reminder") {
    if (!userId) {
        functionResult = { success: false, message: "User not authenticated." };
    } else {
        functionResult = await createReminder(
            functionArgs.contract_id,
            functionArgs.reminder_date,
            functionArgs.message,
            userId
        );
    }
} else {
    functionResult = { success: false, message: "Unknown function" };
}
```

---

## 3. Security Controls

### A. Authentication

**Location:** Lines 95-99

```typescript
// Extract user ID from JWT
let userId = null;
if (authHeader) {
    const token = authHeader.replace("Bearer ", "");
    const { data: { user } } = await supabase.auth.getUser(token);
    userId = user?.id;
}
```

**What It Does:**
- Verifies user is logged in
- Extracts user ID from authentication token
- Prevents unauthorized access to user data

**How to Modify:**

**Example: Require authentication for all queries**
```typescript
if (!authHeader) {
    return new Response(
        JSON.stringify({
            choices: [{
                message: { 
                    role: "assistant", 
                    content: "אנא התחבר כדי להשתמש בצ'אט. / Please log in to use the chat." 
                }
            }]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}
```

### B. Usage Limits

**Location:** Lines 101-124

```typescript
// Check usage limits (if user is authenticated)
if (userId) {
    const { data: usageCheck } = await supabase.rpc('check_ai_chat_usage', {
        p_user_id: userId,
        p_tokens_used: 500
    });
    
    if (usageCheck && !usageCheck.allowed) {
        // Return limit exceeded message
    }
}
```

**What It Does:**
- Tracks message count per user
- Enforces tier-based limits (Free: 50, Basic: 200, Pro: 1000)
- Prevents abuse and controls costs

**How to Modify:**

**Example: Add rate limiting (max 10 messages per minute)**
```typescript
// Add to the usage check section
const { data: recentMessages } = await supabase
    .from('ai_chat_usage')
    .select('created_at')
    .eq('user_id', userId)
    .gte('created_at', new Date(Date.now() - 60000).toISOString())
    .order('created_at', { ascending: false });

if (recentMessages && recentMessages.length >= 10) {
    return new Response(
        JSON.stringify({
            choices: [{
                message: { 
                    role: "assistant", 
                    content: "אנא המתן דקה לפני שליחת הודעות נוספות. / Please wait a minute before sending more messages." 
                }
            }]
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
}
```

### C. Data Access Control

**Location:** Function implementations (e.g., `searchContracts`)

```typescript
async function searchContracts(query: string, userId: string) {
    const { data, error } = await supabase
        .from('contracts')
        .select('id, start_date, end_date, monthly_rent, status')
        .eq('user_id', userId)  // ← Only user's own contracts
        .limit(10);
    
    // ...
}
```

**What It Does:**
- Ensures users can only access their own data
- Implements Row Level Security (RLS)
- Prevents data leaks

**How to Add More Controls:**

**Example: Admin-only function**
```typescript
async function getAllUsers(userId: string) {
    // Check if user is admin
    const { data: userProfile } = await supabase
        .from('user_profiles')
        .select('role')
        .eq('id', userId)
        .single();
    
    if (userProfile?.role !== 'admin') {
        return { 
            success: false, 
            message: "Unauthorized. Admin access required." 
        };
    }
    
    // Admin can see all users
    const { data: users } = await supabase
        .from('user_profiles')
        .select('id, email, subscription_tier');
    
    return { success: true, users };
}
```

---

## 4. Knowledge Base Control

**Location:** `supabase/functions/chat-support/knowledge.ts`

### What It Controls:
- What information the bot knows
- What topics it can discuss
- Language-specific content

### How to Modify:

**Example: Add topic restrictions**

Edit `knowledge.ts`:

```typescript
export const KNOWLEDGE_HE = `
# התחלת עבודה עם RentMate
[... existing content ...]

# נושאים שאינם נתמכים
הבוט לא יכול לעזור עם:
- ייעוץ משפטי מקצועי (פנה לעורך דין)
- ייעוץ מס מקצועי (פנה לרואה חשבון)
- תמיכה טכנית מתקדמת (פנה לתמיכה: support@rentmate.co.il)
- שינויים בחשבון או מנוי (פנה לתמיכה)
`;
```

And update system prompt:

```typescript
content: `You are a helpful customer support assistant for "RentMate".

RESTRICTIONS:
- If asked for legal advice, say: "אני לא יכול לתת ייעוץ משפטי. אנא פנה לעורך דין מוסמך."
- If asked for tax advice, say: "אני לא יכול לתת ייעוץ מס. אנא פנה לרואה חשבון."
- If asked about billing/account changes, say: "אנא צור קשר עם התמיכה: support@rentmate.co.il"

Knowledge Base:
${knowledgeBase}`
```

---

## 5. Complete Example: Adding "Send Payment Message" Function

### Step 1: Define the Function Tool

```typescript
const FUNCTION_TOOLS = [
    // ... existing tools ...
    {
        type: "function",
        function: {
            name: "send_payment_message",
            description: "Send a payment reminder message to a tenant via WhatsApp. Use when user asks to send payment reminder or notify tenant about payment.",
            parameters: {
                type: "object",
                properties: {
                    contract_id: {
                        type: "string",
                        description: "The contract ID"
                    },
                    amount: {
                        type: "number",
                        description: "Payment amount in NIS"
                    },
                    due_date: {
                        type: "string",
                        description: "Payment due date (YYYY-MM-DD)"
                    }
                },
                required: ["contract_id", "amount", "due_date"]
            }
        }
    }
];
```

### Step 2: Implement the Function

```typescript
async function sendPaymentMessage(contractId: string, amount: number, dueDate: string, userId: string) {
    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);
        
        // Get contract and tenant info
        const { data: contract } = await supabase
            .from('contracts')
            .select('tenant_id, property_id')
            .eq('id', contractId)
            .eq('user_id', userId)
            .single();
        
        if (!contract) {
            return { success: false, message: "חוזה לא נמצא" };
        }
        
        const { data: tenant } = await supabase
            .from('tenants')
            .select('name, phone')
            .eq('id', contract.tenant_id)
            .single();
        
        // Generate WhatsApp link
        const message = `שלום ${tenant.name},\nתזכורת לתשלום שכירות:\nסכום: ₪${amount}\nתאריך: ${dueDate}\nתודה!`;
        const whatsappLink = `https://wa.me/${tenant.phone}?text=${encodeURIComponent(message)}`;
        
        return {
            success: true,
            message: `הודעה מוכנה לשליחה ל-${tenant.name}`,
            whatsapp_link: whatsappLink
        };
    } catch (err) {
        return { success: false, message: "שגיאה ביצירת הודעה" };
    }
}
```

### Step 3: Add to Execution Logic

```typescript
if (functionName === "search_contracts") {
    // ... existing code ...
} else if (functionName === "send_payment_message") {
    if (!userId) {
        functionResult = { success: false, message: "User not authenticated." };
    } else {
        functionResult = await sendPaymentMessage(
            functionArgs.contract_id,
            functionArgs.amount,
            functionArgs.due_date,
            userId
        );
    }
} else {
    functionResult = { success: false, message: "Unknown function" };
}
```

### Step 4: Update System Prompt

```typescript
content: `You are a helpful customer support assistant for "RentMate".

You can help users by:
1. Answering questions based on the Knowledge Base
2. Searching for their contracts
3. Sending payment reminders to tenants (creates WhatsApp message)

LANGUAGE: Respond in the SAME language the user writes in.

Knowledge Base:
${knowledgeBase}`
```

### Step 5: Deploy

```bash
npx supabase functions deploy chat-support --project-ref qfvrekvugdjnwhnaucmz
```

---

## Quick Reference: Permission Levels

| What to Control | Where to Edit | Redeploy Needed? |
|-----------------|---------------|------------------|
| Bot personality/tone | System prompt (index.ts line 134) | ✅ Yes |
| What bot can do | FUNCTION_TOOLS (index.ts line 17) | ✅ Yes |
| What bot knows | knowledge.ts | ✅ Yes |
| Usage limits | Database (ai_usage_limits table) | ❌ No |
| Authentication rules | index.ts lines 95-99 | ✅ Yes |
| Data access rules | Function implementations | ✅ Yes |

---

## Best Practices

### 1. **Always Authenticate Sensitive Actions**
```typescript
if (!userId) {
    return { success: false, message: "Authentication required" };
}
```

### 2. **Validate User Owns Data**
```typescript
.eq('user_id', userId)  // Always filter by user_id
```

### 3. **Limit Data Exposure**
```typescript
.select('id, name, email')  // Only select needed fields
.limit(10)  // Limit results
```

### 4. **Add Clear Error Messages**
```typescript
if (error) {
    return { 
        success: false, 
        message: "שגיאה: " + error.message 
    };
}
```

### 5. **Log Important Actions**
```typescript
console.log(`User ${userId} performed action: ${functionName}`);
```

---

## Testing Your Changes

After modifying permissions:

1. **Deploy:**
   ```bash
   npx supabase functions deploy chat-support --project-ref qfvrekvugdjnwhnaucmz
   ```

2. **Test in app:**
   - Open chatbot
   - Try the new function
   - Verify authentication works
   - Check error handling

3. **Monitor logs:**
   - Go to Supabase Dashboard → Functions → chat-support
   - Check logs for errors

---

## Summary

The chatbot's permissions are controlled through:

1. **System Prompt** → What the bot should/shouldn't do
2. **Function Tools** → What actions are available
3. **Authentication** → Who can use the bot
4. **Usage Limits** → How much users can use
5. **Data Access** → What data users can see
6. **Knowledge Base** → What information bot has

**To add new capabilities:**
1. Define function in `FUNCTION_TOOLS`
2. Implement function logic
3. Add to execution switch
4. Update system prompt
5. Deploy

**To restrict capabilities:**
1. Update system prompt with restrictions
2. Add authentication checks
3. Limit data access in queries
4. Deploy
