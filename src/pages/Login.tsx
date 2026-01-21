import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, AlertTriangle, Shield, Mail } from 'lucide-react';
import logoIconOnly from '../assets/rentmate-icon-only.png';
import logoIconDark from '../assets/rentmate-icon-only-dark.png';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { cn } from '../lib/utils';

export function Login() {
    const navigate = useNavigate();
    const { t, lang } = useTranslation();
    const { effectiveTheme } = useUserPreferences();
    const isRtl = lang === 'he';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password'>('signin');
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [marketingConsent, setMarketingConsent] = useState(false);

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
            setMessage('Check your email for the password reset link.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'apple' | 'facebook') => {
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
                    redirectTo: `${window.location.origin}/properties`,
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
            // Mock success for dev
            navigate('/dashboard');
            return;
        }

        setLoading(true);
        setError(null);

        if (mode === 'signup' && !agreeToTerms && isSupabaseConfigured) {
            setError(isRtl ? 'עליך להסכים לתנאי השימוש' : 'You must agree to the Terms of Service');
            setLoading(false);
            return;
        }

        if (mode === 'signup' && (!firstName.trim() || !lastName.trim())) {
            setError(isRtl ? 'יש למלא שם פרטי ושם משפחה' : 'First name and last name are required');
            setLoading(false);
            return;
        }

        const passwordRequirements = {
            length: password.length >= 8,
            uppercase: /[A-Z]/.test(password),
            lowercase: /[a-z]/.test(password),
            number: /[0-9]/.test(password),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
        };

        if (mode === 'signup' && !Object.values(passwordRequirements).every(req => req)) {
            setError(isRtl ? 'הסיסמה אינה עומדת בדרישות האבטחה' : 'Password does not meet security requirements');
            setLoading(false);
            return;
        }

        try {
            let authResult;
            if (mode === 'signup') {
                authResult = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: `${firstName.trim()} ${lastName.trim()}`,
                            first_name: firstName.trim(),
                            last_name: lastName.trim(),
                        }
                    }
                });

                if (authResult.data.user && !authResult.data.session) {
                    setAwaitingConfirmation(true);
                    setLoading(false);
                    return;
                }

            } else {
                authResult = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
            }

            if (authResult.error) throw authResult.error;

            const user = authResult.data.user;
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'admin') {
                    navigate('/admin');
                    return;
                }
            }

            navigate('/dashboard');

        } catch (err: any) {
            console.error("Auth Error:", err);
            if (err.message === "Invalid login credentials") {
                setError("Invalid email or password.");
            } else if (err.message === "Email not confirmed") {
                setError("Please verify your email before logging in.");
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    if (awaitingConfirmation) {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a] ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="w-full max-w-md p-8 relative z-10">
                    <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 shadow-2xl rounded-3xl p-8 text-center space-y-6">
                        <div className="w-20 h-20 bg-gray-50 dark:bg-neutral-800 text-black dark:text-white rounded-full flex items-center justify-center mx-auto">
                            <Mail className="w-10 h-10" />
                        </div>
                        <div className="space-y-2">
                            <h2 className="text-2xl font-bold text-black dark:text-white">{t('auth_check_inbox')}</h2>
                            <p className="text-gray-500 dark:text-gray-400">
                                {t('auth_confirmation_sent').replace('{email}', email)}
                            </p>
                        </div>
                        <button
                            onClick={() => setAwaitingConfirmation(false)}
                            className="no-dark-fix w-full py-4 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all"
                        >
                            {mode === 'signin' ? t('login') : t('lp_nav_about')}
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    if (mode === 'forgot-password') {
        return (
            <div className={`min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a] ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                {/* Language Toggle - Left Side */}
                <div className="absolute top-8 left-8 z-50">
                    <LanguageToggle />
                </div>
                {/* Theme Toggle - Right Side */}
                <div className="absolute top-8 right-8 z-50">
                    <ThemeToggle />
                </div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md p-8 relative z-10">
                    <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 shadow-2xl rounded-3xl p-8 space-y-8">
                        <div className="text-center space-y-2">
                            <h2 className="text-2xl font-bold text-black dark:text-white">{t('auth_forgot_password')}</h2>
                            <p className="text-gray-500 dark:text-gray-400 text-sm">Enter your email to receive a reset link</p>
                        </div>

                        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm border border-red-100 dark:border-red-900/40 text-center">{error}</div>}
                        {message && <div className="bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 p-4 rounded-2xl text-sm border border-green-100 dark:border-green-900/40 text-center">{message}</div>}

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
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Send Reset Link'}
                            </button>
                        </form>
                        <button onClick={() => { setMode('signin'); setError(null); setMessage(null); }} className="w-full text-sm text-gray-500 dark:text-gray-400 hover:text-black dark:hover:text-white font-medium transition-colors">
                            {isRtl ? '← חזרה להתחברות' : '← Back to Sign In'}
                        </button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className={`min-h-screen flex flex-col items-center justify-center bg-white dark:bg-[#0a0a0a] ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            {/* Back Button - Top Left */}
            <button
                onClick={() => navigate('/')}
                className="absolute top-8 left-8 z-50 p-2 rounded-full bg-gray-100 dark:bg-neutral-900 hover:bg-gray-200 dark:hover:bg-neutral-800 transition-all"
                title={isRtl ? 'חזרה לדף הבית' : 'Back to home'}
            >
                <ArrowRight className={cn("w-5 h-5 text-gray-600 dark:text-gray-400", !isRtl && "rotate-180")} />
            </button>
            {/* Language Toggle - Left Side */}
            <div className="absolute top-8 left-20 z-50">
                <LanguageToggle />
            </div>
            {/* Theme Toggle - Right Side */}
            <div className="absolute top-8 right-8 z-50">
                <ThemeToggle />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 relative z-10"
            >
                {/* Content Card */}
                <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 shadow-2xl rounded-[2.5rem] p-8 md:p-12 space-y-10">
                    <div className="text-center space-y-6">
                        <img
                            src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly}
                            alt="RentMate"
                            className="h-16 md:h-20 w-auto mx-auto object-contain"
                        />
                        <div className="space-y-2">
                            <motion.h2
                                key={mode}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                className="text-3xl font-bold text-black dark:text-white"
                            >
                                {mode === 'signin' ? t('auth_welcome_back') : t('auth_join')}
                            </motion.h2>

                            {!isSupabaseConfigured && (
                                <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-900/40 rounded-2xl flex items-center gap-3 text-left">
                                    <AlertTriangle className="w-5 h-5 text-amber-600" />
                                    <div>
                                        <h3 className="text-sm font-bold text-amber-900 dark:text-amber-400">Demo Mode</h3>
                                        <p className="text-xs text-amber-800 dark:text-amber-500">Authentication is simulated.</p>
                                    </div>
                                </div>
                            )}
                            {isSupabaseConfigured && (
                                <p className="text-gray-500 dark:text-gray-400 font-medium">
                                    {isRtl ? 'ניהול נכסים חכם' : 'Smart Property Management'}
                                </p>
                            )}
                        </div>
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-center text-sm font-medium border border-red-100 dark:border-red-900/40"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form className="space-y-6" onSubmit={handleAuth}>
                        <div className="space-y-5">
                            {/* Name fields - only for signup */}
                            {mode === 'signup' && isSupabaseConfigured && (
                                <div className="grid grid-cols-2 gap-3">
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block ml-1">
                                            {isRtl ? 'שם פרטי' : 'First Name'}
                                        </label>
                                        <input
                                            name="firstName"
                                            type="text"
                                            required
                                            value={firstName}
                                            onChange={(e) => setFirstName(e.target.value)}
                                            className="block w-full px-4 py-4 bg-gray-50 dark:bg-neutral-800 text-black dark:text-white border-transparent focus:bg-white dark:focus:bg-neutral-700 focus:border-black dark:focus:border-white rounded-2xl outline-none transition-all"
                                            placeholder={isRtl ? 'יוסי' : 'John'}
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block ml-1">
                                            {isRtl ? 'שם משפחה' : 'Last Name'}
                                        </label>
                                        <input
                                            name="lastName"
                                            type="text"
                                            required
                                            value={lastName}
                                            onChange={(e) => setLastName(e.target.value)}
                                            className="block w-full px-4 py-4 bg-gray-50 dark:bg-neutral-800 text-black dark:text-white border-transparent focus:bg-white dark:focus:bg-neutral-700 focus:border-black dark:focus:border-white rounded-2xl outline-none transition-all"
                                            placeholder={isRtl ? 'כהן' : 'Doe'}
                                        />
                                    </div>
                                </div>
                            )}

                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block ml-1">{t('auth_email')}</label>
                                <input
                                    name="email"
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
                                    {mode === 'signin' && isSupabaseConfigured && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot-password')}
                                            className="text-xs font-medium text-black dark:text-white hover:underline transition-colors"
                                        >
                                            {t('auth_forgot_password')}
                                        </button>
                                    )}
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required={isSupabaseConfigured}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="block w-full px-4 py-4 bg-gray-50 dark:bg-neutral-800 text-black dark:text-white border-transparent focus:bg-white dark:focus:bg-neutral-700 focus:border-black dark:focus:border-white rounded-2xl outline-none transition-all"
                                    placeholder="••••••••"
                                />

                                {mode === 'signup' && (
                                    <div className="mt-4 p-4 bg-gray-50/50 dark:bg-neutral-800/50 rounded-2xl border border-gray-100 dark:border-neutral-800 space-y-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('passwordStrength')}</span>
                                            <span className={cn(
                                                "text-[10px] font-bold uppercase tracking-widest",
                                                Object.values({
                                                    length: password.length >= 8,
                                                    uppercase: /[A-Z]/.test(password),
                                                    lowercase: /[a-z]/.test(password),
                                                    number: /[0-9]/.test(password),
                                                    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
                                                }).filter(Boolean).length <= 2 ? "text-red-500" :
                                                    Object.values({
                                                        length: password.length >= 8,
                                                        uppercase: /[A-Z]/.test(password),
                                                        lowercase: /[a-z]/.test(password),
                                                        number: /[0-9]/.test(password),
                                                        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
                                                    }).filter(Boolean).length <= 4 ? "text-amber-500" : "text-emerald-500"
                                            )}>
                                                {Object.values({
                                                    length: password.length >= 8,
                                                    uppercase: /[A-Z]/.test(password),
                                                    lowercase: /[a-z]/.test(password),
                                                    number: /[0-9]/.test(password),
                                                    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
                                                }).filter(Boolean).length <= 2 ? t('passwordWeak') :
                                                    Object.values({
                                                        length: password.length >= 8,
                                                        uppercase: /[A-Z]/.test(password),
                                                        lowercase: /[a-z]/.test(password),
                                                        number: /[0-9]/.test(password),
                                                        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
                                                    }).filter(Boolean).length <= 4 ? t('passwordMedium') : t('passwordStrong')}
                                            </span>
                                        </div>

                                        {/* Strength Bar */}
                                        <div className="h-1.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden flex gap-1">
                                            {[1, 2, 3, 4, 5].map((step) => {
                                                const metCount = Object.values({
                                                    length: password.length >= 8,
                                                    uppercase: /[A-Z]/.test(password),
                                                    lowercase: /[a-z]/.test(password),
                                                    number: /[0-9]/.test(password),
                                                    special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
                                                }).filter(Boolean).length;

                                                return (
                                                    <div
                                                        key={step}
                                                        className={cn(
                                                            "h-full flex-1 transition-all duration-500",
                                                            step <= metCount
                                                                ? metCount <= 2 ? "bg-red-500"
                                                                    : metCount <= 4 ? "bg-amber-500"
                                                                        : "bg-emerald-500"
                                                                : "bg-transparent"
                                                        )}
                                                    />
                                                );
                                            })}
                                        </div>

                                        <div className="grid grid-cols-1 gap-2 pt-2">
                                            {[
                                                { key: 'length', label: t('passwordRequirementLength'), met: password.length >= 8 },
                                                { key: 'upper', label: t('passwordRequirementUppercase'), met: /[A-Z]/.test(password) },
                                                { key: 'lower', label: t('passwordRequirementLowercase'), met: /[a-z]/.test(password) },
                                                { key: 'number', label: t('passwordRequirementNumber'), met: /[0-9]/.test(password) },
                                                { key: 'special', label: t('passwordRequirementSpecial'), met: /[!@#$%^&*(),.?":{}|<>]/.test(password) },
                                            ].map((req) => (
                                                <div key={req.key} className="flex items-center gap-2">
                                                    <div className={cn(
                                                        "w-1.5 h-1.5 rounded-full transition-all shrink-0",
                                                        req.met ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-gray-200 dark:bg-neutral-700"
                                                    )} />
                                                    <span className={cn(
                                                        "text-[10px] font-bold uppercase tracking-wider transition-colors",
                                                        req.met ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-600"
                                                    )}>
                                                        {req.label}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Fixed height container for checkboxes to prevent layout shift */}
                        <div className="min-h-[120px]">
                            {mode === 'signup' && isSupabaseConfigured && (
                                <div className={`space-y-3 ${isRtl ? 'text-right' : 'text-left'}`}>
                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={agreeToTerms}
                                            onChange={(e) => setAgreeToTerms(e.target.checked)}
                                            className="mt-1 w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-gray-400 focus:ring-gray-500 dark:focus:ring-gray-500 transition-all cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed group-hover:text-black dark:group-hover:text-white transition-colors">
                                            {t('agreeToTerms').split('{terms}').map((part: string, i: number) => {
                                                if (i === 1) {
                                                    const [p1, p2] = part.split('{privacy}');
                                                    return (
                                                        <React.Fragment key={i}>
                                                            <a href="/legal/terms" className="text-black dark:text-white hover:underline font-bold" target="_blank" onClick={(e) => e.stopPropagation()}>{t('termsOfService')}</a>
                                                            {p1}
                                                            <a href="/legal/privacy" className="text-black dark:text-white hover:underline font-bold" target="_blank" onClick={(e) => e.stopPropagation()}>{t('privacyPolicy')}</a>
                                                            {p2}
                                                        </React.Fragment>
                                                    );
                                                }
                                                return part;
                                            })}
                                        </span>
                                    </label>

                                    <label className="flex items-start gap-3 cursor-pointer group">
                                        <input
                                            type="checkbox"
                                            checked={marketingConsent}
                                            onChange={(e) => setMarketingConsent(e.target.checked)}
                                            className="mt-0.5 w-4 h-4 rounded border-gray-300 dark:border-neutral-600 text-gray-600 dark:text-gray-400 focus:ring-gray-500 dark:focus:ring-gray-500 transition-all cursor-pointer"
                                        />
                                        <span className="text-xs text-gray-500 dark:text-gray-400 font-medium leading-relaxed group-hover:text-black dark:group-hover:text-white transition-colors">
                                            {t('marketingConsent')}
                                        </span>
                                    </label>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-4 px-4 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-2xl shadow-xl transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-70"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin text-white dark:text-black" />
                            ) : (
                                <div className="flex items-center gap-2">
                                    <span className="text-white dark:text-black">{!isSupabaseConfigured ? (isRtl ? 'כניסה למצב דמו' : 'Enter Demo Mode') : (mode === 'signin' ? t('auth_sign_in') : t('auth_create_account'))}</span>
                                    <ArrowRight className={cn("w-4 h-4 text-white dark:text-black", isRtl && "rotate-180")} />
                                </div>
                            )}
                        </button>
                    </form>

                    {isSupabaseConfigured && (
                        <div className="space-y-6">
                            <div className="relative">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100 dark:border-neutral-800" /></div>
                                <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500"><span className="bg-white dark:bg-neutral-900 px-3">{t('auth_or_continue')}</span></div>
                            </div>

                            <button
                                type="button"
                                onClick={() => handleSocialLogin('google')}
                                disabled={loading}
                                className="w-full flex items-center justify-center gap-3 py-4 bg-white dark:bg-neutral-800 border border-gray-100 dark:border-neutral-800 rounded-2xl hover:bg-gray-50 dark:hover:bg-neutral-700 transition-all shadow-sm disabled:opacity-50"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                <span className="text-sm font-bold text-black dark:text-white">Continue with Google</span>
                            </button>

                            {/* Trust & Security Badge */}
                            <div className="flex items-center justify-center gap-2 opacity-30 grayscale hover:opacity-100 transition-opacity">
                                <Shield className="w-4 h-4 text-black dark:text-white" />
                                <span className="text-[10px] font-bold uppercase tracking-widest text-black dark:text-white">256-bit AES Encryption • SSL Secure</span>
                            </div>
                        </div>
                    )}

                    <div className="text-center pt-2">
                        <button
                            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                            className="text-sm font-bold text-black dark:text-white hover:underline transition-colors"
                        >
                            {mode === 'signin' ? t('auth_no_account') : t('auth_have_account')}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
