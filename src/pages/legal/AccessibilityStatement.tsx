import React from 'react';
import { GlassCard } from '../../components/common/GlassCard';
import { Badge } from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';
import { LanguageToggle } from '../../components/common/LanguageToggle';
import { useTranslation } from '../../hooks/useTranslation';

export default function AccessibilityStatement() {
    const { lang } = useTranslation();
    const isRtl = lang === 'he';

    const [contactInfo, setContactInfo] = React.useState({
        email: 'support@rentmate.co.il',
        phone: '+972-50-3602000'
    });

    React.useEffect(() => {
        async function fetchContactInfo() {
            const { data } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', ['global_email_support', 'global_phone_support']);

            if (data) {
                const email = data.find(s => s.key === 'global_email_support')?.value as string;
                const phone = data.find(s => s.key === 'global_phone_support')?.value as string;

                setContactInfo({
                    email: email || 'support@rentmate.co.il',
                    phone: phone || '+972-50-3602000'
                });
            }
        }
        fetchContactInfo();
    }, []);

    return (
        <div className="relative min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-hidden font-hebrew" dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Decorative Background Elements */}
            <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-primary-100/50 via-slate-100/10 to-transparent dark:from-primary-900/10 dark:via-slate-900/10 dark:to-transparent z-0 pointer-events-none" />
            <div className="absolute top-0 left-0 w-full h-96 bg-blue-500/5 dark:bg-primary/5 filter blur-3xl z-0 pointer-events-none" />
            <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-teal-500/10 dark:bg-teal-600/5 filter blur-3xl rounded-full z-0 pointer-events-none" />

            <div className="relative z-10 pb-20 pt-8">
                <div className="container mx-auto px-4 max-w-4xl mt-6">
                    <div className="flex justify-end mb-2">
                        <LanguageToggle />
                    </div>
                    <div className="mb-8 text-center">
                        <h1 className="text-3xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight leading-tight mb-2">
                            {isRtl ? 'הצהרת נגישות' : 'Accessibility Statement'}
                        </h1>
                        <p className="text-muted-foreground font-medium text-lg">
                            {isRtl ? 'המחויבות שלנו לשוויון ושוויון הזדמנויות באינטרנט' : 'Our commitment to equality and equal opportunities online'}
                        </p>
                    </div>

                    <GlassCard className="p-6 md:p-10 bg-card/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10">
                        <div className="prose prose-slate dark:prose-invert max-w-none space-y-6 text-foreground/80" dir="rtl">
                            <div className="flex items-center gap-3 mb-6">
                                <h2 className="text-2xl font-bold m-0 text-foreground">הצהרת נגישות</h2>
                                <Badge variant="default" className="bg-primary-600 hover:bg-primary-700 text-white">תקן 5568 AA</Badge>
                            </div>

                            <p className="leading-relaxed text-base md:text-lg">
                                אנו ב-RentMate רואים חשיבות רבה במתן שירות שוויוני משלים לכלל הלקוחות והגולשים ובשיפור השירות הניתן לאנשים עם מוגבלות.
                                אנו משקיעים משאבים רבים בהנגשת האתר והאפליקציה על מנת להפוך אותם לזמינים, נוחים וידידותיים עבור אנשים עם מוגבלויות.
                            </p>

                            <h3 className="text-xl font-bold text-foreground mt-8 mb-4">רמת הנגישות</h3>
                            <p className="leading-relaxed">
                                אתר זה עומד בדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג 2013.
                                התאמות הנגישות בוצעו עפ"י המלצות התקן הישראלי (ת"י 5568) לנגישות תכנים באינטרנט ברמת AA ומסמך WCAG2.0 הבינלאומי.
                            </p>

                            <h3 className="text-xl font-bold text-foreground mt-8 mb-4">תיקונים והתאמות שבוצעו</h3>
                            <ul className="list-disc list-inside space-y-2 marker:text-primary-500">
                                <li>התאמה לקורא מסך ולניווט מקלדת.</li>
                                <li>שימוש בצבעים ניגודיים וברורים.</li>
                                <li>תגיות חלופיות (Alt Text) לתמונות ולרכיבים גרפיים.</li>
                                <li>שימוש בכותרות והיררכיה ברורה.</li>
                                <li>הגדלת גופנים ושליטה בתצוגה.</li>
                            </ul>

                            <h3 className="text-xl font-bold text-foreground mt-8 mb-4">יצירת קשר בנושא נגישות</h3>
                            <p className="leading-relaxed">
                                אם נתקלתם בבעיה או שיש לכם הצעה לשיפור, נשמח לשמוע מכם.
                                ניתן לפנות לרכז הנגישות שלנו:
                            </p>
                            <div className="bg-muted/30/50 p-6 rounded-2xl border border-slate-100 dark:border-slate-700">
                                <p className="font-semibold text-foreground">פרטי רכז הנגישות:</p>
                                <ul className="list-none space-y-2 mt-4 text-foreground/80">
                                    <li>שם: צוות התמיכה</li>
                                    <li>אימייל: <a href={`mailto:${contactInfo.email}`} className="text-primary-600 hover:text-primary-500 font-semibold transition-colors">{contactInfo.email}</a></li>
                                </ul>
                            </div>

                            <p className="text-sm font-medium text-muted-foreground mt-8">
                                הצהרה זו עודכנה לאחרונה בתאריך: {new Date().toLocaleDateString('he-IL')}
                            </p>
                        </div>
                    </GlassCard>
                </div>
            </div>
        </div>
    );
}
