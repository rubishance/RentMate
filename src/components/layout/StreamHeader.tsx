import { useNavigate, Link } from 'react-router-dom';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { NotificationCenter } from '../common/NotificationCenter';
import { SettingsIcon } from '../icons/NavIcons';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageToggle } from '../common/LanguageToggle';
import { useTranslation } from '../../hooks/useTranslation';

interface StreamHeaderProps {
    title?: string;
    hideControls?: boolean;
}

export function StreamHeader({ title, hideControls }: StreamHeaderProps) {
    const navigate = useNavigate();
    const { effectiveTheme, preferences } = useUserPreferences();
    const { t } = useTranslation();

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('goodMorning');
        if (hour < 18) return t('goodAfternoon');
        return t('goodEvening');
    };

    return (
        <header className="fixed top-0 left-0 right-0 h-16 glass-premium z-[60] flex items-center justify-between px-4 md:px-10 border-b border-white/10 transition-all duration-500">
            {/* Left: Logo or Title */}
            {/* Left: Logo or Title */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-3">
                    <div className="flex flex-col justify-center">
                        <span className="text-xl md:text-2xl font-black tracking-tighter text-foreground whitespace-nowrap lowercase leading-none">
                            {title || 'RentMate'}
                        </span>
                        {!title && (
                            <span className="text-[8px] font-bold uppercase tracking-widest text-muted-foreground opacity-90 mt-0.5">
                                {getGreeting()}
                            </span>
                        )}
                    </div>
                </div>
            </div>

            {/* Right: Actions */}
            {!hideControls && (
                <div className="flex items-center gap-2 md:gap-4">
                    <NotificationCenter />

                    <Link
                        to="/settings"
                        className="p-2 flex items-center justify-center text-muted-foreground hover:text-primary hover:bg-primary/5 rounded-full transition-all"
                        aria-label="Settings"
                        onClick={() => console.log('[StreamHeader] [NAV] Settings clicked')}
                    >
                        <SettingsIcon className="w-6 h-6" />
                    </Link>
                </div>
            )}
        </header>
    );
}
