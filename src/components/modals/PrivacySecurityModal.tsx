import { useState, useEffect } from 'react';
import { X, Shield, Eye, EyeOff, Trash2, Lock, AlertTriangle, Cloud } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface PrivacySecurityModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function PrivacySecurityModal({ isOpen, onClose }: PrivacySecurityModalProps) {
    const { t } = useTranslation();
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [passwordError, setPasswordError] = useState('');
    const [passwordSuccess, setPasswordSuccess] = useState(false);

    const { preferences, setAiDataConsent } = useUserPreferences();
    const aiConsent = preferences.ai_data_consent ?? false;


    if (!isOpen) return null;

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


    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-border dark:border-gray-700 px-6 py-4 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 dark:bg-blue-900/20 flex items-center justify-center">
                            <Shield className="w-5 h-5 text-primary dark:text-blue-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-foreground dark:text-white">
                                {t('privacySecurityTitle')}
                            </h2>
                            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                                {t('privacySecuritySubtitle')}
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-muted dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* AI Data Access Consent */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Cloud className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                            <h3 className="font-semibold text-foreground dark:text-white">
                                RentMate AI
                            </h3>
                        </div>

                        <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-4 flex items-start justify-between gap-4">
                            <div>
                                <h4 className="font-medium text-purple-900 dark:text-purple-100 mb-1">
                                    Allow AI Analysis
                                </h4>
                                <p className="text-sm text-purple-700 dark:text-purple-300">
                                    Allow RentMate AI to access your contracts, payments, and tenant data to provide financial insights and smart alerts.
                                    <span className='block mt-1 font-semibold'>This is required for features like "How much did I earn?"</span>
                                    <span className='block mt-2 text-xs opacity-80 italic'>
                                        Data is processed securely via OpenAI and is NOT used for model training.
                                        Insights are generated in real-time for your specific request.
                                    </span>
                                </p>
                            </div>
                            <button
                                onClick={() => {
                                    setAiDataConsent(!aiConsent);
                                }}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 ${aiConsent ? 'bg-purple-600' : 'bg-gray-200 dark:bg-gray-700'
                                    }`}
                            >
                                <span
                                    className={`${aiConsent ? 'translate-x-6' : 'translate-x-1'
                                        } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                                />
                            </button>
                        </div>
                    </div>

                    {/* Change Password Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-muted-foreground dark:text-muted-foreground" />
                            <h3 className="font-semibold text-foreground dark:text-white">
                                {t('changePassword')}
                            </h3>
                        </div>

                        {!isChangingPassword ? (
                            <button
                                onClick={() => setIsChangingPassword(true)}
                                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                            >
                                {t('changePasswordBtn')}
                            </button>
                        ) : (
                            <div className="space-y-4 p-4 bg-secondary dark:bg-foreground rounded-xl">
                                {/* New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('newPassword')}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white pr-10"
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
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('confirmPassword')}
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                                        placeholder={t('enterPasswordAgain')}
                                    />
                                </div>

                                {passwordError && (
                                    <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                                )}

                                {passwordSuccess && (
                                    <p className="text-sm text-green-600 dark:text-green-400">
                                        {t('passwordChangedSuccess')}
                                    </p>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleChangePassword}
                                        className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                                    >
                                        {t('save')}
                                    </button>
                                    <button
                                        onClick={() => {
                                            setIsChangingPassword(false);
                                            setPasswordError('');
                                            setNewPassword('');
                                            setConfirmPassword('');
                                        }}
                                        className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                    >
                                        {t('cancel')}
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Delete Account Section */}
                    <div className="space-y-4 pt-6 border-t border-border dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <Trash2 className="w-5 h-5 text-red-600 dark:text-red-400" />
                            <h3 className="font-semibold text-red-600 dark:text-red-400">
                                {t('deleteAccount')}
                            </h3>
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-orange-800 dark:text-orange-200">
                                    <p className="font-semibold mb-2">
                                        {t('deletionProcessTitle')}
                                    </p>
                                    <ul className="space-y-1 list-disc list-inside">
                                        <li>{t('deletionStep1')}</li>
                                        <li>{t('deletionStep2')}</li>
                                        <li>{t('deletionStep3')}</li>
                                        <li>{t('deletionStep4')}</li>
                                        <li className="font-semibold">{t('deletionStep5')}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSuspendAccount}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('suspendAccountBtn')}
                        </button>
                    </div>
                </div>
            </div>
        </div >
    );
}
