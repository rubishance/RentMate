import { useNavigate } from 'react-router-dom';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { NotificationCenter } from '../common/NotificationCenter';
import { SettingsIcon } from '../icons/NavIcons';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageToggle } from '../common/LanguageToggle';
import logoIconOnly from '../../assets/rentmate-icon-only.png';
import logoIconDark from '../../assets/rentmate-icon-only-dark.png';
import { useTranslation } from '../../hooks/useTranslation';

interface StreamHeaderProps {
    title?: string;
}

export function StreamHeader({ title }: StreamHeaderProps) {
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
        <header className="fixed top-0 left-0 right-0 h-24 bg-white/50 dark:bg-black/50 backdrop-blur-3xl z-40 flex items-center justify-between px-8 border-b border-slate-50 dark:border-neutral-900 transition-all duration-500">
            {/* Left: Logo or Title */}
            <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/dashboard')}>
                <div className="w-10 h-10 bg-foreground rounded-[0.8rem] flex items-center justify-center group-hover:rotate-12 transition-transform duration-500 shadow-minimal">
                    <img
                        src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly}
                        alt="RentMate"
                        className="w-6 h-6 invert dark:invert-0"
                    />
                </div>
                <div className="flex flex-col justify-center">
                    <span className="text-3xl md:text-4xl font-black tracking-tighter text-foreground whitespace-nowrap lowercase leading-none">
                        {title || 'RentMate'}
                    </span>
                    {!title && (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground opacity-60">
                            {getGreeting()}
                        </span>
                    )}
                </div>
            </div>

            {/* Right: Actions */}
            <div className="flex items-center gap-4">
                <div className="hidden md:flex gap-4">
                    <ThemeToggle className="scale-[0.8]" />
                    <LanguageToggle className="scale-[0.8]" />
                </div>
                <div className="h-8 w-[1px] bg-slate-100 dark:bg-neutral-800 hidden md:block" />

                <NotificationCenter />

                <button
                    onClick={() => navigate('/settings')}
                    className="w-10 h-10 flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-neutral-900 rounded-xl transition-all"
                    aria-label="Settings"
                >
                    <SettingsIcon className="w-5 h-5" />
                </button>
            </div>
        </header>
    );
}
