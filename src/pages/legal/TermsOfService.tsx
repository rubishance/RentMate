import React from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { PageHeader } from '../../components/common/PageHeader';
import { GlassCard } from '../../components/common/GlassCard';

export default function TermsOfService() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';
    const lastUpdatedDate = new Date('2026-02-27').toLocaleDateString(isRtl ? 'he-IL' : 'en-US');

    return (
        <div className="pb-20">
            <PageHeader
                title={isRtl ? "תנאי שימוש" : "Terms of Service"}
                subtitle={isRtl ? "Terms of Service" : ""}
            />

            <div className="container mx-auto px-4 max-w-4xl mt-6">
                <GlassCard className="p-6 md:p-8">
                    {isRtl ? (
                        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6" dir="rtl">
                            <h2 className="text-2xl font-bold">תנאי שימוש ושימוש הוגן (Fair Use)</h2>
                            <p className="text-muted-foreground">עודכן לאחרונה: {lastUpdatedDate}</p>

                            <p>
                                ברוכים הבאים ל-RentMate. השימוש באתר ובאפליקציה כפוף לתנאים המפורטים להלן.
                                יצירת חשבון, גלישה באתר או הרשמה לרשימת ההמתנה מהווה הסכמה מוחלטת לתנאים אלו.
                            </p>

                            <h3>1. השירות</h3>
                            <p>
                                RentMate מספקת פלטפורמה לניהול נכסים, דיירים וחוזים. המערכת מספקת כלים לחישובים, מעקב תשלומים ותחזוקת הנכסים, וזמינה ככלי עזר טכנולוגי בלבד. המערכת אינה מספקת ייעוץ משפטי או חשבונאי.
                            </p>

                            <h3>2. שימוש הוגן (Fair Use)</h3>
                            <p>מערכת RentMate נועדה לניהול נכסי נדל"ן באופן אישי ומקצועי. כדי להבטיח זמינות ואיכות שירות לכלל המשתמשים, אנו מגדירים שימוש הוגן כך:</p>
                            <ul className="list-disc list-inside">
                                <li><strong>זהות המשתמש:</strong> החשבון הינו אישי למשתמש או לתאגיד נרשם. שיתוף סיסמאות מחוץ להתקשרות המותרת בתוכנית מוגדר כהפרה בוטה של השימוש.</li>
                                <li><strong>מכסות משאבים:</strong> גבולות השימוש (כמות נכסים, זיכרון ואחסון מסמכים) מוגבלים לחבילת המנוי בה בחרת. יש לשמור על מסגרת השימוש המוקצית.</li>
                                <li><strong>כלים תבוניים:</strong> השימוש בכלי ה-AI ובוטים האוטומטיים נועד למטרות המערכת בלבד. ניסיון לפרוץ, לאמן במכוון נתוני שווא או למשוך מידע באופן לא סביר, הינו עבירה שתוביל להרחקתך לצמיתות.</li>
                            </ul>

                            <h3>3. איסור על שימוש לרעה (Abuse)</h3>
                            <p>הפעולות הבאות קובעות כשימוש לרעה ויגררו בהכרח השהיית פעילות לחשבון ודיווח לרשויות אם יידרש:</p>
                            <ul className="list-disc list-inside">
                                <li>העלאת תוכן בלתי חוקי, מסוכן, מטעה, או המפר זכויות יוצרים של צד שלישי (בכלל זה בתוך מסמכים סרוקים מצורפים).</li>
                                <li>ניסיונות חדירה, פריצה, סריקת פגיעויות, או הכְבדה בזדון על שרתינו (כגון התקפות DDOS).</li>
                                <li>שימוש בנתוני דיירים ומשתמשים שהתקבלו במערכת לצורך "ספאם", מעקב אסור, או פעילות הפוגעת בפרטיותם לפי דין.</li>
                            </ul>

                            <h3>4. הגבלת אחריות</h3>
                            <p>
                                השירות (לרבות כלי הבינה המלאכותית שלנו) מוגש "כמות שהוא" (AS IS). RentMate, מנהליה, עובדיה והחברות הבנות לא יהיו אחראים לכל אובדן דטה, הפסד רווחים, עוגמת נפש או נזק עקיף-לרבות טעויות בחישובי הצמדה למדד תשלומי כספים או חוזים שיפוגו בטעות. מוטלת החובה המוחלטת עליך כמשתמש המערכת לבקר ולאמת כל פלט ונתון אופרטיבי במערכת.
                            </p>

                            <h3>5. קניין רוחני</h3>
                            <p>
                                כל זכויות הקניין, לרבות קניין רוחני בקוד, מתודולוגיות, מאזני אלגוריתם ה-AI ועיצוב המערכת – הינם בבעלות RentMate. אין להעתיק, למסור או לעשות הנדסה חוזרת לכל חלק בה ללא היתר. המידע הנוגע לנכסיך (דיירים וחוזים) שייך לך בלבד.
                            </p>

                            <h3>6. פרטיות והסכמה להעברת מידע</h3>
                            <p>
                                במסירת פרטיך ובשימוש במערכת אתה מציין כי קראת את מדיניות הפרטיות שלנו. אתה מעניק בזאת ל-RentMate את הזכות לעבד ולנהל את הנתונים תוך שמירה עליהם (ראה "מדיניות פרטיות" לפירוט מורחב של הזכויות שלך להסרה).
                            </p>

                            <h3>7. סמכות שיפוט ודין חל</h3>
                            <p>
                                על תנאי שימוש אלו חלים אך ורק דיני מדינת ישראל. סמכות השיפוט הבלעדית בכל עניין או מחלוקת נתונה לבית המשפט המוסמך תל אביב-יפו (ישראל).
                            </p>
                        </div>
                    ) : (
                        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6" dir="ltr">
                            <h2 className="text-2xl font-bold">Terms of Service and Fair Use</h2>
                            <p className="text-muted-foreground">Last Updated: {lastUpdatedDate}</p>

                            <p>
                                Welcome to RentMate. Using the website and application implies agreement with the terms listed below.
                                Browsing the site, entering the waitlist, or registering an account constitutes your absolute acceptance of these terms.
                            </p>

                            <h3>1. The Service</h3>
                            <p>
                                RentMate provides a platform to manage assets, tenants, and contracts. We offer tools for calculations, payment tracking, and property maintenance purely as a technological assistant. We do not provide legal or accounting advice.
                            </p>

                            <h3>2. Fair Use</h3>
                            <p>The RentMate system is designed to manage real estate professionally. To maintain stable service for all users, Fair Use encompasses:</p>
                            <ul className="list-disc list-inside">
                                <li><strong>User Identity:</strong> Your account is strictly personal or assigned to your legal entity. Sharing passwords with unassociated parties is strictly prohibited.</li>
                                <li><strong>Resource Quotas:</strong> Resource limits (properties count, file storage, chat) are governed by the subscription plan chosen. Attempts to circumvent these controls are prohibited.</li>
                                <li><strong>Intelligent Tools:</strong> AI bots and tools provided are for standard application purposes only. Scraping, hostile prompts, or unnatural bulk executions will result in a permanent ban.</li>
                            </ul>

                            <h3>3. Abuse Prohibition</h3>
                            <p>The following actions comprise system abuse leading to immediate account suspension and potential legal involvement:</p>
                            <ul className="list-disc list-inside">
                                <li>Uploading illegal, harmful, deceptive, or copyright-infringing content through documents or system fields.</li>
                                <li>Attempting unauthorized access, scanning vulnerabilities, executing DDOS, or reverse-engineering platform workflows.</li>
                                <li>Exploiting user or tenant contact info within the platform for external spam or deliberate invasions of privacy in violation of any law.</li>
                            </ul>

                            <h3>4. Limitation of Liability</h3>
                            <p>
                                The service (including our underlying AI tools) is provided "AS IS". RentMate, its directors, employees, and affiliates bear no responsibility for direct or indirect losses, damages, loss of profits, or data anomalies. This includes potential miscalculations in Israeli CPI tracking or notifications of expired leases. It remains entirely your responsibility to double-check and verify system outputs for accuracy.
                            </p>

                            <h3>5. Intellectual Property</h3>
                            <p>
                                All intellectual property rights within the application codebase, algorithms, methodological structures, and UX design are exclusively retained by RentMate. You may not copy, reproduce, or reverse engineer any part of it. The real estate data and tenant artifacts generated by you remain your property.
                            </p>

                            <h3>6. Privacy & Data Authorization</h3>
                            <p>
                                By accessing RentMate, you assert you have read our Privacy Policy. You grant RentMate the operational right to securely process and store your submitted data (Reference our "Privacy Policy" for extensive details regarding data deletion rights).
                            </p>

                            <h3>7. Jurisdiction</h3>
                            <p>
                                These Terms of Service are governed strictly by the laws of the State of Israel. The exclusive jurisdiction for resolving any disputes lies with the competent courts in Tel Aviv-Jaffa, Israel.
                            </p>
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
}
