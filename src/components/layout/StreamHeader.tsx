import { useNavigate, Link } from 'react-router-dom';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { NotificationCenter } from '../common/NotificationCenter';
import { SettingsIcon } from '../icons/NavIcons';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageToggle } from '../common/LanguageToggle';
import { useTranslation } from '../../hooks/useTranslation';
import { useSubscription } from '../../hooks/useSubscription';
import { Star, Crown } from 'lucide-react';
import { chatBus } from '../../events/chatEvents';
import { RentyMascot } from '../common/RentyMascot';
import { useEffect, useState } from 'react';

interface StreamHeaderProps {
    title?: string;
    hideControls?: boolean;
}

export function StreamHeader({ title, hideControls }: StreamHeaderProps) {
    const navigate = useNavigate();
    const { effectiveTheme, preferences } = useUserPreferences();
    const { t } = useTranslation();
    const { plan, loading } = useSubscription();
    const [unreadCount, setUnreadCount] = useState(chatBus.unreadCount || 0);

    useEffect(() => {
        const unsubscribe = chatBus.subscribe((event) => {
            if (event.type === 'UNREAD_COUNT_CHANGED') {
                setUnreadCount(event.payload || 0);
            }
        });
        return unsubscribe;
    }, []);

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return t('goodMorning');
        if (hour < 18) return t('goodAfternoon');
        return t('goodEvening');
    };

    return (
        <header className="fixed top-0 left-0 right-0 h-16 glass-premium z-[60] flex items-center justify-between px-4 md:px-10 border-b border-white/10 transition-all duration-500">
            {/* Left: Logo or Title */}
            <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 sm:gap-4">
                    <div className="flex flex-col justify-center">
                        <span className="text-xl md:text-2xl font-black tracking-tighter text-foreground whitespace-nowrap leading-none flex items-center gap-2">
                            {title || 'RentMate'}
                        </span>
                        {!title && (
                            <span className="text-xs font-bold uppercase tracking-widest text-muted-foreground opacity-90 mt-0.5">
                                {getGreeting()}
                            </span>
                        )}
                    </div>
                    {/* Mobile Renty Trigger */}
                    <button
                        onClick={() => chatBus.emit('TOGGLE_CHAT')}
                        className="md:hidden flex items-center justify-center relative ml-2 transition-transform active:scale-95"
                        aria-label="Open Chat"
                    >
                        <div className="relative bg-secondary w-10 h-10 rounded-[20px] rounded-bl-sm sm:rounded-bl-md shadow-low flex items-center justify-center border border-primary/10">
                            <RentyMascot size={24} showBackground={false} className="text-primary drop-shadow-sm" />
                        </div>
                        {unreadCount > 0 && (
                            <span className="absolute -top-1 -right-1 flex h-3.5 w-3.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-destructive border-[1.5px] border-white dark:border-slate-900"></span>
                            </span>
                        )}
                    </button>
                </div>
            </div>

            {/* Right: Actions */}
            {!hideControls && (
                <div className="flex items-center gap-2 md:gap-4">
                    {!loading && plan && (
                        <div className="flex items-center gap-2 sm:gap-2">
                            {plan.id === 'free' && (
                                <button
                                    onClick={() => navigate('/subscription')}
                                    className="flex sm:hidden items-center justify-center px-2.5 py-1 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-full text-xs font-bold shadow-sm"
                                >
                                    שדרג
                                </button>
                            )}
                            <button
                                onClick={() => navigate('/subscription')}
                                className="hidden sm:flex items-center gap-2 sm:gap-2 px-2.5 sm:px-2 sm:px-4 py-1 sm:py-2 rounded-full bg-gradient-to-r from-primary/10 to-cyan-600/10 hover:from-primary/20 hover:to-cyan-600/20 border border-blue-200 dark:border-blue-900 transition-all group"
                            >
                                {plan.id === 'free' || plan.id === 'solo' ? (
                                    <Star className="w-3 h-3 text-primary group-hover:scale-110 transition-transform" />
                                ) : (
                                    <Crown className="w-3 h-3 text-yellow-500 fill-yellow-500 group-hover:scale-110 transition-transform" />
                                )}
                                <span className="text-xs sm:text-xs font-bold uppercase tracking-widest bg-clip-text text-transparent bg-gradient-to-r from-primary to-cyan-600">
                                    {plan.id === 'free' || plan.id === 'solo' || plan.name === 'BASIC' ? 'FREE' : plan.name}
                                </span>
                            </button>
                        </div>
                    )}
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
