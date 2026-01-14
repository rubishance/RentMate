import type { Gender } from '../types/database';

/**
 * Translation dictionary with support for gender-aware Hebrew text
 * Structure: { key: { en: string, he: { male: string, female: string, unspecified: string } } }
 */
type TranslationValue = string | {
    male: string;
    female: string;
    unspecified: string;
};

type Translations = {
    [key: string]: {
        en: string;
        he: TranslationValue;
    };
};

const translations: Translations = {
    // Common UI elements
    welcome: {
        en: 'Welcome',
        he: {
            male: 'ברוך הבא',
            female: 'ברוכה הבאה',
            unspecified: 'ברוך/ה הבא/ה',
        },
    },
    settings: {
        en: 'Settings',
        he: 'הגדרות',
    },
    save: {
        en: 'Save',
        he: 'שמור',
    },
    cancel: {
        en: 'Cancel',
        he: 'ביטול',
    },
    // User-specific messages
    yourProfile: {
        en: 'Your Profile',
        he: {
            male: 'הפרופיל שלך',
            female: 'הפרופיל שלך',
            unspecified: 'הפרופיל שלך',
        },
    },
    loggedIn: {
        en: 'You are logged in',
        he: {
            male: 'אתה מחובר',
            female: 'את מחוברת',
            unspecified: 'מחובר/ת',
        },
    },
    // Dashboard
    dashboard: {
        en: 'Dashboard',
        he: 'לוח בקרה',
    },
    properties: {
        en: 'Properties',
        he: 'נכסים',
    },
    tenants: {
        en: 'Tenants',
        he: 'שוכרים',
    },
    contracts: {
        en: 'Contracts',
        he: 'חוזים',
    },
};

/**
 * Get translation for a key based on language and gender
 */
export function translate(
    key: string,
    language: 'he' | 'en',
    gender: Gender | null = null
): string {
    const translation = translations[key];

    if (!translation) {
        console.warn(`Translation key "${key}" not found`);
        return key;
    }

    // For English, always return the English string
    if (language === 'en') {
        return translation.en;
    }

    // For Hebrew, check if it's gender-aware
    const hebrewTranslation = translation.he;

    if (typeof hebrewTranslation === 'string') {
        // Simple string, no gender variation
        return hebrewTranslation;
    }

    // Gender-aware translation
    if (!gender || gender === 'unspecified') {
        return hebrewTranslation.unspecified;
    }

    return hebrewTranslation[gender];
}

/**
 * Helper to add new translations dynamically (for future use)
 */
export function addTranslation(
    key: string,
    en: string,
    he: TranslationValue
): void {
    translations[key] = { en, he };
}
