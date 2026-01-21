import type { UserPreferences, Language, Gender, Theme } from '../types/database';

const STORAGE_KEY = 'userPreferences';

const DEFAULT_PREFERENCES: UserPreferences = {
    language: 'he',
    gender: null,
    theme: 'system',
};

/**
 * Detect system theme preference
 */
function getSystemTheme(): 'light' | 'dark' {
    if (typeof window !== 'undefined' && window.matchMedia) {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
}

/**
 * Service for managing user preferences (language, gender, and theme)
 * Uses localStorage for persistence until authentication is implemented
 */
export const userPreferencesService = {
    /**
     * Get current user preferences from localStorage
     */
    getUserPreferences(): UserPreferences {
        try {
            const stored = localStorage.getItem(STORAGE_KEY);
            if (stored) {
                const parsed = JSON.parse(stored);
                return {
                    language: parsed.language || DEFAULT_PREFERENCES.language,
                    gender: parsed.gender || DEFAULT_PREFERENCES.gender,
                    theme: parsed.theme || DEFAULT_PREFERENCES.theme,
                };
            }
        } catch (error) {
            console.error('Error reading user preferences:', error);
        }
        return { ...DEFAULT_PREFERENCES };
    },

    /**
     * Save user preferences to localStorage
     */
    savePreferences(preferences: UserPreferences): void {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(preferences));
        } catch (error) {
            console.error('Error saving user preferences:', error);
        }
    },

    /**
     * Set language preference
     * If switching from Hebrew to another language, clears gender
     */
    setLanguage(language: Language): UserPreferences {
        const current = this.getUserPreferences();
        const updated: UserPreferences = {
            ...current,
            language,
            gender: language === 'he' ? current.gender : null,
        };
        this.savePreferences(updated);
        return updated;
    },

    /**
     * Set gender preference (only valid when language is Hebrew)
     */
    setGender(gender: Gender | null): UserPreferences {
        const current = this.getUserPreferences();
        if (current.language !== 'he') {
            console.warn('Gender preference is only applicable for Hebrew language');
            return current;
        }
        const updated: UserPreferences = {
            ...current,
            gender,
        };
        this.savePreferences(updated);
        return updated;
    },

    /**
     * Set theme preference
     */
    setTheme(theme: Theme): UserPreferences {
        const current = this.getUserPreferences();
        const updated: UserPreferences = {
            ...current,
            theme,
        };
        this.savePreferences(updated);
        return updated;
    },

    /**
     * Get the effective theme (resolves 'system' to actual theme)
     */
    getEffectiveTheme(): 'light' | 'dark' {
        const preferences = this.getUserPreferences();
        if (preferences.theme === 'system') {
            return getSystemTheme();
        }
        return preferences.theme;
    },

    /**
     * Clear all preferences (reset to defaults)
     */
    clearPreferences(): void {
        try {
            localStorage.removeItem(STORAGE_KEY);
        } catch (error) {
            console.error('Error clearing user preferences:', error);
        }
    },
};

