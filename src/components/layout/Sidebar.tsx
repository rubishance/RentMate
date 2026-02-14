import { NavLink } from 'react-router-dom';
import { cn } from '../../lib/utils';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useAuth } from '../../contexts/AuthContext';
import { supabase } from '../../lib/supabase';
import {
    LayoutDashboard,
    Building2,
    FileText,
    Wallet,
    Wrench,
    ShieldCheck,
    LogOut,
    Settings
} from 'lucide-react';
import logoIconOnly from '../../assets/rentmate-icon-only.png';

export function Sidebar() {
    const { preferences } = useUserPreferences();
    const { profile } = useAuth();

    const handleSignOut = async () => {
        await supabase.auth.signOut();
    };

    // Simple translation map for Sidebar
    const t = {
        he: {
            dashboard: 'לוח בקרה',
            properties: 'נכסים',
            contracts: 'חוזים',
            payments: 'תשלומים',
            tools: 'כלים',
            admin: 'ניהול',
            settings: 'הגדרות',
            logout: 'התנתק'
        },
        en: {
            dashboard: 'Dashboard',
            properties: 'Properties',
            contracts: 'Contracts',
            payments: 'Payments',
            tools: 'Tools',
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
        { path: '/contracts', label: labels.contracts, icon: FileText },
        { path: '/payments', label: labels.payments, icon: Wallet },
        { path: '/tools', label: labels.tools, icon: Wrench },
    ];

    if (profile?.role === 'admin' || profile?.is_super_admin) {
        navItems.push({ path: '/admin', label: labels.admin, icon: ShieldCheck });
    }

    return (
        <aside className="hidden md:flex flex-col w-64 fixed inset-y-0 left-0 z-50 bg-card border-r border-border shadow-sm">
            {/* Logo Section */}
            <div className="h-16 flex items-center px-6 border-b border-border/50">
                <div className="flex items-center gap-3">
                    <img src={logoIconOnly} alt="RentMate" className="w-8 h-8 rounded-md" />
                    <span className="font-heading text-xl font-bold tracking-tight text-primary">RentMate</span>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors",
                            isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                        )}
                    >
                        <item.icon className="w-5 h-5" />
                        {item.label}
                    </NavLink>
                ))}
            </nav>

            {/* User Profile & Actions */}
            <div className="p-4 border-t border-border/50 bg-slate-50/50 dark:bg-slate-900/50">
                <div className="flex flex-col gap-2">
                    <NavLink
                        to="/settings"
                        className={({ isActive }) => cn(
                            "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors",
                            isActive
                                ? "bg-primary/10 text-primary"
                                : "text-muted-foreground hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-foreground"
                        )}
                    >
                        <Settings className="w-4 h-4" />
                        {labels.settings}
                    </NavLink>

                    <button
                        onClick={handleSignOut}
                        className="flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium text-destructive hover:bg-destructive/10 transition-colors w-full text-left"
                    >
                        <LogOut className="w-4 h-4" />
                        {labels.logout}
                    </button>

                    <div className="mt-4 px-3 flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xs">
                            {profile?.full_name?.charAt(0) || profile?.email?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{profile?.full_name || 'User'}</p>
                            <p className="text-xs text-muted-foreground truncate">{profile?.email}</p>
                        </div>
                    </div>
                </div>
            </div>
        </aside>
    );
}
