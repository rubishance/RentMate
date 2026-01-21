import React from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { PageHeader } from '../components/common/PageHeader';
import { Accessibility, Mail, Phone, ExternalLink } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';

export function AccessibilityStatement() {
    const { t } = useTranslation();
    const { preferences } = useUserPreferences();
    const isRtl = preferences.language === 'he';

    return (
        <div className="min-h-screen bg-secondary dark:bg-foreground pb-20">
            <div className="max-w-4xl mx-auto px-4 py-8">
                <PageHeader
                    title={isRtl ? 'הצהרת נגישות' : 'Accessibility Statement'}
                    subtitle={isRtl ? 'המחויבות שלנו לשוויון ושוויון הזדמנויות באינטרנט' : 'Our commitment to equality and equal opportunities online'}
                />

                <div className="mt-8 space-y-8">
                    {/* Introduction Card */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
                        <div className="flex items-start gap-4">
                            <div className="p-3 bg-primary/10 dark:bg-blue-900/20 rounded-xl shrink-0">
                                <Accessibility className="w-8 h-8 text-primary dark:text-blue-400" />
                            </div>
                            <div className="space-y-4">
                                <h2 className="text-xl font-bold text-foreground dark:text-white">
                                    {isRtl ? 'כללי' : 'General'}
                                </h2>
                                <p className="text-muted-foreground dark:text-gray-300 leading-relaxed">
                                    {isRtl
                                        ? 'אנו ב-RentMate שואפים להבטיח כי השירותים הדיגיטליים שלנו יהיו נגישים לאנשים עם מוגבלויות, מתוך אמונה כי לכל אדם מגיעה הזכות לחיות בכבוד, שוויון, נוחות ועצמאות. השקענו משאבים רבים כדי להקל את השימוש באתר עבור אנשים עם מוגבלויות, ככל האפשר, מתוך אמונה כי לכל אדם מגיעה הזכות לחיות בשוויון, כבוד, נוחות ועצמאות.'
                                        : 'We at RentMate strive to ensure that our digital services are accessible to people with disabilities, believing that every person deserves the right to live with dignity, equality, comfort, and independence. We have invested significant resources to make the site easier to use for people with disabilities, as much as possible.'}
                                </p>
                            </div>
                        </div>
                    </div>

                    {/* Compliance Level */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
                        <h2 className="text-xl font-bold text-foreground dark:text-white mb-4">
                            {isRtl ? 'רמת הנגישות באתר' : 'Accessibility Compliance Level'}
                        </h2>
                        <ul className="list-disc list-inside space-y-2 text-muted-foreground dark:text-gray-300">
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
                    </div>

                    {/* Contact Info */}
                    <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 shadow-sm border border-border dark:border-gray-700">
                        <h2 className="text-xl font-bold text-foreground dark:text-white mb-6">
                            {isRtl ? 'פרטי רכז נגישות' : 'Accessibility Coordinator Details'}
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="flex items-center gap-4 p-4 bg-secondary dark:bg-gray-700/50 rounded-xl">
                                <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                                    <Mail className="w-5 h-5 text-muted-foreground dark:text-gray-300" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground dark:text-muted-foreground">{isRtl ? 'דואר אלקטרוני' : 'Email'}</div>
                                    <a href="mailto:accessibility@rentmate.co.il" className="font-medium text-primary hover:underline">
                                        accessibility@rentmate.co.il
                                    </a>
                                </div>
                            </div>
                            <div className="flex items-center gap-4 p-4 bg-secondary dark:bg-gray-700/50 rounded-xl">
                                <div className="p-2 bg-white dark:bg-gray-700 rounded-lg shadow-sm">
                                    <Phone className="w-5 h-5 text-muted-foreground dark:text-gray-300" />
                                </div>
                                <div>
                                    <div className="text-sm text-muted-foreground dark:text-muted-foreground">{isRtl ? 'טלפון' : 'Phone'}</div>
                                    <a href="tel:+972501234567" className="font-medium text-primary hover:underline">
                                        +972-50-123-4567
                                    </a>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Feedback */}
                    <div className="bg-primary/10 dark:bg-blue-900/10 rounded-2xl p-6 border border-blue-100 dark:border-blue-900/30">
                        <h2 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">
                            {isRtl ? 'נתקלתם בבעיה?' : 'Encountered an issue?'}
                        </h2>
                        <p className="text-blue-800 dark:text-blue-200 mb-4">
                            {isRtl
                                ? 'אם מצאתם באתר מידע שאינו נגיש, לרבות מסמכים, סרטונים וכו\', או אם נתקלתם בקושי כלשהו בגלישה באתר, נשמח אם תעדכנו אותנו כדי שנוכל לטפל בבעיה בהקדם.'
                                : 'If you found inaccessible information on the site, including documents, videos, etc., or if you encountered any difficulty browsing the site, please let us know so we can address the issue promptly.'}
                        </p>
                        <a
                            href="mailto:accessibility@rentmate.co.il"
                            className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 transition-colors font-medium text-sm"
                        >
                            {isRtl ? 'צור קשר לדיווח על בעיה' : 'Contact us to report an issue'}
                            <ExternalLink className="w-4 h-4" />
                        </a>
                    </div>

                    <div className="text-center text-xs text-muted-foreground mt-8">
                        {isRtl ? 'הצהרת הנגישות עודכנה לאחרונה בתאריך: 17/01/2026' : 'Accessibility statement last updated on: 17/01/2026'}
                    </div>
                </div>
            </div>
        </div>
    );
}
