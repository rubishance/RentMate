import { usePreferences } from '../contexts/PreferencesContext';
import { hebrew, english, TranslationsKeys } from '../lib/i18n';

export function useAppTranslation() {
  const { language } = usePreferences();
  
  const t = (key: TranslationsKeys, params?: Record<string, string>): string => {
    const dict = language === 'en' ? english : hebrew;
    let str = dict[key] || hebrew[key] || key;
    
    if (params) {
      Object.keys(params).forEach(p => {
        str = str.replace(`{${p}}`, params[p]);
      });
    }
    
    return str;
  };
  
  return { t, language };
}
