import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Loader2, ArrowRight, Mail } from 'lucide-react';
import logoIconOnly from '../assets/rentmate-icon-only.png';
import logoIconDark from '../assets/rentmate-icon-only-dark.png';
import { useTranslation } from '../hooks/useTranslation';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { SettingsTray } from '../components/common/SettingsTray';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { cn } from '../lib/utils';
import { Input } from '../components/ui/Input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

export function Signup() {
    const navigate = useNavigate();
    const { t, lang } = useTranslation();
    const { effectiveTheme } = useUserPreferences();
    const [searchParams] = useSearchParams();
    const planFromUrl = searchParams.get('plan');
    const isRtl = lang === 'he';

    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');
    const [phone, setPhone] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);
    const [agreeToTerms, setAgreeToTerms] = useState(false);
    const [marketingConsent, setMarketingConsent] = useState(false);

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
                    redirectTo: `${window.location.origin}/properties`,
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

        if (!agreeToTerms) {
            setError(isRtl ? 'עליך להסכים לתנאי השימוש' : 'You must agree to the Terms of Service');
            setLoading(false);
            return;
        }

        if (!fullName.trim()) {
            setError(isRtl ? 'יש למלא שם מלא' : 'Full name is required');
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

        if (!Object.values(passwordRequirements).every(req => req)) {
            setError(isRtl ? 'הסיסמה אינה עומדת בדרישות האבטחה' : 'Password does not meet security requirements');
            setLoading(false);
            return;
        }

        try {
            const authResult = await supabase.auth.signUp({
                email,
                password,
                options: {
                    data: {
                        full_name: fullName.trim(),
                        phone_number: phone.trim() || null,
                        marketing_consent: marketingConsent,
                        plan_id: planFromUrl || 'free'
                    },
                    emailRedirectTo: `${window.location.origin}/login`,
                }
            });

            if (authResult.error) throw authResult.error;

            if (authResult.data.user && !authResult.data.session) {
                setAwaitingConfirmation(true);
            } else if (authResult.data.session) {
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={`min-h-screen flex flex-col items-center justify-start sm:justify-center bg-white dark:bg-[#0a0a0a] py-4 sm:py-12 ${isRtl ? 'text-right font-hebrew' : 'text-left font-english'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 rounded-full bg-muted dark:bg-neutral-900 hover:bg-gray-200 dark:hover:bg-neutral-800"
                title={isRtl ? 'חזרה לדף הבית' : 'Back to home'}
            >
                <ArrowRight className={cn("w-5 h-5 text-muted-foreground dark:text-muted-foreground", !isRtl && "rotate-180")} />
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
                className="w-full max-w-[420px] px-4 sm:p-0 relative z-10"
            >
                <Card className="border-border/50 shadow-2xl bg-window">
                    <AnimatePresence mode="wait">
                        {awaitingConfirmation ? (
                            <ConfirmationView email={email} onBack={() => navigate('/login')} isRtl={isRtl} t={t} />
                        ) : (
                            <SignupFormView
                                handleAuth={handleAuth}
                                email={email} setEmail={setEmail}
                                password={password} setPassword={setPassword}
                                fullName={fullName} setFullName={setFullName}
                                phone={phone} setPhone={setPhone}
                                agreeToTerms={agreeToTerms} setAgreeToTerms={setAgreeToTerms}
                                marketingConsent={marketingConsent} setMarketingConsent={setMarketingConsent}
                                loading={loading}
                                error={error}
                                handleSocialLogin={handleSocialLogin}
                                t={t} isRtl={isRtl}
                                effectiveTheme={effectiveTheme}
                                isSupabaseConfigured={isSupabaseConfigured}
                            />
                        )}
                    </AnimatePresence>
                </Card>
            </motion.div>
        </div>
    );
}

const ConfirmationView = ({ email, onBack, isRtl, t }: any) => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 sm:space-y-8 py-2 sm:py-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-secondary dark:bg-neutral-800 text-black dark:text-white rounded-full flex items-center justify-center mx-auto ring-8 ring-gray-100 dark:ring-white/5">
            <Mail className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <div className="space-y-2 sm:space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">{t('auth_check_inbox')}</h2>
            <p className="text-sm text-muted-foreground dark:text-muted-foreground leading-relaxed">
                {t('auth_confirmation_sent').replace('{email}', email)}
            </p>
        </div>
        <Button onClick={onBack} className="no-dark-fix w-full py-6 sm:py-6 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl text-base">
            {isRtl ? '← חזרה להתחברות' : '← Back to Login'}
        </Button>
    </motion.div>
);

const SignupFormView = ({
    handleAuth, email, setEmail, password, setPassword, fullName, setFullName,
    phone, setPhone, agreeToTerms, setAgreeToTerms, marketingConsent, setMarketingConsent, loading, error, handleSocialLogin,
    t, isRtl, effectiveTheme
}: any) => (
    <div className="space-y-0">
        <CardHeader className="space-y-4 pb-2 text-center">
            <img src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly} alt="RentMate" className="h-16 h-20 w-auto mx-auto object-contain transition-all mb-4" />
            <CardTitle className="text-3xl font-black tracking-tight">{t('auth_join')}</CardTitle>
            <CardDescription className="text-base font-medium">{isRtl ? 'ניהול נכסים חכם' : 'Smart Property Management'}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6 pt-6">
            {error && <div className="bg-destructive/10 text-destructive p-4 rounded-xl text-sm border border-destructive/20 text-center font-bold shadow-sm">{error}</div>}

            <div className="space-y-6 sm:space-y-10">
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
                    <div className="relative flex justify-center text-xs font-bold uppercase tracking-widest text-muted-foreground"><span className="bg-window px-3">{t('auth_or_continue')}</span></div>
                </div>
            </div>

            <form className="space-y-4 sm:space-y-6" onSubmit={handleAuth}>
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">
                        {isRtl ? 'שם מלא' : 'Full Name'}
                    </label>
                    <Input
                        type="text"
                        required
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={isRtl ? 'שם מלא' : 'Full Name'}
                        className={`h-12 block w-full rounded-xl border-border bg-background/50 shadow-inner ${isRtl ? 'pr-3' : 'pl-3'} py-2.5 md:py-3 text-foreground focus:border-primary focus:ring-primary focus:bg-background focus:shadow-md text-base transition-all`}
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">
                        {t('phone')} {isRtl ? '(רשות)' : '(Optional)'}
                    </label>
                    <Input
                        type="tel"
                        value={phone}
                        onChange={(e) => setPhone(e.target.value)}
                        placeholder="050-0000000"
                        className={`h-12 block w-full rounded-xl border-border bg-background/50 shadow-inner ${isRtl ? 'pr-3' : 'pl-3'} py-2.5 md:py-3 text-foreground focus:border-primary focus:ring-primary focus:bg-background focus:shadow-md text-base transition-all`}
                        dir="ltr"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">
                        {t('auth_email')}
                    </label>
                    <Input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className={`h-12 block w-full rounded-xl border-border bg-background/50 shadow-inner ${isRtl ? 'pr-10' : 'pl-10'} py-2.5 md:py-3 text-foreground focus:border-primary focus:ring-primary focus:bg-background focus:shadow-md text-base transition-all`}
                        leftIcon={<Mail className="w-4 h-4 text-muted-foreground" />}
                        dir="ltr"
                    />
                </div>
                <div>
                    <label className="block text-sm font-semibold text-foreground mb-1">
                        {t('auth_password')}
                    </label>
                    <Input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={`h-12 block w-full rounded-xl border-border bg-background/50 shadow-inner ${isRtl ? 'pr-3' : 'pl-3'} py-2.5 md:py-3 text-foreground focus:border-primary focus:ring-primary focus:bg-background focus:shadow-md text-base transition-all`}
                        dir="ltr"
                    />
                </div>

                <div className="space-y-3 pt-2">
                    <div className="flex items-start gap-2.5 mt-2">
                        <div className="flex items-center h-4 md:h-5">
                            <input
                                id="termsConsentSignup"
                                type="checkbox"
                                checked={agreeToTerms}
                                onChange={(e) => setAgreeToTerms(e.target.checked)}
                                required
                                className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary bg-background border-border rounded focus:ring-primary ring-offset-background focus:ring-2 md:mt-0.5 cursor-pointer transition-colors"
                            />
                        </div>
                        <label htmlFor="termsConsentSignup" className="text-xs md:text-xs font-medium text-muted-foreground cursor-pointer">
                            {t('agreeToTerms').split('{terms}').map((part: string, i: number) => {
                                if (i === 1) {
                                    const [p1, p2] = part.split('{privacy}');
                                    return <React.Fragment key={i}>
                                        <Link to="/legal/terms" className="font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary/80 text-xs md:text-xs" target="_blank">{t('termsOfService')}</Link>{p1}
                                        <Link to="/legal/privacy" className="font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary/80 text-xs md:text-xs" target="_blank">{t('privacyPolicy')}</Link>{p2}
                                    </React.Fragment>;
                                }
                                return part;
                            })}
                        </label>
                    </div>
                    <div className="flex items-start gap-2.5 mt-2">
                        <div className="flex items-center h-4 md:h-5">
                            <input
                                id="marketingConsentSignup"
                                type="checkbox"
                                checked={marketingConsent}
                                onChange={(e) => setMarketingConsent(e.target.checked)}
                                className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary bg-background border-border rounded focus:ring-primary ring-offset-background focus:ring-2 md:mt-0.5 cursor-pointer transition-colors"
                            />
                        </div>
                        <label htmlFor="marketingConsentSignup" className="text-xs md:text-xs font-medium text-muted-foreground cursor-pointer">
                            <span>{t('marketingConsent')}</span>
                        </label>
                    </div>
                </div>

                <Button
                    type="submit"
                    disabled={loading}
                    className="w-full h-12 text-sm font-bold mt-4"
                    size="lg"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <div className="flex items-center gap-2">{t('auth_create_account')} <ArrowRight className={cn("w-4 h-4", isRtl && "rotate-180")} /></div>}
                </Button>
            </form>
        </CardContent>
        <CardFooter className="flex flex-col gap-6 pb-8">
            <div className="text-center">
                <span className="text-muted-foreground text-sm font-medium mr-2">{t('auth_have_account')}</span>
                <Link to="/login" className="text-primary font-black hover:underline underline-offset-4 text-sm">{t('auth_sign_in')}</Link>
            </div>
        </CardFooter>
    </div>
);
