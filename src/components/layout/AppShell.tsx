import { Suspense, useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { CookieConsent } from '../legal/CookieConsent';
import type { PanInfo } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useNotificationScheduler } from '../../hooks/useNotificationScheduler';
import { SystemBroadcast } from '../common/SystemBroadcast';
import { StreamHeader } from './StreamHeader';
import { BottomDock } from './BottomDock';
import { FloatingContactButton } from './FloatingContactButton';
import { GlobalActionFab } from './GlobalActionFab';
import { useStack } from '../../contexts/StackContext';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { useAuth } from '../../contexts/AuthContext';

export function AppShell() {
    useActivityTracking(); // Start tracking
    const location = useLocation();
    const navigate = useNavigate();
    const { preferences } = useUserPreferences();
    const { language: lang } = preferences; // Match 'lang' usage in fallback
    const [isMaintenance, setIsMaintenance] = useState(false);
    const { activeLayer } = useStack();
    const { profile: authProfile } = useAuth();

    useEffect(() => {
        const timestamp = new Date().toISOString();
        console.log(`[AppShell] [${timestamp}] Navigation to: ${location.pathname}`);
        if (window.location.pathname !== location.pathname) {
            console.error(`[AppShell] Router/Browser Mismatch: Router=${location.pathname}, Browser=${window.location.pathname}`);
        }
    }, [location.pathname]);

    // GLOBAL CLICK LOGGER
    useEffect(() => {
        const handleGlobalClick = (e: MouseEvent) => {
            const target = e.target as HTMLElement;
            console.log(`[AppShell] [CLICK] Tag: ${target.tagName}, ID: ${target.id}, Class: ${target.className.substring(0, 50)}`);
        };
        window.addEventListener('click', handleGlobalClick);
        return () => window.removeEventListener('click', handleGlobalClick);
    }, []);

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

            // 2. Check Permissions via AuthContext profile
            if (maintMode === true) {
                if (!authProfile || (authProfile.role !== 'admin' && !authProfile.is_super_admin)) {
                    setIsMaintenance(true);
                }
            }
        };
        checkSystemStatus();
    }, [authProfile]);

    useEffect(() => {
        if (isMaintenance) {
            navigate('/system-maintenance', { replace: true });
        }
    }, [isMaintenance, navigate]);

    // Simplified navigation
    const onDragEnd = undefined;

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
        <div className="min-h-screen bg-background font-sans selection:bg-primary/10 relative">
            {/* Ambient Depth Layer */}
            <div className="ambient-depth" />

            {/* New Stream Header */}
            <StreamHeader title={activeLayer?.title} />

            <div className="pt-16 min-h-screen flex flex-col relative overflow-hidden">
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

                <main
                    id="main-content"
                    className="flex-1 overflow-y-auto overflow-x-hidden pb-40 scroll-smooth relative z-10"
                >
                    {/* Debug Indicator (Always visible for deconstruction) */}
                    <div className="fixed top-0 right-0 bg-indigo-600 text-white text-[10px] font-black px-3 py-2 z-[9999] opacity-100 shadow-2xl border-b border-l border-white animate-pulse">
                        V1.4.14-STABLE | {new Date().toLocaleTimeString()}
                    </div>

                    <div className="min-h-full px-3 md:px-10 max-w-7xl mx-auto">
                        <Outlet key={location.pathname} />
                    </div>
                </main>
            </div>

            {/* Cookie Consent */}
            <CookieConsent />

            {/* New Bottom Dock */}
            <BottomDock />

            {/* Global Actions FAB */}
            <GlobalActionFab />

            {/* Global Quick Contact FAB */}
            <FloatingContactButton />
        </div>
    );
}
