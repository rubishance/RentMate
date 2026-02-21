import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, ArrowRight, Lock } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../components/ui/Card';
import { Input } from '../components/ui/Input';
import { Button } from '../components/ui/Button';

export function ResetPassword() {
    const navigate = useNavigate();
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Ensure user is authenticated (via the email link magic)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError(isRtl ? "קישור האיפוס אינו תקין או פג תוקף. אנא נסו שוב." : "Invalid or expired reset link. Please try again.");
            }
        });
    }, [isRtl]);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();

        const passwordRequirements = {
            length: newPassword.length >= 8,
            uppercase: /[A-Z]/.test(newPassword),
            lowercase: /[a-z]/.test(newPassword),
            number: /[0-9]/.test(newPassword),
            special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
        };

        if (!Object.values(passwordRequirements).every(req => req)) {
            setError(isRtl ? 'הסיסמה אינה עומדת בדרישות האבטחה' : 'Password does not meet security requirements');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            // Send notification email
            const { data: { user } } = await supabase.auth.getUser();
            if (user?.email) {
                await supabase.functions.invoke('send-notification-email', {
                    body: {
                        email: user.email,
                        lang: lang,
                        notification: {
                            title: lang === 'he' ? 'הסיסמה שונתה בהצלחה' : 'Password Changed Successfully',
                            message: lang === 'he'
                                ? 'הסיסמה לחשבון ה-RentMate שלך שונתה בהצלחה. אם לא ביצעת פעולה זו, אנא צור קשר עם התמיכה מיד.'
                                : 'The password for your RentMate account has been successfully changed. If you did not perform this action, please contact support immediately.'
                        }
                    }
                });
            }

            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className={cn(
            "min-h-screen flex items-center justify-center bg-background py-6 sm:py-12",
            isRtl ? "text-right" : "text-left"
        )} dir={isRtl ? "rtl" : "ltr"}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-4 sm:p-0 relative z-10"
            >
                <Card className="border-border/50 shadow-2xl bg-window">
                    <CardHeader className="space-y-4 pb-2 text-center">
                        <div className="w-16 h-16 bg-primary/10 text-primary rounded-[1.5rem] flex items-center justify-center shadow-sm mx-auto mb-2 ring-8 ring-primary/5">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div className="space-y-1">
                            <CardTitle className="text-2xl font-black tracking-tight">
                                {isRtl ? 'קביעת סיסמה חדשה' : 'Set New Password'}
                            </CardTitle>
                            <CardDescription className="text-xs font-bold uppercase tracking-widest mt-1">
                                {isRtl ? 'אבטח את החשבון שלך' : 'Secure your account'}
                            </CardDescription>
                        </div>
                    </CardHeader>

                    <CardContent className="space-y-6 pt-6">
                        {error && (
                            <div className="p-4 bg-destructive/10 text-destructive rounded-xl text-center text-sm font-medium border border-destructive/20">
                                {error}
                            </div>
                        )}

                        {success ? (
                            <div className="text-center py-8 space-y-4">
                                <div className="w-16 h-16 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto ring-8 ring-emerald-500/5">
                                    <CheckIcon />
                                </div>
                                <div className="space-y-2">
                                    <h3 className="text-xl font-bold text-foreground">
                                        {isRtl ? 'הסיסמה עודכנה!' : 'Password Updated!'}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">
                                        {isRtl ? 'מעבר לדף ההתחברות...' : 'Redirecting to login...'}
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdatePassword} className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-xs font-bold text-muted-foreground uppercase tracking-wider block ml-1">
                                        {isRtl ? 'סיסמה חדשה' : 'New Password'}
                                    </label>
                                    <Input
                                        type="password"
                                        required
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="h-12 bg-background/50"
                                        placeholder="••••••••"
                                        leftIcon={<Lock className="w-4 h-4 text-muted-foreground" />}
                                    />

                                    <div className="mt-4 p-4 bg-muted/30 rounded-xl border border-border/50 space-y-3">
                                        <div className="flex justify-between items-center mb-1">
                                            <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{t('passwordStrength')}</span>
                                            <StrengthLabel newPassword={newPassword} t={t} />
                                        </div>

                                        <StrengthBar newPassword={newPassword} />

                                        <div className="grid grid-cols-1 gap-2 pt-2">
                                            <RequirementsList newPassword={newPassword} t={t} />
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={loading || success}
                                    className="w-full h-12 text-sm font-bold shadow-lg shadow-primary/20"
                                    size="lg"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                                    ) : (
                                        <div className="flex items-center gap-2">
                                            <span>{isRtl ? 'עדכן סיסמה' : 'Update Password'}</span>
                                            <ArrowRight className={cn("w-4 h-4", isRtl && "rotate-180")} />
                                        </div>
                                    )}
                                </Button>
                            </form>
                        )}
                    </CardContent>
                </Card>
            </motion.div>
        </div>
    );
}

const CheckIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="20 6 9 17 4 12" />
    </svg>
);

const StrengthLabel = ({ newPassword, t }: any) => {
    const strength = calculateStrength(newPassword);
    const colorClass = strength <= 2 ? "text-destructive" : strength <= 4 ? "text-amber-500" : "text-emerald-500";
    const label = strength <= 2 ? t('passwordWeak') : strength <= 4 ? t('passwordMedium') : t('passwordStrong');

    return (
        <span className={cn("text-[10px] font-bold uppercase tracking-widest", colorClass)}>
            {label}
        </span>
    );
};

const StrengthBar = ({ newPassword }: any) => {
    const strength = calculateStrength(newPassword);

    return (
        <div className="h-1.5 w-full bg-muted/50 rounded-full overflow-hidden flex gap-1">
            {[1, 2, 3, 4, 5].map((step) => {
                const isActive = step <= strength;
                let colorClass = "bg-transparent";
                if (isActive) {
                    colorClass = strength <= 2 ? "bg-destructive" : strength <= 4 ? "bg-amber-500" : "bg-emerald-500";
                }
                return (
                    <div
                        key={step}
                        className={cn("h-full flex-1 transition-all duration-500", colorClass)}
                    />
                );
            })}
        </div>
    );
};

const RequirementsList = ({ newPassword, t }: any) => {
    const requirements = [
        { key: 'length', label: t('passwordRequirementLength'), met: newPassword.length >= 8 },
        { key: 'upper', label: t('passwordRequirementUppercase'), met: /[A-Z]/.test(newPassword) },
        { key: 'lower', label: t('passwordRequirementLowercase'), met: /[a-z]/.test(newPassword) },
        { key: 'number', label: t('passwordRequirementNumber'), met: /[0-9]/.test(newPassword) },
        { key: 'special', label: t('passwordRequirementSpecial'), met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
    ];

    return (
        <>
            {requirements.map((req) => (
                <div key={req.key} className="flex items-center gap-2">
                    <div className={cn(
                        "w-1.5 h-1.5 rounded-full transition-all shrink-0",
                        req.met ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]" : "bg-muted-foreground/30"
                    )} />
                    <span className={cn(
                        "text-[10px] font-bold uppercase tracking-wider transition-colors",
                        req.met ? "text-foreground" : "text-muted-foreground"
                    )}>
                        {req.label}
                    </span>
                </div>
            ))}
        </>
    );
};

const calculateStrength = (password: string) => {
    return Object.values({
        length: password.length >= 8,
        uppercase: /[A-Z]/.test(password),
        lowercase: /[a-z]/.test(password),
        number: /[0-9]/.test(password),
        special: /[!@#$%^&*(),.?":{}|<>]/.test(password),
    }).filter(Boolean).length;
};

