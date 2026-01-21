import { notFound } from 'next/navigation';
import { getRequestConfig } from 'next-intl/server';

// Can be imported from a shared config
const locales = ['en', 'he'];

export default getRequestConfig(async (params) => {
    const { locale } = params as any; // Temporary cast to check

    // Validate that the incoming `locale` parameter is valid
    if (!locale || !locales.includes(locale)) {
        console.log('[i18n] Invalid/Missing locale:', locale);
        // Fallback for debug
        return {
            locale: 'en',
            messages: (await import(`../messages/en.json`)).default
        };
        // notFound();
    }

    return {
        locale,
        messages: (await import(`../messages/${locale}.json`)).default
    };
});
