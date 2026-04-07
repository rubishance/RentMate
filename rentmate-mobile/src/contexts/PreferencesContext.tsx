import React, { createContext, useContext, useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { I18nManager } from 'react-native';

export type AppLanguage = 'he' | 'en';
export type AppTheme = 'light' | 'dark' | 'auto';

interface PreferencesContextType {
  language: AppLanguage;
  theme: AppTheme;
  setLanguage: (lang: AppLanguage) => Promise<void>;
  setTheme: (theme: AppTheme) => Promise<void>;
  isLoading: boolean;
}

const PreferencesContext = createContext<PreferencesContextType | undefined>(undefined);

const PREFS_KEY = '@rentmate_app_preferences';

export const PreferencesProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<AppLanguage>('he');
  const [theme, setThemeState] = useState<AppTheme>('dark'); // Default premium dark
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadPreferences();
  }, []);

  const loadPreferences = async () => {
    try {
      const stored = await AsyncStorage.getItem(PREFS_KEY);
      if (stored) {
        const { lang, themeSelection } = JSON.parse(stored);
        if (lang) {
            setLanguageState(lang);
        }
        if (themeSelection) setThemeState(themeSelection);
      }
    } catch (e) {
      console.warn('Failed to load preferences', e);
    } finally {
      setIsLoading(false);
    }
  };

  const setLanguage = async (newLang: AppLanguage) => {
    setLanguageState(newLang);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ lang: newLang, themeSelection: theme }));
      
      const isRTL = newLang === 'he';
      if (I18nManager.isRTL !== isRTL) {
          I18nManager.allowRTL(isRTL);
          I18nManager.forceRTL(isRTL);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const setTheme = async (newTheme: AppTheme) => {
    setThemeState(newTheme);
    try {
      await AsyncStorage.setItem(PREFS_KEY, JSON.stringify({ lang: language, themeSelection: newTheme }));
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <PreferencesContext.Provider value={{ language, theme, setLanguage, setTheme, isLoading }}>
      {children}
    </PreferencesContext.Provider>
  );
};

export const usePreferences = () => {
  const context = useContext(PreferencesContext);
  if (!context) {
    throw new Error('usePreferences must be used within a PreferencesProvider');
  }
  return context;
};
