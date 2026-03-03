import { useTranslation } from '../hooks/useTranslation';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { PageHeader } from '../components/common/PageHeader';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { Accessibility, Mail, Phone, ExternalLink } from 'lucide-react';
import { GlassCard } from '../components/common/GlassCard';

export function AccessibilityStatement() {
    const { t } = useTranslation();
    const { preferences } = useUserPreferences();
    const isRtl = preferences.language === 'he';

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
                            {isRtl ? 'הצהרת נגישות' : 'Accessibility Statement'}
                        </h1>
                        <p className="text-muted-foreground font-medium">
                            {isRtl ? 'המחויבות שלנו לשוויון ושוויון הזדמנויות באינטרנט' : 'Our commitment to equality and equal opportunities online'}
                        </p>
                    </div>

                    <div className="mt-8 space-y-8">
                        {/* Introduction Card */}
                        <GlassCard className="p-6 md:p-8 bg-card/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10">
                            <div className="flex items-start gap-4">
                                <div className="p-3 bg-primary-100 dark:bg-primary-900/20 rounded-xl shrink-0">
                                    <Accessibility className="w-8 h-8 text-primary-600 dark:text-primary-400" />
                                </div>
                                <div className="space-y-4">
                                    <h2 className="text-xl font-bold text-foreground">
                                        {isRtl ? 'כללי' : 'General'}
                                    </h2>
                                    <p className="text-foreground/80 leading-relaxed text-base md:text-lg">
                                        {isRtl
                                            ? 'אנו ב-RentMate שואפים להבטיח כי השירותים הדיגיטליים שלנו יהיו נגישים לאנשים עם מוגבלויות, מתוך אמונה כי לכל אדם מגיעה הזכות לחיות בכבוד, שוויון, נוחות ועצמאות. השקענו משאבים רבים כדי להקל את השימוש באתר עבור אנשים עם מוגבלויות, ככל האפשר, מתוך אמונה כי לכל אדם מגיעה הזכות לחיות בשוויון, כבוד, נוחות ועצמאות.'
                                            : 'We at RentMate strive to ensure that our digital services are accessible to people with disabilities, believing that every person deserves the right to live with dignity, equality, comfort, and independence. We have invested significant resources to make the site easier to use for people with disabilities, as much as possible.'}
                                    </p>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Compliance Level */}
                        <GlassCard className="p-6 md:p-8 bg-card/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10">
                            <h2 className="text-xl font-bold text-foreground mb-4">
                                {isRtl ? 'רמת הנגישות באתר' : 'Accessibility Compliance Level'}
                            </h2>
                            <ul className="list-disc list-inside space-y-2 text-foreground/80 leading-relaxed marker:text-primary-500">
                                <li>
                                    {isRtl
                                        ? 'אתר זה עומד בדרישות תקנות שוויון זכויות לאנשים עם מוגבלות (התאמות נגישות לשירות), התשע"ג 2013.'
                                        : 'This website meets the requirements of the Equal Rights for Persons with Disabilities (Service Accessibility Adjustments) Regulations, 2013.'}
                                </li>
                                <li>
                                    {isRtl
                                        ? 'התאמות הנגישות בוצעו עפ"י המלצות התקן הישראלי (ת"י 5568) לנגישות תכנים באינטרנט ברמת AA ומסמך WCAG 2.1 הבינלאומי.'
                                        : 'Accessibility adjustments were made according to the recommendations of the Israeli Standard (IS 5568) for web content accessibility at Level AA and the international WCAG 2.1 document.'}
                                </li>
                                <li>
                                    {isRtl
                                        ? 'האתר מספק מבנה סמנטי עבור טכנולוגיות מסייעות ותמיכה בדפוס השימוש המקובל להפעלה עם מקלדת בעזרת מקשי החיצים, Enter ו- Esc ליציאה מתפריטים וחלונות.'
                                        : 'The site provides a semantic structure for assistive technologies and supports standard keyboard operation patterns using arrow keys, Enter, and Esc to exit menus and windows.'}
                                </li>
                                <li>
                                    {isRtl
                                        ? 'מותאם לתצוגה בדפדפנים הנפוצים ולשימוש בטלפון הסלולרי.'
                                        : 'Optimized for display in common browsers and mobile phone usage.'}
                                </li>
                            </ul>
                        </GlassCard>

                        {/* Contact Info */}
                        <GlassCard className="p-6 md:p-8 bg-card/80 backdrop-blur-xl rounded-3xl shadow-xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10">
                            <h2 className="text-xl font-bold text-foreground mb-6">
                                {isRtl ? 'פרטי רכז נגישות' : 'Accessibility Coordinator Details'}
                            </h2>
                            <div className="grid grid-cols-1 gap-6 max-w-lg">
                                <div className="flex items-center gap-4 p-4 bg-muted/30/50 rounded-2xl border border-slate-100 dark:border-slate-700">
                                    <div className="p-2.5 bg-card rounded-xl shadow-sm border border-slate-100 dark:border-slate-700">
                                        <Mail className="w-5 h-5 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <div className="text-sm text-muted-foreground mb-0.5">{isRtl ? 'דואר אלקטרוני' : 'Email'}</div>
                                        <a href="mailto:support@rentmate.co.il" className="font-semibold text-primary-600 hover:text-primary-500 transition-colors">
                                            support@rentmate.co.il
                                        </a>
                                    </div>
                                </div>
                            </div>
                        </GlassCard>

                        {/* Feedback */}
                        <div className="bg-primary-50/50 dark:bg-primary-900/10 rounded-3xl p-6 md:p-8 border border-primary-100 dark:border-primary-900/30 shadow-inner">
                            <h2 className="text-lg font-bold text-primary-900 dark:text-primary-100 mb-2">
                                {isRtl ? 'נתקלתם בבעיה?' : 'Encountered an issue?'}
                            </h2>
                            <p className="text-primary-800/80 dark:text-primary-200/80 mb-6 leading-relaxed">
                                {isRtl
                                    ? 'אם מצאתם באתר מידע שאינו נגיש, לרבות מסמכים, סרטונים וכו\', או אם נתקלתם בקושי כלשהו בגלישה באתר, נשמח אם תעדכנו אותנו כדי שנוכל לטפל בבעיה בהקדם.'
                                    : 'If you found inaccessible information on the site, including documents, videos, etc., or if you encountered any difficulty browsing the site, please let us know so we can address the issue promptly.'}
                            </p>
                            <a
                                href="mailto:support@rentmate.co.il"
                                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors font-medium text-sm shadow-sm hover:shadow shadow-primary-500/20"
                            >
                                {isRtl ? 'צור קשר לדיווח על בעיה' : 'Contact us to report an issue'}
                                <ExternalLink className="w-4 h-4" />
                            </a>
                        </div>

                        <div className="text-center text-xs text-slate-400 mt-8 font-medium">
                            {isRtl ? 'הצהרת הנגישות עודכנה לאחרונה בתאריך: 17/01/2026' : 'Accessibility statement last updated on: 17/01/2026'}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
