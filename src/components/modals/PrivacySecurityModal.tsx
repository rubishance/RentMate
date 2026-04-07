import { useState } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Shield, Eye, EyeOff, Trash2, Lock, AlertTriangle, Cloud } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { Button } from '../ui/Button';

interface PrivacySecurityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PrivacySecurityModal({ isOpen, onClose }: PrivacySecurityModalProps) {
    const { t, lang } = useTranslation();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const { preferences, setAiDataConsent } = useUserPreferences();
    const aiConsent = preferences.ai_data_consent ?? false;


    const handleChangePassword = async () => {
        setPasswordError('');
        setPasswordSuccess(false);

        // Validation
        if (!newPassword || newPassword.length < 6) {
            setPasswordError(t('passwordLengthError'));
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError(t('passwordsDoNotMatch'));
            return;
        }

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;

            setPasswordSuccess(true);
            setNewPassword('');
            setConfirmPassword('');
            setIsChangingPassword(false);

            setTimeout(() => setPasswordSuccess(false), 3000);
        } catch (error: any) {
            setPasswordError(error.message || t('errorChangingPassword'));
        }
    };

    const handleSuspendAccount = async () => {
        const message = t('suspendConfirmation');
        const confirmed = window.confirm(message);
        if (!confirmed) return;

        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // Mark account for deletion (set deleted_at timestamp)
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    deleted_at: new Date().toISOString(),
                    account_status: 'suspended'
                })
                .eq('id', user.id);

            if (error) throw error;

            alert(t('accountSuspendedSuccess'));

            // Sign out
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (error: any) {
            alert(error.message || t('errorSuspendingAccount'));
        }
    };


    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 mt-auto" dir={lang === 'he' ? 'rtl' : 'ltr'}>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity"
                    />
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        className="relative bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh] mt-auto sm:mt-0"
                    >
                        {/* Header */}
                        <div className="p-6 flex items-center justify-between border-b border-border dark:border-gray-700 bg-white/50 dark:bg-background/50 backdrop-blur-xl shrink-0">
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-slate-100 dark:hover:bg-neutral-800 rounded-xl transition-colors text-muted-foreground hover:text-slate-600 dark:hover:text-slate-300"
                            >
                                <X className="w-5 h-5" />
                            </button>
                            <div className="flex items-center gap-2 sm:gap-4">
                                <div className="text-right">
                                    <h2 className="text-xl font-bold text-foreground dark:text-white">
                                        {t('privacySecurityTitle')}
                                    </h2>
                                    <p className="text-xs text-muted-foreground dark:text-muted-foreground">
                                        {t('privacySecuritySubtitle')}
                                    </p>
                                </div>
                                <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-blue-900/20 flex items-center justify-center shrink-0">
                                    <Shield className="w-5 h-5 text-primary dark:text-blue-400" />
                                </div>
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-6 overflow-y-auto flex-1 custom-scrollbar pb-10 sm:pb-6 space-y-6">
                            {/* AI Data Access Consent */}
                            <div className="space-y-4">
                                <div className="flex items-center gap-2">
                                    <Cloud className="w-5 h-5 text-primary" />
                                    <h3 className="font-semibold text-foreground dark:text-white">
                                        RentMate AI
                                    </h3>
                                </div>

                                <div className="bg-primary/5 border border-primary/20 rounded-xl p-6 flex items-start justify-between gap-4">
                                    <div>
                                        <h4 className="font-medium text-primary-900 dark:text-primary-100 mb-1">
                                            {t('aiAnalysisTitle')}
                                        </h4>
                                        <p className="text-base text-primary">
                                            {t('aiAnalysisDesc')}
                                            <span className='block mt-1 font-semibold'>{t('aiAnalysisRequiredFor')}</span>
                                            <span className='block mt-2 text-sm opacity-80 italic'>
                                                {t('aiAnalysisDisclaimer')}
                                            </span>
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => {
                                            setAiDataConsent(!aiConsent);
                                        }}
                                        className={`relative inline-flex h-6 w-11 mt-1 items-center rounded-full transition-colors shrink-0 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 ${aiConsent ? 'bg-primary' : 'bg-gray-200 dark:bg-gray-700'
                                            }`}
                                    >
                                        <span
                                            className={`${aiConsent
                                                ? (lang === 'he' ? '-translate-x-6' : 'translate-x-6')
                                                : (lang === 'he' ? '-translate-x-1' : 'translate-x-1')
                                                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                        />
                                    </button>
                                </div>
                            </div>

                            {/* Change Password Section */}
                            <div className="space-y-4 pt-6 border-t border-border dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <Lock className="w-5 h-5 text-muted-foreground dark:text-muted-foreground" />
                                    <h3 className="font-semibold text-foreground dark:text-white">
                                        {t('changePassword')}
                                    </h3>
                                </div>

                                {!isChangingPassword ? (
                                    <button
                                        onClick={() => setIsChangingPassword(true)}
                                        className="px-6 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors font-bold"
                                    >
                                        {t('changePasswordBtn')}
                                    </button>
                                ) : (
                                    <div className="space-y-4 p-6 bg-secondary dark:bg-foreground rounded-xl">
                                        {/* New Password */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                {t('newPassword')}
                                            </label>
                                            <div className="relative">
                                                <input
                                                    type={showNewPassword ? 'text' : 'password'}
                                                    value={newPassword}
                                                    onChange={(e) => setNewPassword(e.target.value)}
                                                    className="w-full px-6 py-2 border border-border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white pr-10"
                                                    placeholder={t('enterNewPassword')}
                                                />
                                                <button
                                                    type="button"
                                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                                    className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-gray-700"
                                                >
                                                    {showNewPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                                                </button>
                                            </div>
                                        </div>

                                        {/* Confirm Password */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
                                                {t('confirmPassword')}
                                            </label>
                                            <input
                                                type="password"
                                                value={confirmPassword}
                                                onChange={(e) => setConfirmPassword(e.target.value)}
                                                className="w-full px-6 py-2 border border-border dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary dark:bg-gray-800 dark:text-white"
                                                placeholder={t('enterPasswordAgain')}
                                            />
                                        </div>

                                        {passwordError && (
                                            <p className="text-sm font-bold text-destructive">{passwordError}</p>
                                        )}

                                        {passwordSuccess && (
                                            <p className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                                                {t('passwordChangedSuccess')}
                                            </p>
                                        )}

                                        <div className="flex gap-4">
                                            <Button
                                                variant="secondary"
                                                onClick={() => {
                                                    setIsChangingPassword(false);
                                                    setPasswordError('');
                                                    setNewPassword('');
                                                    setConfirmPassword('');
                                                }}
                                                className="flex-1 rounded-xl"
                                            >
                                                {t('cancel')}
                                            </Button>
                                            <Button
                                                variant="primary"
                                                onClick={handleChangePassword}
                                                className="flex-1 rounded-xl"
                                            >
                                                {t('save')}
                                            </Button>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Delete Account Section */}
                            <div className="space-y-4 pt-6 border-t border-border dark:border-gray-700">
                                <div className="flex items-center gap-2">
                                    <Trash2 className="w-5 h-5 text-destructive" />
                                    <h3 className="font-semibold text-destructive">
                                        {t('deleteAccount')}
                                    </h3>
                                </div>

                                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-6 flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-warning flex-shrink-0 mt-0.5" />
                                    <div className="text-sm text-orange-800 dark:text-orange-200">
                                        <p className="font-bold mb-2">
                                            {t('deletionProcessTitle')}
                                        </p>
                                        <ul className="space-y-1 list-disc list-inside px-1">
                                            <li>{t('deletionStep1')}</li>
                                            <li>{t('deletionStep2')}</li>
                                            <li>{t('deletionStep3')}</li>
                                            <li>{t('deletionStep4')}</li>
                                            <li className="font-bold">{t('deletionStep5')}</li>
                                        </ul>
                                    </div>
                                </div>

                                <button
                                    onClick={handleSuspendAccount}
                                    className="px-6 py-2 bg-destructive text-white font-bold rounded-xl hover:bg-red-700 transition-colors flex items-center justify-center gap-2 w-full sm:w-auto"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {t('suspendAccountBtn')}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}

