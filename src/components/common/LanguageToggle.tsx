import { SegmentedControl } from '../ui/SegmentedControl';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useTranslation } from '../../hooks/useTranslation';

export function LanguageToggle({ className }: { className?: string }) {
    const { setLanguage } = useUserPreferences();
    const { lang } = useTranslation();

    const options = [
        { value: 'en', label: 'EN' },
        { value: 'he', label: 'HE' },
    ];

    return (
        <SegmentedControl
            options={options}
            value={lang}
            onChange={(val) => setLanguage(val as 'en' | 'he')}
            size="sm"
            className={className || "w-24"}
        />
    );
}
