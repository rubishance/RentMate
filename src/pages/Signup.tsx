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
import { Checkbox } from '../components/ui/Checkbox';
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
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
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

        if (!firstName.trim() || !lastName.trim()) {
            setError(isRtl ? 'יש למלא שם פרטי ושם משפחה' : 'First name and last name are required');
            setLoading(false);
            return;
        }

        if (!phone.trim()) {
            setError(isRtl ? 'יש למלא מספר טלפון' : 'Phone number is required');
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
                        full_name: `${firstName.trim()} ${lastName.trim()}`,
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
        <div className={`min-h-screen flex flex-col items-center justify-start sm:justify-center bg-white dark:bg-[#0a0a0a] py-4 sm:py-12 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate('/')}
                className="absolute top-4 left-4 sm:top-8 sm:left-8 z-50 rounded-full bg-gray-100 dark:bg-neutral-900 hover:bg-gray-200 dark:hover:bg-neutral-800"
                title={isRtl ? 'חזרה לדף הבית' : 'Back to home'}
            >
                <ArrowRight className={cn("w-5 h-5 text-gray-600 dark:text-gray-400", !isRtl && "rotate-180")} />
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
                className="w-full max-w-md px-4 sm:px-6 relative z-10"
            >
                <div className="bg-window border border-gray-100 dark:border-neutral-800 shadow-2xl rounded-3xl sm:rounded-[2.5rem] p-5 sm:p-8 md:p-12">
                    <AnimatePresence mode="wait">
                        {awaitingConfirmation ? (
                            <ConfirmationView email={email} onBack={() => navigate('/login')} isRtl={isRtl} t={t} />
                        ) : (
                            <SignupFormView
                                handleAuth={handleAuth}
                                email={email} setEmail={setEmail}
                                password={password} setPassword={setPassword}
                                firstName={firstName} setFirstName={setFirstName}
                                lastName={lastName} setLastName={setLastName}
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
                </div>
            </motion.div>
        </div>
    );
}

const ConfirmationView = ({ email, onBack, isRtl, t }: any) => (
    <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center space-y-6 sm:space-y-8 py-2 sm:py-4">
        <div className="w-16 h-16 sm:w-20 sm:h-20 bg-gray-50 dark:bg-neutral-800 text-black dark:text-white rounded-full flex items-center justify-center mx-auto ring-8 ring-gray-100 dark:ring-white/5">
            <Mail className="w-8 h-8 sm:w-10 sm:h-10" />
        </div>
        <div className="space-y-2 sm:space-y-3">
            <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">{t('auth_check_inbox')}</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
                {t('auth_confirmation_sent').replace('{email}', email)}
            </p>
        </div>
        <Button onClick={onBack} className="no-dark-fix w-full py-6 sm:py-6 bg-black dark:bg-white text-white dark:text-black font-bold rounded-2xl hover:bg-gray-800 transition-all shadow-xl text-base">
            {isRtl ? '← חזרה להתחברות' : '← Back to Login'}
        </Button>
    </motion.div>
);

const SignupFormView = ({
    handleAuth, email, setEmail, password, setPassword, firstName, setFirstName, lastName, setLastName,
    phone, setPhone, agreeToTerms, setAgreeToTerms, marketingConsent, setMarketingConsent, loading, error, handleSocialLogin,
    t, isRtl, effectiveTheme
}: any) => (
    <div className="space-y-6 sm:space-y-10">
        <div className="text-center space-y-3 sm:space-y-6">
            <img src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly} alt="RentMate" className="h-10 sm:h-20 w-auto mx-auto object-contain" />
            <div className="space-y-1">
                <h2 className="text-2xl sm:text-3xl font-bold text-black dark:text-white">{t('auth_join')}</h2>
                <p className="text-xs sm:text-sm text-gray-500 dark:text-gray-400 font-medium">{isRtl ? 'ניהול נכסים חכם' : 'Smart Property Management'}</p>
            </div>
        </div>

        {error && <div className="bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 p-4 rounded-2xl text-sm border border-red-100 dark:border-red-900/40 text-center font-medium">{error}</div>}

        <div className="space-y-6 sm:space-y-10">
            <Button
                variant="outline"
                onClick={() => handleSocialLogin('google')}
                disabled={loading}
                className="w-full h-12 gap-3 bg-white dark:bg-neutral-800 border-gray-100 rounded-2xl hover:bg-gray-50 dark:hover:bg-neutral-700 shadow-sm"
            >
                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                <span className="text-sm font-bold text-black dark:text-white">{isRtl ? 'המשך עם Google' : 'Continue with Google'}</span>
            </Button>
            <div className="relative"><div className="absolute inset-0 flex items-center"><span className="w-full border-t border-gray-100 dark:border-neutral-800" /></div><div className="relative flex justify-center text-[10px] font-bold uppercase tracking-widest text-gray-400"><span className="bg-window px-3">{t('auth_or_continue')}</span></div></div>
        </div>

        <form className="space-y-4 sm:space-y-6" onSubmit={handleAuth}>
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-400 uppercase tracking-wider block ml-1">
                    {isRtl ? 'שם מלא' : 'Full Name'}
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <Input
                        type="text"
                        required
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        placeholder={isRtl ? 'שם פרטי' : 'First Name'}
                        className="h-12 bg-gray-50 dark:bg-neutral-800"
                    />
                    <Input
                        type="text"
                        required
                        value={lastName}
                        onChange={(e) => setLastName(e.target.value)}
                        placeholder={isRtl ? 'שם משפחה' : 'Last Name'}
                        className="h-12 bg-gray-50 dark:bg-neutral-800"
                    />
                </div>
            </div>
            <div className="space-y-2">
                <Input
                    label={t('phone')}
                    type="tel"
                    required
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="050-0000000"
                    className="h-12 bg-gray-50 dark:bg-neutral-800"
                />
            </div>
            <div className="space-y-2">
                <Input
                    label={t('auth_email')}
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="h-12 bg-gray-50 dark:bg-neutral-800"
                    leftIcon={<Mail className="w-4 h-4 text-muted-foreground" />}
                />
            </div>
            <div className="space-y-2">
                <Input
                    label={t('auth_password')}
                    type="password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="h-12 bg-gray-50 dark:bg-neutral-800"
                />
            </div>

            <div className="space-y-3 pt-2">
                <Checkbox
                    checked={agreeToTerms}
                    onChange={setAgreeToTerms}
                    label={(
                        <span className="text-xs text-gray-500 font-medium leading-relaxed group-hover:text-black transition-colors">
                            {t('agreeToTerms').split('{terms}').map((part: string, i: number) => {
                                if (i === 1) {
                                    const [p1, p2] = part.split('{privacy}');
                                    return <React.Fragment key={i}>
                                        <Link to="/legal/terms" className="text-black font-bold hover:underline" target="_blank">{t('termsOfService')}</Link>{p1}
                                        <Link to="/legal/privacy" className="text-black font-bold hover:underline" target="_blank">{t('privacyPolicy')}</Link>{p2}
                                    </React.Fragment>;
                                }
                                return part;
                            })}
                        </span>
                    )}
                />
                <Checkbox
                    checked={marketingConsent}
                    onChange={setMarketingConsent}
                    label={<span className="text-xs text-gray-500 font-medium leading-relaxed group-hover:text-black transition-colors">{t('marketingConsent')}</span>}
                />
            </div>

            <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 shadow-xl hover:scale-[1.02] transition-all"
                size="lg"
            >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : <div className="flex items-center gap-2">{t('auth_create_account')} <ArrowRight className={cn("w-4 h-4", isRtl && "rotate-180")} /></div>}
            </Button>
        </form>

        <div className="text-center pt-2">
            <Link to="/login" className="text-black dark:text-white font-black hover:underline underline-offset-4">{t('auth_have_account')}</Link>
        </div>
    </div>
);
