import { useEffect, useState } from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { supabase } from '../../lib/supabase';

const AuthGuard = () => {
    const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);

    useEffect(() => {
        let mounted = true;

        const checkAuth = async () => {
            try {
                // 1. Initial Session Check with refresh
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error('Session error:', sessionError);
                    if (mounted) setIsAuthenticated(false);
                    return;
                }

                if (session) {
                    await verifyProfile(session.user.id, mounted);
                    return;
                }

                // 2. Setup Listener for Auth Changes (Login, OAuth Redirects)
                const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, session) => {
                    if (session) {
                        await verifyProfile(session.user.id, mounted);
                    } else {
                        // If no session, check if we are in the middle of an OAuth flow
                        if (isOAuthCallback()) {
                            // Let Supabase process the code/token.
                            // If it fails or takes too long, the timeout below will eventually catch it
                            // (or the user will remain on the loading spinner until they refresh/timeout).
                        } else {
                            if (mounted) setIsAuthenticated(false);
                        }
                    }
                });

                // 3. Fallback Timeout for OAuth hanging
                if (isOAuthCallback()) {
                    setTimeout(() => {
                        if (mounted && isAuthenticated === null) {
                            setIsAuthenticated(false);
                        }
                    }, 10000); // 10s timeout
                } else if (!session) {
                    if (mounted) setIsAuthenticated(false);
                }

                return () => subscription.unsubscribe();
            } catch (error) {
                console.error('Auth check error:', error);
                if (mounted) setIsAuthenticated(false);
            }
        };

        checkAuth();

        return () => { mounted = false; };
    }, []);

    const isOAuthCallback = () => {
        return window.location.search.includes('code=') || window.location.hash.includes('access_token');
    };

    const verifyProfile = async (userId: string, mounted: boolean) => {
        try {
            const { data: profile, error } = await supabase
                .from('user_profiles')
                .select('subscription_status')
                .eq('id', userId)
                .single();

            if (!mounted) return;

            if (error || !profile || profile.subscription_status === 'suspended') {
                await supabase.auth.signOut();
                setIsAuthenticated(false);
            } else {
                setIsAuthenticated(true);
            }
        } catch (err) {
            if (mounted) setIsAuthenticated(false);
        }
    };

    if (isAuthenticated === null) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-brand-600"></div>
            </div>
        );
    }

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />;
    }

    return <Outlet />;
};

export default AuthGuard;
