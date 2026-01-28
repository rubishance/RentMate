import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence, useScroll, useTransform } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { ThemeToggle } from '../components/common/ThemeToggle';
import {
    ArrowRight, Check, X, Menu, Bell, Calculator, Mail,
    Play, Search, Clock, Tag, Shield, FileText, Zap
} from 'lucide-react';
import { BillScanningAnimation } from '../components/animations/BillScanningAnimation';
import logoIconOnly from '../assets/rentmate-icon-only.png';
import logoIconDark from '../assets/rentmate-icon-only-dark.png';
import { cn } from '../lib/utils';
import { articles } from '../content/articleIndex';
import { supabase } from '../lib/supabase';
import { BotFullBody } from '../components/chat/BotFullBody';
import { BotIcon } from '../components/chat/BotIcon';
import { RentyRagdoll } from '../components/chat/RentyRagdoll';

// --- STITCH DESIGN TOKENS ---
// Radical Layouts, Sharp Edges, High Contrast
const STITCH = {
    card: "bg-white/5 backdrop-blur-md border border-black/5 dark:border-white/10 rounded-3xl overflow-hidden hover:border-gold/50 transition-colors duration-500",
    buttonPrimary: "bg-black dark:bg-white text-white dark:text-black font-bold rounded-xl hover:bg-gold hover:text-black dark:hover:bg-gold dark:hover:text-black transition-all duration-300 shadow-lg hover:shadow-gold/20",
    buttonSecondary: "bg-transparent border-2 border-black/10 dark:border-white/10 text-black dark:text-white font-bold rounded-xl hover:border-black dark:hover:border-white transition-all duration-300",
    textGradient: "text-transparent bg-clip-text bg-gradient-to-r from-black to-gray-600 dark:from-white dark:to-gray-400",
    goldGradient: "text-transparent bg-clip-text bg-gradient-to-r from-gold via-gold-light to-gold-dark"
};

export function WelcomeLanding() {
    const { lang } = useTranslation();
    const { effectiveTheme } = useUserPreferences();
    const isRtl = lang === 'he';
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState<'home' | 'blog' | 'demo' | 'calculator'>('home');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [checkingAuth, setCheckingAuth] = useState(true);

    // Auto-redirect if logged in
    useEffect(() => {
        const checkAuth = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                navigate('/dashboard', { replace: true });
            } else {
                setCheckingAuth(false);
            }
        };
        checkAuth();
    }, [navigate]);

    // Scroll Animation for Hero Walking
    const containerRef = useRef(null);
    const { scrollY } = useScroll();
    const walkX = useTransform(scrollY, [0, 400], [0, isRtl ? -100 : 100]); // Bot walks slightly as you scroll

    const features = [
        {
            icon: FileText,
            color: "text-gold",
            title: isRtl ? 'ניתוח חוזים' : 'Contract Analysis',
            desc: isRtl ? 'AI הסורק את החוזה ומחלץ סעיפי הצמדה' : 'AI scans contracts and extracts linkage clauses',
            stat: "95%"
        },
        {
            icon: Calculator,
            color: "text-black dark:text-white",
            title: isRtl ? 'חישוב מדד' : 'CPI Calculator',
            desc: isRtl ? 'סנכרון אוטומטי ללמ״ס וחישוב חובות' : 'Auto-sync with CBS and debt calculation',
            stat: "100%"
        },
        {
            icon: Zap,
            color: "text-gold",
            title: isRtl ? 'ניהול חשבונות' : 'Bill Management',
            desc: isRtl ? 'סריקת חשבונות ואוטומציה של תשלומים' : 'Bill scanning and payment automation',
            stat: "24/7"
        },
        {
            icon: Bell,
            color: "text-black dark:text-white",
            title: isRtl ? 'התראות חכמות' : 'Smart Alerts',
            desc: isRtl ? 'תזכורות לחידוש חוזה ועדכון שכר דירה' : 'Contract renewal and rent update reminders',
            stat: "∞"
        },
    ];

    if (checkingAuth) {
        return (
            <div className="min-h-screen bg-white dark:bg-black flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div
            ref={containerRef}
            className={`min-h-screen bg-white dark:bg-black ${isRtl ? 'text-right' : 'text-left'} selection:bg-primary/20`}
            dir={isRtl ? 'rtl' : 'ltr'}
        >
            {/* --- HEADER --- */}
            <header className="fixed top-0 w-full z-50 bg-white/50 dark:bg-black/50 backdrop-blur-3xl border-b border-slate-100 dark:border-neutral-900 transition-all">
                <div className="max-w-7xl mx-auto px-6 md:px-8 h-20 md:h-24 flex items-center justify-between">
                    <div className="flex items-center cursor-pointer group" onClick={() => navigate('/')}>
                        <span className="text-2xl md:text-4xl font-black tracking-tighter text-foreground uppercase">
                            Rent<span className="opacity-40">Mate</span>
                        </span>
                    </div>

                    {/* Desktop Nav */}
                    <nav className="hidden lg:flex items-center gap-2 p-1.5 bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-full shadow-minimal">
                        {['home', 'blog', 'demo', 'calculator'].map((tab) => (
                            <button
                                key={tab}
                                onClick={() => setActiveTab(tab as any)}
                                className={cn(
                                    "px-6 py-2.5 text-[10px] font-black uppercase tracking-[0.2em] rounded-full transition-all duration-500",
                                    activeTab === tab
                                        ? "bg-white dark:bg-neutral-800 text-foreground shadow-premium"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {isRtl && tab === 'home' && 'בית'}
                                {isRtl && tab === 'blog' && 'בלוג'}
                                {isRtl && tab === 'demo' && 'הדגמה'}
                                {isRtl && tab === 'calculator' && 'מחשבון'}
                                {!isRtl && tab}
                            </button>
                        ))}
                    </nav>

                    <div className="flex items-center gap-2 md:gap-6">
                        <div className="hidden md:flex gap-4">
                            <ThemeToggle />
                            <LanguageToggle />
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="hidden md:flex h-12 items-center px-8 text-[10px] font-black uppercase tracking-[0.2em] bg-foreground text-background rounded-full hover:scale-105 active:scale-95 transition-all shadow-premium-dark"
                        >
                            {isRtl ? 'כניסה' : 'Sign In'}
                        </button>
                        <button
                            className="lg:hidden p-3 text-foreground hover:bg-slate-50 dark:hover:bg-neutral-900 rounded-xl transition-colors"
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            aria-label="Toggle Menu"
                        >
                            {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                        </button>
                    </div>
                </div>
            </header>

            {/* Mobile Menu Overlay - Moved outside header to avoid backdrop-filter containing block issues */}
            <AnimatePresence>
                {isMenuOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="fixed inset-0 top-[80px] bg-white/95 dark:bg-black/95 backdrop-blur-2xl z-[100] lg:hidden overflow-y-auto"
                        style={{ height: 'calc(100vh - 80px)' }} // Explicit height for safe measure
                    >
                        <div className="p-8 flex flex-col space-y-12">
                            <div className="space-y-2">
                                {['home', 'blog', 'demo', 'calculator'].map((tab, i) => (
                                    <motion.button
                                        initial={{ opacity: 0, x: isRtl ? 20 : -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: i * 0.1 }}
                                        key={tab}
                                        onClick={() => {
                                            setActiveTab(tab as any);
                                            setIsMenuOpen(false);
                                        }}
                                        className={cn(
                                            "w-full text-right p-5 rounded-3xl text-3xl font-black uppercase tracking-tighter transition-all flex items-center justify-between group",
                                            activeTab === tab
                                                ? "bg-slate-100 dark:bg-neutral-900 text-foreground"
                                                : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <span>
                                            {isRtl && tab === 'home' && 'בית'}
                                            {isRtl && tab === 'blog' && 'בלוג'}
                                            {isRtl && tab === 'demo' && 'הדגמה'}
                                            {isRtl && tab === 'calculator' && 'מחשבון'}
                                            {!isRtl && tab}
                                        </span>
                                        {activeTab === tab && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </motion.button>
                                ))}
                            </div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.4 }}
                                className="border-t border-slate-100 dark:border-neutral-900 pt-10 space-y-8"
                            >
                                <div className="flex items-center justify-between px-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{isRtl ? 'מראה' : 'Appearance'}</span>
                                    <ThemeToggle />
                                </div>
                                <div className="flex items-center justify-between px-4">
                                    <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{isRtl ? 'שפה' : 'Language'}</span>
                                    <LanguageToggle />
                                </div>

                                <button
                                    onClick={() => navigate('/login')}
                                    className="w-full h-20 bg-foreground text-background font-black text-xs uppercase tracking-[0.3em] rounded-[2rem] shadow-premium-dark flex items-center justify-center gap-4 hover:scale-[1.02] active:scale-[0.98] transition-all"
                                >
                                    {isRtl ? 'כניסה למערכת' : 'Sign In'}
                                    <ArrowRight className={cn("w-6 h-6", isRtl && "rotate-180")} />
                                </button>
                            </motion.div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            <main className="pt-24">
                <AnimatePresence mode="wait">
                    {activeTab === 'home' && (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-0"
                        >
                            {/* --- HERO SECTION --- */}
                            <section className="relative min-h-[90vh] flex items-center overflow-hidden px-8">
                                <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,#00000008,transparent)] dark:bg-[radial-gradient(circle_at_50%_50%,#ffffff08,transparent)] pointer-events-none" />

                                <div className="max-w-7xl mx-auto w-full grid lg:grid-cols-2 gap-20 items-center relative z-10">
                                    {/* Text Column */}
                                    <div className="space-y-12 order-2 lg:order-1">
                                        <motion.div
                                            initial={{ opacity: 0, y: 50 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                            className="space-y-8"
                                        >
                                            <div className="inline-flex items-center gap-3 px-4 py-2 bg-slate-50 dark:bg-neutral-900 rounded-full border border-slate-100 dark:border-neutral-800 shadow-minimal">
                                                <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
                                                <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">
                                                    {isRtl ? 'בינה מלאכותית בשירות הנדל״ן' : 'AI Powered Real Estate'}
                                                </span>
                                            </div>

                                            <h1 className="text-6xl lg:text-[7rem] font-black tracking-tighter leading-[0.85] text-foreground lowercase">
                                                {isRtl ? 'ניהול חכם.' : 'Manage'} <br />
                                                <span className="opacity-20 translate-x-4 inline-block">
                                                    {isRtl ? 'בראש שקט' : 'Quietly.'}
                                                </span>
                                            </h1>

                                            <p className="text-xl text-muted-foreground max-w-lg leading-relaxed font-medium opacity-80">
                                                {isRtl
                                                    ? 'עוזר ה-AI האישי שלך לניהול נכסים. חוזים, חשבונות, הצמדות ועוד - הכל במקום אחד, במינימום מאמץ.'
                                                    : 'Your personal AI property assistant. Automate contracts, CPI calculations, and daily management - all in one high-end interface.'
                                                }
                                            </p>
                                        </motion.div>

                                        <motion.div
                                            initial={{ opacity: 0, y: 30 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.3, duration: 1, ease: [0.16, 1, 0.3, 1] }}
                                            className="flex flex-wrap gap-6"
                                        >
                                            <button
                                                onClick={() => navigate('/login?mode=signup')}
                                                className="h-16 px-10 bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] hover:scale-105 active:scale-95 transition-all shadow-premium-dark flex items-center gap-4"
                                            >
                                                {isRtl ? 'התחל עכשיו' : 'Start Now'}
                                                <ArrowRight className={cn("w-5 h-5", isRtl && "rotate-180")} />
                                            </button>
                                            <button
                                                onClick={() => setActiveTab('demo')}
                                                className="h-16 px-10 bg-slate-50 dark:bg-neutral-900 text-foreground font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] hover:bg-slate-100 dark:hover:bg-neutral-800 transition-all flex items-center gap-4 border border-slate-100 dark:border-neutral-800 shadow-minimal"
                                            >
                                                <Play className="w-4 h-4 fill-current" />
                                                {isRtl ? 'הדגמה' : 'Demo'}
                                            </button>
                                        </motion.div>
                                    </div>

                                    {/* Bot Column */}
                                    <div className="order-1 lg:order-2 relative h-[40vh] lg:h-[70vh] flex items-center justify-center">
                                        <div className="relative w-full h-full flex items-center justify-center">
                                            <div className="absolute inset-0 bg-slate-100 dark:bg-neutral-900 blur-[150px] rounded-full opacity-30 animate-pulse"></div>
                                            <div className="relative z-20">
                                                <BotFullBody size={320} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </section>

                            {/* --- FEATURES GRID --- */}
                            <section className="py-32 bg-slate-50 dark:bg-black/50 border-y border-slate-100 dark:border-neutral-900 relative">
                                <div className="max-w-7xl mx-auto px-8">
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                                        {features.map((f, i) => (
                                            <motion.div
                                                key={i}
                                                initial={{ opacity: 0, scale: 0.95 }}
                                                whileInView={{ opacity: 1, scale: 1 }}
                                                transition={{ delay: i * 0.1, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                                                viewport={{ once: true }}
                                                className="group p-10 rounded-[3rem] bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 hover:shadow-premium transition-all duration-700 cursor-pointer relative overflow-hidden"
                                                onClick={() => setActiveTab('demo')}
                                            >
                                                <div className="absolute -top-4 -right-4 p-8 opacity-5 font-black text-8xl text-foreground select-none group-hover:scale-110 transition-transform duration-1000">
                                                    {f.stat}
                                                </div>
                                                <div className="w-16 h-16 rounded-[1.5rem] bg-slate-50 dark:bg-neutral-800 shadow-minimal flex items-center justify-center mb-10 text-foreground group-hover:scale-110 group-hover:rotate-6 transition-all duration-500">
                                                    <f.icon className="w-7 h-7" />
                                                </div>
                                                <h3 className="text-xl font-black tracking-tighter mb-4 text-foreground lowercase">{f.title}</h3>
                                                <p className="text-muted-foreground leading-relaxed text-sm opacity-60">
                                                    {f.desc}
                                                </p>
                                            </motion.div>
                                        ))}
                                    </div>
                                </div>
                            </section>

                            {/* --- PREVIEW SECTION --- */}
                            <section className="py-40 relative px-8">
                                <div className="max-w-5xl mx-auto text-center space-y-20">
                                    <div className="space-y-4">
                                        <h2 className="text-5xl lg:text-7xl font-black tracking-tighter text-foreground lowercase">
                                            {isRtl ? 'הכל תחת שליטה.' : 'Absolute Control.'}
                                        </h2>
                                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto opacity-60">
                                            {isRtl ? 'ממשק אחד חכם לניהול הנכס, הדיירים והחוזים במינימום קליקים.' : 'One smart interface for property, tenant, and contract management with minimum effort.'}
                                        </p>
                                    </div>

                                    <motion.div
                                        initial={{ opacity: 0, y: 100 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                                        className="relative"
                                    >
                                        <BillScanningAnimation isRtl={isRtl} />
                                    </motion.div>
                                </div>
                            </section>


                        </motion.div>
                    )}

                    {activeTab !== 'home' && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="min-h-[80vh] flex items-center justify-center px-8"
                        >
                            <div className="text-center space-y-8">
                                <div className="w-24 h-24 bg-slate-50 dark:bg-neutral-900 rounded-[2rem] flex items-center justify-center mx-auto shadow-minimal">
                                    <Clock className="w-10 h-10 text-slate-300" />
                                </div>
                                <h2 className="text-3xl font-black tracking-tighter text-foreground uppercase">Coming Soon</h2>
                                <button
                                    onClick={() => setActiveTab('home')}
                                    className="px-10 py-4 bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] rounded-full shadow-premium-dark"
                                >
                                    {isRtl ? 'חזרה לבית' : 'Back to Home'}
                                </button>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* --- FOOTER (Global) --- */}
            <footer className="py-24 border-t border-slate-100 dark:border-neutral-900 bg-white dark:bg-black text-center px-8 relative z-10">
                <div className="max-w-7xl mx-auto space-y-16">
                    <div className="space-y-6">
                        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.5em] opacity-40">
                            {isRtl ? 'מאובטח בטכנולוגיית ענן מובילה' : 'Built with Premium Enterprise Stack'}
                        </p>
                        <div className="flex flex-wrap justify-center gap-12 opacity-30 invert dark:invert-0 grayscale hover:grayscale-0 transition-all duration-1000">
                            {['Supabase', 'Stripe', 'OpenAI', 'AWS'].map(brand => (
                                <span key={brand} className="text-2xl font-black text-foreground tracking-tighter lowercase">{brand}</span>
                            ))}
                        </div>
                    </div>

                    <div className="pt-16 border-t border-slate-50 dark:border-neutral-900 flex flex-col md:flex-row items-center justify-between gap-8">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60">
                            © 2025 RentMate. Intelligently Minimal.
                        </span>
                        <div className="flex gap-10">
                            <a
                                href="/legal/privacy"
                                onClick={(e) => { e.preventDefault(); navigate('/legal/privacy'); }}
                                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isRtl ? 'פרטיות' : 'Privacy'}
                            </a>
                            <a
                                href="/legal/terms"
                                onClick={(e) => { e.preventDefault(); navigate('/legal/terms'); }}
                                className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors"
                            >
                                {isRtl ? 'תנאים' : 'Terms'}
                            </a>
                            <button className="text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-colors">
                                {isRtl ? 'תמיכה' : 'Support'}
                            </button>
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
