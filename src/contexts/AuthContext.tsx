import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { User } from '@supabase/supabase-js';

interface UserProfile {
    id: string;
    full_name: string;
    email: string;
    role: string;
    subscription_status: string;
    is_super_admin?: boolean;
}

interface AuthContextType {
    user: User | null;
    profile: UserProfile | null;
    isLoading: boolean;
    isAuthenticated: boolean;
    refreshProfile: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const SESSION_CACHE_KEY = 'rentmate_boot_session';
const PROFILE_CACHE_KEY = 'rentmate_boot_profile';

export function AuthProvider({ children }: { children: ReactNode }) {
    // SYNC INIT: Load from cache immediately to prevent blank screen
    const [user, setUser] = useState<User | null>(() => {
        try {
            const cached = localStorage.getItem(SESSION_CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });
    const [profile, setProfile] = useState<UserProfile | null>(() => {
        try {
            const cached = localStorage.getItem(PROFILE_CACHE_KEY);
            return cached ? JSON.parse(cached) : null;
        } catch { return null; }
    });

    // If we have a cached user, we can allow rendering immediately
    const [isLoading, setIsLoading] = useState(() => {
        return !localStorage.getItem(SESSION_CACHE_KEY);
    });

    const updateCaches = (user: User | null, profile: UserProfile | null) => {
        try {
            if (user) localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(user));
            else localStorage.removeItem(SESSION_CACHE_KEY);

            if (profile) localStorage.setItem(PROFILE_CACHE_KEY, JSON.stringify(profile));
            else localStorage.removeItem(PROFILE_CACHE_KEY);
        } catch (e) { console.error('Cache update failed', e); }
    };

    const fetchProfile = async (userId: string) => {
        try {
            console.log(`[AuthContext] Fetching profile for ${userId}...`);
            // Add a strict 4-second timeout for the profile fetch
            const fetchPromise = supabase
                .from('user_profiles')
                .select('*')
                .eq('id', userId)
                .single();

            const timeoutPromise = new Promise((_, reject) =>
                setTimeout(() => reject(new Error('Profile fetch timeout')), 4000)
            );

            const { data, error } = await Promise.race([fetchPromise, timeoutPromise]) as any;

            if (data) {
                setProfile(data);
                updateCaches(user, data);
            } else if (error) {
                console.warn('[AuthContext] Profile fetch error:', error);
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
        }
    };

    useEffect(() => {
        let mounted = true;
        const mountId = Math.random().toString(36).substring(7);
        console.log(`[AuthProvider] [${mountId}] Mounted`);

        async function initAuth() {
            // Safety: Force loading to false after 6 seconds if init hangs
            const safetyTimeout = setTimeout(() => {
                if (mounted && isLoading) {
                    console.warn(`[AuthProvider] [${mountId}] Safety timeout triggered - forcing loading to false`);
                    setIsLoading(false);
                }
            }, 6000);

            try {
                console.log(`[AuthProvider] [${mountId}] initAuth starting...`);
                const { data: { session }, error: sessionError } = await supabase.auth.getSession();

                if (sessionError) {
                    console.error(`[AuthProvider] [${mountId}] getSession error:`, sessionError);
                }

                if (mounted && session) {
                    setUser(session.user);
                    await fetchProfile(session.user.id);
                } else if (mounted) {
                    setUser(null);
                    setProfile(null);
                    updateCaches(null, null);
                }
            } catch (e: any) {
                console.error(`[AuthProvider] [${mountId}] initAuth failure:`, e);
            } finally {
                clearTimeout(safetyTimeout);
                if (mounted) {
                    console.log(`[AuthProvider] [${mountId}] initAuth done, loading=false`);
                    setIsLoading(false);
                }
            }
        }

        initAuth();

        const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
            console.log(`[AuthContext] onAuthStateChange: ${event}`);
            try {
                if (mounted) {
                    if (session) {
                        setUser(session.user);
                        await fetchProfile(session.user.id);
                    } else {
                        setUser(null);
                        setProfile(null);
                        updateCaches(null, null);
                    }
                }
            } catch (e) {
                console.error('[AuthContext] onAuthStateChange error:', e);
            } finally {
                if (mounted) {
                    setIsLoading(false);
                }
            }
        });

        return () => {
            console.log(`[AuthProvider] [${mountId}] Unmounting`);
            mounted = false;
            subscription.unsubscribe();
        };
    }, []); // STABLE: Only run on mount. onAuthStateChange handles the rest.



    const refreshProfile = async () => {
        if (user) await fetchProfile(user.id);
    };

    return (
        <AuthContext.Provider value={{
            user,
            profile,
            isLoading,
            isAuthenticated: !!user,
            refreshProfile
        }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
}
