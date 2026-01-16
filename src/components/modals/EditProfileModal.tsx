import { useState, useEffect } from 'react';
import { X, Save, User as UserIcon, Loader2 } from 'lucide-react';
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

    useEffect(() => {
        if (isOpen) {
            setFirstName(initialData.first_name || '');
            setLastName(initialData.last_name || '');
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

            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl overflow-hidden flex flex-col max-h-[90vh]">
                <div className="p-4 border-b flex items-center justify-between">
                    <h2 className="text-lg font-bold">{lang === 'he' ? 'עריכת פרופיל' : 'Edit Profile'}</h2>
                    <button onClick={onClose} className="p-2 hover:bg-gray-100 rounded-full">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    <div className="flex justify-center">
                        <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center text-blue-600 mb-2">
                            <UserIcon className="w-10 h-10" />
                        </div>
                    </div>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">{lang === 'he' ? 'שם פרטי' : 'First Name'}</label>
                            <input
                                type="text"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">{lang === 'he' ? 'שם משפחה' : 'Last Name'}</label>
                            <input
                                type="text"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all"
                            />
                        </div>
                    </div>
                </div>

                <div className="p-4 border-t bg-gray-50 flex gap-3">
                    <button
                        onClick={onClose}
                        className="flex-1 py-3 px-4 bg-white border border-gray-200 text-gray-700 font-medium rounded-xl hover:bg-gray-50 active:scale-[0.98] transition-all"
                    >
                        {lang === 'he' ? 'ביטול' : 'Cancel'}
                    </button>
                    <button
                        onClick={handleSave}
                        disabled={isLoading}
                        className="flex-1 py-3 px-4 bg-blue-600 text-white font-medium rounded-xl hover:bg-blue-700 active:scale-[0.98] transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                    >
                        {isLoading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        {lang === 'he' ? 'שמור שינויים' : 'Save Changes'}
                    </button>
                </div>
            </div>
        </div>
    );
}

// Simple Notification Modal (Stub)
export function NotificationsSettingsModal({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
    const { lang } = useTranslation();

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
            <div className="relative w-full max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-xl overflow-hidden p-6 text-center">
                <h2 className="text-lg font-bold mb-2">{lang === 'he' ? 'התראות' : 'Notifications'}</h2>
                <p className="text-gray-500 mb-6">{lang === 'he' ? 'העדפות התראות יגיעו בקרוב!' : 'Notification preferences are coming soon!'}</p>
                <button onClick={onClose} className="w-full py-3 bg-blue-600 text-white rounded-xl font-medium">{lang === 'he' ? 'סגור' : 'Close'}</button>
            </div>
        </div>
    );
}
