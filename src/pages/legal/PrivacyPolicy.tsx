import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { GlassCard } from '../../components/common/GlassCard';

export default function PrivacyPolicy() {
    return (
        <div className="pb-20">
            <PageHeader
                title="מדיניות פרטיות"
                subtitle="Privacy Policy"
            />

            <div className="container mx-auto px-4 max-w-4xl mt-6">
                <GlassCard className="p-6 md:p-8">
                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-6" dir="rtl">
                        <h2 className="text-2xl font-bold">מדיניות פרטיות</h2>
                        <p className="text-muted-foreground">עודכן לאחרונה: {new Date().toLocaleDateString('he-IL')}</p>

                        <p>
                            אנו ב-RentMate מכבדים את פרטיותך ומחויבים להגן על המידע האישי שלך.
                            מדיניות זו מתארת כיצד אנו אוספים, משתמשים ושומרים על המידע שלך, בהתאם לחוק הגנת הפרטיות, התשמ"א-1981.
                        </p>

                        <h3>1. איסוף מידע</h3>
                        <p>אנו אוספים את סוגי המידע הבאים:</p>
                        <ul className="list-disc list-inside">
                            <li>פרטי זיהוי: שם מלא, כתובת אימייל, מספר טלפון.</li>
                            <li>פרטי נכסים וחוזים: כתובות נכסים, נתוני חוזים, סכומי תשלום.</li>
                            <li>מידע טכני: כתובת IP, סוג דפדפן, נתוני שימוש (Cookies).</li>
                        </ul>

                        <h3>2. שימוש במידע</h3>
                        <p>המידע משמש אותנו למטרות הבאות:</p>
                        <ul className="list-disc list-inside">
                            <li>אספקת השירותים וניהול הנכסים שלך.</li>
                            <li>שיפור חווית המשתמש והתאמת השירות.</li>
                            <li>יצירת קשר ושליחת עדכונים תפעוליים (חשבוניות, התראות).</li>
                            <li>אבטחת המידע ומניעת הונאות.</li>
                        </ul>

                        <h3>3. עוגיות (Cookies)</h3>
                        <p>
                            האתר עושה שימוש ב-Cookies לצורך תפעולו השוטף, כולל איסוף נתונים סטטיסטיים, אימות פרטים והתאמת האתר להעדפותיך האישיות.
                            באפשרותך לשנות את הגדרות הדפדפן ולחסום קבצי Cookies בכל עת.
                        </p>

                        <h3>4. אבטחת מידע</h3>
                        <p>
                            אנו נוקטים באמצעי אבטחה מחמירים (כגון הצפנה ופרוטוקולי SSL) כדי להגן על המידע שלך. עם זאת, אין אבטחה הרמטית מוחלטת ברשת האינטרנט.
                        </p>

                        <h3>5. זכויותיך</h3>
                        <p>
                            עומדת לך הזכות לעיין במידע שנאסף עליך, לבקש לתקנו או למחוק אותו.
                            למימוש זכויות אלו, ניתן לפנות אלינו בכתובת: <a href="mailto:privacy@rentmate.com" className="text-brand-primary">privacy@rentmate.com</a>.
                        </p>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
