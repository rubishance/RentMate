import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ShieldCheck, ArrowRight } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';

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
            "min-h-screen flex items-center justify-center bg-white dark:bg-[#0a0a0a]",
            isRtl ? "text-right" : "text-left"
        )} dir={isRtl ? "rtl" : "ltr"}>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md p-8 relative z-10"
            >
                <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 shadow-2xl rounded-3xl p-8 space-y-6">
                    <div className="flex flex-col items-center gap-4 mb-2">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-neutral-800 text-black dark:text-white rounded-[1.5rem] flex items-center justify-center shadow-sm">
                            <ShieldCheck className="w-8 h-8" />
                        </div>
                        <div className="text-center">
                            <h2 className="text-2xl font-black text-black dark:text-white tracking-tighter">
                                {isRtl ? 'קביעת סיסמה חדשה' : 'Set New Password'}
                            </h2>
                            <p className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mt-1">
                                {isRtl ? 'אבטח את החשבון שלך' : 'Secure your account'}
                            </p>
                        </div>
                    </div>

                    {error && (
                        <div className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-center text-sm font-medium border border-red-100 dark:border-red-900/40">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-8 space-y-4">
                            <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400 rounded-full flex items-center justify-center mx-auto">
                                ✓
                            </div>
                            <div className="space-y-1">
                                <h3 className="text-lg font-bold text-black dark:text-white">
                                    {isRtl ? 'הסיסמה עודכנה!' : 'Password Updated!'}
                                </h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    {isRtl ? 'מעבר לדף ההתחברות...' : 'Redirecting to login...'}
                                </p>
                            </div>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdatePassword} className="space-y-6">
                            <div className="space-y-2">
                                <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider block ml-1">
                                    {isRtl ? 'סיסמה חדשה' : 'New Password'}
                                </label>
                                <input
                                    type="password"
                                    required
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="block w-full px-4 py-4 bg-gray-50 dark:bg-neutral-800 text-black dark:text-white border-transparent focus:bg-white dark:focus:bg-neutral-700 focus:border-black dark:focus:border-white rounded-2xl outline-none transition-all"
                                    placeholder="••••••••"
                                />

                                <div className="mt-4 p-4 bg-gray-50/50 dark:bg-neutral-800/50 rounded-2xl border border-gray-100 dark:border-neutral-800 space-y-3">
                                    <div className="flex justify-between items-center mb-1">
                                        <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-gray-500">{t('passwordStrength')}</span>
                                        <span className={cn(
                                            "text-[10px] font-bold uppercase tracking-widest",
                                            Object.values({
                                                length: newPassword.length >= 8,
                                                uppercase: /[A-Z]/.test(newPassword),
                                                lowercase: /[a-z]/.test(newPassword),
                                                number: /[0-9]/.test(newPassword),
                                                special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
                                            }).filter(Boolean).length <= 2 ? "text-red-500" :
                                                Object.values({
                                                    length: newPassword.length >= 8,
                                                    uppercase: /[A-Z]/.test(newPassword),
                                                    lowercase: /[a-z]/.test(newPassword),
                                                    number: /[0-9]/.test(newPassword),
                                                    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
                                                }).filter(Boolean).length <= 4 ? "text-amber-500" : "text-emerald-500"
                                        )}>
                                            {Object.values({
                                                length: newPassword.length >= 8,
                                                uppercase: /[A-Z]/.test(newPassword),
                                                lowercase: /[a-z]/.test(newPassword),
                                                number: /[0-9]/.test(newPassword),
                                                special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
                                            }).filter(Boolean).length <= 2 ? t('passwordWeak') :
                                                Object.values({
                                                    length: newPassword.length >= 8,
                                                    uppercase: /[A-Z]/.test(newPassword),
                                                    lowercase: /[a-z]/.test(newPassword),
                                                    number: /[0-9]/.test(newPassword),
                                                    special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
                                                }).filter(Boolean).length <= 4 ? t('passwordMedium') : t('passwordStrong')}
                                        </span>
                                    </div>

                                    <div className="h-1.5 w-full bg-gray-100 dark:bg-neutral-800 rounded-full overflow-hidden flex gap-1">
                                        {[1, 2, 3, 4, 5].map((step) => {
                                            const metCount = Object.values({
                                                length: newPassword.length >= 8,
                                                uppercase: /[A-Z]/.test(newPassword),
                                                lowercase: /[a-z]/.test(newPassword),
                                                number: /[0-9]/.test(newPassword),
                                                special: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword),
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
                                            { key: 'length', label: t('passwordRequirementLength'), met: newPassword.length >= 8 },
                                            { key: 'upper', label: t('passwordRequirementUppercase'), met: /[A-Z]/.test(newPassword) },
                                            { key: 'lower', label: t('passwordRequirementLowercase'), met: /[a-z]/.test(newPassword) },
                                            { key: 'number', label: t('passwordRequirementNumber'), met: /[0-9]/.test(newPassword) },
                                            { key: 'special', label: t('passwordRequirementSpecial'), met: /[!@#$%^&*(),.?":{}|<>]/.test(newPassword) },
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
                            </div>

                            <button
                                type="submit"
                                disabled={loading || success}
                                className="w-full flex items-center justify-center py-4 px-4 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-2xl shadow-xl transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-70"
                            >
                                {loading ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    <div className="flex items-center gap-2">
                                        <span>{isRtl ? 'עדכן סיסמה' : 'Update Password'}</span>
                                        <ArrowRight className={cn("w-4 h-4", isRtl && "rotate-180")} />
                                    </div>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}

