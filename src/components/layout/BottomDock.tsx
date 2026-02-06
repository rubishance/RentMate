import { useNavigate, useLocation, Link } from 'react-router-dom';
import { HomeIcon, AssetsIcon, PaymentsIcon, ToolsIcon, AdminIcon } from '../icons/NavIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { prefetchRoutes } from '../../utils/prefetch';

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
        <div className="fixed bottom-10 left-0 right-0 z-[50] flex justify-center px-3 pointer-events-none">
            <nav
                className="glass-premium p-2.5 rounded-[2.5rem] shadow-premium flex gap-2 pointer-events-auto"
                role="navigation"
                aria-label="Bottom Dock"
            >
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    const Icon = item.icon;
                    return (
                        <Link
                            key={item.path}
                            to={item.path}
                            onClick={() => {
                                console.log(`[BottomDock] [NAV] Link clicked: ${item.path}`);
                                if (isActive) {
                                    window.scrollTo({ top: 0, behavior: 'smooth' });
                                }
                            }}
                            onMouseEnter={() => {
                                if (item.path === '/dashboard') prefetchRoutes.dashboard();
                                if (item.path === '/properties') prefetchRoutes.properties();
                                if (item.path === '/payments') prefetchRoutes.payments();
                                if (item.path === '/tools') prefetchRoutes.settings();
                                if (item.path === '/admin') prefetchRoutes.adminDashboard();
                            }}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                            className={cn(
                                "relative flex items-center justify-center h-16 rounded-[1.8rem] transition-all duration-300",
                                isActive
                                    ? "text-primary-foreground button-jewel px-8"
                                    : "text-muted-foreground hover:text-foreground hover:bg-white/10 px-5"
                            )}
                        >
                            <Icon className={cn("w-6 h-6 transition-all duration-300", isActive && "scale-110")} />
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
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
