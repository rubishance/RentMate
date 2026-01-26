import { useNavigate, useLocation } from 'react-router-dom';
import { HomeIcon, AssetsIcon, PaymentsIcon, ToolsIcon, AdminIcon } from '../icons/NavIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';

// Navigation Labels Mapping
const NAV_LABELS = {
    he: {
        '/dashboard': 'בית',
        '/properties': 'נכסים',
        '/payments': 'תשלומים',
        '/tools': 'כלים',
        '/admin': 'ניהול'
    },
    en: {
        '/dashboard': 'Home',
        '/properties': 'Assets',
        '/payments': 'Wallet',
        '/tools': 'Tools',
        '/admin': 'Admin'
    }
} as const;

export function BottomDock() {
    const navigate = useNavigate();
    const location = useLocation();
    const { preferences } = useUserPreferences();
    const [isAdmin, setIsAdmin] = useState(false);

    useEffect(() => {
        const checkRole = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (user) {
                const { data } = await supabase.from('user_profiles').select('role').eq('id', user.id).single();
                if (data?.role === 'admin') setIsAdmin(true);
            }
        };
        checkRole();
    }, []);

    const labels = NAV_LABELS[preferences.language] || NAV_LABELS.en;

    const navItems = [
        { path: '/dashboard', label: labels['/dashboard'], icon: HomeIcon },
        { path: '/properties', label: labels['/properties'], icon: AssetsIcon },
        { path: '/payments', label: labels['/payments'], icon: PaymentsIcon },
        { path: '/tools', label: labels['/tools'], icon: ToolsIcon },
        ...(isAdmin ? [{ path: '/admin', label: labels['/admin'], icon: AdminIcon }] : []),
    ];

    return (
        <div className="fixed bottom-10 left-0 right-0 z-[50] flex justify-center px-6 pointer-events-none">
            <nav
                className="bg-white/90 dark:bg-black/90 backdrop-blur-3xl border border-slate-100 dark:border-neutral-800 p-2.5 rounded-[2.5rem] shadow-premium flex gap-2 pointer-events-auto"
                role="navigation"
                aria-label="Bottom Dock"
            >
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                "relative flex items-center justify-center h-16 rounded-[1.8rem] transition-all duration-500",
                                isActive
                                    ? "text-foreground bg-slate-100 dark:bg-neutral-800 px-8 shadow-minimal ring-1 ring-slate-200 dark:ring-neutral-700"
                                    : "text-muted-foreground hover:text-foreground hover:bg-slate-50 dark:hover:bg-neutral-900 px-5"
                            )}
                        >
                            <Icon className={cn("w-6 h-6 transition-all duration-500", isActive && "scale-110")} />
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
    );
}
