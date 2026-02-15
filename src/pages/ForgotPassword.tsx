import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate, Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, Mail } from 'lucide-react';
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
        <div className={`min-h-screen flex flex-col items-center justify-start sm:justify-center bg-background py-6 sm:py-12 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/login')}
                className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 rounded-full"
                title={isRtl ? 'חזרה להתחברות' : 'Back to login'}
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
                        <img src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly} alt="RentMate" className="h-16 h-20 w-auto mx-auto object-contain mb-4" />
                        <CardTitle className="text-2xl font-bold tracking-tight">{t('auth_forgot_password')}</CardTitle>
                        <CardDescription className="text-sm font-medium">
                            {isRtl ? 'הזן את המייל שלך כדי לקבל קישור לאיפוס' : 'Enter your email to receive a reset link'}
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6">
                        {error && <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm border border-destructive/20 text-center font-medium">{error}</div>}
                        {message && <div className="bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 p-4 rounded-xl text-sm border border-emerald-500/20 text-center font-medium">{message}</div>}

                        <form onSubmit={handlePasswordReset} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block ml-1">{t('auth_email')}</label>
                                <Input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="name@example.com"
                                    className="h-12 bg-background/50"
                                    leftIcon={<Mail className="w-4 h-4 text-muted-foreground" />}
                                />
                            </div>
                            <Button
                                type="submit"
                                disabled={loading}
                                className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20"
                                size="lg"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : (isRtl ? 'שלח קישור לאיפוס' : 'Send Reset Link')}
                            </Button>
                        </form>
                    </CardContent>

                    <CardFooter className="flex justify-center pb-8">
                        <Link to="/login" className="text-foreground font-black hover:text-primary hover:underline underline-offset-4 transition-colors">
                            {isRtl ? '← חזרה להתחברות' : '← Back to Sign In'}
                        </Link>
                    </CardFooter>
                </Card>
            </motion.div>
        </div>
    );
}
