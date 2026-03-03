import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { PageHeader } from '../../components/common/PageHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { LanguageToggle } from '../../components/common/LanguageToggle';

export default function TermsOfService() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';
    const lastUpdatedDate = new Date('2026-02-27').toLocaleDateString(isRtl ? 'he-IL' : 'en-US');

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden font-hebrew" dir={isRtl ? 'rtl' : 'ltr'}>

            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-primary-100/50 via-slate-100/10 to-transparent dark:from-primary-900/10 dark:via-slate-900/10 dark:to-transparent z-0 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-96 bg-blue-500/5 dark:bg-primary/5 filter blur-3xl z-0 pointer-events-none" />
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-teal-500/10 dark:bg-teal-600/5 filter blur-3xl rounded-full z-0 pointer-events-none" />

            <div className="relative z-10 pb-20 pt-8">
                <div className="container mx-auto px-4 max-w-4xl">
                    <div className="flex justify-end mb-2">
                        <LanguageToggle />
                    </div>
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight leading-tight mb-2">
                            {isRtl ? "תנאי שימוש" : "Terms of Service"}
                        </h1>
                    </div>

                    <GlassCard className="p-6 md:p-10 bg-card/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10">
                        {isRtl ? (
                            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/80" dir="rtl">
                                <h2 className="text-2xl font-bold text-foreground">תנאי שימוש ושימוש הוגן (Fair Use)</h2>
                                <p className="text-sm font-medium text-muted-foreground">עודכן לאחרונה: {lastUpdatedDate}</p>
                                <p className="text-sm italic text-muted-foreground mb-2">
                                    * האמור באתר, באפליקציה ובתקנון זה מנוסח בלשון זכר מטעמי נוחות בלבד, אך מתייחס ופונה לשני המינים כאחד באופן שווה וללא כל הבדל.
                                </p>

                                <p className="text-base md:text-lg leading-relaxed">
                                    ברוכים הבאים ל-RentMate. השימוש באתר ובאפליקציה כפוף לתנאים המפורטים להלן.
                                    יצירת חשבון, גלישה באתר או הרשמה לרשימת ההמתנה מהווה הסכמה מוחלטת לתנאים אלו.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">1. השירות</h3>
                                <p className="leading-relaxed">
                                    RentMate מספקת פלטפורמה לניהול נכסים, דיירים וחוזים. המערכת מספקת כלים לחישובים, מעקב תשלומים ותחזוקת הנכסים, וזמינה ככלי עזר טכנולוגי בלבד. המערכת אינה מספקת ייעוץ משפטי או חשבונאי.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">2. שימוש הוגן (Fair Use)</h3>
                                <p className="leading-relaxed">מערכת RentMate נועדה לניהול נכסי נדל"ן באופן אישי ומקצועי. כדי להבטיח זמינות ואיכות שירות לכלל המשתמשים, אנו מגדירים שימוש הוגן כך:</p>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                    <li><strong className="text-foreground">זהות המשתמש:</strong> החשבון הינו אישי למשתמש או לתאגיד נרשם. שיתוף סיסמאות מחוץ להתקשרות המותרת בתוכנית מוגדר כהפרה בוטה של השימוש.</li>
                                    <li><strong className="text-foreground">מכסות משאבים:</strong> גבולות השימוש (כמות נכסים, זיכרון ואחסון מסמכים) מוגבלים לחבילת המנוי בה בחרת. יש לשמור על מסגרת השימוש המוקצית.</li>
                                    <li><strong className="text-foreground">כלים תבוניים:</strong> השימוש בכלי ה-AI ובוטים האוטומטיים נועד למטרות המערכת בלבד. ניסיון לפרוץ, לאמן במכוון נתוני שווא או למשוך מידע באופן לא סביר, הינו עבירה שתוביל להרחקתך לצמיתות.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">3. איסור על שימוש לרעה (Abuse)</h3>
                                <p className="leading-relaxed">הפעולות הבאות קובעות כשימוש לרעה ויגררו בהכרח השהיית פעילות לחשבון ודיווח לרשויות אם יידרש:</p>
                                <ul className="list-disc list-inside space-y-2 marker:text-destructive">
                                    <li>העלאת תוכן בלתי חוקי, מסוכן, מטעה, או המפר זכויות יוצרים של צד שלישי (בכלל זה בתוך מסמכים סרוקים מצורפים).</li>
                                    <li>ניסיונות חדירה, פריצה, סריקת פגיעויות, או הכְבדה בזדון על שרתינו (כגון התקפות DDOS).</li>
                                    <li>שימוש בנתוני דיירים ומשתמשים שהתקבלו במערכת לצורך "ספאם", מעקב אסור, או פעילות הפוגעת בפרטיותם לפי דין.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">4. הגבלת אחריות</h3>
                                <p className="leading-relaxed">
                                    השירות (לרבות כלי הבינה המלאכותית שלנו) מוגש "כמות שהוא" (AS IS). RentMate, מנהליה, עובדיה והחברות הבנות לא יהיו אחראים לכל אובדן דטה, הפסד רווחים, עוגמת נפש או נזק עקיף-לרבות טעויות בחישובי הצמדה למדד תשלומי כספים או חוזים שיפוגו בטעות. מוטלת החובה המוחלטת עליך כמשתמש המערכת לבקר ולאמת כל פלט ונתון אופרטיבי במערכת.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">5. קניין רוחני</h3>
                                <p className="leading-relaxed">
                                    כל זכויות הקניין, לרבות קניין רוחני בקוד, מתודולוגיות, מאזני אלגוריתם ה-AI ועיצוב המערכת – הינם בבעלות RentMate. אין להעתיק, למסור או לעשות הנדסה חוזרת לכל חלק בה ללא היתר. המידע הנוגע לנכסיך (דיירים וחוזים) שייך לך בלבד.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">6. פרטיות והסכמה להעברת מידע</h3>
                                <p className="leading-relaxed">
                                    במסירת פרטיך ובשימוש במערכת אתה מציין כי קראת את מדיניות הפרטיות שלנו. אתה מעניק בזאת ל-RentMate את הזכות לעבד ולנהל את הנתונים תוך שמירה עליהם (ראה "מדיניות פרטיות" לפירוט מורחב של הזכויות שלך להסרה).
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">7. סמכות שיפוט ודין חל</h3>
                                <p className="leading-relaxed">
                                    על תנאי שימוש אלו חלים אך ורק דיני מדינת ישראל. סמכות השיפוט הבלעדית בכל עניין או מחלוקת נתונה לבית המשפט המוסמך תל אביב-יפו (ישראל).
                                </p>
                            </div>
                        ) : (
                            <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/80" dir="ltr">
                                <h2 className="text-2xl font-bold text-foreground">Terms of Service and Fair Use</h2>
                                <p className="text-sm font-medium text-muted-foreground">Last Updated: {lastUpdatedDate}</p>

                                <p className="text-base md:text-lg leading-relaxed">
                                    Welcome to RentMate. Using the website and application implies agreement with the terms listed below.
                                    Browsing the site, entering the waitlist, or registering an account constitutes your absolute acceptance of these terms.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">1. The Service</h3>
                                <p className="leading-relaxed">
                                    RentMate provides a platform to manage assets, tenants, and contracts. We offer tools for calculations, payment tracking, and property maintenance purely as a technological assistant. We do not provide legal or accounting advice.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">2. Fair Use</h3>
                                <p className="leading-relaxed">The RentMate system is designed to manage real estate professionally. To maintain stable service for all users, Fair Use encompasses:</p>
                                <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                    <li><strong className="text-foreground">User Identity:</strong> Your account is strictly personal or assigned to your legal entity. Sharing passwords with unassociated parties is strictly prohibited.</li>
                                    <li><strong className="text-foreground">Resource Quotas:</strong> Resource limits (properties count, file storage, chat) are governed by the subscription plan chosen. Attempts to circumvent these controls are prohibited.</li>
                                    <li><strong className="text-foreground">Intelligent Tools:</strong> AI bots and tools provided are for standard application purposes only. Scraping, hostile prompts, or unnatural bulk executions will result in a permanent ban.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">3. Abuse Prohibition</h3>
                                <p className="leading-relaxed">The following actions comprise system abuse leading to immediate account suspension and potential legal involvement:</p>
                                <ul className="list-disc list-inside space-y-2 marker:text-destructive">
                                    <li>Uploading illegal, harmful, deceptive, or copyright-infringing content through documents or system fields.</li>
                                    <li>Attempting unauthorized access, scanning vulnerabilities, executing DDOS, or reverse-engineering platform workflows.</li>
                                    <li>Exploiting user or tenant contact info within the platform for external spam or deliberate invasions of privacy in violation of any law.</li>
                                </ul>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">4. Limitation of Liability</h3>
                                <p className="leading-relaxed">
                                    The service (including our underlying AI tools) is provided "AS IS". RentMate, its directors, employees, and affiliates bear no responsibility for direct or indirect losses, damages, loss of profits, or data anomalies. This includes potential miscalculations in Israeli CPI tracking or notifications of expired leases. It remains entirely your responsibility to double-check and verify system outputs for accuracy.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">5. Intellectual Property</h3>
                                <p className="leading-relaxed">
                                    All intellectual property rights within the application codebase, algorithms, methodological structures, and UX design are exclusively retained by RentMate. You may not copy, reproduce, or reverse engineer any part of it. The real estate data and tenant artifacts generated by you remain your property.
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">6. Privacy & Data Authorization</h3>
                                <p className="leading-relaxed">
                                    By accessing RentMate, you assert you have read our Privacy Policy. You grant RentMate the operational right to securely process and store your submitted data (Reference our "Privacy Policy" for extensive details regarding data deletion rights).
                                </p>

                                <h3 className="text-xl font-bold text-foreground mt-8 mb-4">7. Jurisdiction</h3>
                                <p className="leading-relaxed">
                                    These Terms of Service are governed strictly by the laws of the State of Israel. The exclusive jurisdiction for resolving any disputes lies with the competent courts in Tel Aviv-Jaffa, Israel.
                                </p>
                            </div>
                        )}
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}

