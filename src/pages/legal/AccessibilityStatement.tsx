import React from 'react';
import { PageHeader } from '../../components/common/PageHeader';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/ui/Badge';

export default function AccessibilityStatement() {
    return (
        <div className="pb-20">
            <PageHeader
                title="הצהרת נגישות"
                subtitle="Accessibility Statement"
            />

            <div className="container mx-auto px-4 max-w-4xl mt-6">
                <GlassCard className="p-6 md:p-8">
                    <div className="prose prose-slate dark:prose-invert max-w-none space-y-6" dir="rtl">
                        <div className="flex items-center gap-3 mb-6">
                            <h2 className="text-2xl font-bold m-0">הצהרת נגישות</h2>
                            <Badge variant="success">תקן 5568 AA</Badge>
                        </div>

                        <p>
                            אנו ב-RentMate רואים חשיבות רבה במתן שירות שוויוני משלים לכלל הלקוחות והגולשים ובשיפור השירות הניתן לאנשים עם מוגבלות.
                            אנו משקיעים משאבים רבים בהנגשת האתר והאפליקציה על מנת להפוך אותם לזמינים, נוחים וידידותיים עבור אנשים עם מוגבלויות.
                        </p>

                        <h3>רמת הנגישות</h3>
                        <p>
                            אתר זה עומד בדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג 2013.
                            התאמות הנגישות בוצעו עפ"י המלצות התקן הישראלי (ת"י 5568) לנגישות תכנים באינטרנט ברמת AA ומסמך WCAG2.0 הבינלאומי.
                        </p>

                        <h3>תיקונים והתאמות שבוצעו</h3>
                        <ul className="list-disc list-inside space-y-2">
                            <li>התאמה לקורא מסך ולניווט מקלדת.</li>
                            <li>שימוש בצבעים ניגודיים וברורים.</li>
                            <li>תגיות חלופיות (Alt Text) לתמונות ולרכיבים גרפיים.</li>
                            <li>שימוש בכותרות והיררכיה ברורה.</li>
                            <li>הגדלת גופנים ושליטה בתצוגה.</li>
                        </ul>

                        <h3>יצירת קשר בנושא נגישות</h3>
                        <p>
                            אם נתקלתם בבעיה או שיש לכם הצעה לשיפור, נשמח לשמוע מכם.
                            ניתן לפנות לרכז הנגישות שלנו:
                        </p>
                        <div className="bg-slate-50 dark:bg-slate-800 p-4 rounded-lg">
                            <p className="font-semibold">פרטי רכז הנגישות:</p>
                            <ul className="list-none space-y-1 mt-2">
                                <li>שם: צוות התמיכה</li>
                                <li>אימייל: <a href="mailto:support@rentmate.co.il" className="text-brand-primary hover:underline">support@rentmate.co.il</a></li>
                                <li>טלפון: <a href="tel:+972503602000" className="text-brand-primary hover:underline">+972-50-3602000</a></li>
                            </ul>
                        </div>

                        <p className="text-sm text-muted-foreground mt-4">
                            הצהרה זו עודכנה לאחרונה בתאריך: {new Date().toLocaleDateString('he-IL')}
                        </p>
                    </div>
                </GlassCard>
            </div>
        </div>
    );
}
