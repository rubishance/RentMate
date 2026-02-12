export interface ArticleMetadata {
    slug: string;
    title_en: string;
    title_he: string;
    category: string;
    category_he: string;
    readTime: number;
    date: string;
    description_en: string;
    description_he: string;
    keywords_en: string[];
    keywords_he: string[];
}

export const articles: ArticleMetadata[] = [
    {
        slug: 'cpi-linkage-guide',
        title_en: 'Understanding CPI Linkage in Israeli Rental Contracts',
        title_he: 'מדריך להבנת הצמדה למדד במחירי שכירות',
        category: 'Legal & Regulations',
        category_he: 'חוקים ותקנות',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Learn how CPI (Consumer Price Index) linkage works in Israeli rental contracts and how to calculate rent adjustments accurately.',
        description_he: 'למדו כיצד פועלת הצמדה למדד המחירים לצרכן בחוזי שכירות ישראליים וכיצד לחשב עדכוני שכר דירה במדויק.',
        keywords_en: ['CPI linkage', 'rent adjustment', 'consumer price index'],
        keywords_he: ['הצמדה למדד', 'עדכון שכר דירה', 'מדד המחירים לצרכן']
    },
    {
        slug: 'landlord-tax-obligations',
        title_en: 'Landlord Tax Obligations in Israel: Complete Guide',
        title_he: 'חובות מס למשכירים בישראל: מדריך מלא',
        category: 'Taxes & Finance',
        category_he: 'מיסים ופיננסים',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Everything you need to know about tax obligations for landlords in Israel, including Form 1301, deductions, and filing deadlines.',
        description_he: 'כל מה שצריך לדעת על חובות מס למשכירים בישראל, כולל טופס 1301, ניכויים ומועדי הגשה.',
        keywords_en: ['rental income tax', 'form 1301', 'landlord taxes Israel'],
        keywords_he: ['מס הכנסה משכירות', 'טופס 1301', 'מס למשכירים']
    },
    {
        slug: 'rent-calculation-methods',
        title_en: 'How to Calculate Rent Adjustments: Step-by-Step Guide',
        title_he: 'כיצד לחשב עדכוני שכר דירה: מדריך שלב אחר שלב',
        category: 'Property Management',
        category_he: 'ניהול נכסים',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Master the formulas and methods for calculating accurate rent adjustments based on CPI linkage in Israeli rental contracts.',
        description_he: 'שלטו בנוסחאות ובשיטות לחישוב עדכוני שכר דירה מדויקים על בסיס הצמדה למדד בחוזי שכירות ישראליים.',
        keywords_en: ['rent calculation', 'CPI adjustment', 'index linkage formula'],
        keywords_he: ['חישוב שכר דירה', 'התאמת מדד', 'נוסחת הצמדה']
    },
    {
        slug: 'tenant-rights-landlord-responsibilities',
        title_en: 'Tenant Rights and Landlord Responsibilities in Israel',
        title_he: 'זכויות שוכרים וחובות משכירים בישראל',
        category: 'Legal & Regulations',
        category_he: 'חוקים ותקנות',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Understand the legal rights of tenants and obligations of landlords under Israeli rental law to avoid disputes and maintain good relationships.',
        description_he: 'הבינו את הזכויות החוקיות של שוכרים וחובות המשכירים על פי חוק השכירות הישראלי כדי למנוע סכסוכים ולשמור על יחסים טובים.',
        keywords_en: ['tenant rights Israel', 'landlord obligations', 'rental law'],
        keywords_he: ['זכויות שוכרים', 'חובות משכירים', 'חוק השכירות']
    },
    {
        slug: 'writing-rental-contract',
        title_en: 'Writing a Legally Compliant Rental Contract in Israel',
        title_he: 'כתיבת חוזה שכירות תקין מבחינה משפטית בישראל',
        category: 'Legal & Regulations',
        category_he: 'חוקים ותקנות',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Learn the essential elements every Israeli rental contract must include to be legally valid and protect both landlord and tenant.',
        description_he: 'למדו את המרכיבים החיוניים שכל חוזה שכירות ישראלי חייב לכלול כדי להיות תקף משפטית ולהגן על המשכיר והשוכר.',
        keywords_en: ['rental contract Israel', 'lease agreement', 'legal requirements'],
        keywords_he: ['חוזה שכירות', 'הסכם שכירות', 'דרישות חוקיות']
    },
    {
        slug: 'security-deposits-guide',
        title_en: 'Security Deposits in Israel: Rules and Best Practices',
        title_he: 'פיקדונות בישראל: כללים ושיטות עבודה מומלצות',
        category: 'Property Management',
        category_he: 'ניהול נכסים',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Everything landlords and tenants need to know about security deposits (pitzuim) in Israeli rental agreements—from collection to return.',
        description_he: 'כל מה שמשכירים ושוכרים צריכים לדעת על פיקדונות (פיצויים) בהסכמי שכירות ישראליים - מגביה ועד החזרה.',
        keywords_en: ['security deposit', 'pitzuim', 'deposit return'],
        keywords_he: ['פיקדון', 'פיצויים', 'החזר פיקדון']
    },
    {
        slug: 'eviction-process-guide',
        title_en: 'The Eviction Process in Israel: A Legal Guide',
        title_he: 'תהליך הפינוי בישראל: מדריך משפטי',
        category: 'Legal & Regulations',
        category_he: 'חוקים ותקנות',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Understand the legal eviction process in Israel, including valid grounds, court procedures, and timeline for landlords and tenants.',
        description_he: 'הבינו את תהליך הפינוי החוקי בישראל, כולל עילות תקפות, נהלי בית משפט ולוח זמנים למשכירים ושוכרים.',
        keywords_en: ['eviction Israel', 'tenant eviction', 'eviction process'],
        keywords_he: ['פינוי דייר', 'הליך פינוי', 'בית משפט לשכירות']
    },
    {
        slug: 'property-maintenance-requirements',
        title_en: 'Property Maintenance: Legal Requirements for Landlords',
        title_he: 'תחזוקת נכס: דרישות חוקיות למשכירים',
        category: 'Property Management',
        category_he: 'ניהול נכסים',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Learn what maintenance and repairs landlords are legally required to provide in Israel and how to handle maintenance requests properly.',
        description_he: 'למדו איזו תחזוקה ותיקונים משכירים נדרשים לספק חוקית בישראל וכיצד לטפל בבקשות תחזוקה כראוי.',
        keywords_en: ['property maintenance', 'landlord obligations', 'repair responsibilities'],
        keywords_he: ['תחזוקת נכס', 'חובות משכיר', 'אחריות תיקונים']
    },
    {
        slug: 'rental-income-tax-deductions',
        title_en: 'Rental Income Tax Deductions You Can Claim in Israel',
        title_he: 'ניכויי מס על הכנסה משכירות שאתם יכולים לתבוע בישראל',
        category: 'Taxes & Finance',
        category_he: 'מיסים ופיננסים',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Maximize your rental income by understanding which expenses are tax-deductible for Israeli landlords and how to claim them properly.',
        description_he: 'מקסמו את הכנסתכם משכירות על ידי הבנה אילו הוצאות ניתנות לניכוי במס למשכירים ישראליים וכיצד לתבוע אותן כראוי.',
        keywords_en: ['tax deductions', 'rental expenses', 'landlord tax savings'],
        keywords_he: ['ניכויי מס', 'הוצאות שכירות', 'חיסכון במס למשכירים']
    },
    {
        slug: 'contract-renewal-vs-new-contract',
        title_en: 'Contract Renewal vs. New Contract: What\'s the Difference?',
        title_he: 'חידוש חוזה לעומת חוזה חדש: מה ההבדל?',
        category: 'Legal & Regulations',
        category_he: 'חוקים ותקנות',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Learn the legal and practical differences between renewing an existing rental contract and signing a new one in Israel.',
        description_he: 'למדו את ההבדלים המשפטיים והמעשיים בין חידוש חוזה שכירות קיים לחתימה על חוזה חדש בישראל.',
        keywords_en: ['contract renewal', 'lease extension', 'new lease'],
        keywords_he: ['חידוש חוזה', 'הארכת שכירות', 'חוזה חדש']
    },
    {
        slug: 'managing-multiple-properties',
        title_en: 'Managing Multiple Properties Efficiently: Systems and Tools',
        title_he: 'ניהול מספר נכסים ביעילות: מערכות וכלים',
        category: 'Property Management',
        category_he: 'ניהול נכסים',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Strategies, systems, and tools for efficiently managing multiple rental properties without getting overwhelmed.',
        description_he: 'אסטרטגיות, מערכות וכלים לניהול יעיל של מספר נכסי שכירות מבלי להיות מוצפים.',
        keywords_en: ['portfolio management', 'multiple properties', 'property management software'],
        keywords_he: ['ניהול תיק נכסים', 'מספר נכסים', 'תוכנת ניהול נכסים']
    },
    {
        slug: 'common-rental-disputes',
        title_en: 'Common Rental Disputes and How to Avoid Them',
        title_he: 'סכסוכי שכירות נפוצים וכיצד להימנע מהם',
        category: 'Legal & Regulations',
        category_he: 'חוקים ותקנות',
        readTime: 2,
        date: '2026-01-19',
        description_en: 'Learn about the most common disputes between landlords and tenants in Israel and proven strategies to prevent them before they escalate.',
        description_he: 'למדו על הסכסוכים הנפוצים ביותר בין משכירים לשוכרים בישראל ואסטרטגיות מוכחות למנוע אותם לפני שהם מסלימים.',
        keywords_en: ['rental disputes', 'landlord tenant conflict', 'dispute resolution'],
        keywords_he: ['סכסוכי שכירות', 'קונפליקט משכיר שוכר', 'פתרון סכסוכים']
    },
    {
        slug: 'admin-email-forwarding-guide',
        title_en: 'Admin Guide: Smart Email Forwarding to CRM',
        title_he: 'מדריך למנהלים: העברת אימיילים חכמה ל-CRM',
        category: 'Admin Operations',
        category_he: 'תפעול מנהלים',
        readTime: 3,
        date: '2026-01-26',
        description_en: 'Learn how to use log@rentmate.co.il to automatically sync client communications and attachments directly to the RentMate CRM history.',
        description_he: 'למדו כיצד להשתמש בכתובת log@rentmate.co.il כדי לסנכרן אוטומטית תקשורת עם לקוחות וקבצים מצורפים ישירות להיסטוריית ה-CRM של RentMate.',
        keywords_en: ['email forwarding', 'CRM logging', 'admin tools', 'support tickets'],
        keywords_he: ['העברת אימייל', 'תיעוד CRM', 'כלי ניהול', 'קריאות שירות']
    },
    {
        slug: 'digital-organization-tips',
        title_en: 'Digital Organization for Rental Properties: A Modern Approach',
        title_he: 'ארגון דיגיטלי לנכסי השכרה: גישה מודרנית',
        category: 'Property Management',
        category_he: 'ניהול נכסים',
        readTime: 4,
        date: '2026-02-12',
        description_en: 'Managing rental properties in 2026 requires more than just collecting rent checks. Digital organization has become essential for efficient property management.',
        description_he: 'ניהול נכסי השכרה ב-2026 דורש יותר מסתם גביית שיקי שכירות. ארגון דיגיטלי הפך להכרחי לניהול יעיל של נכסים.',
        keywords_en: ['digital organization', 'cloud storage', 'property management', 'automation'],
        keywords_he: ['ארגון דיגיטלי', 'אחסון בענן', 'ניהול נכסים', 'אוטומציה']
    },
    {
        slug: 'tenant-screening-guide',
        title_en: 'Tenant Screening: Finding Reliable Renters',
        title_he: 'סינון שוכרים: מציאת דיירים אמינים',
        category: 'Property Management',
        category_he: 'ניהול נכסים',
        readTime: 5,
        date: '2026-02-12',
        description_en: 'Finding the right tenant can make or break your rental experience. Learn how to screen tenants effectively without crossing legal boundaries.',
        description_he: 'מציאת השוכר הנכון יכולה לקבוע את הצלחת ההשקעה. למדו כיצד לסנן שוכרים ביעילות מבלי לחצות גבולות חוקיים.',
        keywords_en: ['tenant screening', 'background check', 'rental application', 'tenant verification'],
        keywords_he: ['סינון שוכרים', 'בדיקת רקע', 'בקשת שכירות', 'אימות שוכר']
    },
    {
        slug: 'preventive-maintenance-schedule',
        title_en: 'Preventive Maintenance: Protecting Your Investment',
        title_he: 'תחזוקה מונעת: הגנה על ההשקעה שלכם',
        category: 'Property Management',
        category_he: 'ניהול נכסים',
        readTime: 6,
        date: '2026-02-12',
        description_en: 'A well-maintained property attracts better tenants and avoids costly repairs. Discover the secret to long-term profitability in rental management.',
        description_he: 'נכס מתוחזק היטב מושך שוכרים טובים יותר ומונע תיקונים יקרים. גלו את הסוד לרווחיות ארוכת טווח בניהול נכסים.',
        keywords_en: ['preventive maintenance', 'maintenance schedule', 'property upkeep', 'HVAC'],
        keywords_he: ['תחזוקה מונעת', 'לוח תחזוקה', 'תחזוקת נכס', 'מיזוג אוויר']
    },
    {
        slug: 'israeli-rental-market-faq',
        title_en: 'Israeli Rental Market FAQ: Everything You Need to Know',
        title_he: 'שוק השכירות הישראלי: שאלות ותשובות וכל מה שצריך לדעת',
        category: 'Legal & Regulations',
        category_he: 'חוקים ותקנות',
        readTime: 4,
        date: '2026-02-12',
        description_en: 'Navigate the unique financial, legal, and cultural landscape of the Israeli rental market using professional terminology and legal guidelines.',
        description_he: 'נווטו בנוף הפיננסי, המשפטי והתרבותי הייחודי של שוק השכירות הישראלי תוך שימוש במונחים מקצועיים והנחיות משפטיות.',
        keywords_en: ['rental market faq', 'israel rental laws', 'arnona', 'guarantees'],
        keywords_he: ['שאלות ותשובות שכירות', 'חוקי שכירות בישראל', 'ארנונה', 'ערבויות']
    }
];
