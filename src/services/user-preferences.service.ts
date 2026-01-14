import type { UserPreferences, Language, Gender } from '../types/database';

const STORAGE_KEY = 'userPreferences';

const DEFAULT_PREFERENCES: UserPreferences = {
    language: 'he',
    gender: null,
};

/**
 * Service for managing user preferences (language and gender)
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
