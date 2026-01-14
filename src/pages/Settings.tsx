import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import logoFinalCleanV2 from '../assets/logo-final-clean-v2.png';
import { User, Bell, Shield, LogOut, ChevronRight, Languages, Check } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import type { Language, Gender } from '../types/database';
import { EditProfileModal, NotificationsSettingsModal } from '../components/modals/EditProfileModal';
import { SubscriptionCard } from '../components/subscription/SubscriptionCard';

export function Settings() {
    const { preferences, setLanguage, setGender } = useUserPreferences();
    const [isAdmin, setIsAdmin] = useState(false);
    const [userData, setUserData] = useState<{ full_name: string | null; email: string | null; first_name?: string; last_name?: string }>({
        full_name: '',
        email: '',
        first_name: '',
        last_name: ''
    });

    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);

    useEffect(() => {
        fetchUserData();
    }, []);

    const fetchUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            let name = user.user_metadata?.full_name;
            const email = user.email;

            const { data } = await supabase
                .from('user_profiles')
                .select('full_name, first_name, last_name, role')
                .eq('id', user.id)
                .single();

            if (data) {
                if (data.full_name) name = data.full_name;
                if (data.role === 'admin') setIsAdmin(true);
            }

            setUserData({
                full_name: name || 'User',
                email: email || '',
                first_name: data?.first_name || (name ? name.split(' ')[0] : ''),
                last_name: data?.last_name || (name ? name.split(' ').slice(1).join(' ') : '')
            });
        }
    };

    const languageOptions: { value: Language; label: string }[] = [
        { value: 'he', label: 'עברית (Hebrew)' },
        { value: 'en', label: 'English' },
    ];

    const genderOptions: { value: Gender; label: string; labelHe: string }[] = [
        { value: 'male', label: 'Male', labelHe: 'זכר' },
        { value: 'female', label: 'Female', labelHe: 'נקבה' },
        { value: 'unspecified', label: 'Rather Not Say', labelHe: 'מעדיף/ה לא לציין' },
    ];

    const settingsSections = [
        {
            title: 'Account',
            items: [
                { icon: User, label: 'Profile', description: 'Manage your personal information', onClick: () => setIsEditProfileOpen(true) },
                { icon: Bell, label: 'Notifications', description: 'Configure alerts and reminders', onClick: () => setIsNotificationsOpen(true) },
                { icon: Shield, label: 'Privacy & Security', description: 'Control your data and access', onClick: () => { } },
            ]
        }
    ];

    return (
        <div className="space-y-6 pb-20 px-4 pt-6">
            <div className="flex items-center justify-between relative min-h-[4rem]">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">Settings</h1>
                    <p className="text-sm text-muted-foreground mt-1">Manage your account and preferences</p>
                </div>
                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <img src={logoFinalCleanV2} alt="RentMate" className="h-16 w-auto object-contain drop-shadow-sm" />
                </div>
            </div>

            {/* Subscription Card */}
            <SubscriptionCard />

            {/* User Profile Card - Clickable */}
            <div
                onClick={() => setIsEditProfileOpen(true)}
                className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors group relative"
            >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl group-hover:scale-110 transition-transform">
                    {userData.full_name?.charAt(0) || userData.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg">{userData.full_name || 'RentMate User'}</h3>
                    <p className="text-sm text-muted-foreground">{userData.email}</p>
                </div>
                <button className="text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">Edit</button>
            </div>

            {/* Admin Dashboard Link (Only visible to admins) */}
            {isAdmin && (
                <div className="bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer" onClick={() => window.location.href = '/admin'}>
                    <div className="flex items-center justify-between">
                        <div>
                            <h3 className="font-bold text-lg">Admin Dashboard</h3>
                            <p className="text-sm opacity-90">Manage users, invoices, and system settings</p>
                        </div>
                        <Shield className="w-8 h-8 opacity-80" />
                    </div>
                </div>
            )}

            {/* Language & Localization Section */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                    Language & Localization
                </h2>
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                    {/* Language Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Languages className="w-5 h-5 text-foreground" />
                            <label className="font-medium text-foreground">Language</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {languageOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setLanguage(option.value)}
                                    className={`p-4 rounded-xl border-2 transition-all ${preferences.language === option.value
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                        }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <span className="font-medium">{option.label}</span>
                                        {preferences.language === option.value && (
                                            <Check className="w-5 h-5 text-primary" />
                                        )}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Gender Selection (only shown for Hebrew) */}
                    {preferences.language === 'he' && (
                        <div className="space-y-3 pt-3 border-t border-border">
                            <div className="flex items-center gap-2">
                                <User className="w-5 h-5 text-foreground" />
                                <label className="font-medium text-foreground">Gender (for Hebrew text)</label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                This helps us show you text with the correct grammatical gender in Hebrew
                            </p>
                            <div className="grid grid-cols-1 gap-3">
                                {genderOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setGender(option.value)}
                                        className={`p-4 rounded-xl border-2 transition-all ${preferences.gender === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                            }`}
                                    >
                                        <div className="flex items-center justify-between">
                                            <div className="text-left">
                                                <div className="font-medium">{option.labelHe}</div>
                                                <div className="text-sm text-muted-foreground">{option.label}</div>
                                            </div>
                                            {preferences.gender === option.value && (
                                                <Check className="w-5 h-5 text-primary" />
                                            )}
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Settings Sections */}
            {settingsSections.map((section) => (
                <div key={section.title} className="space-y-3">
                    <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                        {section.title}
                    </h2>
                    <div className="bg-card border border-border rounded-2xl overflow-hidden divide-y divide-border">
                        {section.items.map((item) => {
                            const Icon = item.icon;
                            return (
                                <button
                                    key={item.label}
                                    onClick={item.onClick}
                                    className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors text-left"
                                >
                                    <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                                        <Icon className="w-5 h-5 text-foreground" />
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium">{item.label}</div>
                                        <div className="text-sm text-muted-foreground">{item.description}</div>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground" />
                                </button>
                            );
                        })}
                    </div>
                </div>
            ))}

            {/* Logout Button */}
            <button
                onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/login';
                }}
                className="w-full flex items-center justify-center gap-2 p-4 bg-destructive/10 text-destructive rounded-2xl font-medium hover:bg-destructive/20 transition-colors"
            >
                <LogOut className="w-5 h-5" />
                Sign Out
            </button>

            {/* App Version */}
            <div className="text-center text-xs text-muted-foreground pt-4">
                RentMate v2.0 • Build 2026.01
            </div>

            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                onSuccess={() => {
                    fetchUserData();
                    setIsEditProfileOpen(false);
                }}
                initialData={{ first_name: userData.first_name || '', last_name: userData.last_name || '' }}
            />

            <NotificationsSettingsModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
            />
        </div>
    );
}
