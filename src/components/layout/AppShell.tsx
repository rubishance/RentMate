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

const NAV_LABELS = {
    he: {
        '/dashboard': 'בית',
        '/properties': 'נכסים',
        '/tenants': 'דיירים',
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
        '/tenants': 'Tenants',
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
        { path: '/tenants', label: labels['/tenants'], icon: TenantsIcon },
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
        <div className="h-full bg-background dark:bg-[#0a0a0a] text-foreground dark:text-white flex flex-col font-sans relative">
            {/* Top Header */}
            <header className="fixed top-0 left-0 right-0 h-14 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md border-b border-border dark:border-neutral-800 z-50 flex items-center justify-between px-2">
                <div className="flex items-center gap-2 px-1 cursor-pointer" onClick={() => navigate('/dashboard')}>
                    <img
                        src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly}
                        alt="RentMate Icon"
                        className="h-9 w-9 object-contain"
                    />
                    <span className="text-xl tracking-tighter text-black dark:text-white leading-none">
                        <span className="font-black">Rent</span>
                        <span className="font-normal">Mate</span>
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <ThemeToggle className="scale-90" />
                    <NotificationCenter />
                    <button
                        onClick={() => navigate('/settings')}
                        className="p-2 text-muted-foreground dark:text-gray-400 hover:text-foreground dark:hover:text-white hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-full transition-colors"
                        aria-label="Settings"
                    >
                        <SettingsIcon className="w-5 h-5" />
                    </button>
                </div>
            </header>

            <div className="pt-14">
                <SystemBroadcast />
            </div>

            {/* Accessibility: Skip to Content */}
            <a
                href="#main-content"
                className="sr-only focus:not-sr-only focus:absolute focus:top-20 focus:left-4 z-[999] px-4 py-2 bg-primary text-white font-bold rounded-lg shadow-lg"
            >
                {preferences.language === 'he' ? 'דלג לתוכן המרכזי' : 'Skip to main content'}
            </a>

            {/* Main Content Area (With Swipe) */}
            <motion.main
                id="main-content"
                className="flex-1 overflow-y-auto overflow-x-hidden pt-14 pb-32 scroll-smooth relative z-10"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.2}
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
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                        className="h-full"
                    >
                        <Outlet />
                    </motion.div>
                </AnimatePresence>
            </motion.main>

            {/* Cookie Consent */}
            <CookieConsent />

            {/* Bottom Navigation Bar */}
            <nav className="fixed bottom-0 left-0 right-0 bg-white/95 dark:bg-[#0a0a0a]/95 backdrop-blur-sm border-t border-border dark:border-neutral-800 pt-3 pb-safe z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.02)] dark:shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)]" role="navigation" aria-label="Main Navigation">
                <div className="flex justify-around items-center px-2">
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
                                    "flex flex-col items-center justify-center min-w-[4rem] gap-1.5 transition-all duration-200",
                                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                <div className={cn(
                                    "p-1 rounded-xl transition-all duration-200",
                                    isActive && "bg-primary/10 scale-110"
                                )}>
                                    <Icon className={cn("w-6 h-6", isActive && "stroke-[2.5px]")} />
                                </div>
                                <span className={cn("text-[10px] font-medium tracking-wide", isActive && "font-bold")}>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
