import { useColorScheme } from 'react-native';
import { usePreferences } from '../contexts/PreferencesContext';
import { lightTheme, darkTheme } from '../lib/theme';

export function useAppTheme() {
  const systemTheme = useColorScheme();
  const { theme } = usePreferences();
  
  const isDark = theme === 'dark' || (theme === 'auto' && systemTheme === 'dark');
  return {
    colors: isDark ? darkTheme : lightTheme,
    isDark
  };
}
