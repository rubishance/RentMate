import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { PageHeader } from '../../components/common/PageHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { LanguageToggle } from '../../components/common/LanguageToggle';

export default function PrivacyPolicy() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';
    const lastUpdatedDate = new Date('2026-02-27').toLocaleDateString(isRtl ? 'he-IL' : 'en-US');

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden font-hebrew" dir={isRtl ? 'rtl' : 'ltr'}>

            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-primary-100/50 via-slate-100/10 to-transparent dark:from-primary-900/10 dark:via-slate-900/10 dark:to-transparent z-0 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-96 bg-primary/5 dark:bg-primary/5 filter blur-3xl z-0 pointer-events-none" />
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-teal-500/10 dark:bg-teal-600/5 filter blur-3xl rounded-full z-0 pointer-events-none" />

            <div className="relative z-10 pb-20 pt-8">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="flex justify-end mb-2">
                        <LanguageToggle />
                    </div>
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight leading-tight mb-2">
                            {isRtl ? "מדיניות פרטיות" : "Privacy Policy"}
                        </h1>
                    </div>

                    <GlassCard className="p-6 md:p-10 bg-card/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10">
                        {isRtl ? (
                            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/80" dir="rtl">
                                <h2 className="text-2xl font-bold text-foreground">מדיניות פרטיות - RentMate</h2>
                                <p className="text-sm font-medium text-muted-foreground">עודכן לאחרונה: {lastUpdatedDate}</p>
                                <p className="text-sm italic text-muted-foreground mb-2">
                                    * האמור באתר, באפליקציה ובמדיניות זו מנוסח בלשון זכר מטעמי נוחות בלבד, אך מתייחס ופונה לשני המינים כאחד באופן שווה וללא כל הבדל.
                                </p>

                                <p className="text-base md:text-lg leading-relaxed">
                                    אנו ב-RentMate מכבדים את פרטיותך ומחויבים להגן על המידע האישי שלך.
                                    מדיניות זו מתארת כיצד אנו אוספים, משתמשים, מעבדים ושומרים על המידע שלך, בהתאם לדרישות
                                    חוק הגנת הפרטיות, התשמ"א-1981, ותיקון 13 לחוק.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">1. איסוף מידע</h3>
                                <p className="leading-relaxed">אנו אוספים את סוגי המידע הבאים מאחר והזנת אותם או אישרת את איסופם:</p>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                    <li><strong className="text-foreground">פרטי זיהוי והתקשרות:</strong> שם מלא, כתובת אימייל, ומספר טלפון.</li>
                                    <li><strong className="text-foreground">פרטי נכסים וחוזים:</strong> כתובות נכסים, נתוני חוזים, מועדי תחילה וסיום, וסכומי תשלום המנוהלים במערכת על ידך.</li>
                                    <li><strong className="text-foreground">מידע טכני ומזהים:</strong> כתובת IP, סוג דפדפן, נתוני גלישה וזמן גישה (Cookies) המשמשים לתפעול ואבטחת המערכת.</li>
                                </ul>
                                <p className="leading-relaxed"><strong className="text-foreground">חובת מסירת המידע:</strong> אינך חייב/ת על פי חוק למסור מידע זה, אולם ללא מסירת פרטי החובה (כגון אימייל לצורך יצירת חשבון), לא נוכל לספק לך את שירותי המערכת.</p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">2. מטרות השימוש במידע</h3>
                                <p className="leading-relaxed">המידע ישמש אותנו למטרות הבאות באופן בלעדי:</p>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                    <li>מתן השירותים וניהול נכסיך כפי שהוגדר במערכת.</li>
                                    <li>יצירת קשר ושליחת עדכונים תפעוליים שוטפים והתראות.</li>
                                    <li>שיפור חווית המשתמש והתאמת השירות.</li>
                                    <li>אבטחת המידע שלנו ומניעת הונאות נגד המשתמשים.</li>
                                    <li>ציות לדרישות חוקיות ורגולטוריות במדינת ישראל.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">3. העברת מידע לצדדים שלישיים</h3>
                                <p className="leading-relaxed">אנו מתחייבים לא למכור או להעביר את פרטיך האישיים לגורמים מסחריים שאינם מורשים. עם זאת, רשאים אנו לשתף את המידע עם:</p>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                    <li>ספקי שירות חיצוניים (כגון שירותי אחסון ענן, ספקי דיוור, ומערכות בינה מלאכותית המסייעות לעיבוד הנתונים), למטרות מתן ושיפור השירות בלבד, ותחת התחייבויות לשמירת סודיות.</li>
                                    <li>רשויות חוק וממשל, במידה ונדרש לעשות זאת על פי דרישה חוקית, צו בית משפט או כדי למנוע עבירה פלילית.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">4. שילוב מערכות בינה מלאכותית (AI)</h3>
                                <p className="leading-relaxed">
                                    המערכת מפעילה עוזר וירטואלי (צ'אטבוט) המבוסס על מודלים מתקדמים של בינה מלאכותית, לרבות שירותים של צדדים שלישיים כגון OpenAI ו-Google (Gemini), המשמשים כקבלני משנה לעיבוד נתונים (Sub-processors).
                                </p>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                    <li><strong className="text-foreground">איסוף ושמירת שיחות:</strong> כל התכתובות והשיחות עם הצ'אטבוט נשמרות באופן מאובטח במערכותינו (בסביבת הענן של Supabase).</li>
                                    <li><strong className="text-foreground">מטרת השמירה:</strong> השיחות נשמרות לצרכי בקרת איכות, שיפור השירות, פתרון תקלות ושיפור מודלי הבינה המלאכותית שלנו.</li>
                                    <li><strong className="text-foreground">העברת המידע לעיבוד:</strong> במסגרת מתן השירות, תוכן השיחות (למעט קבצים מצורפים) מועבר לעיבוד דרך ה-API של הספקים המוזכרים לעיל על מנת לספק תשובות.</li>
                                    <li><strong className="text-foreground">שמירת נתונים:</strong> אנו שומרים את תיעוד השיחות כל עוד חשבונך פעיל, או עד שתבקש למחוק אותן במסגרת זכותך למחיקת מידע.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">5. זכויות המשתמש (עיון, תיקון ומחיקת מידע)</h3>
                                <p className="leading-relaxed">
                                    על פי חוק הגנת הפרטיות, הנך זכאי/ת לעיין במידע האישי המוחזק עליך במאגרינו.
                                    במקרה שהמידע אינו מדויק או שברצונך למחוק אותו, הינך רשאי/ת לפנות אלינו בבקשה לתיקון או למחיקת המידע מהמאגר.
                                    אנא שים/י לב כי מחיקת מידע חיוני עלולה למנוע את המשך אספקת השירות.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">6. אבטחת מידע</h3>
                                <p className="leading-relaxed">
                                    צדנו מפעילים ומטמיעים במערכת אמצעים טכנולוגיים וארגוניים מחמירים בהתאם לסטנדרטים המקובלים בשוק, על מנת להגן על המידע שלך בצורה המיטבית מאובדן, גישה בלתי מורשית או דלף. עם זאת, איננו יכולים להתחייב לחסינות מערכתית מוחלטת מפני חדירות של צדדים עוינים בזדון.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">7. עוגיות (Cookies) ואמצעי מעקב</h3>
                                <p className="leading-relaxed">
                                    האתר עושה שימוש בקבצי "עוגיות" (Cookies) לצורך תפעולו האופטימלי, אימון שירותי האתר ואבטחה.
                                    שימוש בשירותים מהווה הסכמה לאיסוף הנתונים כמתואר. תוכל/י לשנות את הגדרות הדפדפן שלך כדי לחסום Cookies בכל שלב (אם כי חלק מפעולות האתר עשויות שלא לפעול כראוי).
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">8. יצירת קשר</h3>
                                <p className="leading-relaxed">
                                    לכל שאלה על מדיניות זו או לצורך מימוש זכויות, ניתן לפנות אלינו בכתובת דוא"ל: <a href="mailto:info@rentmate.co.il" className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">info@rentmate.co.il</a>.
                                </p>
                            </div>
                        ) : (
                            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/80" dir="ltr">
                                <h2 className="text-2xl font-bold text-foreground">Privacy Policy - RentMate</h2>
                                <p className="text-sm font-medium text-muted-foreground">Last Updated: {lastUpdatedDate}</p>

                                <p className="text-base md:text-lg leading-relaxed">
                                    At RentMate, we respect your privacy and are committed to protecting your personal information.
                                    This policy explains how we collect, use, process, and safeguard your data in compliance with the Israeli Privacy Protection Law, 5741-1981, including Amendment 13.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">1. Information Collection</h3>
                                <p className="leading-relaxed">We collect the following types of information because you have voluntarily provided them or consented to their collection:</p>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                    <li><strong className="text-foreground">Identity and Contact Info:</strong> Full name, email address, and phone number.</li>
                                    <li><strong className="text-foreground">Property and Contract Info:</strong> Property addresses, contract details, start/end dates, and payment amounts managed by you on the platform.</li>
                                    <li><strong className="text-foreground">Technical Information:</strong> IP address, browser type, usage data, and Cookies, to ensure operations and security.</li>
                                </ul>
                                <p className="leading-relaxed"><strong className="text-foreground">Obligation to Provide Data:</strong> You are not legally obligated to provide this data. However, without basic details like your email, we cannot create your account or provide the service.</p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">2. Purposes of Use</h3>
                                <p className="leading-relaxed">We use your information strictly for the following purposes:</p>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                    <li>To provide and manage the operational services for your properties.</li>
                                    <li>To contact you and send regular operational updates and alerts.</li>
                                    <li>To improve user experience and customize the platform.</li>
                                    <li>To secure our data and prevent fraudulent access to user accounts.</li>
                                    <li>To strictly comply with regulatory and legal requirements in the State of Israel.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">3. Disclosure to Third Parties</h3>
                                <p className="leading-relaxed">We do not sell your personal data. However, we may share your data with:</p>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                    <li>External service providers (e.g., cloud storage, email delivery, AI processing systems) exclusively for the provision and enhancement of our service, under strict confidentiality agreements.</li>
                                    <li>Law enforcement or government bodies, if legally required by a court order or to prevent criminal activities.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">4. Artificial Intelligence (AI) Integration</h3>
                                <p className="leading-relaxed">
                                    The platform operates a virtual assistant (chatbot) powered by advanced artificial intelligence models, including third-party services such as OpenAI and Google (Gemini), acting as data sub-processors.
                                </p>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                    <li><strong className="text-foreground">Chat Logging:</strong> All interactions and conversations with the chatbot are securely stored on our servers (via Supabase cloud infrastructure).</li>
                                    <li><strong className="text-foreground">Purpose of Storage:</strong> Logs are kept for quality assurance, service improvement, troubleshooting, and enhancement of our AI models.</li>
                                    <li><strong className="text-foreground">Data Processing:</strong> Chat content (excluding file attachments) is processed through the APIs of the aforementioned providers in order to generate responses.</li>
                                    <li><strong className="text-foreground">Data Retention:</strong> We retain chat logs for as long as your account is active, or until you request their deletion in accordance with your right to be forgotten.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">5. User Rights (Review, Edit, and Delete)</h3>
                                <p className="leading-relaxed">
                                    Under the Israeli Privacy Protection Law, you have the right to review the personal information we hold about you.
                                    Should you find the information inaccurate or if you wish to withdraw your consent and request its deletion, you may do so.
                                    Note that deleting essential information may prevent us from continuing to provide the services.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">6. Data Security</h3>
                                <p className="leading-relaxed">
                                    We apply strict technological and organizational security measures conforming to market standards to optimally safeguard your data against loss, unauthorized access, or leaks. However, we cannot guarantee absolute, unbreakable security against hostile cyber interventions.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">7. Cookies and Tracking</h3>
                                <p className="leading-relaxed">
                                    We use Cookies for the ongoing and secure operation of the site, as well as for user authentication and preferences.
                                    Using our services implies consent. You can disable Cookies via your browser settings, but some features of the service may be impaired.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">8. Contact Us</h3>
                                <p className="leading-relaxed">
                                    Check your rights or address any privacy concerns by contacting us at: <a href="mailto:info@rentmate.co.il" className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">info@rentmate.co.il</a>.
                                </p>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
