import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { User, Bell, Shield, ChevronRight, Mail, Send, Check, LogOut, MessageCircle } from 'lucide-react';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import type { Language, Gender } from '../types/database';
import { EditProfileModal, NotificationsSettingsModal } from '../components/modals/EditProfileModal';
import { useTranslation } from '../hooks/useTranslation';
import { PrivacySecurityModal } from '../components/modals/PrivacySecurityModal';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { Palette } from 'lucide-react';

export function Settings() {
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [isAdmin, setIsAdmin] = useState(false);

    const [userData, setUserData] = useState<{ full_name: string | null; email: string | null }>({
        full_name: '',
        email: ''
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
    }, []);

    const fetchUserData = async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            let name = user.user_metadata?.full_name;
            const email = user.email;

            const { data } = await supabase
                .from('user_profiles')
                .select('full_name, role')
                .eq('id', user.id)
                .single();

            if (data) {
                if (data.full_name) name = data.full_name;
                if (data.role === 'admin') setIsAdmin(true);
            }

            setUserData({
                full_name: name || t('user_generic'),
                email: email || ''
            });
        }
    };

    const handleSendMessage = async () => {
        setIsSendingMessage(true);
        // Simulate API call
        await new Promise(resolve => setTimeout(resolve, 2000));
        setIsSendingMessage(false);
        setMessageSent(true);
        setTimeout(() => setMessageSent(false), 3000);
        setContactMessage('');
    };

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
        }
    ];

    return (
        <div className="pb-40 pt-8 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-700 px-4 md:px-8">
            {/* Header */}
            <div className="space-y-1">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-2">
                    <User className="w-3 h-3 text-indigo-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        {t('preferencesAndAccount')}
                    </span>
                </div>
                <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight lowercase">
                    {t('settings')}
                </h1>
            </div>

            {/* User Profile Card */}
            <div
                onClick={() => setIsEditProfileOpen(true)}
                className="glass-premium dark:bg-neutral-900/60 border-white/10 rounded-[3rem] p-10 flex items-center gap-10 cursor-pointer shadow-minimal hover:shadow-jewel transition-all duration-700 group relative overflow-hidden"
            >
                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-bl-[4rem] -translate-y-full group-hover:translate-y-0 transition-transform duration-1000 pointer-events-none" />

                <div className="w-24 h-24 rounded-[2rem] bg-white/5 dark:bg-neutral-800/40 flex items-center justify-center text-foreground font-black text-4xl group-hover:scale-110 group-hover:rotate-3 transition-all duration-700 shadow-minimal border border-white/5">
                    {userData.full_name?.charAt(0) || userData.email?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 space-y-2">
                    <h3 className="font-black text-3xl tracking-tighter text-foreground lowercase leading-none">{userData.full_name || 'rentmate user'}</h3>
                    <p className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-40">{userData.email}</p>
                </div>
                <div className="w-14 h-14 rounded-2xl glass-premium border-white/10 flex items-center justify-center text-muted-foreground/30 group-hover:bg-foreground group-hover:text-background group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-minimal">
                    <ChevronRight className="w-7 h-7" />
                </div>
            </div>

            {/* Admin Dashboard Link */}
            {isAdmin && (
                <div
                    onClick={() => window.location.href = '/admin'}
                    className="button-jewel rounded-[3rem] p-10 shadow-jewel cursor-pointer hover:scale-[1.02] active:scale-[0.98] transition-all group overflow-hidden relative"
                >
                    <div className="absolute top-0 right-0 w-48 h-48 bg-white/20 rounded-full -translate-y-1/2 translate-x-1/2 blur-3xl group-hover:scale-125 transition-transform duration-1000" />
                    <div className="flex items-center justify-between relative z-10 text-white">
                        <div className="space-y-2 text-center md:text-left rtl:md:text-right w-full md:w-auto">
                            <h3 className="font-black text-2xl tracking-tighter uppercase mb-1">{t('settings_admin_dashboard')}</h3>
                            <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-60">{t('settings_admin_desc')}</p>
                        </div>
                        <Shield className="w-12 h-12 opacity-30 group-hover:rotate-12 transition-transform duration-500 hidden md:block" />
                    </div>
                </div>
            )}

            {/* Settings Sections */}
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-8">
                {settingsSections.map((section) => (
                    <div key={section.title} className="space-y-8">
                        <div className="px-4">
                            <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40 tracking-[0.5em] block mb-2">{section.title}</span>
                        </div>
                        <div className="glass-premium dark:bg-neutral-900/40 border-white/5 rounded-[3rem] overflow-hidden shadow-minimal divide-y divide-white/5">
                            {section.items.map((item) => {
                                const Icon = item.icon;
                                return (
                                    <button
                                        key={item.label}
                                        onClick={item.onClick}
                                        className="w-full flex items-center gap-8 p-10 hover:bg-white/5 transition-all text-left group"
                                    >
                                        <div className="w-16 h-16 rounded-2xl glass-premium border-white/10 flex items-center justify-center group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                                            <Icon className="w-7 h-7 text-foreground opacity-60 group-hover:opacity-100" />
                                        </div>
                                        <div className="flex-1 space-y-2">
                                            <div className="font-black text-xl tracking-tighter text-foreground lowercase">{item.label}</div>
                                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{item.description}</div>
                                        </div>
                                        <ChevronRight className="w-6 h-6 text-muted-foreground/20 group-hover:text-primary group-hover:translate-x-2 transition-all duration-500" />
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                ))}
            </div>

            {/* App Appearance Section (New) */}
            <div className="space-y-6">
                <div className="px-4">
                    <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40 tracking-[0.5em] block mb-2">{t('appearance')}</span>
                </div>
                <div className="glass-premium dark:bg-neutral-900/40 border-white/5 rounded-[3rem] p-10 shadow-minimal space-y-10">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl glass-premium border-white/10 flex items-center justify-center">
                                <Palette className="w-7 h-7 text-foreground opacity-60" />
                            </div>
                            <div>
                                <div className="font-black text-xl tracking-tighter text-foreground lowercase">{t('theme')}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{t('chooseTheme')}</div>
                            </div>
                        </div>
                        <ThemeToggle className="w-full md:w-auto" />
                    </div>

                    <div className="h-[1px] bg-white/5" />

                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                        <div className="flex items-center gap-6">
                            <div className="w-14 h-14 rounded-2xl glass-premium border-white/10 flex items-center justify-center">
                                <div className="text-[10px] font-black opacity-60">EN/עב</div>
                            </div>
                            <div>
                                <div className="font-black text-xl tracking-tighter text-foreground lowercase">{t('language')}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{t('chooseLanguage')}</div>
                            </div>
                        </div>
                        <LanguageToggle className="w-full md:w-auto justify-center" />
                    </div>
                </div>
            </div>

            {/* Support Section */}
            <div className="space-y-6">
                <div className="px-4">
                    <span className="text-[10px] font-black text-muted-foreground uppercase opacity-40 tracking-[0.5em] block mb-2">{t('support')}</span>
                </div>
                <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[3rem] overflow-hidden shadow-minimal">
                    <button
                        onClick={() => setIsContactOpen(!isContactOpen)}
                        className="w-full flex items-center gap-8 p-10 hover:bg-slate-50/50 dark:hover:bg-neutral-800/20 transition-all text-left group"
                    >
                        <div className="w-16 h-16 rounded-2xl bg-slate-50 dark:bg-neutral-800 flex items-center justify-center border border-slate-100 dark:border-neutral-700 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                            <Mail className="w-7 h-7 text-foreground" />
                        </div>
                        <div className="flex-1 space-y-2">
                            <div className="font-black text-xl tracking-tighter text-foreground lowercase">{t('contactSupport')}</div>
                            <div className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
                                {t('contactSupportDesc')}
                            </div>
                        </div>
                        <div className={cn(
                            "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-700",
                            isContactOpen ? 'bg-foreground text-background scale-110 rotate-90 shadow-premium-dark' : 'bg-slate-50 dark:bg-neutral-800 text-slate-300 group-hover:text-foreground'
                        )}>
                            <ChevronRight className="w-6 h-6" />
                        </div>
                    </button>

                    <AnimatePresence>
                        {isContactOpen && (
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-10 bg-slate-50/50 dark:bg-neutral-800/10 border-t border-slate-50 dark:border-neutral-800/10 space-y-8">
                                    <textarea
                                        value={contactMessage}
                                        onChange={(e) => setContactMessage(e.target.value)}
                                        placeholder={t('typeMessageHere')}
                                        className="w-full min-h-[200px] p-10 bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[2.5rem] resize-none outline-none font-medium placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest transition-all focus:border-primary/20 shadow-minimal"
                                        disabled={isSendingMessage}
                                    />
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                        <button
                                            onClick={() => navigate('/contact')}
                                            className="p-6 bg-green-500/10 dark:bg-green-500/5 border border-green-500/20 rounded-[2rem] flex items-center gap-4 hover:bg-green-500/20 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <MessageCircle className="w-6 h-6" />
                                            </div>
                                            <div className="text-left rtl:text-right">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-green-600 dark:text-green-400">{t('whatsapp_support_title') || 'WhatsApp'}</div>
                                                <div className="font-bold text-slate-900 dark:text-white">{t('whatsapp_support_desc') || 'Fast Response'}</div>
                                            </div>
                                        </button>

                                        <button
                                            onClick={() => window.location.href = 'mailto:support@rentmate.co.il'}
                                            className="p-6 bg-blue-500/10 dark:bg-blue-500/5 border border-blue-500/20 rounded-[2rem] flex items-center gap-4 hover:bg-blue-500/20 transition-all group"
                                        >
                                            <div className="w-12 h-12 rounded-xl bg-blue-500 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                                                <Mail className="w-6 h-6" />
                                            </div>
                                            <div className="text-left rtl:text-right">
                                                <div className="text-[10px] font-black uppercase tracking-widest text-blue-600 dark:text-blue-400">{t('email_support_title') || 'Email'}</div>
                                                <div className="font-bold text-slate-900 dark:text-white">support@rentmate.co.il</div>
                                            </div>
                                        </button>
                                    </div>

                                    <div className="space-y-6">
                                        <button
                                            onClick={handleSendMessage}
                                            disabled={!contactMessage.trim() || isSendingMessage}
                                            className={cn(
                                                "w-full h-18 py-6 rounded-full font-black uppercase text-xs tracking-[0.3em] transition-all flex items-center justify-center gap-4",
                                                !contactMessage.trim() || isSendingMessage
                                                    ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                                                    : 'bg-foreground text-background hover:scale-[1.02] active:scale-[0.98] shadow-premium-dark'
                                            )}
                                        >
                                            {isSendingMessage ? (
                                                <div className="w-7 h-7 border-3 border-current border-t-transparent rounded-full animate-spin" />
                                            ) : messageSent ? (
                                                <><Check className="w-6 h-6" /> {t('settings_sent')}</>
                                            ) : (
                                                <><Send className="w-6 h-6" /> {t('sendMessage')}</>
                                            )}
                                        </button>
                                    </div>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Logout & Footer */}
            <div className="pt-20 space-y-16 border-t border-slate-50 dark:border-neutral-800/50">
                <button
                    onClick={async () => {
                        await supabase.auth.signOut();
                        localStorage.clear();
                        window.location.href = '/login';
                    }}
                    className="w-full h-20 bg-rose-500/5 text-rose-500 rounded-full font-black uppercase text-xs tracking-[0.4em] hover:bg-rose-500/10 active:scale-[0.98] transition-all border border-rose-500/10 shadow-minimal flex items-center justify-center gap-4 group"
                >
                    <LogOut className="w-6 h-6 group-hover:-translate-x-1 group-hover:rotate-12 transition-all" />
                    {t('logout')}
                </button>

                <div className="text-center space-y-8">
                    <div className="text-[10px] font-black uppercase tracking-[0.8em] text-muted-foreground opacity-20">{t('appVersion')}</div>
                    <button
                        onClick={() => navigate('/accessibility')}
                        className="text-[10px] font-black uppercase tracking-[0.3em] text-primary hover:text-foreground transition-all px-8 py-3 bg-primary/5 rounded-full hover:bg-primary/10"
                    >
                        {t('accessibilityStatement')}
                    </button>
                </div>
            </div>

            <EditProfileModal
                isOpen={isEditProfileOpen}
                onClose={() => setIsEditProfileOpen(false)}
                onSuccess={() => {
                    fetchUserData();
                    setIsEditProfileOpen(false);
                }}
                initialData={{ full_name: userData.full_name || '' }}
            />

            <NotificationsSettingsModal
                isOpen={isNotificationsOpen}
                onClose={() => setIsNotificationsOpen(false)}
            />

            <PrivacySecurityModal
                isOpen={isPrivacySecurityOpen}
                onClose={() => setIsPrivacySecurityOpen(false)}
            />
        </div>
    );
}
