import { useState } from 'react';
import { X, Shield, Eye, EyeOff, Trash2, Lock, AlertTriangle } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

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

    if (!isOpen) return null;

    const handleChangePassword = async () => {
        setPasswordError('');
        setPasswordSuccess(false);

        // Validation
        if (!newPassword || newPassword.length < 6) {
            setPasswordError(t('language') === 'he' ? 'הסיסמה חייבת להכיל לפחות 6 תווים' : 'Password must be at least 6 characters');
            return;
        }

        if (newPassword !== confirmPassword) {
            setPasswordError(t('language') === 'he' ? 'הסיסמאות אינן תואמות' : 'Passwords do not match');
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
            setPasswordError(error.message || (t('language') === 'he' ? 'שגיאה בשינוי סיסמה' : 'Error changing password'));
        }
    };

    const handleSuspendAccount = async () => {
        const message = t('language') === 'he'
            ? 'החשבון שלך יושעה למשך 14 יום.\n\nבמהלך תקופה זו:\n• לא תוכל להתחבר למערכת\n• הנתונים שלך יישמרו\n• תוכל לבטל את ההשעיה על ידי יצירת קשר עם התמיכה\n\nלאחר 14 יום, החשבון והנתונים יימחקו לצמיתות.\n\nהאם להמשיך?'
            : 'Your account will be suspended for 14 days.\n\nDuring this period:\n• You will not be able to log in\n• Your data will be preserved\n• You can cancel the suspension by contacting support\n\nAfter 14 days, your account and data will be permanently deleted.\n\nContinue?';

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

            alert(
                t('language') === 'he'
                    ? 'החשבון הושעה בהצלחה. תקבל אימייל עם פרטים נוספים.'
                    : 'Account suspended successfully. You will receive an email with more details.'
            );

            // Sign out
            await supabase.auth.signOut();
            window.location.href = '/login';
        } catch (error: any) {
            alert(error.message || (t('language') === 'he' ? 'שגיאה בהשעיית חשבון' : 'Error suspending account'));
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
                                {t('language') === 'he' ? 'פרטיות ואבטחה' : 'Privacy & Security'}
                            </h2>
                            <p className="text-sm text-muted-foreground dark:text-muted-foreground">
                                {t('language') === 'he' ? 'נהל את הגדרות האבטחה שלך' : 'Manage your security settings'}
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
                    {/* Change Password Section */}
                    <div className="space-y-4">
                        <div className="flex items-center gap-2">
                            <Lock className="w-5 h-5 text-muted-foreground dark:text-muted-foreground" />
                            <h3 className="font-semibold text-foreground dark:text-white">
                                {t('language') === 'he' ? 'שינוי סיסמה' : 'Change Password'}
                            </h3>
                        </div>

                        {!isChangingPassword ? (
                            <button
                                onClick={() => setIsChangingPassword(true)}
                                className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                            >
                                {t('language') === 'he' ? 'שנה סיסמה' : 'Change Password'}
                            </button>
                        ) : (
                            <div className="space-y-4 p-4 bg-secondary dark:bg-foreground rounded-xl">
                                {/* New Password */}
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                        {t('language') === 'he' ? 'סיסמה חדשה' : 'New Password'}
                                    </label>
                                    <div className="relative">
                                        <input
                                            type={showNewPassword ? 'text' : 'password'}
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white pr-10"
                                            placeholder={t('language') === 'he' ? 'הזן סיסמה חדשה' : 'Enter new password'}
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
                                        {t('language') === 'he' ? 'אימות סיסמה' : 'Confirm Password'}
                                    </label>
                                    <input
                                        type="password"
                                        value={confirmPassword}
                                        onChange={(e) => setConfirmPassword(e.target.value)}
                                        className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-indigo-500 dark:bg-gray-800 dark:text-white"
                                        placeholder={t('language') === 'he' ? 'הזן סיסמה שוב' : 'Enter password again'}
                                    />
                                </div>

                                {passwordError && (
                                    <p className="text-sm text-red-600 dark:text-red-400">{passwordError}</p>
                                )}

                                {passwordSuccess && (
                                    <p className="text-sm text-green-600 dark:text-green-400">
                                        {t('language') === 'he' ? 'הסיסמה שונתה בהצלחה!' : 'Password changed successfully!'}
                                    </p>
                                )}

                                <div className="flex gap-3">
                                    <button
                                        onClick={handleChangePassword}
                                        className="px-4 py-2 bg-primary text-white rounded-xl hover:bg-primary/90 transition-colors"
                                    >
                                        {t('language') === 'he' ? 'שמור' : 'Save'}
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
                                        {t('language') === 'he' ? 'ביטול' : 'Cancel'}
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
                                {t('language') === 'he' ? 'מחיקת חשבון' : 'Delete Account'}
                            </h3>
                        </div>

                        <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded-xl p-4">
                            <div className="flex gap-3">
                                <AlertTriangle className="w-5 h-5 text-orange-600 dark:text-orange-400 flex-shrink-0 mt-0.5" />
                                <div className="text-sm text-orange-800 dark:text-orange-200">
                                    <p className="font-semibold mb-2">
                                        {t('language') === 'he' ? 'תהליך מחיקת חשבון:' : 'Account Deletion Process:'}
                                    </p>
                                    <ul className="space-y-1 list-disc list-inside">
                                        <li>{t('language') === 'he' ? 'החשבון יושעה למשך 14 יום' : 'Account will be suspended for 14 days'}</li>
                                        <li>{t('language') === 'he' ? 'לא תוכל להתחבר במהלך תקופה זו' : 'You cannot log in during this period'}</li>
                                        <li>{t('language') === 'he' ? 'הנתונים שלך יישמרו' : 'Your data will be preserved'}</li>
                                        <li>{t('language') === 'he' ? 'ניתן לבטל על ידי יצירת קשר עם התמיכה' : 'Can be cancelled by contacting support'}</li>
                                        <li className="font-semibold">{t('language') === 'he' ? 'לאחר 14 יום - מחיקה לצמיתות' : 'After 14 days - permanent deletion'}</li>
                                    </ul>
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleSuspendAccount}
                            className="px-4 py-2 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-colors flex items-center gap-2"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('language') === 'he' ? 'השעה חשבון' : 'Suspend Account'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
