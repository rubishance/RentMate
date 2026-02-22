import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, Mail, Phone, Camera, Loader2, Send, CheckCircle2, ArrowRight, ShieldCheck, Clock } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { StorageUtils } from '../lib/storage-utils';
import { WhatsAppService } from '../services/whatsapp.service';
import { GlassCard } from '../components/common/GlassCard';
import { PageHeader } from '../components/common/PageHeader';

export default function Contact() {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';
    const { preferences } = useUserPreferences();

    const [contactInfo, setContactInfo] = useState({
        whatsapp: '972503602000',
        email: 'support@rentmate.co.il',
        phone: '+972-50-360-2000'
    });

    useEffect(() => {
        async function fetchContactInfo() {
            const { data: settings } = await supabase
                .from('system_settings')
                .select('key, value')
                .in('key', ['global_email_support', 'global_phone_support', 'global_whatsapp_support']);

            if (settings) {
                const email = settings.find(s => s.key === 'global_email_support')?.value as string;
                const phone = settings.find(s => s.key === 'global_phone_support')?.value as string;
                const whatsapp = settings.find(s => s.key === 'global_whatsapp_support')?.value as string;

                setContactInfo({
                    email: email || 'support@rentmate.co.il',
                    phone: phone || '+972-50-360-2000',
                    whatsapp: whatsapp || '972503602000'
                });
            }
        }
        fetchContactInfo();
    }, []);

    const [loading, setLoading] = useState(false);
    const [includeScreenshot, setIncludeScreenshot] = useState(false);
    const [message, setMessage] = useState('');
    const [sent, setSent] = useState(false);
    const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null);

    const handleWhatsAppContact = async () => {
        setLoading(true);
        try {
            let finalUrl = null;

            if (includeScreenshot) {
                // 1. Capture Screenshot (Dynamic Import for performance)
                const html2canvas = (await import('html2canvas')).default;
                const canvas = await html2canvas(document.body, {
                    useCORS: true,
                    allowTaint: true,
                    ignoreElements: (el) => el.id === 'contact-actions'
                });

                const blob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg', 0.8));

                // 2. Upload to Supabase
                const fileName = `support-${Date.now()}.jpg`;
                const { data: uploadData, error: uploadError } = await supabase.storage
                    .from('feedback-screenshots')
                    .upload(fileName, blob);

                if (uploadError) throw uploadError;

                const signedUrl = await StorageUtils.getSignedUrl('feedback-screenshots', fileName);

                finalUrl = signedUrl;
                setScreenshotUrl(fileName); // Store the path/filename in state
            }

            // 3. Generate WA link
            const defaultMsg = message.trim() || (isRtl ? 'שלום, אשמח לעזרה ב-' : 'Hi, I need help with...');
            const fullMsg = finalUrl
                ? `${defaultMsg}\n\nScreenshot: ${finalUrl}`
                : defaultMsg;

            const waLink = WhatsAppService.generateLink(contactInfo.whatsapp, fullMsg);
            window.open(waLink, '_blank');
            setSent(true);

        } catch (error: any) {
            console.error('Contact Error:', error);
            alert(isRtl ? 'חלה שגיאה בשליחת ההודעה' : 'Error sending message');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="pb-40 pt-16 animate-in fade-in duration-1000 px-4">
            <div className="max-w-5xl mx-auto space-y-16">
                <div className="space-y-4 px-4 md:px-0">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-2">
                        <MessageCircle className="w-3 h-3 text-indigo-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {t('contactTitle') || 'Support Hub'}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-tight lowercase">
                        {isRtl ? 'צור קשר עם התמיכה' : 'Contact Support'}
                    </h1>
                    <p className="text-muted-foreground text-lg font-medium leading-relaxed max-w-2xl opacity-60">
                        {isRtl ? 'אנחנו כאן כדי לעזור לכם להצליח בכל שלב בניהול הנכסים שלכם.' : "We're here to help you succeed at every step of your property management journey."}
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
                    {/* Main Action Area */}
                    <div className="lg:col-span-2 space-y-8">
                        <div className="p-10 glass-premium dark:bg-neutral-900/60 border-white/10 rounded-[4rem] shadow-minimal space-y-10 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-64 h-64 bg-emerald-500/5 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none group-hover:scale-150 transition-transform duration-1000" />

                            <div className="flex items-center gap-6 relative z-10">
                                <div className="w-16 h-16 glass-premium dark:bg-neutral-800/40 rounded-[2rem] flex items-center justify-center text-emerald-500 shadow-minimal border border-white/5">
                                    <MessageCircle className="w-8 h-8" />
                                </div>
                                <div className="space-y-1">
                                    <h3 className="text-2xl font-black tracking-tighter text-foreground lowercase">{isRtl ? 'שלח הודעת WhatsApp' : 'Send WhatsApp Message'}</h3>
                                    <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{isRtl ? 'הדרך המהירה ביותר לקבל מענה' : 'Fastest way to get a response'}</p>
                                </div>
                            </div>

                            <div className="relative z-10">
                                <textarea
                                    value={message}
                                    onChange={(e) => setMessage(e.target.value)}
                                    placeholder={isRtl ? 'במה אפשר לעזור?' : 'How can we help?'}
                                    className="w-full h-40 p-8 glass-premium dark:bg-neutral-900/40 border-white/5 rounded-[3rem] text-foreground placeholder:text-muted-foreground/20 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-minimal transition-all resize-none text-lg font-medium"
                                />
                            </div>

                            <div className="flex flex-col md:flex-row items-center justify-between gap-8 relative z-10">
                                <label className="flex items-center gap-4 cursor-pointer group select-none">
                                    <div className="relative">
                                        <input
                                            type="checkbox"
                                            checked={includeScreenshot}
                                            onChange={(e) => setIncludeScreenshot(e.target.checked)}
                                            className="sr-only"
                                        />
                                        <div className={`w-12 h-7 rounded-full transition-all duration-500 border border-white/5 ${includeScreenshot ? 'bg-emerald-500/20 border-emerald-500/30' : 'bg-white/5'}`} />
                                        <motion.div
                                            animate={{ x: includeScreenshot ? 24 : 4 }}
                                            className={`absolute top-1 left-0 w-5 h-5 rounded-full shadow-sm transition-colors duration-500 ${includeScreenshot ? 'bg-emerald-500' : 'bg-white/20'}`}
                                        />
                                    </div>
                                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 group-hover:opacity-100 transition-all">
                                        <Camera className="w-4 h-4" />
                                        {isRtl ? 'צרף צילום מסך אוטומטי' : 'Attach auto-screenshot'}
                                    </div>
                                </label>

                                <button
                                    id="contact-actions"
                                    onClick={handleWhatsAppContact}
                                    disabled={loading}
                                    className="h-14 px-12 button-jewel font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] hover:scale-105 active:scale-95 transition-all shadow-jewel flex items-center justify-center gap-4 group disabled:opacity-50"
                                >
                                    {loading ? (
                                        <Loader2 className="w-5 h-5 animate-spin" />
                                    ) : (
                                        <>
                                            <Send className="w-5 h-5 transition-transform group-hover:translate-x-1 group-hover:-translate-y-1" />
                                            {isRtl ? 'שלח הודעה' : 'Send Message'}
                                        </>
                                    )}
                                </button>
                            </div>

                            {sent && (
                                <motion.div
                                    initial={{ opacity: 0, y: 10 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="p-6 glass-premium dark:bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem] flex items-center gap-4 text-indigo-400 font-black text-[10px] uppercase tracking-widest relative z-10"
                                >
                                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                                    {isRtl
                                        ? 'ההודעה נשלחה בהצלחה! תוכל להמשיך את השיחה ב-WhatsApp.'
                                        : 'Message sent! You can continue the conversation in WhatsApp.'}
                                </motion.div>
                            )}
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                            <div className="p-8 glass-premium dark:bg-neutral-900/60 border-white/10 rounded-[3rem] shadow-minimal flex items-center gap-6 group cursor-pointer hover:shadow-jewel transition-all duration-700"
                                onClick={() => window.location.href = `mailto:${contactInfo.email}`}
                            >
                                <div className="w-14 h-14 glass-premium dark:bg-neutral-800/40 rounded-2xl flex items-center justify-center text-indigo-500 shadow-minimal border border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                                    <Mail className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">{isRtl ? 'אימייל' : 'Email'}</div>
                                    <div className="font-black text-foreground tracking-tight lowercase">{contactInfo.email}</div>
                                </div>
                            </div>

                            <div className="p-8 glass-premium dark:bg-neutral-900/60 border-white/10 rounded-[3rem] shadow-minimal flex items-center gap-6 group cursor-pointer hover:shadow-jewel transition-all duration-700"
                                onClick={() => window.location.href = `tel:${contactInfo.phone.replace(/[^0-9+]/g, '')}`}
                            >
                                <div className="w-14 h-14 glass-premium dark:bg-neutral-800/40 rounded-2xl flex items-center justify-center text-indigo-500 shadow-minimal border border-white/5 group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                                    <Phone className="w-6 h-6" />
                                </div>
                                <div>
                                    <div className="text-[9px] font-black text-muted-foreground uppercase tracking-widest opacity-40 mb-1">{isRtl ? 'טלפון' : 'Phone'}</div>
                                    <div className="font-black text-foreground tracking-tight lowercase">{contactInfo.phone}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Sidebar Info */}
                    <div className="space-y-8">
                        <div className="p-8 glass-premium dark:bg-neutral-900/60 border-white/10 rounded-[3rem] shadow-minimal space-y-8">
                            <h4 className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40 lowercase pb-4 border-b border-white/5">{isRtl ? 'זמינות ותמיכה' : 'Availability & Support'}</h4>

                            <div className="space-y-8">
                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 glass-premium rounded-xl flex items-center justify-center text-indigo-500 border-white/5 shadow-sm">
                                        <Clock className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-black text-foreground tracking-tight lowercase">{isRtl ? 'שעות פעילות' : 'Support Hours'}</p>
                                        <div className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 space-y-1">
                                            <p>{isRtl ? 'א-ה: 09:00 - 18:00' : 'Sun-Thu: 09:00 - 18:00'}</p>
                                            <p>{isRtl ? 'ו\': 09:00 - 13:00' : 'Fri: 09:00 - 13:00'}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-start gap-4">
                                    <div className="w-10 h-10 glass-premium rounded-xl flex items-center justify-center text-emerald-500 border-white/5 shadow-sm">
                                        <ShieldCheck className="w-5 h-5" />
                                    </div>
                                    <div className="space-y-1">
                                        <p className="font-black text-foreground tracking-tight lowercase">{isRtl ? 'תמיכה בחינם' : 'Free Support'}</p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">{isRtl ? 'זמין לכלל המשתמשים בכל שלב' : 'Available to all users at any stage'}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className="p-10 bg-gradient-to-br from-indigo-600 to-blue-700 rounded-[4rem] text-white shadow-2xl shadow-indigo-500/20 relative overflow-hidden group">
                            <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 blur-[40px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />

                            <div className="relative z-10 space-y-6">
                                <h4 className="text-2xl font-black tracking-tighter leading-tight lowercase">{isRtl ? 'צריכים עזרה טכנית?' : 'Need technical help?'}</h4>
                                <p className="text-indigo-100 text-sm font-medium leading-relaxed opacity-80">{isRtl ? 'ה-AI שלנו זמין 24/7 לכל שאלה בנוגע למערכת' : 'Our AI is available 24/7 for any system-related questions'}</p>
                                <button
                                    onClick={() => window.dispatchEvent(new CustomEvent('OPEN_CHAT'))}
                                    className="w-full h-12 bg-white text-indigo-600 rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-white/90 transition-all flex items-center justify-center gap-3 active:scale-95"
                                >
                                    {isRtl ? 'דבר עם רנטי' : 'Talk with Renty'}
                                    <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
