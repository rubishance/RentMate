# RentMate Chatbot - Quick Start Improvements

## 🎯 Goal: Make Your Chatbot 10x Better in 2 Hours

This guide focuses on **high-impact, low-effort** improvements you can implement immediately.

---

## ✅ Checklist (Complete in Order)

### **Step 1: Enhance Welcome Message** (5 minutes)

**File:** `src/hooks/useChatBot.ts` (Line 14)

**Replace:**
```typescript
{ role: 'assistant', content: 'שלום! אני בוט התמיכה של RentMate. איך אוכל לעזור לך בנושא שכירות, חוזים או מס?' }
```

**With:**
```typescript
{ role: 'assistant', content: `שלום! 👋 אני RentMate AI, העוזר החכם שלך לניהול נכסים.

אני יכול לעזור לך עם:
📋 חיפוש וניהול חוזים
💰 מעקב אחר תשלומים
🏠 מידע על נכסים
📊 חישובי הצמדה למדד
⚖️ שאלות משפטיות ומיסוי

מה תרצה לעשות היום?` }
```

---

### **Step 2: Improve System Prompt** (10 minutes)

**File:** `supabase/functions/chat-support/index.ts` (Lines 133-145)

**Replace the current system prompt with:**

```typescript
{
    role: "system",
    content: `You are RentMate AI, an expert property management assistant for Israeli landlords.

PERSONALITY:
- Friendly, professional, and helpful
- Expert in Israeli rental laws and property management
- Always provide actionable, specific advice
- Use emojis sparingly for clarity (📋 contracts, 💰 payments, 🏠 properties, ⚖️ legal)

LANGUAGE RULES:
- ALWAYS respond in the SAME language the user writes in
- For Hebrew: Use natural, conversational Hebrew (not overly formal)
- For English: Use clear, professional English
- Most users speak Hebrew

YOUR CAPABILITIES:
1. Search and display user's rental contracts
2. Answer questions about property management
3. Explain Israeli rental laws and regulations
4. Help with CPI calculations (הצמדה למדד)
5. Provide tax and legal guidance (general information only)

IMPORTANT RESTRICTIONS:
❌ Do NOT provide personalized legal advice - refer users to consult a lawyer
❌ Do NOT provide personalized tax advice - refer users to consult an accountant (רואה חשבון)
❌ Do NOT make promises about future features
❌ Do NOT access or discuss other users' data
❌ Do NOT perform actions without user confirmation

RESPONSE STYLE:
✅ Be concise but complete
✅ Use bullet points for lists
✅ Provide examples when explaining concepts
✅ Ask clarifying questions if user's request is unclear
✅ Suggest next steps after answering

PROACTIVE BEHAVIOR:
- If user asks about contracts, offer to search for them
- If discussing payments, mention reminder features
- If explaining laws, cite specific regulations when relevant

Knowledge Base:
${knowledgeBase}`
}
```

---

### **Step 3: Expand Knowledge Base** (30 minutes)

**File:** `supabase/functions/chat-support/knowledge.ts`

**Add these sections to the Hebrew knowledge base:**

```typescript
export const KNOWLEDGE_HE = `
# מדריך RentMate - תמיכה מלאה

## 🏠 ניהול נכסים

### הוספת נכס חדש
1. לחץ על כפתור "+" בתפריט התחתון
2. בחר "נכס חדש"
3. מלא את הפרטים:
   - כתובת מלאה
   - סוג נכס (דירה, בית, מסחרי)
   - גודל במ"ר
   - מספר חדרים
   - תמונות (אופציונלי)
4. לחץ "שמור"

### עריכת פרטי נכס
1. היכנס לעמוד "הנכסים שלי"
2. לחץ על הנכס שברצונך לערוך
3. לחץ על כפתור העריכה (✏️)
4. עדכן את הפרטים
5. לחץ "שמור שינויים"

### מחיקת נכס
⚠️ שים לב: מחיקת נכס תמחק גם את כל החוזים והמסמכים הקשורים אליו!
1. היכנס לעמוד הנכס
2. לחץ על תפריט (⋮)
3. בחר "מחק נכס"
4. אשר את המחיקה

---

## 📋 ניהול חוזים

### יצירת חוזה חדש
1. לחץ על "+" → "חוזה חדש"
2. בחר נכס מהרשימה
3. מלא פרטי שוכר:
   - שם מלא
   - תעודת זהות
   - טלפון
   - אימייל
4. הגדר תנאי שכירות:
   - תאריך התחלה
   - תאריך סיום
   - דמי שכירות חודשיים
   - הצמדה למדד (כן/לא)
   - מדד בסיס (אם יש הצמדה)
5. העלה חוזה סרוק (PDF)
6. לחץ "צור חוזה"

### הצמדה למדד - מה זה?
**הצמדה למדד המחירים לצרכן** היא מנגנון להתאמת דמי השכירות לשינויים במחירים.

**איך זה עובד?**
- בתחילת החוזה נקבע "מדד בסיס"
- מדי תקופה (בדרך כלל שנה) בודקים את המדד הנוכחי
- אם המדד עלה, דמי השכירות עולים באחוז זהה
- אם המדד ירד, דמי השכירות יורדים באחוז זהה

**דוגמה:**
- דמי שכירות: ₪4,000
- מדד בסיס: 100
- מדד נוכחי: 105
- עליית מדד: 5%
- דמי שכירות חדשים: ₪4,200 (4,000 × 1.05)

**איפה למצוא את המדד?**
- אתר הלשכה המרכזית לסטטיסטיקה: https://www.cbs.gov.il
- המדד מתפרסם ב-15 לכל חודש

### חידוש חוזה
1. היכנס לעמוד החוזה
2. לחץ "חדש חוזה"
3. עדכן תאריכים ותנאים
4. העלה חוזה חדש (אם יש)
5. לחץ "שמור"

---

## 💰 תשלומים ותזכורות

### מעקב אחר תשלומים
- כל חוזה מציג את סטטוס התשלום החודשי
- צבע ירוק = שולם
- צבע צהוב = ממתין לתשלום
- צבע אדום = איחור בתשלום

### שליחת תזכורת תשלום
1. היכנס לעמוד החוזה
2. לחץ "שלח תזכורת"
3. בחר ערוץ (WhatsApp / SMS / אימייל)
4. ערוך את ההודעה (אופציונלי)
5. לחץ "שלח"

### הודעת תשלום אוטומטית
ניתן להגדיר הודעות אוטומטיות:
1. הגדרות → התראות
2. הפעל "תזכורות תשלום אוטומטיות"
3. בחר מתי לשלוח (למשל: 3 ימים לפני תאריך התשלום)

---

## ⚖️ חוקים ותקנות

### חוק הגנת הדייר (תשל"ב-1972)
**עיקרי החוק:**
- הגנה על זכויות השוכר
- הגבלות על העלאת שכר דירה
- תנאים לפינוי דייר

**מתי חל החוק?**
- חוזים שנחתמו לפני 1972
- דירות מסוימות בבעלות ציבורית
- **רוב החוזים החדשים לא מוגנים!**

### חוק השכירות והשאילה (תשל"א-1971)
**זכויות המשכיר:**
- לקבל תשלום במועד
- לבדוק את הנכס (בתיאום מראש)
- לדרוש פיצוי על נזקים

**חובות המשכיר:**
- לספק נכס ראוי למגורים
- לתקן תקלות מבניות
- להחזיר ערבון בסוף החוזה (אם אין נזקים)

**זכויות השוכר:**
- לגור בשקט ובפרטיות
- לדרוש תיקונים דחופים
- לקבל הודעה מוקדמת על ביקורים

### ערבון
**כללים:**
- ערבון מקסימלי: 3 חודשי שכירות
- חובה להחזיר תוך 30 יום מסיום החוזה
- ניתן לנכות נזקים (עם הוכחות)

---

## 💵 מיסוי והכנסות משכירות

### דיווח למס הכנסה
**חובת דיווח:**
- כל הכנסה משכירות חייבת בדיווח למס הכנסה
- הדיווח נעשה בדוח שנתי (טופס 1301)
- מועד הגשה: עד 30 באפריל (לשנת המס הקודמת)

**שיעורי מס:**
שתי אפשרויות:

1. **מס ליניארי (10%):**
   - מס קבוע של 10% על ההכנסה הגולמית
   - ללא ניכוי הוצאות
   - מתאים למי שיש לו מעט הוצאות

2. **מס רגיל (מדורג):**
   - מס לפי מדרגות (עד 50%)
   - ניתן לנכות הוצאות מוכרות
   - מתאים למי שיש לו הרבה הוצאות

### הוצאות מוכרות לניכוי
✅ ניתן לנכות:
- ארנונה
- ועד בית
- ביטוח דירה
- תיקונים ותחזוקה
- פחת (בהיר 2% לשנה)
- ריבית על משכנתא (אם יש)
- דמי ניהול
- מס שבח (במכירה)

❌ לא ניתן לנכות:
- החזר קרן משכנתא
- שיפורים והשבחות (נדחים למכירה)

### מס שבח
**מתי משלמים?**
- במכירת נכס
- המס הוא על הרווח (מחיר מכירה - מחיר רכישה)

**פטור:**
- דירה יחידה: פטור מלא (בתנאים)
- דירה שנייה: פטור חלקי (עד תקרה)

**שיעור מס שבח:**
- 25% על הרווח הריאלי
- או 25% על הרווח הנומינלי (לבחירה)

---

## 🔧 תחזוקה ותיקונים

### מי אחראי על מה?

**אחריות המשכיר (בעל הנכס):**
- תקלות מבניות (סדקים, נזילות)
- מערכות מרכזיות (חשמל, אינסטלציה)
- מכשירים שסופקו עם הדירה
- תיקוני חורף (דוד שמש, חימום)

**אחריות השוכר:**
- שמירה על ניקיון
- שימוש סביר בנכס
- תיקונים קטנים (נורות, ברזים)
- נזקים שגרם בעצמו

**תיקונים דחופים:**
- נזילת מים חמורה
- תקלת חשמל מסוכנת
- שבר בדלת/חלון
→ המשכיר חייב לטפל מיד!

### טיפים למניעת בעיות
✅ תעד את מצב הנכס בכניסה (תמונות + וידאו)
✅ ערוך פרוטוקול מסירה מפורט
✅ שמור קבלות על כל תיקון
✅ תקשר בכתב (WhatsApp, אימייל) לתיעוד

---

## 📱 שימוש באפליקציה

### תכונות עיקריות
1. **דשבורד:** סקירה כללית של כל הנכסים והחוזים
2. **חוזים:** ניהול חוזים, תשלומים, תזכורות
3. **מסמכים:** אחסון מאובטח של חוזים וקבלות
4. **מחשבון:** חישובי הצמדה למדד, החזר השקעה
5. **התראות:** תזכורות אוטומטיות לתשלומים ואירועים

### תמיכה טכנית
- צ'אט AI: זמין 24/7 (כאן!)
- אימייל: support@rentmate.co.il
- טלפון: 03-1234567 (ראשון-חמישי, 9:00-17:00)

---

## ❓ שאלות נפוצות (FAQ)

**ש: האם RentMate מתאים גם למשכיר של דירה אחת?**
ת: בהחלט! התוכנה מתאימה גם למשכיר של דירה אחת וגם לבעלי תיקי נכסים גדולים.

**ש: האם המידע שלי מאובטח?**
ת: כן! כל המידע מוצפן ומאוחסן בשרתים מאובטחים (Supabase). אנחנו לא משתפים מידע עם צדדים שלישיים.

**ש: האם אפשר לייצא נתונים?**
ת: כן, ניתן לייצא את כל הנתונים ל-PDF או Excel מעמוד ההגדרות.

**ש: מה קורה אם אני מוחק חוזה בטעות?**
ת: ניתן לשחזר חוזים שנמחקו תוך 30 יום מההגדרות → "שחזר פריטים שנמחקו".

**ש: האם יש גרסה למחשב?**
ת: כן! RentMate זמין גם בדפדפן: https://app.rentmate.co.il

**ש: כמה עולה השירות?**
ת: יש 4 תוכניות:
- **חינם:** עד 2 נכסים
- **בסיס (₪29/חודש):** עד 10 נכסים
- **פרו (₪99/חודש):** נכסים ללא הגבלה + תכונות מתקדמות
- **עסקי (₪299/חודש):** כל התכונות + תמיכה ייעודית

---

## 🎓 מונחים חשובים

**מדד המחירים לצרכן (CPI):** מדד שמודד שינויים במחירי סל מוצרים ושירותים.

**הצמדה למדד:** מנגנון להתאמת דמי שכירות לשינויים במדד.

**ערבון:** סכום כסף שהשוכר משלם בתחילת החוזה כביטחון למשכיר.

**דמי ניהול:** עמלה ששולמת לחברת ניהול נכסים (אם יש).

**מס שבח:** מס על רווח ממכירת נכס.

**פחת:** ירידת ערך הנכס לאורך זמן (לצורכי מס).

**RLS (Row Level Security):** אבטחה ברמת השורה - מבטיח שכל משתמש רואה רק את הנתונים שלו.

---

## 📞 צור קשר

**תמיכה טכנית:**
- צ'אט AI: זמין כאן 24/7
- אימייל: support@rentmate.co.il
- טלפון: 03-1234567

**שעות פעילות:**
- ראשון-חמישי: 9:00-17:00
- שישי: 9:00-13:00
- שבת: סגור

**מדיה חברתית:**
- פייסבוק: /RentMateIL
- אינסטגרם: @rentmate.il
- לינקדאין: /company/rentmate

---

*עודכן לאחרונה: ינואר 2026*
`;

// English knowledge base (shorter, for non-Hebrew speakers)
export const KNOWLEDGE_EN = `
# RentMate Support Guide

## Property Management
- Add property: Click "+" → "New Property" → Fill details → Save
- Edit property: Go to property page → Click edit (✏️) → Update → Save
- Delete property: Property page → Menu (⋮) → "Delete Property"

## Contracts
- Create contract: "+" → "New Contract" → Select property → Fill tenant details → Set terms → Upload PDF → Save
- CPI Linkage: Automatic rent adjustment based on Consumer Price Index changes
- Renew contract: Contract page → "Renew Contract" → Update terms → Save

## Payments & Reminders
- Track payments: Green = Paid, Yellow = Pending, Red = Overdue
- Send reminder: Contract page → "Send Reminder" → Choose channel (WhatsApp/SMS/Email) → Send
- Auto reminders: Settings → Notifications → Enable "Auto Payment Reminders"

## Israeli Rental Laws
- **Tenant Protection Law (1972):** Protects tenant rights, limits rent increases
- **Rental and Loan Law (1971):** Defines landlord/tenant rights and obligations
- **Security Deposit:** Max 3 months rent, must be returned within 30 days

## Taxes
- **Income Tax:** All rental income must be reported
- **Tax Options:**
  - Linear (10%): Flat 10% on gross income, no deductions
  - Regular: Progressive tax (up to 50%), can deduct expenses
- **Deductible Expenses:** Property tax, insurance, repairs, depreciation (2%/year), mortgage interest
- **Capital Gains Tax:** 25% on profit when selling property

## Maintenance
- **Landlord Responsible:** Structural issues, central systems, appliances provided
- **Tenant Responsible:** Cleanliness, normal use, minor repairs, self-caused damage

## App Features
- Dashboard: Overview of all properties and contracts
- Contracts: Manage contracts, payments, reminders
- Documents: Secure storage of contracts and receipts
- Calculator: CPI adjustments, ROI calculations
- Notifications: Auto reminders for payments and events

## Support
- AI Chat: Available 24/7 (here!)
- Email: support@rentmate.co.il
- Phone: 03-1234567 (Sun-Thu, 9:00-17:00)

---

*Last updated: January 2026*
`;
```

**Deploy the changes:**
```bash
npx supabase functions deploy chat-support --project-ref qfvrekvugdjnwhnaucmz
```

---

### **Step 4: Add Better Error Handling** (15 minutes)

**File:** `supabase/functions/chat-support/index.ts`

**Find the `searchContracts` function (line 38) and improve error messages:**

```typescript
async function searchContracts(query: string, userId: string) {
    try {
        const supabase = createClient(SUPABASE_URL!, SUPABASE_SERVICE_ROLE_KEY!);

        const { data, error } = await supabase
            .from('contracts')
            .select('id, start_date, end_date, monthly_rent, status, property_id, tenant_id')
            .eq('user_id', userId)
            .limit(10);

        if (error) {
            console.error("Search error:", error);
            return { 
                success: false, 
                message: `אירעה שגיאה בחיפוש. אנא נסה שוב או צור קשר עם התמיכה. (Error: ${error.message})` 
            };
        }

        if (!data || data.length === 0) {
            return { 
                success: false, 
                message: `לא מצאתי חוזים בחשבון שלך. 

רוצה שאעזור לך ליצור חוזה חדש? 
פשוט לחץ על כפתור "+" בתפריט התחתון ובחר "חוזה חדש". 📋` 
            };
        }

        const results = data.map(contract => ({
            id: contract.id,
            rent: `₪${contract.monthly_rent}`,
            period: `${contract.start_date} עד ${contract.end_date}`,
            status: contract.status === 'active' ? '✅ פעיל' : 
                    contract.status === 'expired' ? '⏰ פג תוקף' : 
                    '📋 ' + contract.status
        }));

        return {
            success: true,
            count: results.length,
            message: `מצאתי ${results.length} חוזים בחשבון שלך:`,
            contracts: results
        };
    } catch (err) {
        console.error("Function error:", err);
        return { 
            success: false, 
            message: "אירעה שגיאה לא צפויה. אנא נסה שוב מאוחר יותר. 🔧" 
        };
    }
}
```

---

### **Step 5: Add Quick Action Buttons** (20 minutes)

**File:** `src/components/chat/ChatWidget.tsx`

**Add after the input form (around line 181):**

```tsx
{/* Quick Actions */}
<div className="px-4 pb-3 bg-black border-t border-white/10">
    <p className="text-xs text-gray-400 mb-2">פעולות מהירות:</p>
    <div className="flex gap-2 overflow-x-auto scrollbar-thin scrollbar-thumb-white/10">
        <button
            onClick={() => {
                if (inputRef.current) {
                    inputRef.current.value = "הראה את החוזים שלי";
                    inputRef.current.focus();
                }
            }}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white whitespace-nowrap transition-colors"
        >
            📋 החוזים שלי
        </button>
        <button
            onClick={() => {
                if (inputRef.current) {
                    inputRef.current.value = "איך מחשבים הצמדה למדד?";
                    inputRef.current.focus();
                }
            }}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white whitespace-nowrap transition-colors"
        >
            📊 הצמדה למדד
        </button>
        <button
            onClick={() => {
                if (inputRef.current) {
                    inputRef.current.value = "מה זה ערבון?";
                    inputRef.current.focus();
                }
            }}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white whitespace-nowrap transition-colors"
        >
            💰 ערבון
        </button>
        <button
            onClick={() => {
                if (inputRef.current) {
                    inputRef.current.value = "איך מדווחים למס הכנסה?";
                    inputRef.current.focus();
                }
            }}
            className="px-3 py-1.5 bg-white/10 hover:bg-white/20 rounded-lg text-xs text-white whitespace-nowrap transition-colors"
        >
            ⚖️ מיסוי
        </button>
    </div>
</div>
```

---

### **Step 6: Improve Loading State** (10 minutes)

**File:** `src/components/chat/ChatWidget.tsx`

**Replace the loading indicator (around line 131) with:**

```tsx
{isLoading && (
    <div className="flex justify-start">
        <div className="bg-white/10 border border-white/5 p-3 rounded-2xl rounded-bl-none">
            <div className="flex items-center space-x-2 rtl:space-x-reverse">
                <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <div className="w-2 h-2 bg-white rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
                <span className="text-sm text-white">מחפש תשובה...</span>
            </div>
        </div>
    </div>
)}
```

---

### **Step 7: Deploy Changes** (5 minutes)

**Run these commands:**

```bash
# Deploy the updated Edge Function
npx supabase functions deploy chat-support --project-ref qfvrekvugdjnwhnaucmz

# If you made frontend changes, rebuild
npm run build
```

---

## 🎉 You're Done!

### **What You've Improved:**

✅ **Better First Impression:** Welcoming message with clear capabilities  
✅ **Smarter Responses:** Enhanced system prompt for better understanding  
✅ **Comprehensive Knowledge:** Extensive Hebrew knowledge base  
✅ **User-Friendly Errors:** Helpful error messages instead of technical jargon  
✅ **Quick Actions:** One-click access to common questions  
✅ **Better UX:** Improved loading states  

---

## 📊 Test Your Improvements

**Try these test cases:**

1. **Open chatbot** → Should see new welcome message with emojis
2. **Click "📋 החוזים שלי"** → Should populate input field
3. **Ask: "הראה חוזים"** → Should search contracts (if logged in)
4. **Ask: "מה זה הצמדה למדד?"** → Should get detailed explanation
5. **Ask: "איך מדווחים למס?"** → Should get tax information
6. **Ask in English: "How do I add a property?"** → Should respond in English

---

## 🚀 Next Steps (Optional)

After testing these improvements, you can:

1. **Add More Functions** (from the full optimization plan)
2. **Implement Analytics** (track popular questions)
3. **Add User Feedback** (thumbs up/down)
4. **Create Multi-turn Conversations** (complex task flows)

---

## 💡 Pro Tips

- **Monitor Usage:** Check `/admin/ai-usage` to see how users interact
- **Update Knowledge:** Add new FAQs based on common questions
- **Test Regularly:** Try different phrasings to ensure bot understands
- **Get Feedback:** Ask 5-10 users to test and provide feedback

---

**Questions?** Ask me anything! I'm here to help. 🤖
