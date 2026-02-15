import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, AlertTriangle, Shield, Mail, Lock, Check } from 'lucide-react';
import logoIconOnly from '../assets/rentmate-icon-only.png';
import logoIconDark from '../assets/rentmate-icon-only-dark.png';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { SettingsTray } from '../components/common/SettingsTray';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

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
            // Simulate login delay
            setLoading(true);
            setTimeout(() => {
                navigate('/dashboard');
            }, 800);
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
        <div className={`min-h-screen flex flex-col items-center justify-start sm:justify-center bg-background py-6 sm:py-12 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 rounded-full"
                title={isRtl ? 'חזרה לדף הבית' : 'Back to home'}
            >
                <ArrowRight className={cn("w-5 h-5", !isRtl && "rotate-180")} />
            </Button>

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
                className="w-full max-w-md px-4 sm:p-0 relative z-10"
            >
                <Card className="border-border/50 shadow-2xl bg-window">
                    <CardHeader className="space-y-4 pb-2 text-center">
                        <img
                            src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly}
                            alt="RentMate"
                            className="h-16 h-20 w-auto mx-auto object-contain transition-all mb-4"
                        />
                        <CardTitle className="text-3xl font-black tracking-tight">{t('auth_welcome_back')}</CardTitle>

                        {!isSupabaseConfigured ? (
                            <div className="p-4 bg-amber-500/10 border border-amber-500/20 rounded-xl flex items-center gap-3 text-left mx-auto max-w-sm">
                                <AlertTriangle className="w-5 h-5 text-amber-500 shrink-0" />
                                <div>
                                    <h3 className="text-sm font-bold text-amber-600 dark:text-amber-400">Demo Mode</h3>
                                    <p className="text-xs text-amber-600/80 dark:text-amber-400/80">Authentication is simulated.</p>
                                </div>
                            </div>
                        ) : (
                            <CardDescription className="text-base font-medium">
                                {isRtl ? 'ניהול נכסים חכם' : 'Smart Property Management'}
                            </CardDescription>
                        )}
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6">
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, scale: 0.95 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm border border-destructive/20 text-center font-bold shadow-sm"
                            >
                                {error}
                            </motion.div>
                        )}

                        {isSupabaseConfigured && (
                            <div className="space-y-6">
                                <Button
                                    variant="outline"
                                    onClick={() => handleSocialLogin('google')}
                                    disabled={loading}
                                    className="w-full h-12 text-sm font-bold gap-3"
                                >
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                    <span>{isRtl ? 'המשך עם Google' : 'Continue with Google'}</span>
                                </Button>

                                <div className="relative">
                                    <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-border" /></div>
                                    <div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground"><span className="bg-window px-3">{t('auth_or_continue')}</span></div>
                                </div>
                            </div>
                        )}

                        <form className="space-y-4" onSubmit={handleAuth}>
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block ml-1">{t('auth_email')}</label>
                                <Input
                                    type="email"
                                    required={isSupabaseConfigured}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="demo@rentmate.com"
                                    className="h-12 bg-background/50"
                                    leftIcon={<Mail className="w-4 h-4 text-muted-foreground" />}
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center px-1">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block">{t('auth_password')}</label>
                                    <Link to="/forgot-password" className="text-xs font-bold text-primary hover:text-primary/80 transition-colors">
                                        {t('auth_forgot_password')}
                                    </Link>
                                </div>
                                <Input
                                    type="password"
                                    required={isSupabaseConfigured}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    placeholder="••••••••"
                                    className="h-12 bg-background/50"
                                    leftIcon={<Lock className="w-4 h-4 text-muted-foreground" />}
                                />
                            </div>

                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20"
                                size="lg"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span>{!isSupabaseConfigured ? (isRtl ? 'כניסה למצב דמו' : 'Enter Demo Mode') : t('auth_sign_in')}</span>
                                        <ArrowRight className={cn("w-4 h-4", isRtl && "rotate-180")} />
                                    </div>
                                )}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="flex flex-col gap-6 pb-8">
                        {isSupabaseConfigured && (
                            <div className="flex items-center justify-center gap-2 opacity-50 grayscale hover:opacity-100 transition-opacity">
                                <Shield className="w-4 h-4" />
                                <span className="text-[10px] font-bold uppercase tracking-widest">256-bit AES Encryption • SSL Secure</span>
                            </div>
                        )}

                        <div className="text-center">
                            <span className="text-muted-foreground text-sm font-medium mr-2">{t('auth_no_account')}</span>
                            <Link to={`/signup${plan ? `?plan=${plan}` : ''}`} className="text-primary font-black hover:underline underline-offset-4 text-sm">
                                {t('auth_sign_up')}
                            </Link>
                        </div>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
