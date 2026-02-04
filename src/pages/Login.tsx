import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, AlertTriangle, Shield } from 'lucide-react';
import logoIconOnly from '../assets/rentmate-icon-only.png';
import logoIconDark from '../assets/rentmate-icon-only-dark.png';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { SettingsTray } from '../components/common/SettingsTray';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { cn } from '../lib/utils';

export function Login() {
    const navigate = useNavigate();
    const { t, lang } = useTranslation();
    const { effectiveTheme } = useUserPreferences();
    const [searchParams] = useSearchParams();
    const plan = searchParams.get('plan');
    const isRtl = lang === 'he';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSocialLogin = async (provider: 'google' | 'apple') => {
        if (!isSupabaseConfigured) {
            setError('Social login requires valid Supabase keys.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/dashboard`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSupabaseConfigured) {
            navigate('/dashboard');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { data, error: authError } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (authError) throw authError;

            if (!data.session) {
                setLoading(false);
                return;
            }

            const { data: profile } = await supabase
                .from('user_profiles')
                .select('role')
                .eq('id', data.user.id)
                .single();

            if (profile?.role === 'admin') {
                navigate('/admin');
            } else {
                navigate('/dashboard');
            }

        } catch (err: any) {
            console.error("Auth Error:", err);
            // Translate common errors
            if (err.message === "Invalid login credentials") {
                setError(t('auth_invalid_credentials'));
            } else if (err.message === "Email not confirmed") {
                setError(t('auth_email_not_confirmed'));
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col items-center justify-start sm:justify-center bg-white dark:bg-[#0a0a0a] py-6 sm:py-12 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <button
                onClick={() => navigate('/')}
                className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 p-2 rounded-full bg-gray-100 dark:bg-neutral-900 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-all"
                title={isRtl ? 'חזרה לדף הבית' : 'Back to home'}
            >
                <ArrowRight className={cn("w-5 h-5 text-gray-600 dark:text-gray-400", !isRtl && "rotate-180")} />
            </button>
            <div className="absolute top-4 left-14 sm:top-8 sm:left-20 z-50 hidden sm:block">
                <LanguageToggle />
            </div>
            <div className="absolute top-4 right-4 sm:top-8 sm:right-8 z-50 hidden sm:block">
                <ThemeToggle />
            </div>
            <SettingsTray />

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md px-4 sm:p-8 relative z-10"
            >
                <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 shadow-2xl rounded-3xl sm:rounded-[2.5rem] p-6 sm:p-8 md:p-12 space-y-8 sm:space-y-10">
                    <div className="text-center space-y-4 sm:space-y-6">
                        <img
                            src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly}
                            alt="RentMate"
                            className="h-16 sm:h-20 w-auto mx-auto object-contain transition-all"
                        />
                        <div className="space-y-1">
                            <h2 className="text-3xl font-bold text-black dark:text-white">{t('auth_welcome_back')}</h2>
                            {!isSupabaseConfigured && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center gap-3 text-left my-4">
                                    <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0" />
                                    <div>
                                        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400">Demo Mode</h3>
                                        <p className="text-xs text-amber-800 dark:text-amber-500">Authentication is simulated.</p>
                                    </div>
                                </div>
                            )}
                            {isSupabaseConfigured && (
                                <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">
                                    {isRtl ? 'ניהול נכסים חכם' : 'Smart Property Management'}
                                </p>
                            )}
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm border border-red-100 dark:border-red-900/40 text-center font-bold shadow-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    {isSupabaseConfigured && (
                        <div className="space-y-6">
                            <button
                                onClick={() => handleSocialLogin('google')}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-neutral-700 transition-all shadow-sm disabled:opacity-50"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                <span className="text-sm font-bold text-black dark:text-white">{isRtl ? 'המשך עם Google' : 'Continue with Google'}</span>
                            </button>

                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100 dark:border-neutral-800" /></div>
                                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"><span className="bg-white dark:bg-neutral-900 px-3">{t('auth_or_continue')}</span></div>
                            </div>
                        </div>
                    )}

                    <form className="space-y-6" onSubmit={handleAuth}>
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block ml-1">{t('auth_email')}</label>
                                <input
                                    type="email"
                                    required={isSupabaseConfigured}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full px-4 py-4 bg-gray-50 dark:bg-neutral-800 text-black dark:text-white border-transparent focus:bg-white dark:focus:bg-neutral-700 focus:border-black dark:focus:border-white rounded-2xl outline-none transition-all"
                                    placeholder="demo@rentmate.com"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block">{t('auth_password')}</label>
                                    <Link to="/forgot-password" className="text-xs font-medium text-black dark:text-white hover:underline transition-colors">
                                        {t('auth_forgot_password')}
                                    </Link>
                                </div>
                                <input
                                    type="password"
                                    required={isSupabaseConfigured}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full px-4 py-4 bg-gray-50 dark:bg-neutral-800 text-black dark:text-white border-transparent focus:bg-white dark:focus:bg-neutral-700 focus:border-black dark:focus:border-white rounded-2xl outline-none transition-all"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-4 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-2xl shadow-xl transform transition-all hover:scale-[1.02] disabled:opacity-70"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span>{!isSupabaseConfigured ? (isRtl ? 'כניסה למצב דמו' : 'Enter Demo Mode') : t('auth_sign_in')}</span>
                                    <ArrowRight className={cn("w-4 h-4", isRtl && "rotate-180")} />
                                </div>
                            )}
                        </button>
                    </form>

                    {isSupabaseConfigured && (
                        <div className="flex items-center justify-center gap-2 opacity-30 grayscale hover:opacity-100 transition-opacity">
                            <Shield className="w-4 h-4 text-black dark:text-white" />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">256-bit AES Encryption • SSL Secure</span>
                        </div>
                    )}

                    <div className="text-center pt-2">
                        <Link to={`/signup${plan ? `?plan=${plan}` : ''}`} className="text-black dark:text-white font-black hover:underline underline-offset-4">
                            {t('auth_no_account')}
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
