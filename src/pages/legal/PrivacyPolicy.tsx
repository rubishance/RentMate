import React from 'react';
import { useTranslation } from 'react-i18next';
import { PageHeader } from '../../components/common/PageHeader';
import { GlassCard } from '../../components/common/GlassCard';

export default function PrivacyPolicy() {
    const { t, i18n } = useTranslation();
    const isRtl = i18n.dir() === 'rtl';
    const lastUpdatedDate = new Date('2026-02-27').toLocaleDateString(isRtl ? 'he-IL' : 'en-US');

    return (
        <div className="pb-20">
            <PageHeader
                title={isRtl ? "מדיניות פרטיות" : "Privacy Policy"}
                subtitle={isRtl ? "Privacy Policy" : ""}
            />

            <div className="container mx-auto px-4 max-w-4xl mt-6">
                <GlassCard className="p-6 md:p-8">
                    {isRtl ? (
                        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6" dir="rtl">
                            <h2 className="text-2xl font-bold">מדיניות פרטיות - RentMate</h2>
                            <p className="text-muted-foreground">עודכן לאחרונה: {lastUpdatedDate}</p>

                            <p>
                                אנו ב-RentMate מכבדים את פרטיותך ומחויבים להגן על המידע האישי שלך.
                                מדיניות זו מתארת כיצד אנו אוספים, משתמשים, מעבדים ושומרים על המידע שלך, בהתאם לדרישות
                                חוק הגנת הפרטיות, התשמ"א-1981, ותיקון 13 לחוק.
                            </p>

                            <h3>1. איסוף מידע</h3>
                            <p>אנו אוספים את סוגי המידע הבאים מאחר והזנת אותם או אישרת את איסופם:</p>
                            <ul className="list-disc list-inside">
                                <li><strong>פרטי זיהוי והתקשרות:</strong> שם מלא, כתובת אימייל, ומספר טלפון.</li>
                                <li><strong>פרטי נכסים וחוזים:</strong> כתובות נכסים, נתוני חוזים, מועדי תחילה וסיום, וסכומי תשלום המנוהלים במערכת על ידך.</li>
                                <li><strong>מידע טכני ומזהים:</strong> כתובת IP, סוג דפדפן, נתוני גלישה וזמן גישה (Cookies) המשמשים לתפעול ואבטחת המערכת.</li>
                            </ul>
                            <p><strong>חובת מסירת המידע:</strong> אינך חייב/ת על פי חוק למסור מידע זה, אולם ללא מסירת פרטי החובה (כגון אימייל לצורך יצירת חשבון), לא נוכל לספק לך את שירותי המערכת.</p>

                            <h3>2. מטרות השימוש במידע</h3>
                            <p>המידע ישמש אותנו למטרות הבאות באופן בלעדי:</p>
                            <ul className="list-disc list-inside">
                                <li>מתן השירותים וניהול נכסיך כפי שהוגדר במערכת.</li>
                                <li>יצירת קשר ושליחת עדכונים תפעוליים שוטפים והתראות.</li>
                                <li>שיפור חווית המשתמש והתאמת השירות.</li>
                                <li>אבטחת המידע שלנו ומניעת הונאות נגד המשתמשים.</li>
                                <li>ציות לדרישות חוקיות ורגולטוריות במדינת ישראל.</li>
                            </ul>

                            <h3>3. העברת מידע לצדדים שלישיים</h3>
                            <p>אנו מתחייבים לא למכור או להעביר את פרטיך האישיים לגורמים מסחריים שאינם מורשים. עם זאת, רשאים אנו לשתף את המידע עם:</p>
                            <ul className="list-disc list-inside">
                                <li>ספקי שירות חיצוניים (כגון שירותי אחסון ענן, ספקי דיוור, ומערכות בינה מלאכותית המסייעות לעיבוד הנתונים), למטרות מתן ושיפור השירות בלבד, ותחת התחייבויות לשמירת סודיות.</li>
                                <li>רשויות חוק וממשל, במידה ונדרש לעשות זאת על פי דרישה חוקית, צו בית משפט או כדי למנוע עבירה פלילית.</li>
                            </ul>

                            <h3>4. זכויות המשתמש (עיון, תיקון ומחיקת מידע)</h3>
                            <p>
                                על פי חוק הגנת הפרטיות, הנך זכאי/ת לעיין במידע האישי המוחזק עליך במאגרינו.
                                במקרה שהמידע אינו מדויק או שברצונך למחוק אותו, הינך רשאי/ת לפנות אלינו בבקשה לתיקון או למחיקת המידע מהמאגר.
                                אנא שים/י לב כי מחיקת מידע חיוני עלולה למנוע את המשך אספקת השירות.
                            </p>

                            <h3>5. אבטחת מידע</h3>
                            <p>
                                צדנו מפעילים ומטמיעים במערכת אמצעים טכנולוגיים וארגוניים מחמירים בהתאם לסטנדרטים המקובלים בשוק, על מנת להגן על המידע שלך בצורה המיטבית מאובדן, גישה בלתי מורשית או דלף. עם זאת, איננו יכולים להתחייב לחסינות מערכתית מוחלטת מפני חדירות של צדדים עוינים בזדון.
                            </p>

                            <h3>6. עוגיות (Cookies) ואמצעי מעקב</h3>
                            <p>
                                האתר עושה שימוש בקבצי "עוגיות" (Cookies) לצורך תפעולו האופטימלי, אימון שירותי האתר ואבטחה.
                                שימוש בשירותים מהווה הסכמה לאיסוף הנתונים כמתואר. תוכל/י לשנות את הגדרות הדפדפן שלך כדי לחסום Cookies בכל שלב (אם כי חלק מפעולות האתר עשויות שלא לפעול כראוי).
                            </p>

                            <h3>7. יצירת קשר</h3>
                            <p>
                                לכל שאלה על מדיניות זו או לצורך מימוש זכויות, ניתן לפנות אלינו בכתובת דוא"ל: <a href="mailto:privacy@rentmate.co.il" className="text-brand-primary">privacy@rentmate.co.il</a>.
                            </p>
                        </div>
                    ) : (
                        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6" dir="ltr">
                            <h2 className="text-2xl font-bold">Privacy Policy - RentMate</h2>
                            <p className="text-muted-foreground">Last Updated: {lastUpdatedDate}</p>

                            <p>
                                At RentMate, we respect your privacy and are committed to protecting your personal information.
                                This policy explains how we collect, use, process, and safeguard your data in compliance with the Israeli Privacy Protection Law, 5741-1981, including Amendment 13.
                            </p>

                            <h3>1. Information Collection</h3>
                            <p>We collect the following types of information because you have voluntarily provided them or consented to their collection:</p>
                            <ul className="list-disc list-inside">
                                <li><strong>Identity and Contact Info:</strong> Full name, email address, and phone number.</li>
                                <li><strong>Property and Contract Info:</strong> Property addresses, contract details, start/end dates, and payment amounts managed by you on the platform.</li>
                                <li><strong>Technical Information:</strong> IP address, browser type, usage data, and Cookies, to ensure operations and security.</li>
                            </ul>
                            <p><strong>Obligation to Provide Data:</strong> You are not legally obligated to provide this data. However, without basic details like your email, we cannot create your account or provide the service.</p>

                            <h3>2. Purposes of Use</h3>
                            <p>We use your information strictly for the following purposes:</p>
                            <ul className="list-disc list-inside">
                                <li>To provide and manage the operational services for your properties.</li>
                                <li>To contact you and send regular operational updates and alerts.</li>
                                <li>To improve user experience and customize the platform.</li>
                                <li>To secure our data and prevent fraudulent access to user accounts.</li>
                                <li>To strictly comply with regulatory and legal requirements in the State of Israel.</li>
                            </ul>

                            <h3>3. Disclosure to Third Parties</h3>
                            <p>We do not sell your personal data. However, we may share your data with:</p>
                            <ul className="list-disc list-inside">
                                <li>External service providers (e.g., cloud storage, email delivery, AI processing systems) exclusively for the provision and enhancement of our service, under strict confidentiality agreements.</li>
                                <li>Law enforcement or government bodies, if legally required by a court order or to prevent criminal activities.</li>
                            </ul>

                            <h3>4. User Rights (Review, Edit, and Delete)</h3>
                            <p>
                                Under the Israeli Privacy Protection Law, you have the right to review the personal information we hold about you.
                                Should you find the information inaccurate or if you wish to withdraw your consent and request its deletion, you may do so.
                                Note that deleting essential information may prevent us from continuing to provide the services.
                            </p>

                            <h3>5. Data Security</h3>
                            <p>
                                We apply strict technological and organizational security measures conforming to market standards to optimally safeguard your data against loss, unauthorized access, or leaks. However, we cannot guarantee absolute, unbreakable security against hostile cyber interventions.
                            </p>

                            <h3>6. Cookies and Tracking</h3>
                            <p>
                                We use Cookies for the ongoing and secure operation of the site, as well as for user authentication and preferences.
                                Using our services implies consent. You can disable Cookies via your browser settings, but some features of the service may be impaired.
                            </p>

                            <h3>7. Contact Us</h3>
                            <p>
                                Check your rights or address any privacy concerns by contacting us at: <a href="mailto:privacy@rentmate.co.il" className="text-brand-primary">privacy@rentmate.co.il</a>.
                            </p>
                        </div>
                    )}
                </GlassCard>
            </div>
        </div>
    );
}
