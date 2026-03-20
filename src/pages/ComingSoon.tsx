import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Home, PieChart, ShieldCheck, Mail, ArrowRight, CheckCircle2, Calculator, Receipt, Sparkles, MessageCircle, Building2, AlertCircle, User, Phone, ArrowLeft, Globe, Instagram, Facebook, Twitter, Volume2, VolumeX, Maximize, Minimize } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import YouTube from 'react-youtube';
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

const MOBILE_MOCKUP_IMAGES_HE = [
    showcase1, // TODO: Replace with mobile image for Contracts
    showcase2, // TODO: Replace with mobile image for Calculator
    showcase3, // TODO: Replace with mobile image for Payments
    showcase4  // TODO: Replace with mobile image for AI Assistant
];

const MOBILE_MOCKUP_IMAGES_EN = [
    showcase1_en, // TODO: Replace with mobile image for Contracts
    showcase2_en, // TODO: Replace with mobile image for Calculator
    showcase3_en, // TODO: Replace with mobile image for Payments
    showcase4     // TODO: Replace with mobile image for AI Assistant
];

export function ComingSoon() {
    const { t, lang } = useTranslation();
    const { setLanguage } = useUserPreferences();
    const { user, isLoading: authLoading } = useAuth();
    const navigate = useNavigate();
    const isRtl = lang === 'he';

    // Redirect authenticated users to the dashboard
    useEffect(() => {
        if (!authLoading && user) {
            navigate('/dashboard', { replace: true });
        }
    }, [user, authLoading, navigate]);

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
    const [videoError, setVideoError] = useState(false);
    const [iframeLoaded, setIframeLoaded] = useState(false);
    const [videoEnded, setVideoEnded] = useState(false);
    const showImages = videoError || videoEnded;

    // Video Controls State
    const [isMuted, setIsMuted] = useState(true);
    const [isFullscreen, setIsFullscreen] = useState(false);
    const playerRef = useRef<any>(null);
    const videoContainerRef = useRef<HTMLDivElement>(null);

    const buttonRef = useRef<HTMLButtonElement>(null);
    const [ripple, setRipple] = useState({ x: 0, y: 0, active: false, size: 0 });

    const handlePointerEnter = (e: React.PointerEvent<HTMLButtonElement>) => {
        if (!buttonRef.current) return;
        const rect = buttonRef.current.getBoundingClientRect();
        const size = Math.max(rect.width, rect.height) * 2.5;
        setRipple({
            x: e.clientX - rect.left - size / 2,
            y: e.clientY - rect.top - size / 2,
            size,
            active: true
        });
    };

    const handlePointerLeave = () => {
        setRipple(prev => ({ ...prev, active: false }));
    };

    // Fullscreen Event Listener
    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener('fullscreenchange', handleFullscreenChange);
        return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
    }, []);

    // Iframe loading fallback to carousel after 8 seconds
    useEffect(() => {
        const timer = setTimeout(() => {
            if (!iframeLoaded && !videoEnded) {
                setVideoError(true);
            }
        }, 8000);
        return () => clearTimeout(timer);
    }, [iframeLoaded, videoEnded]);

    // Auto-change image every 5 seconds (Only relevant when showing images)
    useEffect(() => {
        if (!showImages) return; // Don't run intervals if we don't need them

        const totalImages = isRtl ? MOCKUP_IMAGES_HE.length : MOCKUP_IMAGES_EN.length;

        const interval = setInterval(() => {
            setCurrentImageIndex((prev) => {
                const next = prev + 1;
                // If we reach the end of the images and there's no video error, switch back to video
                if (next >= totalImages && !videoError) {
                    setTimeout(() => {
                        setVideoEnded(false);
                        if (playerRef.current) {
                            playerRef.current.playVideo();
                        }
                    }, 0);
                    return 0;
                }
                return next % totalImages;
            });
        }, 5000);
        return () => clearInterval(interval);
    }, [isRtl, showImages, videoError]);

    const toggleFullscreen = async () => {
        if (!document.fullscreenElement) {
            await videoContainerRef.current?.requestFullscreen();
        } else {
            await document.exitFullscreen();
        }
    };

    const toggleMute = () => {
        if (playerRef.current) {
            if (isMuted) {
                playerRef.current.unMute();
                setIsMuted(false);
            } else {
                playerRef.current.mute();
                setIsMuted(true);
            }
        }
    };

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
        <div className={`relative min-h-screen md:h-screen md:h-[100dvh] bg-gradient-to-br from-background to-muted/20 overflow-y-auto md:overflow-hidden flex flex-col md:flex-row ${isRtl ? 'font-hebrew' : 'font-english'}`} dir={isRtl ? 'rtl' : 'ltr'}>

            {/* Desktop Top-Centered Logo (Centered between columns) */}
            <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.8, type: "spring", bounce: 0.5, delay: 0.2 }}
                className="hidden md:flex absolute top-4 md:top-4 lg:top-6 inset-x-0 mx-auto w-max justify-center items-center z-50 pointer-events-none drop-shadow-xl"
            >
                <span className="text-6xl lg:text-7xl font-black tracking-tighter text-foreground drop-shadow-sm font-hebrew" dir="ltr">
                    Rent<span className="text-primary">Mate</span>
                </span>
            </motion.div>

            {/* Left Column - Content & Form */}
            <div className="w-full md:w-1/2 md:h-full flex flex-col justify-start md:justify-center px-6 md:px-8 lg:px-12 py-4 md:py-0 relative z-10 overflow-y-auto custom-scrollbar">

                {/* Main Content */}
                <div className="max-w-md w-full mx-auto md:my-auto mt-6 md:my-0 z-10">
                    <motion.div
                        initial={{ opacity: 0, x: -50 }}
                        whileInView={{ opacity: 1, x: 0 }}
                        viewport={{ once: true, amount: 0.1 }}
                        transition={{ duration: 0.6 }}
                    >
                        <div className="flex items-center gap-2 lg:gap-3 mb-1">
                            <h1 className="text-4xl md:text-4xl lg:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-foreground to-muted-foreground tracking-tight leading-tight" style={{ textWrap: 'balance' }}>
                                {t('coming_soon_title')}
                            </h1>
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, rotate: -10 }}
                                animate={{ opacity: 1, scale: 1, rotate: -10 }}
                                transition={{ duration: 0.6, type: "spring" }}
                                className="inline-block"
                            >
                                <div className="flex flex-col items-center justify-center font-black leading-none drop-shadow-sm select-none bg-primary/10 px-3 py-1 md:px-3 md:py-1.5 rounded-xl border border-primary/20 -rotate-6 shadow-sm">
                                    <span className="text-xl md:text-2xl text-primary">
                                        {isRtl ? 'בקרוב!' : 'Coming Soon!'}
                                    </span>
                                </div>
                            </motion.div>
                        </div>

                        <motion.p
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: 0.1, duration: 0.5 }}
                            className="text-lg md:text-xl text-muted-foreground mb-3 leading-relaxed font-semibold max-w-lg mx-auto md:mx-0"
                        >
                            {t('coming_soon_subtitle')}
                        </motion.p>

                        {/* Features List */}
                        <motion.ul
                            initial="hidden"
                            whileInView="visible"
                            viewport={{ once: true, amount: 0.1 }}
                            variants={{
                                hidden: { opacity: 0 },
                                visible: {
                                    opacity: 1,
                                    transition: { staggerChildren: 0.1, delayChildren: 0.1 }
                                }
                            }}
                            className="space-y-1 mb-2"
                        >
                            {features.map((feature, idx) => (
                                <motion.li
                                    key={idx}
                                    variants={{
                                        hidden: { opacity: 0, x: -50 },
                                        visible: { opacity: 1, x: 0 }
                                    }}
                                    className="flex items-center gap-3 group transition-all duration-300 hover:translate-x-1 cursor-default"
                                >
                                    <div className="flex-shrink-0 w-8 h-8 md:w-9 md:h-9 rounded-xl bg-card shadow-sm border border-border flex items-center justify-center text-primary group-hover:bg-primary-50 group-hover:border-primary-200 group-hover:text-primary dark:group-hover:bg-primary-900/40 group-hover:shadow-md group-hover:shadow-primary-500/10 transition-all duration-300">
                                        <feature.icon className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform duration-300" />
                                    </div>
                                    <span className="text-base md:text-lg text-foreground font-bold group-hover:text-foreground transition-colors">{feature.text}</span>
                                </motion.li>
                            ))}
                        </motion.ul>

                        {/* Form Section */}
                        <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-3 md:p-3.5 shadow-2xl shadow-slate-200/50 dark:shadow-black/50 border border-border ring-1 ring-border/50">
                            <AnimatePresence mode="wait">
                                {status === 'success' ? (
                                    <motion.div
                                        key="success"
                                        initial={{ opacity: 0, scale: 0.95 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="flex flex-col items-center justify-center text-center py-4"
                                    >
                                        <div className="w-12 h-12 md:w-14 md:h-14 bg-secondary/20 text-secondary rounded-full flex items-center justify-center mb-2">
                                            <CheckCircle2 className="w-6 h-6 md:w-7 md:h-7" />
                                        </div>
                                        <h3 className="text-xl md:text-2xl font-black text-foreground mb-1">{t('coming_soon_success')}</h3>
                                        <p className="text-muted-foreground text-base md:text-lg font-medium">{t('coming_soon_subtitle')}</p>
                                    </motion.div>
                                ) : (
                                    <motion.form
                                        key="form"
                                        initial={{ opacity: 0, x: -50 }}
                                        whileInView={{ opacity: 1, x: 0 }}
                                        viewport={{ once: true, amount: 0.1 }}
                                        transition={{ duration: 0.5 }}
                                        onSubmit={handleSubmit}
                                        className="space-y-1"
                                    >
                                        {/* Error Messages */}
                                        {status === 'error' && (
                                            <div className="p-2 bg-destructive/10 text-destructive rounded-xl flex items-center gap-2 text-lg font-medium">
                                                <AlertCircle className="w-5 h-5" />
                                                <span>{t('coming_soon_error')}</span>
                                            </div>
                                        )}
                                        {status === 'duplicate' && (
                                            <div className="p-2 bg-primary/10 text-primary rounded-xl flex items-center gap-2 text-lg font-medium">
                                                <ShieldCheck className="w-5 h-5" />
                                                <span>{t('coming_soon_already_registered')}</span>
                                            </div>
                                        )}

                                        <div>
                                            <span className="text-sm md:text-base font-semibold block mb-0.5 text-foreground">
                                                {t('coming_soon_name_label')}
                                            </span>
                                            <div className="relative group">
                                                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                                    <User className="h-5 w-5 md:h-5 md:w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="text"
                                                    id="fullName"
                                                    name="fullName"
                                                    required
                                                    value={formData.fullName}
                                                    onChange={handleChange}
                                                    className={`block w-full rounded-xl border-border bg-background/50 shadow-inner ${isRtl ? 'pr-10 md:pr-11' : 'pl-10 md:pl-11'} py-1.5 md:py-2 text-foreground focus:border-primary focus:ring-primary focus:bg-background focus:shadow-md text-lg transition-all`}
                                                    aria-label={t('coming_soon_name_label')}
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-sm md:text-base font-semibold block mb-0.5 text-foreground mt-1">
                                                {t('coming_soon_email_label')}
                                            </span>
                                            <div className="relative group">
                                                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                                    <Mail className="h-5 w-5 md:h-5 md:w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="email"
                                                    id="email"
                                                    name="email"
                                                    required
                                                    value={formData.email}
                                                    onChange={handleChange}
                                                    className={`block w-full rounded-xl border-border bg-background/50 shadow-inner ${isRtl ? 'pr-10 md:pr-11' : 'pl-10 md:pl-11'} py-1.5 md:py-2 text-foreground focus:border-primary focus:ring-primary focus:bg-background focus:shadow-md text-lg transition-all`}
                                                    aria-label={t('coming_soon_email_label')}
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>
                                        <div>
                                            <span className="text-sm md:text-base font-semibold block mb-0.5 text-foreground mt-1">
                                                {t('coming_soon_phone_label')}
                                            </span>
                                            <div className="relative group">
                                                <div className={`absolute inset-y-0 ${isRtl ? 'right-0 pr-3' : 'left-0 pl-3'} flex items-center pointer-events-none`}>
                                                    <Phone className="h-5 w-5 md:h-5 md:w-5 text-muted-foreground group-focus-within:text-primary transition-colors" />
                                                </div>
                                                <input
                                                    type="tel"
                                                    id="phone"
                                                    name="phone"
                                                    value={formData.phone}
                                                    onChange={handleChange}
                                                    className={`block w-full rounded-xl border-border bg-background/50 shadow-inner ${isRtl ? 'pr-10 md:pr-11' : 'pl-10 md:pl-11'} py-1.5 md:py-2 text-foreground focus:border-primary focus:ring-primary focus:bg-background focus:shadow-md text-lg transition-all`}
                                                    aria-label={t('coming_soon_phone_label')}
                                                    dir="ltr"
                                                />
                                            </div>
                                        </div>

                                        <div className="flex items-start gap-2.5 mt-2">
                                            <div className="flex items-center h-4 md:h-5">
                                                <input
                                                    id="termsConsent"
                                                    name="termsConsent"
                                                    type="checkbox"
                                                    checked={formData.termsConsent}
                                                    onChange={handleChange}
                                                    required
                                                    className="w-3.5 h-3.5 md:w-4 md:h-4 text-primary bg-background border-border rounded focus:ring-primary ring-offset-background focus:ring-2   md:mt-0.5 cursor-pointer transition-colors"
                                                />
                                            </div>
                                            <label htmlFor="termsConsent" className="text-xs md:text-xs font-medium text-muted-foreground cursor-pointer">
                                                {isRtl ? (
                                                    <span>
                                                        אני מסכים/ה <a href="/legal/terms" target="_blank" className="font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary/80">לתנאי השימוש</a> ול<a href="/legal/privacy" target="_blank" className="font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary/80">מדיניות הפרטיות</a>.
                                                    </span>
                                                ) : (
                                                    <span>
                                                        I agree to the <a href="/legal/terms" target="_blank" className="font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary/80">Terms of Service</a> and <a href="/legal/privacy" target="_blank" className="font-semibold text-primary hover:text-primary/80 transition-colors underline underline-offset-4 decoration-primary/30 hover:decoration-primary/80">Privacy Policy</a>.
                                                    </span>
                                                )}
                                            </label>
                                        </div>

                                        <button
                                            ref={buttonRef}
                                            onPointerEnter={handlePointerEnter}
                                            onPointerLeave={handlePointerLeave}
                                            type="submit"
                                            disabled={status === 'loading'}
                                            className="group relative w-full flex items-center justify-center gap-2 bg-primary py-2 md:py-2.5 rounded-xl text-primary-foreground font-black text-lg mt-2 md:mt-2.5 shadow-md shadow-primary/20 overflow-hidden transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_0_35px_-10px_hsl(var(--primary))] hover:brightness-110 active:scale-[0.98] disabled:opacity-70 disabled:pointer-events-none border border-primary/20"
                                        >
                                            {/* Ripple Effect */}
                                            <span
                                                className="absolute rounded-full pointer-events-none bg-background/20 z-20"
                                                style={{
                                                    width: ripple.size,
                                                    height: ripple.size,
                                                    left: ripple.x,
                                                    top: ripple.y,
                                                    transform: ripple.active ? 'scale(1)' : 'scale(0)',
                                                    transition: 'transform 1s ease-in-out',
                                                    opacity: ripple.active ? 1 : 0,
                                                }}
                                            />

                                            {/* Aurora Fluid Fill Effect */}
                                            <div className="absolute inset-0 overflow-hidden rounded-[inherit] z-0 pointer-events-none">
                                                <div className="absolute -inset-[100%] opacity-40 group-hover:opacity-100 transition-opacity duration-700 blur-xl bg-[conic-gradient(from_90deg_at_50%_50%,hsl(var(--primary))_0%,hsl(var(--secondary))_50%,hsl(var(--primary))_100%)] animate-[spin_20s_linear_infinite]" />
                                                <div className="absolute inset-[1px] bg-primary/95 rounded-[inherit] z-10 backdrop-blur-3xl group-hover:bg-primary/50 transition-colors duration-500" />
                                            </div>

                                            <div className="relative z-10 flex items-center justify-center gap-2">
                                                {status === 'loading' ? (
                                                    <div className="w-4 h-4 md:w-5 md:h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
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

                                        <div className="flex items-center justify-center gap-1.5 mt-1 text-xs md:text-sm font-semibold text-muted-foreground">
                                            <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                                            <span>{isRtl ? 'רישום ומנוי ללא עלות ו/או הזנת פרטי אשראי' : 'Free registration and subscription, no credit card required'}</span>
                                        </div>
                                    </motion.form>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </div>

                {/* Desktop Footer (Hidden on Mobile) */}
                <div className="hidden md:flex w-full mt-4 flex-col items-center justify-center pb-2 lg:pb-2 z-50">
                    <div className="flex items-center justify-center gap-4 mb-2 md:mb-1.5 text-muted-foreground">
                        <a href="https://instagram.com/RentMate_IL" target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-accent hover:text-foreground rounded-full hover:text-foreground transition-colors" aria-label="Instagram">
                            <Instagram className="w-4 h-4 md:w-5 md:h-5" />
                        </a>
                        <a href="https://facebook.com/RentMate.co.il" target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-accent hover:text-foreground rounded-full hover:text-foreground transition-colors" aria-label="Facebook">
                            <Facebook className="w-4 h-4 md:w-5 md:h-5" />
                        </a>
                        <a href="https://twitter.com/RentMate_IL" target="_blank" rel="noopener noreferrer" className="p-1.5 hover:bg-accent hover:text-foreground rounded-full hover:text-foreground transition-colors" aria-label="X (Twitter)">
                            <Twitter className="w-4 h-4 md:w-5 md:h-5" />
                        </a>
                    </div>

                    <div className="flex flex-col items-center gap-1 md:gap-0.5">
                        <div className="flex flex-col items-center gap-1">
                            <a href="/accessibility" className="text-xs md:text-xs text-muted-foreground hover:text-primary transition-colors underline underline-offset-4">
                                {isRtl ? 'הצהרת נגישות' : 'Accessibility Statement'}
                            </a>
                            <p className="text-xs text-muted-foreground/60 max-w-md text-center leading-relaxed px-4">
                                {t('coming_soon_ip_protection')}
                            </p>
                        </div>
                        {isRtl && (
                            <p className="text-xs md:text-xs text-muted-foreground/80 max-w-sm text-center leading-relaxed">
                                * האתר והאפליקציה מנוסחים בלשון זכר מטעמי נוחות בלבד, אך מתייחסים ופונים לשני המינים כאחד.
                            </p>
                        )}
                    </div>
                </div>
            </div >


            {/* Right Column - Visuals */}
            <motion.div
                initial={{ opacity: 0, x: 100 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.8 }}
                className="flex w-full min-h-[500px] md:min-h-0 md:w-1/2 md:h-full relative overflow-hidden bg-muted/30 border-t md:border-t-0 md:border-l border-border items-center justify-center p-4 sm:p-8 lg:p-16"
            >

                {/* Decorative Background Elements */}
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-bl from-primary/10 via-background/10 to-transparent z-0 pointer-events-none" />
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-primary/10 filter blur-3xl rounded-full z-0 pointer-events-none" />
                <div className="absolute top-1/4 right-1/4 w-64 h-64 bg-secondary/10 filter blur-3xl rounded-full z-0 pointer-events-none" />

                {/* Teaser Video / Carousel Fallback */}
                <div
                    ref={videoContainerRef}
                    className="absolute top-4 left-4 right-4 bottom-32 md:bottom-20 lg:top-8 lg:left-8 lg:right-8 lg:bottom-4 px-4 md:px-16 flex flex-col justify-center items-center z-10 pt-4 md:pt-12 bg-muted/10 md:bg-transparent"
                >
                    {!showImages ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 1.02 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ duration: 0.8 }}
                            className="flex justify-center items-center w-full aspect-video max-w-full relative rounded-2xl overflow-hidden shadow-2xl border border-border/50 bg-black/5"
                        >
                            {!iframeLoaded && (
                                <div className="absolute inset-0 z-10 bg-muted/10 animate-pulse flex items-center justify-center">
                                    <div className="w-12 h-12 md:w-16 md:h-16 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
                                </div>
                            )}

                            <YouTube
                                videoId="wxmmGUIOsQw"
                                opts={{
                                    playerVars: {
                                        autoplay: 1,
                                        mute: 1, // Start muted for autoplay
                                        controls: 0,
                                        rel: 0,
                                        playsinline: 1,
                                        modestbranding: 1,
                                        showinfo: 0,
                                        fs: 0,
                                        disablekb: 1,
                                    }
                                }}
                                className={`w-full h-full absolute inset-0 transition-opacity duration-1000 ${iframeLoaded ? 'opacity-100' : 'opacity-0'}`}
                                iframeClassName="w-full h-full pointer-events-none"
                                onReady={(e) => {
                                    setIframeLoaded(true);
                                    playerRef.current = e.target;
                                    e.target.mute();
                                }}
                                onError={() => setVideoError(true)}
                                onEnd={() => {
                                    setVideoEnded(true);
                                    setCurrentImageIndex(0); // Reset UI to first image when starting images
                                }}
                            />

                            {/* Custom Controls Overlay */}
                            {iframeLoaded && (
                                <div className="absolute bottom-4 right-4 flex items-center justify-center gap-2 z-20 pointer-events-auto">
                                    <button
                                        onClick={toggleMute}
                                        className="p-2 md:p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/10 hover:scale-105 active:scale-95"
                                        aria-label={isMuted ? "Unmute" : "Mute"}
                                    >
                                        {isMuted ? <VolumeX className="w-4 h-4 md:w-5 md:h-5 text-white/90" /> : <Volume2 className="w-4 h-4 md:w-5 md:h-5 text-white" />}
                                    </button>
                                    <button
                                        onClick={toggleFullscreen}
                                        className="p-2 md:p-3 bg-black/60 hover:bg-black/80 backdrop-blur-md rounded-full text-white transition-all shadow-lg border border-white/10 hover:scale-105 active:scale-95"
                                        aria-label={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
                                    >
                                        {isFullscreen ? <Minimize className="w-4 h-4 md:w-5 md:h-5 text-white" /> : <Maximize className="w-4 h-4 md:w-5 md:h-5 text-white/90" />}
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentImageIndex}
                                initial={{ opacity: 0, scale: 1.02, x: 50 }}
                                animate={{ opacity: 1, scale: 1, x: 0 }}
                                exit={{ opacity: 0, scale: 0.98, x: -50 }}
                                transition={{ duration: 0.8, type: "spring" }}
                                className="flex justify-center items-center h-full w-full max-w-full max-h-[300px] md:max-h-full relative"
                            >
                                <picture className="contents">
                                    <source
                                        media="(min-width: 768px)"
                                        srcSet={isRtl ? MOCKUP_IMAGES_HE[currentImageIndex] : MOCKUP_IMAGES_EN[currentImageIndex]}
                                    />
                                    <img
                                        src={isRtl ? MOBILE_MOCKUP_IMAGES_HE[currentImageIndex] : MOBILE_MOCKUP_IMAGES_EN[currentImageIndex]}
                                        alt="App Preview"
                                        className="max-w-full max-h-[300px] md:max-h-full object-contain rounded-xl shadow-2xl border border-border/50"
                                    />
                                </picture>
                            </motion.div>
                        </AnimatePresence>
                    )}
                </div>

                {/* Overlay Graphic Element */}
                {showImages && (
                    <div className="absolute bottom-4 md:bottom-8 right-4 md:right-8 left-4 md:left-8 z-30 flex justify-center pointer-events-none">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={`content-${currentImageIndex}`}
                                initial={{ opacity: 0, x: 50 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: -50 }}
                                transition={{ duration: 0.4 }}
                            >
                                <GlassCard className="w-[300px] sm:w-[380px] h-auto min-h-[120px] md:h-[140px] flex flex-col justify-center p-4 md:p-6 border-white/20 bg-card/70 backdrop-blur-2xl text-foreground shadow-xl pointer-events-auto">
                                    <div className={`flex items-center gap-2 md:gap-3 mb-2 ${isRtl ? 'flex-row' : 'flex-row'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                                        <div className="p-1.5 md:p-2 bg-primary rounded-xl text-white">
                                            {(() => {
                                                const Icon = SLIDE_CONTENT[currentImageIndex].icon;
                                                return <Icon className="w-4 h-4 md:w-5 md:h-5" />;
                                            })()}
                                        </div>
                                        <h4 className="font-bold text-base md:text-lg">{SLIDE_CONTENT[currentImageIndex].title}</h4>
                                    </div>
                                    <p className="text-sm md:text-base font-medium text-foreground" dir={isRtl ? 'rtl' : 'ltr'}>
                                        {SLIDE_CONTENT[currentImageIndex].desc}
                                    </p>
                                </GlassCard>
                            </motion.div>
                        </AnimatePresence>
                    </div>
                )}
            </motion.div>

            {/* Mobile Footer (Hidden on Desktop) */}
            <motion.div
                initial={{ opacity: 0, x: 50 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, amount: 0.1 }}
                transition={{ duration: 0.6 }}
                className="md:hidden w-full bg-white/50 bg-background/50 backdrop-blur-md border-t border-border/50 pt-8 pb-8 flex flex-col items-center justify-center z-50">
                <div className="flex items-center justify-center gap-6 mb-4 text-muted-foreground">
                    <a href="https://instagram.com/RentMate_IL" target="_blank" rel="noopener noreferrer" className="p-3 bg-background/50 hover:bg-accent rounded-full hover:text-foreground shadow-sm border border-border/50 transition-all" aria-label="Instagram">
                        <Instagram className="w-6 h-6" />
                    </a>
                    <a href="https://facebook.com/RentMate.co.il" target="_blank" rel="noopener noreferrer" className="p-3 bg-background/50 hover:bg-accent rounded-full hover:text-foreground shadow-sm border border-border/50 transition-all" aria-label="Facebook">
                        <Facebook className="w-6 h-6" />
                    </a>
                    <a href="https://twitter.com/RentMate_IL" target="_blank" rel="noopener noreferrer" className="p-3 bg-background/50 hover:bg-accent rounded-full hover:text-foreground shadow-sm border border-border/50 transition-all" aria-label="X (Twitter)">
                        <Twitter className="w-6 h-6" />
                    </a>
                </div>

                <div className="flex flex-col items-center gap-2">
                    <a href="/accessibility" className="text-sm font-medium text-muted-foreground hover:text-primary transition-colors underline underline-offset-4 mb-1">
                        {isRtl ? 'הצהרת נגישות' : 'Accessibility Statement'}
                    </a>
                    <p className="text-xs text-muted-foreground/60 px-6 max-w-sm text-center leading-relaxed">
                        {t('coming_soon_ip_protection')}
                    </p>
                    {isRtl && (
                        <p className="text-xs text-muted-foreground/80 px-6 max-w-sm text-center leading-relaxed mt-2">
                            * האתר והאפליקציה מנוסחים בלשון זכר מטעמי נוחות בלבד, אך מתייחסים ופונים לשני המינים כאחד.
                        </p>
                    )}
                </div>
            </motion.div>

            {/* Fixed EN/HE Language Toggle (Positioned opposite to UserWay on Mobile) */}
            <div className="fixed bottom-4 md:bottom-auto top-auto md:top-4 right-4 md:right-auto left-auto md:left-20 z-[99999]" dir="ltr">
                <div className="flex items-center bg-card/80 backdrop-blur-xl border border-border rounded-full shadow-lg font-extrabold text-sm overflow-hidden p-[3px]">
                    <button
                        onClick={() => setLanguage('en')}
                        className={`px-4 py-1.5 rounded-full transition-all duration-300 ${!isRtl ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'} focus:outline-none`}
                    >
                        EN
                    </button>
                    <button
                        onClick={() => setLanguage('he')}
                        className={`px-4 py-1.5 rounded-full transition-all duration-300 ${isRtl ? 'bg-primary text-white shadow-md' : 'text-muted-foreground hover:text-foreground hover:bg-accent/50'} focus:outline-none`}
                    >
                        HE
                    </button>
                </div>
            </div>
        </div>
    );
}
