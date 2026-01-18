import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import logoFinalCleanV2 from '../assets/logo-final-clean-v2.png';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Bell, Shield, Wallet, CreditCard, ChevronRight, Mail, Send, Check, LogOut, Receipt, Languages, Cloud } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import type { Language, Gender } from '../types/database';
import { EditProfileModal, NotificationsSettingsModal } from '../components/modals/EditProfileModal';
import { SubscriptionCard } from '../components/subscription/SubscriptionCard';
import { useTranslation } from '../hooks/useTranslation';
import { PrivacySecurityModal } from '../components/modals/PrivacySecurityModal';
import { googleDriveService } from '../services/google-drive.service';

export function Settings() {
    const { preferences, setLanguage, setGender } = useUserPreferences();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const [isAdmin, setIsAdmin] = useState(false);
    const [isGoogleDriveConnected, setIsGoogleDriveConnected] = useState(false);
    const [checkingDrive, setCheckingDrive] = useState(true);

    const [userData, setUserData] = useState<{ full_name: string | null; email: string | null; first_name?: string; last_name?: string }>({
        full_name: '',
        email: '',
        first_name: '',
        last_name: ''
    });

    const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
    const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
    const [isPrivacySecurityOpen, setIsPrivacySecurityOpen] = useState(false);
    const [contactMessage, setContactMessage] = useState('');
    const [isSendingMessage, setIsSendingMessage] = useState(false);
    const [messageSent, setMessageSent] = useState(false);
    const [isContactOpen, setIsContactOpen] = useState(false);

    useEffect(() => {
        fetchUserData();
        checkGoogleDrive();
    }, []);

    const checkGoogleDrive = async () => {
        try {
            const connected = await googleDriveService.isConnected();
            setIsGoogleDriveConnected(connected);
        } catch (error) {
            console.error('Failed to check Google Drive status:', error);
        } finally {
            setCheckingDrive(false);
        }
    };

    const handleGoogleDriveConnect = async () => {
        try {
            await googleDriveService.connectGoogleDrive();
        } catch (error) {
            console.error('Failed to initiate Google Drive connection:', error);
        }
    };

    const handleGoogleDriveDisconnect = async () => {
        if (window.confirm('Are you sure you want to disconnect Google Drive?')) {
            try {
                await googleDriveService.disconnect();
                setIsGoogleDriveConnected(false);
            } catch (error) {
                console.error('Failed to disconnect Google Drive:', error);
            }
        }
    };

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
        { value: 'female', label: 'Female', labelHe: 'נקבה' }
    ];

    const settingsSections = [
        {
            title: t('manageAccount'),
            items: [
                {
                    icon: User,
                    label: t('profile'),
                    description: t('managePersonalInfo'),
                    onClick: () => setIsEditProfileOpen(true)
                },
                {
                    icon: Bell,
                    label: t('notifications'),
                    description: t('configureAlerts'),
                    onClick: () => setIsNotificationsOpen(true)
                },
                {
                    icon: Shield,
                    label: t('privacySecurity'),
                    description: t('controlData'),
                    onClick: () => setIsPrivacySecurityOpen(true)
                },
            ]
        },
        {
            title: 'Storage & Integrations',
            items: [
                {
                    icon: Cloud,
                    label: 'Google Drive',
                    description: isGoogleDriveConnected ? 'Connected' : 'Connect your Google Drive',
                    onClick: isGoogleDriveConnected ? handleGoogleDriveDisconnect : handleGoogleDriveConnect,
                    badge: isGoogleDriveConnected ? (
                        <div className="flex items-center gap-1 text-green-600">
                            <Check className="w-3 h-3" />
                            <span className="text-xs font-medium">Connected</span>
                        </div>
                    ) : null
                }
            ]
        }
    ];

    const handleSendMessage = async () => {
        if (!contactMessage.trim()) return;

        setIsSendingMessage(true);

        try {
            // Get current user
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error('Not authenticated');

            // Save message to database
            const { error: dbError } = await supabase
                .from('contact_messages')
                .insert({
                    user_id: user.id,
                    user_name: userData.full_name || 'RentMate User',
                    user_email: userData.email || user.email,
                    message: contactMessage,
                    status: 'new'
                });

            if (dbError) throw dbError;

            // Send email notification via Edge Function
            const { error: emailError } = await supabase.functions.invoke('send-contact-email', {
                body: { user_id: user.id, user_name: userData.full_name, user_email: userData.email, message: contactMessage }
            });

            if (emailError) {
                console.error('Email notification failed:', emailError);
                throw new Error(emailError.message || 'Email sending failed');
            }

            // Show success
            setMessageSent(true);
            setContactMessage('');
            setTimeout(() => setMessageSent(false), 3000);
        } catch (error) {
            console.error('Error sending message:', error);
            alert(`Failed to send message: ${error instanceof Error ? error.message : 'Unknown error'}`);
        } finally {
            setIsSendingMessage(false);
        }
    };

    return (
        <div className="space-y-6 px-4 pt-6">
            {/* Header */}
            <div className="relative h-20 flex items-center justify-between mb-2">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('settings')}</h1>
                    <p className="text-sm text-muted-foreground">{t('manageAccount')}</p>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <img src={logoFinalCleanV2} alt="RentMate" className="h-16 w-auto object-contain drop-shadow-sm" />
                </div>

                <div className="w-8"></div> {/* Spacer for balance */}
            </div>

            {/* Subscription Card */}
            <SubscriptionCard />

            {/* User Profile Card - Clickable */}
            <div
                className="bg-card border border-border rounded-2xl p-6 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition-colors group relative"
            >
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-xl group-hover:scale-110 transition-transform">
                    {userData.full_name?.charAt(0) || userData.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                    <h3 className="font-bold text-lg">{userData.full_name || 'RentMate User'}</h3>
                    <p className="text-sm text-muted-foreground">{userData.email}</p>
                </div>
                <button className="text-sm text-primary font-medium opacity-0 group-hover:opacity-100 transition-opacity">{t('edit')}</button>
            </div>

            {/* Admin Dashboard Link (Only visible to admins) */}
            {
                isAdmin && (
                    <div className="bg-gradient-to-r from-brand-600 to-purple-600 rounded-2xl p-6 text-white shadow-lg cursor-pointer" onClick={() => window.location.href = '/admin'}>
                        <div className="flex items-center justify-between">
                            <div>
                                <h3 className="font-bold text-lg">Admin Dashboard</h3>
                                <p className="text-sm opacity-90">Manage users, invoices, and system settings</p>
                            </div>
                            <Shield className="w-8 h-8 opacity-80" />
                        </div>
                    </div>
                )
            }

            {/* Language & Localization Section */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                    {t('languageLocalization')}
                </h2>
                <div className="bg-card border border-border rounded-2xl p-6 space-y-6">
                    {/* Language Selection */}
                    <div className="space-y-3">
                        <div className="flex items-center gap-2">
                            <Languages className="w-5 h-5 text-foreground" />
                            <label className="font-medium text-foreground">{t('language')}</label>
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                            {languageOptions.map((option) => (
                                <button
                                    key={option.value}
                                    onClick={() => setLanguage(option.value)}
                                    className={`p - 4 rounded - xl border - 2 transition - all ${preferences.language === option.value
                                        ? 'border-primary bg-primary/5'
                                        : 'border-border hover:border-primary/50'
                                        } `}
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
                                <label className="font-medium text-foreground">{t('genderForHebrew')}</label>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                {preferences.language === 'he' ? 'זה עוזר לנו להציג לך טקסט עם המגדר הדקדוקי הנכון בעברית' : 'This helps us show you text with the correct grammatical gender in Hebrew'}
                            </p>
                            <div className="grid grid-cols-1 gap-3">
                                {genderOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        onClick={() => setGender(option.value)}
                                        className={`p - 4 rounded - xl border - 2 transition - all ${preferences.gender === option.value
                                            ? 'border-primary bg-primary/5'
                                            : 'border-border hover:border-primary/50'
                                            } `}
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
            {
                settingsSections.map((section) => (
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
                ))
            }

            {/* Contact Support Section */}
            <div className="space-y-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide px-1">
                    {t('support')}
                </h2>
                <div className="bg-card border border-border rounded-2xl overflow-hidden shadow-sm">
                    <button
                        onClick={() => setIsContactOpen(!isContactOpen)}
                        className="w-full flex items-center gap-4 p-4 hover:bg-secondary/50 transition-colors text-left"
                    >
                        <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center">
                            <Mail className="w-5 h-5 text-foreground" />
                        </div>
                        <div className="flex-1">
                            <div className="font-medium text-foreground">{t('contactSupport')}</div>
                            <div className="text-sm text-muted-foreground">
                                {t('contactSupportDesc')}
                            </div>
                        </div>
                        <ChevronRight className={`w - 5 h - 5 text - muted - foreground transition - transform duration - 200 ${isContactOpen ? 'rotate-90' : ''} `} />
                    </button>

                    {isContactOpen && (
                        <div className="p-6 pt-0 border-t border-border mt-4">
                            <textarea
                                value={contactMessage}
                                onChange={(e) => setContactMessage(e.target.value)}
                                placeholder={t('typeMessageHere')}
                                className="w-full min-h-[120px] p-4 border border-border rounded-xl resize-none focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all mt-4"
                                disabled={isSendingMessage}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!contactMessage.trim() || isSendingMessage}
                                className={`w - full mt - 4 flex items - center justify - center gap - 2 p - 3 rounded - xl font - medium transition - all ${!contactMessage.trim() || isSendingMessage
                                    ? 'bg-secondary text-muted-foreground cursor-not-allowed'
                                    : 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-lg shadow-primary/25'
                                    } `}
                            >
                                {isSendingMessage ? (
                                    <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                                ) : messageSent ? (
                                    <>
                                        <Check className="w-5 h-5" />
                                        Sent
                                    </>
                                ) : (
                                    <>
                                        <Send className="w-5 h-5" />
                                        Send
                                    </>
                                )}
                            </button>
                            <p className="text-xs text-muted-foreground text-center mt-4">
                                {t('orEmailDirectly')} <a href="mailto:support@rentmate.co.il" className="text-primary hover:underline">support@rentmate.co.il</a>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Logout Button */}
            <button
                onClick={async () => {
                    await supabase.auth.signOut();
                    window.location.href = '/login';
                }}
                className="w-full flex items-center justify-center gap-2 p-4 bg-destructive/10 text-destructive rounded-2xl font-medium hover:bg-destructive/20 transition-colors"
            >
                <LogOut className="w-5 h-5" />
                {t('logout')}
            </button>

            {/* App Version */}
            <div className="text-center text-xs text-muted-foreground pt-4 space-y-2">
                <div>{t('appVersion')}</div>
                <button
                    onClick={() => navigate('/accessibility')}
                    className="text-primary hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded px-2"
                >
                    {t('accessibilityStatement')}
                </button>
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

            <PrivacySecurityModal
                isOpen={isPrivacySecurityOpen}
                onClose={() => setIsPrivacySecurityOpen(false)}
            />
        </div >
    );
}
