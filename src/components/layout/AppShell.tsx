import { useState, useEffect } from 'react';
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
import { useStack } from '../../contexts/StackContext';

export function AppShell() {
    const navigate = useNavigate();
    const location = useLocation();
    const { preferences } = useUserPreferences();
    const [direction, setDirection] = useState(0);
    const [isMaintenance, setIsMaintenance] = useState(false);
    const { activeLayer } = useStack(); // Use stack state to update header title if needed

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
        return null;
    }

    // Determine swipe direction for animation logic (simplified for now as nav logic is in BottomDock)
    const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
        // Swipe logic can be re-enabled here if we want gesture navigation between tabs
        // For now, relying on BottomDock
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
            {/* New Stream Header */}
            <StreamHeader title={activeLayer?.title} />

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

            {/* New Bottom Dock */}
            <BottomDock />
        </div>
    );
}
