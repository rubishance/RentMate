import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { HomeIcon, AssetsIcon, TenantsIcon, ContractsIcon, PaymentsIcon, ToolsIcon, AdminIcon, SettingsIcon } from '../icons/NavIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { CookieConsent } from '../legal/CookieConsent';
import type { PanInfo } from 'framer-motion';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { ThemeToggle } from '../common/ThemeToggle';
import { LanguageToggle } from '../common/LanguageToggle';

const NAV_LABELS = {
    he: {
        '/dashboard': 'בית',
        '/properties': 'נכסים',
        '/contracts': 'חוזים',
        '/payments': 'תשלומים',
        '/calculator': 'מחשבון',
        '/settings': 'הגדרות',
        '/analytics': 'אנליטיקה',
        '/tools': 'כלים',
        '/admin': 'ניהול'
    },
    en: {
        '/dashboard': 'Home',
        '/properties': 'Assets',
        '/contracts': 'Contracts',
        '/payments': 'Payments',
        '/calculator': 'Calc',
        '/settings': 'Settings',
        '/analytics': 'Analytics',
        '/tools': 'Tools',
        '/admin': 'Admin'
    }
} as const;

import logoIconOnly from '../../assets/rentmate-icon-only.png';
import logoIconDark from '../../assets/rentmate-icon-only-dark.png';
import { useNotificationScheduler } from '../../hooks/useNotificationScheduler';
import { NotificationCenter } from '../common/NotificationCenter';
import { SystemBroadcast } from '../common/SystemBroadcast';
// Custom SettingsIcon already imported from NavIcons
// Custom SettingsIcon already imported from NavIcons

export function AppShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const { preferences, effectiveTheme } = useUserPreferences();
    const [direction, setDirection] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);
    const [debugPadding, setDebugPadding] = useState(128); // Default to pb-32 (128px)

    const [isMaintenance, setIsMaintenance] = useState(false);

    // Initial automated checks
    useNotificationScheduler();

    useEffect(() => {
        const checkSystemStatus = async () => {
            // 1. Check Maintenance Mode
            const { data: settings } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', ['maintenance_mode', 'disable_ai_processing']);

            const maintMode = settings?.find(s => s.key === 'maintenance_mode')?.value;

            // 2. Check User Role
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('role, is_super_admin')
                    .eq('id', authUser.id)
                    .single();

                if (profile?.role === 'admin') {
                    setIsAdmin(true);
                }

                // If maintenance is on and user is NOT super admin, redirect
                if (maintMode === true && profile?.is_super_admin !== true) {
                    setIsMaintenance(true);
                }
            } else if (maintMode === true) {
                // If not logged in and maintenance is on
                setIsMaintenance(true);
            }
        };
        checkSystemStatus();
    }, []);

    if (isMaintenance) {
        navigate('/maintenance', { replace: true });
        return null; // Prevent rendering the rest of the shell
    }

    const labels = NAV_LABELS[preferences.language] || NAV_LABELS.en;

    const navItems = [
        { path: '/dashboard', label: labels['/dashboard'], icon: HomeIcon },
        { path: '/properties', label: labels['/properties'], icon: AssetsIcon },
        { path: '/contracts', label: labels['/contracts'], icon: ContractsIcon },
        { path: '/payments', label: labels['/payments'], icon: PaymentsIcon },
        { path: '/tools', label: labels['/tools'], icon: ToolsIcon },
        ...(isAdmin ? [{ path: '/admin', label: labels['/admin'], icon: AdminIcon }] : []),
    ];

    const activeIndex = navItems.findIndex(item => item.path === location.pathname);

    // Handle Swipe
    const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const swipeThreshold = 50;
        const isRtl = preferences.language === 'he';
        const swipeNext = isRtl ? info.offset.x > swipeThreshold : info.offset.x < -swipeThreshold;
        const swipePrev = isRtl ? info.offset.x < -swipeThreshold : info.offset.x > swipeThreshold;

        if (swipePrev && activeIndex > 0) {
            setDirection(-1);
            navigate(navItems[activeIndex - 1].path);
        } else if (swipeNext && activeIndex < navItems.length - 1) {
            setDirection(1);
            navigate(navItems[activeIndex + 1].path);
        }
    };

    const handleNavClick = (path: string, index: number) => {
        setDirection(index > activeIndex ? 1 : -1);
        navigate(path);
    };

    const variants = {
        enter: (direction: number) => ({
            x: direction > 0 ? 100 : -100,
            opacity: 0,
        }),
        center: {
            x: 0,
            opacity: 1,
        },
        exit: (direction: number) => ({
            x: direction < 0 ? 100 : -100,
            opacity: 0,
        }),
    };
    return (
        <div className="min-h-screen bg-white dark:bg-black font-sans selection:bg-primary/10">
            {/* Header */}
            <header className="fixed top-0 left-0 right-0 h-24 bg-white/50 dark:bg-black/50 backdrop-blur-3xl z-50 flex items-center justify-between px-8 border-b border-slate-50 dark:border-neutral-900 transition-all duration-500">
                <div className="flex items-center gap-4 group cursor-pointer" onClick={() => navigate('/dashboard')}>
                    <div className="w-10 h-10 bg-foreground rounded-[0.8rem] flex items-center justify-center group-hover:rotate-12 transition-transform duration-500">
                        <img
                            src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly}
                            alt="RentMate"
                            className="w-6 h-6 invert dark:invert-0"
                        />
                    </div>
                    <span className="text-2xl font-black tracking-tighter text-foreground whitespace-nowrap lowercase">
                        Rent<span className="opacity-40">Mate</span>
                    </span>
                </div>

                <div className="flex items-center gap-6">
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

            <div className="pt-24 min-h-screen flex flex-col relative overflow-hidden">
                <div className="relative z-50">
                    <SystemBroadcast />
                </div>

                {/* Accessibility: Skip to Content */}
                <a
                    href="#main-content"
                    className="sr-only focus:not-sr-only focus:absolute focus:top-28 focus:left-8 z-[999] px-8 py-4 bg-foreground text-background font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-premium-dark"
                >
                    {preferences.language === 'he' ? 'דלג לתוכן המרכזי' : 'Skip to main content'}
                </a>

                {/* Main Content Area */}
                <motion.main
                    id="main-content"
                    className="flex-1 overflow-y-auto overflow-x-hidden pb-40 scroll-smooth relative z-10"
                    drag="x"
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.05}
                    onDragEnd={onDragEnd}
                >
                    <AnimatePresence mode="wait" custom={direction} initial={false}>
                        <motion.div
                            key={location.pathname}
                            custom={direction}
                            variants={variants}
                            initial="enter"
                            animate="center"
                            exit="exit"
                            transition={{ type: 'spring', stiffness: 350, damping: 35 }}
                            className="min-h-full px-6 md:px-10 max-w-7xl mx-auto"
                        >
                            <Outlet />
                        </motion.div>
                    </AnimatePresence>
                </motion.main>
            </div>

            {/* Cookie Consent */}
            <CookieConsent />

            {/* Premium Bottom Navigation */}
            <div className="fixed bottom-10 left-0 right-0 z-[100] flex justify-center px-6 pointer-events-none">
                <nav
                    className="bg-white/80 dark:bg-neutral-900/80 backdrop-blur-3xl border border-slate-100 dark:border-neutral-800 p-2.5 rounded-[2.5rem] shadow-premium flex gap-2 pointer-events-auto"
                    role="navigation"
                    aria-label="Main Navigation"
                >
                    {navItems.map((item, index) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.path}
                                onClick={() => handleNavClick(item.path, index)}
                                aria-label={item.label}
                                aria-current={isActive ? 'page' : undefined}
                                className={cn(
                                    "relative flex items-center justify-center h-16 rounded-[1.8rem] transition-all duration-700",
                                    isActive
                                        ? "text-foreground bg-slate-50 dark:bg-neutral-800 px-8 shadow-minimal ring-1 ring-slate-100 dark:ring-neutral-700"
                                        : "text-muted-foreground hover:text-foreground hover:bg-slate-50/50 dark:hover:bg-neutral-800/50 px-5"
                                )}
                            >
                                <Icon className={cn("w-6 h-6 transition-all duration-700", isActive && "scale-110")} />
                                <AnimatePresence>
                                    {isActive && (
                                        <motion.span
                                            initial={{ opacity: 0, width: 0, marginLeft: 0 }}
                                            animate={{ opacity: 1, width: 'auto', marginLeft: 12 }}
                                            exit={{ opacity: 0, width: 0, marginLeft: 0 }}
                                            className="text-[10px] font-black uppercase tracking-[0.2em] overflow-hidden whitespace-nowrap"
                                        >
                                            {item.label}
                                        </motion.span>
                                    )}
                                </AnimatePresence>
                            </button>
                        );
                    })}
                </nav>
            </div>
        </div>
    );
}
