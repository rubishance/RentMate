import { useNavigate, useLocation, Link } from 'react-router-dom';
import { HomeIcon, AssetsIcon, ContractsIcon, PaymentsIcon, ToolsIcon, AdminIcon, DocumentsIcon } from '../icons/NavIcons';
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
        '/contracts': 'חוזים',
        '/documents': 'מסמכים',
        '/payments': 'תשלומים',
        '/calculator': 'מחשבון',
        '/admin': 'ניהול'
    },
    en: {
        '/dashboard': 'Home',
        '/properties': 'Assets',
        '/contracts': 'Contracts',
        '/documents': 'Documents',
        '/payments': 'Wallet',
        '/calculator': 'Calculator',
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
        { path: '/documents', label: labels['/documents'], icon: DocumentsIcon },
        { path: '/payments', label: labels['/payments'], icon: PaymentsIcon },
        { path: '/calculator', label: labels['/calculator'], icon: ToolsIcon },
        ...(isAdmin ? [{ path: '/admin', label: labels['/admin'], icon: AdminIcon }] : []),
    ];

    return (
        <div className="fixed bottom-0 left-0 right-0 z-[50] pointer-events-none w-full">
            <nav
                className="bg-card dark:glass-premium shadow-[0_-8px_30px_rgb(0,0,0,0.12)] dark:shadow-[0_-8px_30px_rgb(0,0,0,0.5)] rounded-t-3xl rounded-b-none flex justify-between items-center px-4 pt-3 pb-[max(env(safe-area-inset-bottom),0.75rem)] pointer-events-auto border-t border-border/20 dark:border-border/10 w-full"
                role="navigation"
                aria-label="Bottom Dock"
            >
                {navItems.map((item) => {
                    const isActive = item.path === '/dashboard'
                        ? location.pathname === item.path
                        : location.pathname.startsWith(item.path);

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
                                if (item.path === '/calculator') prefetchRoutes.settings();
                                if (item.path === '/admin') prefetchRoutes.adminDashboard();
                            }}
                            aria-label={item.label}
                            aria-current={isActive ? 'page' : undefined}
                            className="relative flex flex-col items-center gap-2 min-w-[60px] transition-all duration-300 group"
                        >
                            <div className={cn(
                                "flex items-center justify-center w-[3rem] h-[3rem] rounded-[1.5rem] transition-colors duration-300",
                                isActive 
                                    ? "bg-secondary/15 dark:bg-white/10 text-foreground" 
                                    : "text-muted-foreground group-hover:bg-secondary/5 dark:group-hover:bg-white/5"
                            )}>
                                <Icon className={cn("w-6 h-6 transition-transform duration-300", isActive && "scale-110 stroke-[2.2px]")} />
                            </div>
                            <span
                                className={cn(
                                    "text-[11px] font-bold tracking-tight whitespace-nowrap transition-colors duration-300",
                                    isActive ? "text-foreground" : "text-muted-foreground"
                                )}
                            >
                                {item.label}
                            </span>
                        </Link>
                    );
                })}
            </nav>
        </div>
    );
}
