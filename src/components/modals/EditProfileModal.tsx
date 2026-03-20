import { useState, useEffect } from 'react';
import { X, Save, User as UserIcon, Loader2, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import { Checkbox } from '../ui/Checkbox';
import { useScrollLock } from '../../hooks/useScrollLock';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData: {
        full_name: string;
        phone: string;
        phone_verified?: boolean;
    };
}

export function EditProfileModal({ isOpen, onClose, onSuccess, initialData }: EditProfileModalProps) {
    const { t, lang } = useTranslation();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [phone, setPhone] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(true);

    const [isPhoneVerified, setIsPhoneVerified] = useState(initialData.phone_verified || false);
    const [showOtpInput, setShowOtpInput] = useState(false);
    const [otp, setOtp] = useState('');
    const [isSendingOtp, setIsSendingOtp] = useState(false);
    const [isVerifyingOtp, setIsVerifyingOtp] = useState(false);

    useScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) {
            const parts = (initialData.full_name || '').trim().split(/\s+/);
            setFirstName(parts[0] || '');
            setLastName(parts.slice(1).join(' ') || '');
            setPhone(initialData.phone || '');
            setIsPhoneVerified(initialData.phone_verified || false);
            setShowOtpInput(false);
            setOtp('');
            setIsReadOnly(true); // Always start in view mode
        }
    }, [isOpen, initialData]);

    const handleSendOtp = async () => {
        if (!phone.trim()) {
            alert(lang === 'he' ? 'אנא הזן מספר טלפון קודם' : 'Please enter a phone number first');
            return;
        }
        setIsSendingOtp(true);
        try {
            const { error } = await supabase.functions.invoke('send-whatsapp-otp', {
                body: { phone: phone.trim() }
            });

            if (error) throw error;

            setShowOtpInput(true);
            alert(lang === 'he' ? 'קוד בן 6 ספרות נשלח ל-WhatsApp שלך' : 'A 6-digit code has been sent to your WhatsApp');
        } catch (error) {
            console.error('Error sending OTP:', error);
            alert(lang === 'he' ? 'שגיאה בשליחת קוד. בדוק את המספר שלך ונסה שוב.' : 'Error sending code. Check your number and try again.');
        } finally {
            setIsSendingOtp(false);
        }
    };

    const handleVerifyOtp = async () => {
        if (!otp.trim() || otp.length !== 6) {
            alert(lang === 'he' ? 'אנא הזן קוד חוקי בן 6 ספרות' : 'Please enter a valid 6-digit code');
            return;
        }
        setIsVerifyingOtp(true);
        try {
            const { data, error } = await supabase.functions.invoke('verify-whatsapp-otp', {
                body: { phone: phone.trim(), token: otp.trim() }
            });

            if (error) throw error;

            if (data?.verified) {
                setIsPhoneVerified(true);
                setShowOtpInput(false);
                alert(lang === 'he' ? 'הטלפון אומת בהצלחה!' : 'Phone verified successfully!');
                onSuccess(); // refresh parent
            }
        } catch (error) {
            console.error('Error verifying OTP:', error);
            alert(lang === 'he' ? 'קוד שגוי או פג תוקף.' : 'Incorrect or expired code.');
        } finally {
            setIsVerifyingOtp(false);
        }
    };

    const handleSave = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            alert(lang === 'he' ? 'שם פרטי ושם משפחה הם שדות חובה' : 'First Name and Last Name are required.');
            return;
        }

        if (!phone.trim()) {
            alert(lang === 'he' ? 'מספר טלפון הוא שדה חובה' : 'Phone number is required.');
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error('No user found');

            const fullName = `${firstName.trim()} ${lastName.trim()}`;

            // If phone changed, mark as unverified
            const phoneChanged = phone.trim() !== (initialData.phone || '').trim();
            const newVerificationStatus = phoneChanged ? false : isPhoneVerified;

            const updates = {
                id: user.id,
                email: user.email,
                full_name: fullName,
                phone: phone.trim(),
                phone_verified: newVerificationStatus,
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('user_profiles')
                .upsert(updates);

            if (error) throw error;

            // Also update auth metadata for faster initial load next time
            await supabase.auth.updateUser({
                data: { full_name: fullName }
            });

            onSuccess();
        } catch (error) {
            console.error('Error updating profile:', error);
            alert(lang === 'he' ? `שגיאה בעדכון פרופיל: ${(error as any).message || 'שגיאה לא ידועה'}` : `Failed to update profile: ${(error as any).message || 'Unknown error'}`);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />

            <div className="relative w-full max-w-md bg-window border border-border rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col max-h-[90dvh]">
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-bold">{isReadOnly ? (lang === 'he' ? 'פרופיל' : 'Profile') : (lang === 'he' ? 'עריכת פרופיל' : 'Edit Profile')}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto flex-1">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                            <UserIcon className="w-10 h-10" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground dark:text-muted-foreground block ml-1">{lang === 'he' ? 'שם פרטי' : 'First Name'}</label>
                                <input
                                    type="text"
                                    value={firstName}
                                    onChange={(e) => setFirstName(e.target.value)}
                                    readOnly={isReadOnly}
                                    placeholder={lang === 'he' ? 'יוסי' : 'John'}
                                    className={`w-full p-3 border rounded-xl outline-none transition-all ${isReadOnly
                                        ? 'bg-muted border-border cursor-default'
                                        : 'bg-secondary border-border focus:ring-2 focus:ring-indigo-500'
                                        }`}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-black uppercase tracking-widest text-muted-foreground dark:text-muted-foreground block ml-1">{lang === 'he' ? 'שם משפחה' : 'Last Name'}</label>
                                <input
                                    type="text"
                                    value={lastName}
                                    onChange={(e) => setLastName(e.target.value)}
                                    readOnly={isReadOnly}
                                    placeholder={lang === 'he' ? 'כהן' : 'Doe'}
                                    className={`w-full p-3 border rounded-xl outline-none transition-all ${isReadOnly
                                        ? 'bg-muted border-border cursor-default'
                                        : 'bg-secondary border-border focus:ring-2 focus:ring-indigo-500'
                                        }`}
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground dark:text-muted-foreground block ml-1 flex items-center justify-between">
                                <span>{lang === 'he' ? 'טלפון' : 'Phone'}</span>
                                {isPhoneVerified && !isReadOnly && phone.trim() === initialData.phone?.trim() && (
                                    <span className="text-green-500 flex items-center gap-1 bg-green-500/10 px-2 rounded-full text-xs">
                                        ✓ {lang === 'he' ? 'מאומת (WhatsApp)' : 'Verified (WhatsApp)'}
                                    </span>
                                )}
                                {!isPhoneVerified && !isReadOnly && phone.trim() && (
                                    <span className="text-amber-500 flex items-center gap-1 bg-amber-500/10 px-2 rounded-full text-xs">
                                        ! {lang === 'he' ? 'לא מאומת' : 'Unverified'}
                                    </span>
                                )}
                            </label>

                            <div className="flex gap-2">
                                <input
                                    type="tel"
                                    value={phone}
                                    onChange={(e) => {
                                        setPhone(e.target.value);
                                        setIsPhoneVerified(false);
                                        setShowOtpInput(false);
                                    }}
                                    readOnly={isReadOnly}
                                    placeholder="0500000000 (include country code like +972...)"
                                    className={`w-full p-3 border rounded-xl outline-none transition-all ${isReadOnly
                                        ? 'bg-muted border-border cursor-default'
                                        : 'bg-secondary border-border focus:ring-2 focus:ring-indigo-500'
                                        }`}
                                />
                                {!isReadOnly && !isPhoneVerified && phone.trim() && !showOtpInput && (
                                    <button
                                        onClick={handleSendOtp}
                                        disabled={isSendingOtp || isLoading}
                                        className="px-4 bg-primary text-white rounded-xl font-bold text-xs uppercase hover:bg-primary/90 transition-all flex items-center justify-center min-w-[100px]"
                                    >
                                        {isSendingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === 'he' ? 'שלח קוד' : 'Verify')}
                                    </button>
                                )}
                            </div>

                            {showOtpInput && !isReadOnly && (
                                <div className="mt-3 p-4 bg-primary/5 rounded-xl border border-primary/20 space-y-3 animate-in fade-in slide-in-from-top-2">
                                    <label className="text-xs font-black text-primary block">{lang === 'he' ? 'קוד אימות (WhatsApp)' : 'Verification Code (WhatsApp)'}</label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            maxLength={6}
                                            value={otp}
                                            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                                            placeholder="123456"
                                            className="w-full p-3 border border-primary/30 rounded-xl outline-none tracking-widest text-center font-black focus:ring-2 focus:ring-primary/50 bg-background"
                                        />
                                        <button
                                            onClick={handleVerifyOtp}
                                            disabled={isVerifyingOtp || otp.length !== 6}
                                            className="px-6 bg-primary text-white rounded-xl font-bold text-xs uppercase hover:bg-primary/90 transition-all disabled:opacity-50 flex items-center justify-center min-w-[100px]"
                                        >
                                            {isVerifyingOtp ? <Loader2 className="w-4 h-4 animate-spin" /> : (lang === 'he' ? 'אמת' : 'Confirm')}
                                        </button>
                                    </div>
                                    <p className="text-xs text-muted-foreground">{lang === 'he' ? 'הכנס את הקוד שקיבלת ל-WhatsApp. אם לא קיבלת, ודא שהוספת קידומת בינלאומית, למשל +972' : 'Enter the code sent to your WhatsApp. Make sure your number includes country code e.g. +1 or +972.'}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-secondary flex gap-3 shrink-0">
                    {isReadOnly ? (
                        <>
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 px-4 bg-background border border-border text-foreground font-medium rounded-xl hover:bg-secondary active:scale-[0.98] transition-all"
                            >
                                {lang === 'he' ? 'סגור' : 'Close'}
                            </button>
                            <button
                                onClick={() => setIsReadOnly(false)}
                                className="flex-1 py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                            >
                                <Edit className="w-5 h-5" />
                                {lang === 'he' ? 'ערוך' : 'Edit'}
                            </button>
                        </>
                    ) : (
                        <>
                            <button
                                onClick={() => {
                                    setIsReadOnly(true);
                                    const parts = (initialData.full_name || '').trim().split(/\s+/);
                                    setFirstName(parts[0] || '');
                                    setLastName(parts.slice(1).join(' ') || '');
                                    setPhone(initialData.phone || '');
                                }}
                                className="flex-1 py-3 px-4 bg-background border border-border text-foreground font-medium rounded-xl hover:bg-secondary active:scale-[0.98] transition-all"
                            >
                                {lang === 'he' ? 'ביטול' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isLoading}
                                className="flex-1 py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                            >
                                {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {lang === 'he' ? 'שמור שינויים' : 'Save Changes'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}

import { createPortal } from 'react-dom';

// Notification Settings Modal
export function NotificationsSettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { lang } = useTranslation();
    const [contractExpiryDays, setContractExpiryDays] = useState(60);
    const [extensionOptionDays, setExtensionOptionDays] = useState(30);
    const [extensionOptionEndDays, setExtensionOptionEndDays] = useState(7);
    const [marketingConsent, setMarketingConsent] = useState(true);
    const [unpaidRentEnabled, setUnpaidRentEnabled] = useState(true);
    const [whatsappEnabled, setWhatsappEnabled] = useState(false);
    const [emailEnabled, setEmailEnabled] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

    useScrollLock(isOpen);

    useEffect(() => {
        if (isOpen) {
            loadPreferences();
        }
    }, [isOpen]);

    const loadPreferences = async () => {
        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('user_profiles')
                .select('notification_preferences, marketing_consent')
                .eq('id', user.id)
                .single();

            if (!error && data?.notification_preferences) {
                const prefs = data.notification_preferences as any;
                setContractExpiryDays(prefs.contract_expiry_days ?? 60);
                setExtensionOptionDays(prefs.extension_option_days ?? 30);
                setExtensionOptionEndDays(prefs.extension_option_end_days ?? 7);
                setUnpaidRentEnabled(prefs.unpaid_rent_enabled ?? true);
                setMarketingConsent(data.marketing_consent ?? true);
            }

            // Also fetch channel preferences
            const { data: autoSettings, error: autoError } = await supabase
                .from('user_automation_settings')
                .select('whatsapp_notifications_enabled')
                .eq('user_id', user.id)
                .single();

            if (!autoError && autoSettings) {
                setWhatsappEnabled((autoSettings as any).whatsapp_notifications_enabled ?? false);
                setEmailEnabled((autoSettings as any).email_notifications_enabled ?? true);
            }
        } catch (error) {
            console.error('Error loading notification preferences:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleSave = async () => {
        setIsSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('No user found');

            // Fetch current prefs to merge
            const { data: currentData } = await supabase
                .from('user_profiles')
                .select('notification_preferences')
                .eq('id', user.id)
                .single();

            const currentPrefs = (currentData?.notification_preferences as any) || {};

            const newPrefs = {
                ...currentPrefs,
                contract_expiry_days: Math.min(Math.max(contractExpiryDays, 1), 365),
                extension_option_days: Math.min(Math.max(extensionOptionDays, 1), 180),
                extension_option_end_days: Math.min(Math.max(extensionOptionEndDays, 1), 180),
                unpaid_rent_enabled: unpaidRentEnabled
            };

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    notification_preferences: newPrefs,
                    marketing_consent: marketingConsent
                })
                .eq('id', user.id);

            if (error) throw error;

            // Save channel preferences
            const { error: autoError } = await supabase
                .from('user_automation_settings')
                .upsert({
                    user_id: user.id,
                    whatsapp_notifications_enabled: whatsappEnabled,
                    email_notifications_enabled: emailEnabled,
                    updated_at: new Date().toISOString()
                }, { onConflict: 'user_id' });

            if (autoError) {
                console.error('Error saving channel preferences:', autoError);
                // We won't throw here to not block the main save success, but log it
            }

            alert(lang === 'he' ? 'העדפות נשמרו בהצלחה!' : 'Preferences saved successfully!');
            onClose();
        } catch (error) {
            console.error('Error saving notification preferences:', error);
            alert(lang === 'he' ? 'שגיאה בשמירת העדפות' : 'Error saving preferences');
        } finally {
            setIsSaving(false);
        }
    };

    if (!isOpen) return null;

    return createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-window border border-border rounded-[2rem] shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[90dvh] flex flex-col">
                <div className="p-4 border-b flex items-center justify-between shrink-0">
                    <h2 className="text-lg font-bold">{lang === 'he' ? 'הגדרות התראות' : 'Notification Settings'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {isLoading ? (
                    <div className="p-8 flex justify-center">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                    </div>
                ) : (
                    <>
                        <div className="p-6 space-y-6 overflow-y-auto flex-1">
                            {/* Marketing Consent */}
                            <div className="space-y-3 pb-4 border-b border-border">
                                <h3 className="text-sm font-semibold text-foreground/70 mb-2">
                                    {lang === 'he' ? 'עדכונים וחדשות' : 'News & Updates'}
                                </h3>
                                <Checkbox
                                    label={lang === 'he' ? 'קבלת עדכונים על תכונות חדשות ומבצעים' : 'Receive updates about new features and promotions'}
                                    checked={marketingConsent}
                                    onChange={setMarketingConsent}
                                    className="border-none p-0 bg-transparent"
                                />
                            </div>

                            <h3 className="text-sm font-semibold text-foreground/70 mb-2 mt-4">
                                {lang === 'he' ? 'ערוצי קבלת התראות' : 'Delivery Channels'}
                            </h3>

                            {/* Delivery Channels */}
                            <div className="space-y-3 pb-4 border-b border-border">
                                <Checkbox
                                    label={lang === 'he' ? 'קבלת התראות ב-WhatsApp (בקרוב)' : 'WhatsApp Notifications (Soon)'}
                                    checked={whatsappEnabled}
                                    onChange={setWhatsappEnabled}
                                    className="border-none p-0 bg-transparent"
                                />
                                <Checkbox
                                    label={lang === 'he' ? 'קבלת התראות באימייל' : 'Email Notifications'}
                                    checked={emailEnabled}
                                    onChange={setEmailEnabled}
                                    className="border-none p-0 bg-transparent"
                                />
                            </div>

                            <h3 className="text-sm font-semibold text-foreground/70 mb-2 mt-4">
                                {lang === 'he' ? 'תזכורות אישיות' : 'Personal Reminders'}
                            </h3>

                            {/* Contract Expiry */}
                            <div className="space-y-3 pb-4 border-b border-border">
                                <Checkbox
                                    label={lang === 'he' ? 'התראה לפני סיום חוזה' : 'Contract Expiry Warning'}
                                    checked={contractExpiryDays > 0}
                                    onChange={(val) => setContractExpiryDays(val ? 60 : 0)}
                                    className="border-none p-0 bg-transparent"
                                />
                                {contractExpiryDays > 0 && (
                                    <div className="mr-8 space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            {lang === 'he' ? 'קבל התראה כמה ימים לפני שחוזה עומד להסתיים' : 'Days before contract expires'}
                                        </p>
                                        <input
                                            type="number"
                                            min="1"
                                            max="180"
                                            value={contractExpiryDays}
                                            onChange={(e) => setContractExpiryDays(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full p-3 border border-border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>


                            {/* Unpaid Rent */}
                            <div className="space-y-3 pb-4 border-b border-border">
                                <Checkbox
                                    label={lang === 'he' ? 'התראה על שכר דירה שלא שולם' : 'Unpaid Rent Notification'}
                                    checked={unpaidRentEnabled}
                                    onChange={setUnpaidRentEnabled}
                                    className="border-none p-0 bg-transparent"
                                />
                                <div className="mr-8 space-y-2">
                                    <p className="text-xs text-muted-foreground">
                                        {lang === 'he' ? 'קבל התראה כאשר תשלום שכר דירה לא בוצע בזמן' : 'Get notified when a rent payment has not been paid'}
                                    </p>
                                </div>
                            </div>

                            {/* Extension Option */}
                            <div className="space-y-3 pb-4 border-b border-border">
                                <Checkbox
                                    label={lang === 'he' ? 'התראה לפני תחילת אופציית הארכה' : 'Extension Option Starting'}
                                    checked={extensionOptionDays > 0}
                                    onChange={(val) => setExtensionOptionDays(val ? 30 : 0)}
                                    className="border-none p-0 bg-transparent"
                                />
                                {extensionOptionDays > 0 && (
                                    <div className="mr-8 space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            {lang === 'he' ? 'קבל התראה כמה ימים לפני שאופציית ההארכה מתחילה' : 'Days before extension option starts'}
                                        </p>
                                        <input
                                            type="number"
                                            min="1"
                                            max="180"
                                            value={extensionOptionDays}
                                            onChange={(e) => setExtensionOptionDays(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full p-3 border border-border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Extension Option Deadline */}
                            <div className="space-y-3">
                                <Checkbox
                                    label={lang === 'he' ? 'התראה לפני מועד הודעת הארכה' : 'Extension Deadline Warning'}
                                    checked={extensionOptionEndDays > 0}
                                    onChange={(val) => setExtensionOptionEndDays(val ? 7 : 0)}
                                    className="border-none p-0 bg-transparent"
                                />
                                {extensionOptionEndDays > 0 && (
                                    <div className="mr-8 space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            {lang === 'he' ? 'קבל התראה כמה ימים לפני המועד להודיע על הארכה' : 'Days before extension announcement deadline'}
                                        </p>
                                        <input
                                            type="number"
                                            min="1"
                                            max="180"
                                            value={extensionOptionEndDays}
                                            onChange={(e) => setExtensionOptionEndDays(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full p-3 border border-border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>
                        </div>

                        <div className="p-4 border-t bg-secondary flex gap-3 shrink-0">
                            <button
                                onClick={onClose}
                                className="flex-1 py-3 px-4 bg-background border border-border text-foreground font-medium rounded-xl hover:bg-secondary active:scale-[0.98] transition-all"
                            >
                                {lang === 'he' ? 'ביטול' : 'Cancel'}
                            </button>
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className="flex-1 py-3 px-4 bg-primary text-white font-medium rounded-xl hover:bg-primary/90 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                            >
                                {isSaving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {lang === 'he' ? 'שמור' : 'Save'}
                            </button>
                        </div>
                    </>
                )}
            </div>
        </div>,
        document.body
    );
}
