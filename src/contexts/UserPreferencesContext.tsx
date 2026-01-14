import { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { UserPreferences, Language, Gender } from '../types/database';
import { userPreferencesService } from '../services/user-preferences.service';

interface UserPreferencesContextType {
    preferences: UserPreferences;
    setLanguage: (language: Language) => void;
    setGender: (gender: Gender | null) => void;
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

    return (
        <UserPreferencesContext.Provider
            value={{
                preferences,
                setLanguage: handleSetLanguage,
                setGender: handleSetGender,
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
