
type TranslationKey = string;

const translations = {
    en: { dashboardTitle: "Dashboard" } as any,
    he: { dashboardTitle: "לוח בקרה" } as any
};

export function useLocales() {
    const lang = 'en';

    const t = (key: TranslationKey, params?: Record<string, string | number>) => {
        return (translations[lang as 'en'] as any)[key] || key;
    };

    return { t, lang };
}
