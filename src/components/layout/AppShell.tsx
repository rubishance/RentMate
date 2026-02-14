import { Suspense, useState, useEffect } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { CookieConsent } from '../legal/CookieConsent';
import { supabase } from '../../lib/supabase';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useNotificationScheduler } from '../../hooks/useNotificationScheduler';
import { SystemBroadcast } from '../common/SystemBroadcast';
import { StreamHeader } from './StreamHeader';
import { BottomDock } from './BottomDock';
import { Sidebar } from './Sidebar';
import { useStack } from '../../contexts/StackContext';
import { useActivityTracking } from '../../hooks/useActivityTracking';
import { useAuth } from '../../contexts/AuthContext';
import { cn } from '../../lib/utils';

export function AppShell() {
    useActivityTracking();
    const location = useLocation();
    const navigate = useNavigate();
    const { preferences } = useUserPreferences();
    const [isMaintenance, setIsMaintenance] = useState(false);
    const { activeLayer } = useStack();
    const { profile: authProfile } = useAuth();

    // Distraction-free mode for wizards
    const isWizard =
        location.pathname.includes('/new') ||
        location.pathname.includes('/add') ||
        location.pathname.includes('/create') ||
        location.pathname.includes('/wizard') ||
        location.pathname.includes('/setup') ||
        location.pathname.includes('/onboarding') ||
        activeLayer?.type === 'wizard';

    useEffect(() => {
        const checkSystemStatus = async () => {
            const { data: settings } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', ['maintenance_mode']);

            const maintMode = settings?.find(s => s.key === 'maintenance_mode')?.value;

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

    // Initial automated checks
    useNotificationScheduler();

    return (
        <div className="min-h-screen bg-background font-sans relative flex">
            {/* Desktop Sidebar (Left) */}
            {!isWizard && <Sidebar />}

            {/* Main Content Area */}
            <div className={cn("flex-1 flex flex-col min-h-screen relative transition-all duration-300", !isWizard && "md:pl-64")}>

                {/* Mobile Header (Hidden on Desktop usually, but we keep StreamHeader for now as top bar) */}
                {/* We adjust StreamHeader to be positioned correctly on desktop if we keep it, or hide it */}
                <div className="md:hidden">
                    <StreamHeader title={activeLayer?.title} hideControls={isWizard} />
                </div>

                {/* Desktop Top Bar (Optional, if we want one. For now Sidebar handles Nav. Content handles Title) */}
                {/* If StreamHeader is used on Desktop, it needs to offset left-64. currently it's fixed left-0 */}
                {/* Let's keep StreamHeader for Mobile ONLY for now, and let Dashboard have its own header or use a simple Desktop Header if needed. */}
                {/* Actually, existing pages might rely on the spacer `pt-16` from StreamHeader. */}

                <div className={cn("flex-1 flex flex-col relative", !isWizard && "pt-16 md:pt-0")}>
                    <div className="relative z-50">
                        <SystemBroadcast />
                    </div>

                    <a
                        href="#main-content"
                        className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-64 z-[999] px-4 py-2 bg-primary text-primary-foreground rounded-md shadow-lg"
                    >
                        {preferences.language === 'he' ? 'דלג לתוכן המרכזי' : 'Skip to main content'}
                    </a>

                    <main
                        id="main-content"
                        className="flex-1 overflow-y-auto overflow-x-hidden p-4 md:p-8 scroll-smooth relative z-10"
                    >
                        <div className="max-w-7xl mx-auto w-full">
                            <Outlet key={location.pathname} />
                        </div>
                    </main>
                </div>
            </div>

            {/* Cookie Consent */}
            <CookieConsent />

            {/* Mobile Bottom Dock */}
            {!isWizard && !activeLayer && (
                <div className="md:hidden">
                    <BottomDock />
                </div>
            )}
        </div>
    );
}
