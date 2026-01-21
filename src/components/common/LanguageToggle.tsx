import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { motion } from 'framer-motion';
import { Languages } from 'lucide-react';
import { cn } from '../../lib/utils';

export function LanguageToggle({ className }: { className?: string }) {
    const { preferences, setLanguage } = useUserPreferences();

    const toggleLanguage = () => {
        setLanguage(preferences.language === 'he' ? 'en' : 'he');
    };

    return (
        <button
            onClick={toggleLanguage}
            className={cn(
                "flex items-center gap-2 px-3 py-1.5 rounded-full bg-gray-100 dark:bg-neutral-900 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-all",
                className
            )}
            title={preferences.language === 'he' ? 'Switch to English' : 'עבור לעברית'}
        >
            <Languages className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            <div className="flex items-center gap-1 text-[11px] font-bold tracking-wider uppercase">
                <span className={cn(preferences.language === 'he' ? "text-black dark:text-white px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded-md shadow-sm" : "text-gray-600 dark:text-gray-400")}>
                    HE
                </span>
                <span className="text-gray-300 dark:text-gray-600">|</span>
                <span className={cn(preferences.language === 'en' ? "text-black dark:text-white px-1.5 py-0.5 bg-white dark:bg-neutral-800 rounded-md shadow-sm" : "text-gray-600 dark:text-gray-400")}>
                    EN
                </span>
            </div>
        </button>
    );
}
