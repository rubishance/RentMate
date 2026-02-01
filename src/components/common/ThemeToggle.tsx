import { Sun, Moon, Monitor } from 'lucide-react';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { SegmentedControl } from '../ui/SegmentedControl';
import { cn } from '../../lib/utils';

export function ThemeToggle({ className = '' }: { className?: string }) {
    const { preferences, setTheme } = useUserPreferences();
    const { theme, language } = preferences;

    const options = [
        { value: 'light', label: language === 'he' ? 'בהיר' : 'Light', icon: <Sun className="w-3.5 h-3.5" /> },
        { value: 'dark', label: language === 'he' ? 'כהה' : 'Dark', icon: <Moon className="w-3.5 h-3.5" /> },
        { value: 'system', label: language === 'he' ? 'אוטו' : 'Auto', icon: <Monitor className="w-3.5 h-3.5" /> },
    ];

    return (
        <SegmentedControl
            options={options}
            value={theme}
            onChange={(val) => setTheme(val as any)}
            size="sm"
            className={cn("w-48", className)}
        />
    );
}
