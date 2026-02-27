import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, PieChart, ShieldCheck, Mail, ArrowRight, CheckCircle2, Calculator, Receipt, Sparkles, MessageCircle, Building2, AlertCircle, User, Phone, ArrowLeft, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { supabase } from '../lib/supabase';
import { GlassCard } from '../components/common/GlassCard';

import showcase1 from '../assets/showcase/showcase-1.png';
import showcase2 from '../assets/showcase/showcase-2.png';
import showcase3 from '../assets/showcase/showcase-3.png';
import showcase4 from '../assets/showcase/showcase-4.png';

import showcase1_en from '../assets/showcase/showcase-1-en.png';
import showcase2_en from '../assets/showcase/showcase-2-en.png';
import showcase3_en from '../assets/showcase/showcase-3-en.png';

const MOCKUP_IMAGES_HE = [
    showcase1, // Contracts 
    showcase2, // Calculator
    showcase3, // Payments
    showcase4  // AI Assistant
];

const MOCKUP_IMAGES_EN = [
    showcase1_en, // Contracts 
    showcase2_en, // Calculator
    showcase3_en, // Payments
    showcase4     // AI Assistant (Fallback to same image for now)
];

export function ComingSoon() {
    const { t, lang } = useTranslation();
    const { setLanguage } = useUserPreferences();
    const isRtl = lang === 'he';

    const SLIDE_CONTENT = React.useMemo(() => [
        {
            icon: ShieldCheck,
            title: t('coming_soon_slide_1_title'),
            desc: t('coming_soon_slide_1_desc')
        },
        {
            icon: Calculator,
            title: t('coming_soon_slide_2_title'),
            desc: t('coming_soon_slide_2_desc')
        },
        {
            icon: Receipt,
            title: t('coming_soon_slide_3_title'),
            desc: t('coming_soon_slide_3_desc')
        },
        {
            icon: Sparkles,
            title: t('coming_soon_slide_4_title'),
            desc: t('coming_soon_slide_4_desc')
        }
    ], [t]);

    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        phone: '',
        marketingConsent: true,
        termsConsent: false
    });
    const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error' | 'duplicate'>('idle');
    const [currentImageIndex, setCurrentImageIndex] = useState(0);

    // Auto-change image every 5 seconds
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => (prev + 1) % (isRtl ? MOCKUP_IMAGES_HE.length : MOCKUP_IMAGES_EN.length));
        }, 5000);
        return () => clearInterval(interval);
    }, []);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const { name, value, type, checked } = e.target;
        setFormData({
            ...formData,
            [name]: type === 'checkbox' ? checked : value
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setStatus('loading');

        try {
            const { error } = await supabase
                .from('waitlist')
                .insert({
                    full_name: formData.fullName,
                    email: formData.email,
                    phone: formData.phone || null,
                    agreed_to_terms: formData.termsConsent
                });

            if (error) {
                if (error.code === '23505') { // Postgres unique violation code
                    setStatus('duplicate');
                } else {
                    console.error("Waitlist Error:", error);
                    setStatus('error');
                }
            } else {
                setStatus('success');
                setFormData({ fullName: '', email: '', phone: '', marketingConsent: true, termsConsent: false });
            }
        } catch (err) {
            console.error("Submission error:", err);
            setStatus('error');
        }
    };

    const features = [
        { icon: Sparkles, text: t('coming_soon_feature_1') },
        { icon: MessageCircle, text: t('coming_soon_feature_2') },
        { icon: PieChart, text: t('coming_soon_feature_3') }
    ];

    return (
        <div className={`relative min-h-screen md:h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row ${isRtl ? 'font-hebrew' : 'font-english'}`} dir={isRtl ? 'rtl' : 'ltr'}>

            {/* Desktop Top-Centered Logo (Centered between columns) */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.5, delay: 0.2 }}
                className="hidden md:flex absolute top-6 md:top-6 inset-x-0 mx-auto w-max justify-center items-center z-50 pointer-events-none drop-shadow-xl"
            >
                <span className="text-5xl lg:text-6xl font-black tracking-tighter text-slate-900 dark:text-white drop-shadow-sm font-hebrew" dir="ltr">
                    Rent<span className="text-primary-600">Mate</span>
                </span>
            </motion.div>

            {/* Left Column - Content & Form */}
            <div className="w-full md:w-1/2 md:h-full flex flex-col justify-start md:justify-center px-6 md:px-10 lg:px-16 xl:px-20 py-8 md:py-6 lg:py-8 relative z-10 overflow-y-auto custom-scrollbar">

                {/* Main Content */}
                <div className="max-w-md w-full mx-auto md:my-auto mt-16 md:mt-2">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        {/* Mobile Badge Only */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                            animate={{ opacity: 1, scale: 1, rotate: -10 }}
                            transition={{ duration: 0.6, type: "spring" }}
                            className="md:hidden mb-6 inline-block"
                        >
                            <div className="flex flex-col items-center justify-center font-black leading-none drop-shadow-sm select-none">
                                <span className="text-5xl text-blue-600 dark:text-blue-500 pb-1">
                                    {isRtl ? 'בקרוב' : 'Coming Soon'}
                                </span>
                            </div>
                        </motion.div>

                        <h1 className="text-3xl md:text-3xl lg:text-4xl xl:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-slate-900 to-slate-700 dark:from-white dark:to-slate-300 tracking-tight leading-tight mb-3 lg:mb-4" style={{ textWrap: 'balance' }}>
                            {t('coming_soon_title')}
                        </h1>

                        {/* Inline Language Toggle */}
                        <div className="flex md:justify-start justify-center mb-4 lg:mb-5">
                            <button
                                onClick={() => setLanguage(isRtl ? 'en' : 'he')}
                                className="px-4 py-1.5 md:px-5 md:py-2 rounded-full border border-slate-200 dark:border-slate-700 bg-white/50 dark:bg-slate-900/50 backdrop-blur-md text-sm font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all shadow-sm flex items-center gap-2"
                                aria-label="Toggle Language"
                            >
                                <Globe className="w-4 h-4" />
                                {t('language_toggle')}
                            </button>
                        </div>

                        <motion.p
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className="text-base md:text-base text-slate-600 dark:text-slate-400 mb-4 lg:mb-5 leading-snug font-medium max-w-lg mx-auto md:mx-0"
                        >
                            {t('coming_soon_subtitle')}
                        </motion.p>

                        {/* Features List */}
                        <motion.ul
                            initial="hidden"
                            animate="visible"
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.1, delayChildren: 0.2 }
                                }
                            }}
                            className="space-y-2 lg:space-y-3 mb-5 lg:mb-6"
                        >
                            {features.map((feature, idx) => (
                                <motion.li
                                    key={idx}
                                    variants={{
                                        hidden: { opacity: 0, x: -10 },
                                        visible: { opacity: 1, x: 0 }
                                    }}
                                    className="flex items-center gap-4 group transition-all duration-300 hover:translate-x-1 cursor-default"
                                >
                                    <div className="flex-shrink-0 w-10 h-10 rounded-xl bg-white dark:bg-slate-800 shadow-sm border border-slate-100 dark:border-slate-700 flex items-center justify-center text-primary-500 group-hover:bg-primary-50 group-hover:border-primary-200 group-hover:text-primary-600 dark:group-hover:bg-primary-900/40 group-hover:shadow-md group-hover:shadow-primary-500/10 transition-all duration-300">
                                        <feature.icon className="w-5 h-5 group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <span className="text-sm md:text-base text-slate-700 dark:text-slate-300 font-semibold group-hover:text-slate-900 dark:group-hover:text-white transition-colors">{feature.text}</span>
                                </motion.li>
                            ))}
                        </motion.ul>

                        {/* Form Section */}
                        <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl rounded-3xl p-6 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-white dark:border-slate-800 ring-1 ring-slate-900/5 dark:ring-white/10">
                            <AnimatePresence mode="wait">
                                {status === 'success' ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center text-center py-8"
                                    >
                                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-4">
                                            <CheckCircle2 className="w-8 h-8" />
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">{t('coming_soon_success')}</h3>
                                        <p className="text-slate-500">{t('coming_soon_subtitle')}</p>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        onSubmit={handleSubmit}
                                        className="space-y-3"
                                    >
                                        {/* Error Messages */}
                                        {status === 'error' && (
                                            <div className="p-2 bg-red-50 text-red-600 rounded-xl flex items-center gap-2 text-sm">
                                                <AlertCircle className="w-4 h-4" />
                                                <span>{t('coming_soon_error')}</span>
                                            </div>
                                        )}
                                        {status === 'duplicate' && (
                                            <div className="p-2 bg-blue-50 text-blue-600 rounded-xl flex items-center gap-2 text-sm">
                                                <ShieldCheck className="w-4 h-4" />
                                                <span>{t('coming_soon_already_registered')}</span>
                                            </div>
                                        )}

                                        <div>
                                            <label htmlFor="fullName" className="block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('coming_soon_name_label')}
                                            </label>
                                            <div className="relative group">
                                                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                                    <User className="h-4 w-4 md:h-5 md:w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    id="fullName"
                                                    name="fullName"
                                                    required
                                                    value={formData.fullName}
                                                    onChange={handleChange}
                                                    className={`block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shadow-inner ${isRtl ? 'pr-9 md:pr-10' : 'pl-9 md:pl-10'} py-2.5 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-800 focus:shadow-md text-sm transition-all`}
                                                    aria-label={t('coming_soon_name_label')}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="email" className="block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('coming_soon_email_label')}
                                            </label>
                                            <div className="relative group">
                                                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                                    <Mail className="h-4 w-4 md:h-5 md:w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                                </div>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className={`block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shadow-inner ${isRtl ? 'pr-9 md:pr-10' : 'pl-9 md:pl-10'} py-3 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-800 focus:shadow-md text-sm transition-all`}
                                                    aria-label={t('coming_soon_email_label')}
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <label htmlFor="phone" className="block text-xs md:text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1.5">
                                                {t('coming_soon_phone_label')}
                                            </label>
                                            <div className="relative group">
                                                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                                    <Phone className="h-4 w-4 md:h-5 md:w-5 text-slate-400 group-focus-within:text-primary-500 transition-colors" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    id="phone"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className={`block w-full rounded-xl border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/50 shadow-inner ${isRtl ? 'pr-9 md:pr-10' : 'pl-9 md:pl-10'} py-3 text-slate-900 dark:text-white focus:border-primary-500 focus:ring-primary-500 focus:bg-white dark:focus:bg-slate-800 focus:shadow-md text-sm transition-all`}
                                                    aria-label={t('coming_soon_phone_label')}
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-3 mt-3">
                                            <div className="flex items-center h-5">
                                                <input
                                                    id="termsConsent"
                                                    name="termsConsent"
                                                    type="checkbox"
                                                    checked={formData.termsConsent}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-4 h-4 text-primary-600 bg-slate-100 border-slate-300 rounded focus:ring-primary-500 dark:focus:ring-primary-600 dark:ring-offset-slate-800 focus:ring-2 dark:bg-slate-700 dark:border-slate-600 md:mt-0.5 cursor-pointer transition-colors"
                                                />
                                            </div>
                                            <label htmlFor="termsConsent" className="text-xs md:text-sm font-medium text-slate-600 dark:text-slate-400 cursor-pointer">
                                                {isRtl ? (
                                                    <span>
                                                        אני מסכים/ה <a href="/legal/terms" target="_blank" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors underline underline-offset-4 decoration-primary-600/30 hover:decoration-primary-500">לתנאי השימוש</a> ול<a href="/legal/privacy" target="_blank" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors underline underline-offset-4 decoration-primary-600/30 hover:decoration-primary-500">מדיניות הפרטיות</a>.
                                                    </span>
                                                ) : (
                                                    <span>
                                                        I agree to the <a href="/legal/terms" target="_blank" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors underline underline-offset-4 decoration-primary-600/30 hover:decoration-primary-500">Terms of Service</a> and <a href="/legal/privacy" target="_blank" className="font-semibold text-primary-600 dark:text-primary-400 hover:text-primary-500 transition-colors underline underline-offset-4 decoration-primary-600/30 hover:decoration-primary-500">Privacy Policy</a>.
                                                    </span>
                                                )}
                                            </label>
                                        </div>

                                        <button
                                            type="submit"
                                            disabled={status === 'loading'}
                                            className="group relative w-full flex items-center justify-center gap-2 bg-gradient-to-r from-primary-600 to-primary-500 hover:from-primary-500 hover:to-primary-400 py-3 md:py-3.5 rounded-xl text-white font-bold text-base md:text-lg mt-6 shadow-lg shadow-primary-500/30 overflow-hidden transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-primary-500/50 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none disabled:transform-none border border-primary-400/20"
                                        >
                                            {/* Shine Effect */}
                                            <div className="absolute inset-0 -translate-x-full bg-gradient-to-r from-transparent via-white/20 to-transparent transition-transform duration-700 ease-in-out group-hover:translate-x-full z-0" />

                                            <div className="relative z-10 flex items-center justify-center gap-2">
                                                {status === 'loading' ? (
                                                    <div className="w-5 h-5 md:w-6 md:h-6 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <span>{t('coming_soon_cta')}</span>
                                                        {isRtl ? (
                                                            <ArrowLeft className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:-translate-x-1" />
                                                        ) : (
                                                            <ArrowRight className="w-4 h-4 md:w-5 md:h-5 transition-transform duration-300 group-hover:translate-x-1" />
                                                        )}
                                                    </>
                                                )}
                                            </div>
                                        </button>

                                        <div className="flex items-center justify-center gap-1.5 mt-2 text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400">
                                            <ShieldCheck className="w-4 h-4 text-primary-500" />
                                            <span>{isRtl ? 'רישום ומנוי ללא עלות' : 'Free registration and subscription'}</span>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>

                {/* Footer (Accessibility) */}
                <div className="mt-8 flex justify-center pb-4 lg:absolute lg:bottom-4 lg:left-0 lg:right-0 lg:mt-0 lg:pb-0 z-50">
                    <a href="/accessibility" className="text-xs md:text-sm text-slate-500 hover:text-primary-600 transition-colors underline underline-offset-4">
                        {isRtl ? 'הצהרת נגישות' : 'Accessibility Statement'}
                    </a>
                </div>
            </div >

            {/* Right Column - Visuals */}
            < div className="hidden md:flex md:w-1/2 md:h-full relative overflow-hidden bg-slate-100 dark:bg-slate-900 border-l border-slate-200 dark:border-slate-800 items-center justify-center p-8 lg:p-16" >

                {/* Decorative Background Elements */}
                < div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-primary-100/50 via-slate-100/10 to-transparent dark:from-primary-900/10 dark:via-slate-900/10 dark:to-transparent z-0 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/10 dark:bg-blue-600/5 filter blur-3xl rounded-full z-0 pointer-events-none" />
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-teal-500/10 dark:bg-teal-600/5 filter blur-3xl rounded-full z-0 pointer-events-none" />

                {/* Carousel */}
                <div className="absolute top-4 left-4 right-4 bottom-24 lg:top-8 lg:left-8 lg:right-8 lg:bottom-4 px-20 flex flex-col justify-center items-center h-full z-10 pt-16">
                    <AnimatePresence mode="wait">
                        <motion.img
                            key={currentImageIndex}
                            src={isRtl ? MOCKUP_IMAGES_HE[currentImageIndex] : MOCKUP_IMAGES_EN[currentImageIndex]}
                            alt="App Preview"
                            initial={{ opacity: 0, scale: 1.02, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.98, y: -10 }}
                            transition={{ duration: 0.8, type: "spring" }}
                            className="max-w-full max-h-full object-contain rounded-xl shadow-2xl relative border border-slate-200/50 dark:border-slate-700/50"
                        />
                    </AnimatePresence>
                </div>

                {/* Overlay Graphic Element */}
                <div className="absolute bottom-8 right-8 left-8 z-30 flex justify-center pointer-events-none">
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={`content-${currentImageIndex}`}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.4 }}
                        >
                            <GlassCard className="w-[300px] sm:w-[380px] h-[140px] flex flex-col justify-center p-6 border-white/20 bg-white/70 dark:bg-slate-900/70 backdrop-blur-2xl text-slate-900 dark:text-white shadow-xl pointer-events-auto">
                                <div className={`flex items-center gap-3 mb-2 ${isRtl ? 'flex-row' : 'flex-row'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                                    <div className="p-2 bg-primary-500 rounded-lg text-white">
                                        {(() => {
                                            const Icon = SLIDE_CONTENT[currentImageIndex].icon;
                                            return <Icon className="w-5 h-5" />;
                                        })()}
                                    </div>
                                    <h4 className="font-bold">{SLIDE_CONTENT[currentImageIndex].title}</h4>
                                </div>
                                <p className="text-sm text-slate-700 dark:text-slate-300" dir={isRtl ? 'rtl' : 'ltr'}>
                                    {SLIDE_CONTENT[currentImageIndex].desc}
                                </p>
                            </GlassCard>
                        </motion.div>
                    </AnimatePresence>
                </div>
            </div >
        </div >
    );
}
