import { supabase } from '../lib/supabase';
import type { UserPreferences, Language, Gender, Theme } from '../types/database';

const STORAGE_KEY = 'userPreferences';

const DEFAULT_PREFERENCES: UserPreferences = {
    language: 'he',
    gender: null,
    theme: 'system',
    pinned_cities: [],
    has_seen_welcome_v1: false,
    seen_features: [],
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
                    pinned_cities: parsed.pinned_cities || DEFAULT_PREFERENCES.pinned_cities,
                    has_seen_welcome_v1: parsed.has_seen_welcome_v1 ?? DEFAULT_PREFERENCES.has_seen_welcome_v1,
                    seen_features: parsed.seen_features || DEFAULT_PREFERENCES.seen_features,
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

            // Sync with Supabase if logged in
            this.syncWithSupabase(preferences);
        } catch (error) {
            console.error('Error saving user preferences:', error);
        }
    },

    /**
     * Sync preferences with Supabase
     */
    async syncWithSupabase(preferences: UserPreferences): Promise<void> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { error } = await supabase
                .from('user_preferences')
                .upsert({
                    user_id: user.id,
                    language: preferences.language,
                    gender: preferences.gender,
                    pinned_cities: preferences.pinned_cities,
                    has_seen_welcome_v1: preferences.has_seen_welcome_v1,
                    seen_features: preferences.seen_features,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (error) throw error;
        } catch (error) {
            console.error('Error syncing user preferences with Supabase:', error);
        }
    },

    /**
     * Load preferences from Supabase
     */
    async fetchRemotePreferences(): Promise<UserPreferences | null> {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return null;

            const { data, error } = await supabase
                .from('user_preferences')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (error && error.code !== 'PGRST116') throw error; // PGRST116 is not found

            if (data) {
                const preferences: UserPreferences = {
                    language: data.language,
                    gender: data.gender,
                    theme: 'system', // Use system default as theme isn't in DB yet (per schema)
                    pinned_cities: data.pinned_cities || [],
                    has_seen_welcome_v1: data.has_seen_welcome_v1 ?? false,
                    seen_features: data.seen_features || [],
                };
                this.savePreferences(preferences); // Update local cache
                return preferences;
            }
        } catch (error) {
            console.error('Error fetching remote preferences:', error);
        }
        return null;
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
     * Set pinned cities
     */
    setPinnedCities(cities: string[]): UserPreferences {
        const current = this.getUserPreferences();
        const updated: UserPreferences = {
            ...current,
            pinned_cities: cities,
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

    /**
     * Set has_seen_welcome_v1 flag
     */
    setHasSeenWelcome(seen: boolean): UserPreferences {
        const current = this.getUserPreferences();
        const updated: UserPreferences = {
            ...current,
            has_seen_welcome_v1: seen,
        };
        this.savePreferences(updated);
        return updated;
    },

    /**
     * Mark a feature as seen
     */
    markFeatureSeen(featureId: string): UserPreferences {
        const current = this.getUserPreferences();
        const seen = current.seen_features || [];
        if (seen.includes(featureId)) return current;

        const updated: UserPreferences = {
            ...current,
            seen_features: [...seen, featureId],
        };
        this.savePreferences(updated);
        return updated;
    },
};

