import { useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Building2, Users, FileText, Calculator, ShieldCheck, Home, Wallet } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { CookieConsent } from '../legal/CookieConsent';
import type { PanInfo } from 'framer-motion';
import { cn } from '../../lib/utils';
import { supabase } from '../../lib/supabase';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

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

export function AppShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const { preferences } = useUserPreferences();
    const [direction, setDirection] = useState(0);
    const [isAdmin, setIsAdmin] = useState(false);

    // Apply Language & Direction
    useEffect(() => {
        document.documentElement.dir = preferences.language === 'he' ? 'rtl' : 'ltr';
        document.documentElement.lang = preferences.language;
    }, [preferences.language]);

    useEffect(() => {
        const checkAdmin = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (data?.role === 'admin') {
                    setIsAdmin(true);
                }
            }
        };
        checkAdmin();
    }, []);

    const labels = NAV_LABELS[preferences.language] || NAV_LABELS.en;

    const navItems = [
        { path: '/dashboard', label: labels['/dashboard'], icon: Home },
        { path: '/properties', label: labels['/properties'], icon: Building2 },
        { path: '/tenants', label: labels['/tenants'], icon: Users },
        { path: '/contracts', label: labels['/contracts'], icon: FileText },
        { path: '/payments', label: labels['/payments'], icon: Wallet },
        { path: '/tools', label: labels['/tools'], icon: Calculator },
        // Admin Item
        ...(isAdmin ? [{ path: '/admin', label: labels['/admin'], icon: ShieldCheck }] : []),
    ];

    const activeIndex = navItems.findIndex(item => item.path === location.pathname);

    // Handle Swipe
    const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        const swipeThreshold = 50;
        const isRtl = preferences.language === 'he';
        const swipeNext = isRtl ? info.offset.x > swipeThreshold : info.offset.x < -swipeThreshold;
        const swipePrev = isRtl ? info.offset.x < -swipeThreshold : info.offset.x > swipeThreshold;

        if (swipePrev && activeIndex > 0) {
            // Go Back
            setDirection(-1);
            navigate(navItems[activeIndex - 1].path);
        } else if (swipeNext && activeIndex < navItems.length - 1) {
            // Go Next
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
        <div className="min-h-screen bg-slate-50 text-foreground flex flex-col font-sans overflow-hidden relative">

            {/* Main Content Area (With Swipe) - Adjusted padding for top header */}
            <motion.main
                className="flex-1 overflow-y-auto overflow-x-hidden pt-6 pb-24 scroll-smooth relative z-10"
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
            <nav className="fixed bottom-0 left-0 right-0 bg-white/70 backdrop-blur-xl border-t border-white/50 pb-safe pt-2 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-16 overflow-x-auto px-2">


                    {navItems.map((item, index) => {
                        const isActive = location.pathname === item.path;
                        const Icon = item.icon;
                        return (
                            <button
                                key={item.path}
                                onClick={() => handleNavClick(item.path, index)}
                                className={cn(
                                    "flex flex-col items-center justify-center min-w-[3.5rem] h-full gap-1 transition-all duration-300",
                                    isActive ? "text-blue-600 scale-110" : "text-slate-400 hover:text-slate-600"
                                )}
                            >
                                <div className={cn(
                                    "p-1.5 rounded-full transition-colors",
                                    isActive && "bg-blue-50"
                                )}>
                                    <Icon className="w-5 h-5" />
                                </div>
                                <span className={cn("text-[10px] font-medium", isActive && "font-bold")}>{item.label}</span>
                            </button>
                        );
                    })}
                </div>
            </nav>
        </div>
    );
}
