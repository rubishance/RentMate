import { Sun, Moon, Monitor } from 'lucide-react';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import type { Theme } from '../../types/database';

interface ThemeToggleProps {
    className?: string;
}

export function ThemeToggle({ className = '' }: ThemeToggleProps) {
    const { preferences, setTheme } = useUserPreferences();
    const { theme } = preferences;

    const themes: { value: Theme; icon: typeof Sun; label: string; labelHe: string }[] = [
        { value: 'light', icon: Sun, label: 'Light', labelHe: 'בהיר' },
        { value: 'dark', icon: Moon, label: 'Dark', labelHe: 'כהה' },
        { value: 'system', icon: Monitor, label: 'Auto', labelHe: 'אוטומטי' },
    ];

    const isRtl = preferences.language === 'he';

    return (
        <div className={`flex items-center gap-1 bg-gray-100 dark:bg-neutral-900 rounded-lg p-1 ${className}`}>
            {themes.map(({ value, icon: Icon, label, labelHe }) => (
                <button
                    key={value}
                    onClick={() => setTheme(value)}
                    className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-md text-xs font-medium transition-all ${theme === value
                        ? 'bg-white dark:bg-neutral-800 text-black dark:text-white shadow-sm'
                        : 'text-gray-600 dark:text-gray-400 hover:text-black dark:hover:text-white'
                        }`}
                    aria-label={`${isRtl ? labelHe : label} theme`}
                    title={isRtl ? labelHe : label}
                >
                    <Icon className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">{isRtl ? labelHe : label}</span>
                </button>
            ))}
        </div>
    );
}
