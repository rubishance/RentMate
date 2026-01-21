import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { UserPreferences, Language, Gender, Theme } from '../types/database';
import { userPreferencesService } from '../services/user-preferences.service';

interface UserPreferencesContextType {
    preferences: UserPreferences;
    setLanguage: (language: Language) => void;
    setGender: (gender: Gender | null) => void;
    setTheme: (theme: Theme) => void;
    effectiveTheme: 'light' | 'dark';
    isLoading: boolean;
}

const UserPreferencesContext = createContext<UserPreferencesContextType | undefined>(undefined);

interface UserPreferencesProviderProps {
    children: ReactNode;
}

export function UserPreferencesProvider({ children }: UserPreferencesProviderProps) {
    const [preferences, setPreferences] = useState<UserPreferences>(() =>
        userPreferencesService.getUserPreferences()
    );
    const [effectiveTheme, setEffectiveTheme] = useState<'light' | 'dark'>(() =>
        userPreferencesService.getEffectiveTheme()
    );
    const [isLoading, setIsLoading] = useState(false);

    // Load preferences on mount
    useEffect(() => {
        const loadedPreferences = userPreferencesService.getUserPreferences();

        // Force migration to Hebrew if currently English (for launch)
        if (loadedPreferences.language === 'en') {
            const updated = userPreferencesService.setLanguage('he');
            setPreferences(updated);
        } else {
            setPreferences(loadedPreferences);
        }
    }, []);

    const handleSetLanguage = (language: Language) => {
        setIsLoading(true);
        const updated = userPreferencesService.setLanguage(language);
        setPreferences(updated);
        setIsLoading(false);
    };

    const handleSetGender = (gender: Gender | null) => {
        setIsLoading(true);
        const updated = userPreferencesService.setGender(gender);
        setPreferences(updated);
        setIsLoading(false);
    };

    const handleSetTheme = (theme: Theme) => {
        setIsLoading(true);
        const updated = userPreferencesService.setTheme(theme);
        setPreferences(updated);
        setEffectiveTheme(userPreferencesService.getEffectiveTheme());
        setIsLoading(false);
    };

    // Sync language with DOM
    useEffect(() => {
        document.documentElement.dir = preferences.language === 'he' ? 'rtl' : 'ltr';
        document.documentElement.lang = preferences.language;
    }, [preferences.language]);

    // Sync theme with DOM using View Transitions API for smooth animation
    useEffect(() => {
        const theme = userPreferencesService.getEffectiveTheme();
        setEffectiveTheme(theme);

        // Use View Transitions API if supported for smooth theme change
        const updateTheme = () => {
            if (theme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        // Check if browser supports View Transitions API
        if ('startViewTransition' in document && (document as any).startViewTransition) {
            (document as any).startViewTransition(() => {
                updateTheme();
            });
        } else {
            // Fallback for browsers that don't support View Transitions
            updateTheme();
        }
    }, [preferences.theme]);

    // Listen for system theme changes when using 'system' preference
    useEffect(() => {
        if (preferences.theme !== 'system') return;

        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        const handleChange = (e: MediaQueryListEvent) => {
            const newTheme = e.matches ? 'dark' : 'light';
            setEffectiveTheme(newTheme);
            if (newTheme === 'dark') {
                document.documentElement.classList.add('dark');
            } else {
                document.documentElement.classList.remove('dark');
            }
        };

        mediaQuery.addEventListener('change', handleChange);
        return () => mediaQuery.removeEventListener('change', handleChange);
    }, [preferences.theme]);

    return (
        <UserPreferencesContext.Provider
            value={{
                preferences,
                setLanguage: handleSetLanguage,
                setGender: handleSetGender,
                setTheme: handleSetTheme,
                effectiveTheme,
                isLoading,
            }}
        >
            {children}
        </UserPreferencesContext.Provider>
    );
}

export function useUserPreferences(): UserPreferencesContextType {
    const context = useContext(UserPreferencesContext);
    if (context === undefined) {
        throw new Error('useUserPreferences must be used within a UserPreferencesProvider');
    }
    return context;
}

