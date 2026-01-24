# RentMate Chatbot Optimization Plan

## 📊 Current Status Assessment

### ✅ What's Working Well
- **AI Model**: OpenAI GPT-4o-mini (reliable, no quota issues)
- **Languages**: Hebrew & English auto-detection
- **Voice Input**: Hebrew speech-to-text working
- **Authentication**: Secure user authentication via Supabase
- **Usage Tracking**: Tier-based limits (Free: 50, Basic: 200, Pro: 1000, Business: Unlimited)
- **Function Calling**: Contract search implemented
- **Admin Dashboard**: Real-time usage monitoring at `/admin/ai-usage`

### ⚠️ Areas for Improvement
1. **Limited Functions** - Only contract search available
2. **Knowledge Base** - Could be more comprehensive
3. **Proactive Assistance** - Bot is reactive, not proactive
4. **Analytics** - No tracking of popular questions or user satisfaction
5. **Conversation Context** - Limited memory of previous interactions
6. **Error Handling** - Could be more user-friendly

---

## 🎯 Optimization Strategy

### **Phase 1: Enhance Core Capabilities** (Week 1-2)

#### 1.1 Expand Knowledge Base
**File:** `supabase/functions/chat-support/knowledge.ts`

**Actions:**
- [ ] Add detailed step-by-step guides for all major features
- [ ] Include Israeli rental law information (תקנות השכירות)
- [ ] Add tax-related FAQs (מס הכנסה, מס שבח)
- [ ] Include troubleshooting guides
- [ ] Add glossary of rental terms (Hebrew & English)

**Example Content to Add:**
```typescript
## חוקי שכירות בישראל
- חוק הגנת הדייר (תשל"ב-1972)
- תקנות השכירות והשאילה (תשל"ג-1973)
- זכויות ושכירות: מה מותר ומה אסור

## מיסוי
- דיווח על הכנסות משכירות
- ניכוי הוצאות מוכרות
- מס שבח במכירת נכס
- פטור ממס על דירה יחידה

## תחזוקה ותיקונים
- מי אחראי על מה? (בעל הנכס vs. שוכר)
- תיקונים דחופים
- שיפוצים והשבחות
```

#### 1.2 Add Essential Functions
**File:** `supabase/functions/chat-support/index.ts`

**Priority Functions to Add:**

##### A. **Get Property Details**
```typescript
{
    name: "get_property_details",
    description: "Get details about a specific property. Use when user asks about property information.",
    parameters: {
        property_id: { type: "string", description: "Property ID or address" }
    }
}
```

##### B. **Get Upcoming Payments**
```typescript
{
    name: "get_upcoming_payments",
    description: "Get upcoming rent payments and due dates. Use when user asks about payments or rent due.",
    parameters: {
        days_ahead: { type: "number", description: "Number of days to look ahead (default: 30)" }
    }
}
```

##### C. **Create Payment Reminder**
```typescript
{
    name: "create_payment_reminder",
    description: "Generate a payment reminder message for WhatsApp. Use when user wants to send payment reminder to tenant.",
    parameters: {
        contract_id: { type: "string" },
        amount: { type: "number" },
        due_date: { type: "string" }
    }
}
```

##### D. **Get Contract Expiring Soon**
```typescript
{
    name: "get_expiring_contracts",
    description: "Get contracts expiring within specified days. Use when user asks about contract renewals or expirations.",
    parameters: {
        days_ahead: { type: "number", description: "Number of days to look ahead (default: 60)" }
    }
}
```

##### E. **Calculate Rent with CPI**
```typescript
{
    name: "calculate_cpi_adjustment",
    description: "Calculate rent adjustment based on CPI (מדד המחירים לצרכן). Use when user asks about הצמדה למדד.",
    parameters: {
        base_rent: { type: "number" },
        base_index: { type: "number" },
        current_index: { type: "number" }
    }
}
```

---

### **Phase 2: Improve User Experience** (Week 3-4)

#### 2.1 Enhance System Prompt
**Current:** Basic conversational assistant
**Improved:** Proactive, context-aware assistant

**New System Prompt:**
```typescript
content: `You are RentMate AI, an expert property management assistant for Israeli landlords.

PERSONALITY:
- Friendly, professional, and proactive
- Expert in Israeli rental laws and tax regulations
- Always provide actionable advice
- Use emojis sparingly for clarity (📋 for contracts, 💰 for payments, 🏠 for properties)

LANGUAGE:
- Detect and respond in user's language (Hebrew or English)
- Use formal Hebrew (לשון רשמית) for legal/tax topics
- Use casual Hebrew for general help

CAPABILITIES:
1. Search and manage contracts
2. Track payments and send reminders
3. Calculate CPI adjustments (הצמדה למדד)
4. Provide legal and tax guidance
5. Help with property management tasks

PROACTIVE BEHAVIOR:
- If user has contracts expiring in 60 days, mention it
- If payments are overdue, suggest sending reminders
- If user asks about taxes, offer to explain deductions

RESTRICTIONS:
- Do NOT provide personalized legal advice (refer to lawyer)
- Do NOT provide personalized tax advice (refer to accountant)
- Do NOT make promises about future features
- Do NOT access other users' data

Knowledge Base:
${knowledgeBase}`
```

#### 2.2 Add Conversation Memory
**Current:** Each message is independent
**Improved:** Remember conversation context

**Implementation:**
```typescript
// Store last 5 messages in conversation context
const conversationHistory = messages.slice(-5);

// Add context to system prompt
const contextPrompt = `
Recent conversation context:
${conversationHistory.map(m => `${m.role}: ${m.content}`).join('\n')}

Use this context to provide more relevant responses.
`;
```

#### 2.3 Improve Error Messages
**Current:** Generic error messages
**Improved:** Helpful, actionable error messages

**Examples:**
```typescript
// Instead of: "Database error"
// Use: "לא הצלחתי למצוא את החוזה. האם תוכל לספק את כתובת הנכס או שם השוכר?"

// Instead of: "User not authenticated"
// Use: "כדי לחפש חוזים, אנא התחבר לחשבון שלך. האם אוכל לעזור במשהו אחר בינתיים?"

// Instead of: "Unknown function"
// Use: "אני עדיין לומד איך לעשות את זה. בינתיים, אוכל לעזור לך עם חיפוש חוזים, תזכורות תשלום, או שאלות כלליות."
```

---

### **Phase 3: Analytics & Optimization** (Week 5-6)

#### 3.1 Track User Satisfaction
**New Table:** `ai_chat_feedback`

```sql
CREATE TABLE ai_chat_feedback (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    message_id TEXT,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    feedback_text TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**UI Addition:** Add thumbs up/down after each bot response

#### 3.2 Track Popular Questions
**New Table:** `ai_chat_analytics`

```sql
CREATE TABLE ai_chat_analytics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id),
    question_category TEXT, -- 'contracts', 'payments', 'legal', 'tax', 'general'
    question_text TEXT,
    function_called TEXT,
    response_time_ms INTEGER,
    was_helpful BOOLEAN,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Dashboard:** Add analytics page at `/admin/ai-analytics`
- Most asked questions
- Average response time
- User satisfaction rate
- Function usage statistics

#### 3.3 Implement Smart Suggestions
**Feature:** Suggest common actions based on user data

```typescript
// Example: Proactive suggestions
async function getSmartSuggestions(userId: string) {
    const suggestions = [];
    
    // Check for expiring contracts
    const expiringContracts = await getExpiringContracts(userId, 60);
    if (expiringContracts.length > 0) {
        suggestions.push({
            type: 'warning',
            message: `יש לך ${expiringContracts.length} חוזים שמסתיימים בחודשיים הקרובים. רוצה לראות אותם?`,
            action: 'show_expiring_contracts'
        });
    }
    
    // Check for upcoming payments
    const upcomingPayments = await getUpcomingPayments(userId, 7);
    if (upcomingPayments.length > 0) {
        suggestions.push({
            type: 'info',
            message: `יש ${upcomingPayments.length} תשלומים צפויים השבוע. רוצה לשלוח תזכורות?`,
            action: 'send_payment_reminders'
        });
    }
    
    return suggestions;
}
```

---

### **Phase 4: Advanced Features** (Week 7-8)

#### 4.1 Multi-turn Conversations
**Feature:** Handle complex, multi-step tasks

**Example Flow:**
```
User: "אני רוצה לשלוח תזכורת תשלום"
Bot: "בטח! לאיזה שוכר תרצה לשלוח תזכורת?"
User: "יוסי כהן"
Bot: "מצאתי חוזה עם יוסי כהן ברחוב הרצל 10. סכום השכירות: ₪4,500. מתי התשלום אמור להתקבל?"
User: "1 בחודש"
Bot: "מעולה! הכנתי הודעת תזכורת. רוצה לשלוח אותה עכשיו דרך WhatsApp?"
```

**Implementation:**
```typescript
// Store conversation state
interface ConversationState {
    userId: string;
    intent: string; // 'send_payment_reminder', 'create_contract', etc.
    step: number;
    data: Record<string, any>;
}

// Manage state in Redis or Supabase
```

#### 4.2 Voice Output (Text-to-Speech)
**Feature:** Read responses aloud in Hebrew

**Implementation:**
```typescript
// Use Web Speech API or Google Cloud TTS
const speakResponse = (text: string, lang: string = 'he-IL') => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = lang;
    window.speechSynthesis.speak(utterance);
};
```

#### 4.3 Smart Document Analysis
**Feature:** Analyze uploaded contracts and extract key information

```typescript
{
    name: "analyze_contract_document",
    description: "Analyze uploaded contract PDF and extract key information",
    parameters: {
        file_url: { type: "string", description: "URL to contract PDF" }
    }
}
```

**Use OpenAI Vision API** to read contract images/PDFs

---

## 🔧 Implementation Checklist

### **Immediate Actions (This Week)**
- [ ] Review and expand knowledge base with Israeli rental laws
- [ ] Add 3 most important functions:
  - [ ] `get_upcoming_payments`
  - [ ] `get_expiring_contracts`
  - [ ] `create_payment_reminder`
- [ ] Improve system prompt for better personality
- [ ] Add better error messages

### **Short-term (Next 2 Weeks)**
- [ ] Implement conversation memory (last 5 messages)
- [ ] Add user feedback mechanism (thumbs up/down)
- [ ] Create analytics dashboard
- [ ] Add smart suggestions on chat open

### **Medium-term (Next Month)**
- [ ] Implement multi-turn conversations
- [ ] Add voice output (TTS)
- [ ] Create comprehensive FAQ database
- [ ] Add A/B testing for different prompts

### **Long-term (Next Quarter)**
- [ ] Integrate with NotebookLM for advanced knowledge base
- [ ] Add document analysis (contract OCR)
- [ ] Implement predictive analytics (suggest actions before user asks)
- [ ] Add multi-language support (Arabic, Russian)

---

## 📈 Success Metrics

### **Key Performance Indicators (KPIs)**
1. **User Engagement**
   - Daily active chatbot users
   - Average messages per session
   - Return rate (users who use chatbot multiple times)

2. **Effectiveness**
   - % of questions answered successfully (no "I don't know")
   - Average response time
   - User satisfaction rating (thumbs up/down ratio)

3. **Business Impact**
   - Reduction in support tickets
   - Increase in feature adoption (users discovering features via chatbot)
   - Upgrade rate (users upgrading after hitting limits)

### **Target Goals (3 Months)**
- 70%+ of users interact with chatbot at least once
- 85%+ satisfaction rate (thumbs up)
- <2 second average response time
- 50%+ reduction in support emails

---

## 🚀 Quick Wins (Do These First!)

### **1. Improve Welcome Message**
**Current:**
```typescript
{ role: 'assistant', content: 'שלום! אני בוט התמיכה של RentMate. איך אוכל לעזור לך בנושא שכירות, חוזים או מס?' }
```

**Improved:**
```typescript
{ role: 'assistant', content: `שלום! 👋 אני RentMate AI, העוזר החכם שלך לניהול נכסים.

אני יכול לעזור לך עם:
📋 חיפוש וניהול חוזים
💰 תזכורות תשלום
🏠 מידע על נכסים
📊 חישובי הצמדה למדד
⚖️ שאלות משפטיות ומיסוי

מה תרצה לעשות היום?` }
```

### **2. Add Quick Action Buttons**
**UI Enhancement:** Add suggested actions below chat input

```tsx
<div className="flex gap-2 p-2 overflow-x-auto">
    <button onClick={() => sendMessage("הראה את החוזים שלי")}>
        📋 החוזים שלי
    </button>
    <button onClick={() => sendMessage("תשלומים השבוע")}>
        💰 תשלומים השבוע
    </button>
    <button onClick={() => sendMessage("חוזים שמסתיימים בקרוב")}>
        ⏰ חוזים שמסתיימים
    </button>
    <button onClick={() => sendMessage("איך מחשבים הצמדה למדד?")}>
        📊 הצמדה למדד
    </button>
</div>
```

### **3. Add Typing Indicator**
**Current:** Simple loading dots
**Improved:** Show what bot is doing

```tsx
{isLoading && (
    <div className="flex justify-start">
        <div className="bg-white/10 p-3 rounded-2xl">
            <div className="flex items-center space-x-2">
                <Loader className="w-4 h-4 animate-spin" />
                <span className="text-sm">מחפש במסד הנתונים...</span>
            </div>
        </div>
    </div>
)}
```

---

## 🔐 Security Best Practices

### **Current Security** ✅
- User authentication required for sensitive functions
- Row-level security (RLS) on database queries
- Usage limits per tier
- No data leakage between users

### **Additional Recommendations**
1. **Rate Limiting:** Add per-minute limits (currently only monthly)
   ```typescript
   // Max 10 messages per minute per user
   const recentMessages = await checkRecentMessages(userId, 60000);
   if (recentMessages > 10) {
       return "אנא המתן דקה לפני שליחת הודעות נוספות";
   }
   ```

2. **Input Sanitization:** Prevent prompt injection
   ```typescript
   const sanitizeInput = (input: string) => {
       // Remove system prompt injection attempts
       return input
           .replace(/system:|assistant:|user:/gi, '')
           .replace(/<\|.*?\|>/g, '')
           .trim();
   };
   ```

3. **Audit Logging:** Log all function calls
   ```typescript
   await supabase.from('ai_audit_log').insert({
       user_id: userId,
       function_name: functionName,
       parameters: functionArgs,
       result: functionResult,
       timestamp: new Date()
   });
   ```

---

## 💡 Pro Tips

1. **Test with Real Users:** Get 5-10 users to test chatbot and provide feedback
2. **Monitor Costs:** Check OpenAI usage daily at https://platform.openai.com/usage
3. **A/B Test Prompts:** Try different system prompts and measure satisfaction
4. **Update Knowledge Base Monthly:** Add new FAQs based on popular questions
5. **Celebrate Wins:** Show users when chatbot helps them complete tasks faster

---

## 📞 Support & Resources

- **OpenAI Documentation:** https://platform.openai.com/docs
- **Supabase Edge Functions:** https://supabase.com/docs/guides/functions
- **Israeli Rental Laws:** https://www.gov.il/he/departments/topics/rent
- **CPI Data:** https://www.cbs.gov.il/he/subjects/pages/מדד-המחירים-לצרכן.aspx

---

## 🎯 Next Steps

**Choose Your Priority:**

### **Option A: Quick Improvements (2-3 hours)**
1. Enhance welcome message
2. Add quick action buttons
3. Improve error messages
4. Expand knowledge base with top 10 FAQs

### **Option B: Add Core Functions (1 week)**
1. Implement `get_upcoming_payments`
2. Implement `get_expiring_contracts`
3. Implement `create_payment_reminder`
4. Update system prompt
5. Deploy and test

### **Option C: Full Optimization (1 month)**
Follow the complete Phase 1-4 plan above

---

**Which option would you like to pursue?** Let me know and I'll help you implement it! 🚀
