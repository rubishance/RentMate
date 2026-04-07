import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useAuth } from '../../contexts/AuthContext';
import { useSubscription } from '../../hooks/useSubscription';
import { supabase } from '../../lib/supabase';
import {
    LayoutDashboard,
    Building2,
    FileText,
    FileStack,
    Wallet,
    Calculator,
    ShieldCheck,
    LogOut,
    Settings,
    Users,
    Crown,
    Star
} from 'lucide-react';
import logoIconOnly from '../../assets/rentmate-icon-only.png';

export function Sidebar() {
    const { preferences } = useUserPreferences();
    const { profile } = useAuth();
    const { plan, loading } = useSubscription();

    const isPro = plan && plan.id !== 'free' && plan.id !== 'solo';

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    // Simple translation map for Sidebar
    const t = {
        he: {
            dashboard: 'לוח בקרה',
            leads: 'מתעניינים',
            properties: 'נכסים',
            documents: 'תיק דיגיטלי',
            contracts: 'חוזים',
            payments: 'תשלומים',
            tools: 'מחשבון',
            admin: 'ניהול',
            settings: 'הגדרות',
            logout: 'התנתק'
        },
        en: {
            dashboard: 'Dashboard',
            leads: 'Leads',
            properties: 'Properties',
            documents: 'Digital Portfolio',
            contracts: 'Contracts',
            payments: 'Payments',
            tools: 'Calculator',
            admin: 'Admin',
            settings: 'Settings',
            logout: 'Logout'
        }
    };

    const lang = preferences.language === 'he' ? 'he' : 'en';
    const labels = t[lang];

    const navItems = [
        { path: '/dashboard', label: labels.dashboard, icon: LayoutDashboard },
        { path: '/properties', label: labels.properties, icon: Building2 },
        { path: '/documents', label: labels.documents, icon: FileStack },
        { path: '/payments', label: labels.payments, icon: Wallet },
        { path: '/calculator', label: labels.tools, icon: Calculator },
    ];

    if (profile?.role === 'admin' || profile?.is_super_admin) {
        navItems.push({ path: '/admin', label: labels.admin, icon: ShieldCheck });
    }

    return (
        <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-50 bg-card border-r border-border shadow-sm">
            {/* Logo Section */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <div className="flex items-center gap-2 sm:gap-4">
                    <img src={logoIconOnly} alt="RentMate" className="w-8 h-8 rounded-lg" />
                    <span className="font-heading text-xl font-bold tracking-tight text-primary">RentMate</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-2 sm:px-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center gap-2 sm:gap-4 px-2 sm:px-4 py-2.5 rounded-lg text-base font-medium transition-colors",
                            isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-secondary/50 hover:text-foreground"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile & Actions */}
            <div className="p-4 border-t border-border/50 bg-secondary/20">
                <div className="flex flex-col gap-1">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => cn(
                            "flex items-center justify-start gap-2 sm:gap-4 px-2 sm:px-4 py-2 rounded-lg text-base font-medium transition-colors w-full",
                            isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-muted/50 dark:hover:bg-secondary/50 hover:text-foreground"
                        )}
                    >
                        <div className="w-10 flex justify-center shrink-0">
                            <Settings className="w-5 h-5" />
                        </div>
                        <span className="truncate">{labels.settings}</span>
                    </NavLink>

                    <button
                        onClick={handleSignOut}
                        className="flex items-center justify-start gap-2 sm:gap-4 px-2 sm:px-4 py-2 rounded-lg text-base font-medium text-destructive hover:bg-destructive/10 transition-colors w-full"
                    >
                        <div className="w-10 flex justify-center shrink-0">
                            <LogOut className="w-5 h-5" />
                        </div>
                        <span className="truncate">{labels.logout}</span>
                    </button>
                </div>

                <div className="mt-4 px-2 sm:px-4 flex items-center justify-start gap-2 sm:gap-4 w-full">
                    <div className="w-10 h-10 shrink-0 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                        {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0 flex flex-col items-start justify-center">
                        {!loading && plan && (
                            <span className={cn(
                                "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-bold uppercase tracking-wider mb-1",
                                isPro 
                                    ? "bg-yellow-500/10 text-yellow-600 dark:text-yellow-500"
                                    : "bg-primary/10 text-primary dark:text-primary-foreground"
                            )}>
                                {isPro ? <Crown className="w-3 h-3" /> : <Star className="w-3 h-3" />}
                                {plan.id === 'free' || plan.id === 'solo' ? 'Free' : plan.name}
                            </span>
                        )}
                        <p className="text-sm font-bold text-foreground text-start truncate leading-none mb-1 w-full">
                            {profile?.full_name || (lang === 'he' ? 'משתמש' : 'User')}
                        </p>
                        <p className="text-xs text-muted-foreground text-start truncate leading-none w-full">
                            {profile?.email}
                        </p>
                    </div>
                </div>
            </div>
        </aside>
    );
}
