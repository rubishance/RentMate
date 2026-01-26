import { useState, useEffect } from 'react';
import { X, Save, User as UserIcon, Loader2, Edit } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';

interface EditProfileModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    initialData: {
        first_name: string;
        last_name: string;
    };
}

export function EditProfileModal({ isOpen, onClose, onSuccess, initialData }: EditProfileModalProps) {
    const { t, lang } = useTranslation();
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isReadOnly, setIsReadOnly] = useState(true);

    useEffect(() => {
        if (isOpen) {
            setFirstName(initialData.first_name || '');
            setLastName(initialData.last_name || '');
            setIsReadOnly(true); // Always start in view mode
        }
    }, [isOpen, initialData]);

    const handleSave = async () => {
        if (!firstName.trim() || !lastName.trim()) {
            alert(lang === 'he' ? 'שם פרטי ושם משפחה הם שדות חובה' : 'Both First Name and Last Name are required.');
            return;
        }

        setIsLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();

            if (!user) throw new Error('No user found');

            const updates = {
                id: user.id,
                email: user.email,
                first_name: firstName.trim(),
                last_name: lastName.trim(),
                full_name: `${firstName} ${lastName}`.trim(),
                updated_at: new Date().toISOString(),
            };

            const { error } = await supabase
                .from('user_profiles')
                .upsert(updates);

            if (error) throw error;

            // Also update auth metadata for faster initial load next time
            await supabase.auth.updateUser({
                data: { full_name: updates.full_name }
            });

            onSuccess();
        } catch (error) {
            console.error('Error updating profile:', error);
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

            <div className="relative w-full max-w-md bg-card border border-border rounded-[2.5rem] shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-bold">{isReadOnly ? (lang === 'he' ? 'פרופיל' : 'Profile') : (lang === 'he' ? 'עריכת פרופיל' : 'Edit Profile')}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-muted rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center text-primary mb-2">
                            <UserIcon className="w-10 h-10" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{lang === 'he' ? 'שם פרטי' : 'First Name'}</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                readOnly={isReadOnly}
                                className={`w-full p-3 border rounded-xl outline-none transition-all ${isReadOnly
                                    ? 'bg-muted border-border cursor-default'
                                    : 'bg-secondary border-border focus:ring-2 focus:ring-indigo-500'
                                    }`}
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{lang === 'he' ? 'שם משפחה' : 'Last Name'}</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                readOnly={isReadOnly}
                                className={`w-full p-3 border rounded-xl outline-none transition-all ${isReadOnly
                                    ? 'bg-muted border-border cursor-default'
                                    : 'bg-secondary border-border focus:ring-2 focus:ring-indigo-500'
                                    }`}
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-secondary flex gap-3">
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
                                    setFirstName(initialData.first_name || '');
                                    setLastName(initialData.last_name || '');
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
    const [rentDueDays, setRentDueDays] = useState(3);
    const [extensionOptionDays, setExtensionOptionDays] = useState(30);
    const [extensionOptionEndDays, setExtensionOptionEndDays] = useState(7);
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);

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
                .from('user_automation_settings')
                .select('*')
                .eq('user_id', user.id)
                .single();

            if (!error && data) {
                setContractExpiryDays(data.lease_expiry_days || 60);
                setRentDueDays(data.rent_overdue_days || 3);
                setExtensionOptionDays(data.extension_notice_days || 30);
                // setExtensionOptionEndDays(data.extension_option_end_days || 7); // Not in DB yet, sticking to task plan columns
            } else if (error && error.code === 'PGRST116') {
                // No settings yet, defaults are fine
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

            const updates = {
                user_id: user.id,
                lease_expiry_days: Math.min(Math.max(contractExpiryDays, 1), 365),
                rent_overdue_days: Math.min(Math.max(rentDueDays, 1), 180),
                extension_notice_days: Math.min(Math.max(extensionOptionDays, 1), 180),
                // extension_option_end_days: ... 
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('user_automation_settings')
                .upsert(updates);

            if (error) throw error;

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
            <div className="relative w-full max-w-md bg-card border border-border rounded-[2rem] shadow-xl overflow-hidden animate-in fade-in zoom-in duration-200 max-h-[85vh] flex flex-col">
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
                            {/* Contract Expiry */}
                            <div className="space-y-3 pb-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="contract-expiry-enabled"
                                        checked={contractExpiryDays > 0}
                                        onChange={(e) => setContractExpiryDays(e.target.checked ? 60 : 0)}
                                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <label htmlFor="contract-expiry-enabled" className="text-sm font-bold text-foreground cursor-pointer">
                                        {lang === 'he' ? 'התראה לפני סיום חוזה' : 'Contract Expiry Warning'}
                                    </label>
                                </div>
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

                            {/* Rent Due */}
                            <div className="space-y-3 pb-4 border-b border-border">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="rent-due-enabled"
                                        checked={rentDueDays > 0}
                                        onChange={(e) => setRentDueDays(e.target.checked ? 3 : 0)}
                                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <label htmlFor="rent-due-enabled" className="text-sm font-bold text-foreground cursor-pointer">
                                        {lang === 'he' ? 'התראה לפני תשלום שכירות' : 'Rent Due Warning'}
                                    </label>
                                </div>
                                {rentDueDays > 0 && (
                                    <div className="mr-8 space-y-2">
                                        <p className="text-xs text-muted-foreground">
                                            {lang === 'he' ? 'קבל התראה כמה ימים לפני מועד תשלום השכירות' : 'Days before rent is due'}
                                        </p>
                                        <input
                                            type="number"
                                            min="1"
                                            max="180"
                                            value={rentDueDays}
                                            onChange={(e) => setRentDueDays(Math.max(1, parseInt(e.target.value) || 1))}
                                            className="w-full p-3 border border-border rounded-xl outline-none focus:ring-2 focus:ring-indigo-500"
                                        />
                                    </div>
                                )}
                            </div>

                            {/* Extension Option */}
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="extension-option-enabled"
                                        checked={extensionOptionDays > 0}
                                        onChange={(e) => setExtensionOptionDays(e.target.checked ? 30 : 0)}
                                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <label htmlFor="extension-option-enabled" className="text-sm font-bold text-foreground cursor-pointer">
                                        {lang === 'he' ? 'התראה לפני תחילת אופציית הארכה' : 'Extension Option Starting'}
                                    </label>
                                </div>
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
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        id="extension-deadline-enabled"
                                        checked={extensionOptionEndDays > 0}
                                        onChange={(e) => setExtensionOptionEndDays(e.target.checked ? 7 : 0)}
                                        className="w-5 h-5 text-primary rounded focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                                    />
                                    <label htmlFor="extension-deadline-enabled" className="text-sm font-bold text-foreground cursor-pointer">
                                        {lang === 'he' ? 'התראה לפני מועד הודעת הארכה' : 'Extension Deadline Warning'}
                                    </label>
                                </div>
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
