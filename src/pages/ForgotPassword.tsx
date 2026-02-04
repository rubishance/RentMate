import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight } from 'lucide-react';
import logoIconOnly from '../assets/rentmate-icon-only.png';
import logoIconDark from '../assets/rentmate-icon-only-dark.png';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { SettingsTray } from '../components/common/SettingsTray';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { cn } from '../lib/utils';

export function ForgotPassword() {
    const navigate = useNavigate();
    const { t, lang } = useTranslation();
    const { effectiveTheme } = useUserPreferences();
    const isRtl = lang === 'he';

    const [email, setEmail] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);

    const handlePasswordReset = async (e: React.FormEvent) => {
        if (!isSupabaseConfigured) {
            setError('Cannot reset password without Supabase configuration.');
            return;
        }
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setMessage(isRtl ? 'בדוק את האימייל שלך לקבלת קישור לאיפוס הסיסמה.' : 'Check your email for the password reset link.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col items-center justify-start sm:justify-center bg-white dark:bg-[#0a0a0a] py-6 sm:py-12 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <button
                onClick={() => navigate('/login')}
                className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 p-2 rounded-full bg-gray-100 dark:bg-neutral-900 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-all"
                title={isRtl ? 'חזרה להתחברות' : 'Back to login'}
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
                        <img src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly} alt="RentMate" className="h-16 sm:h-20 w-auto mx-auto object-contain" />
                        <div className="space-y-1">
                            <h2 className="text-2xl font-bold text-black dark:text-white">{t('auth_forgot_password')}</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                                {isRtl ? 'הזן את המייל שלך כדי לקבל קישור לאיפוס' : 'Enter your email to receive a reset link'}
                            </p>
                        </div>
                    </div>

                    {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm border border-red-100 dark:border-red-900/40 text-center font-medium">{error}</div>}
                    {message && <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-2xl text-sm border border-green-100 dark:border-green-900/40 text-center font-medium">{message}</div>}

                    <form onSubmit={handlePasswordReset} className="space-y-6">
                        <div className="space-y-2">
                            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block ml-1">{t('auth_email')}</label>
                            <input
                                type="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="block w-full px-4 py-4 bg-gray-50 dark:bg-neutral-800 border-transparent focus:bg-white dark:focus:bg-neutral-700 focus:border-black dark:focus:border-white text-black dark:text-white rounded-2xl outline-none transition-all"
                                placeholder="name@example.com"
                            />
                        </div>
                        <button
                            type="submit"
                            disabled={loading}
                            className="no-dark-fix w-full py-4 px-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl shadow-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all disabled:opacity-70"
                        >
                            {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto text-white dark:text-black" /> : (isRtl ? 'שלח קישור לאיפוס' : 'Send Reset Link')}
                        </button>
                    </form>

                    <div className="text-center pt-2">
                        <Link to="/login" className="text-black dark:text-white font-black hover:underline underline-offset-4">
                            {isRtl ? '← חזרה להתחברות' : '← Back to Sign In'}
                        </Link>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
