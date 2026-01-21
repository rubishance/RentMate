import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { useUserPreferences } from '../contexts/UserPreferencesContext';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { ArrowRight, Check, X, Menu, Bell, Calculator, Mail, Info, Play, MessageSquare, Search, ChevronRight, ChevronLeft, Clock, Calendar, Tag } from 'lucide-react';
import { BillScanningAnimation } from '../components/animations/BillScanningAnimation';
import logoIconOnly from '../assets/rentmate-icon-only.png';
import logoIconDark from '../assets/rentmate-icon-only-dark.png';
import { cn } from '../lib/utils';
import { articles } from '../content/articleIndex';
import { calculateStandard } from '../services/calculator.service';
import { DatePicker } from '../components/ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { Loader2 } from 'lucide-react';


// Minimal Custom SVG Icons
const ScanIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
        <polyline points="14 2 14 8 20 8" />
        <line x1="9" y1="15" x2="15" y2="15" />
        <circle cx="12" cy="18" r="1" />
    </svg>
);

const ChartIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
);

const DocumentIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M13 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" />
        <polyline points="13 2 13 9 20 9" />
    </svg>
);

const ShieldIcon = () => (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
);

const LogoIcon = () => (
    <svg viewBox="0 0 32 32" fill="none">
        <path d="M6 18L16 10L26 18V28H6V18Z" fill="black" />
        <rect x="11" y="20" width="4" height="8" fill="white" />
        <rect x="18" y="14" width="3" height="3" fill="white" />
    </svg>
);

export function WelcomeLanding() {
    const { lang } = useTranslation();
    const { effectiveTheme } = useUserPreferences();
    const isRtl = lang === 'he';
    const navigate = useNavigate();
    const [selectedFeature, setSelectedFeature] = useState<any>(null);
    const [activeTab, setActiveTab] = useState<'home' | 'blog' | 'demo' | 'about' | 'contact' | 'calculator'>('home');
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const [contactForm, setContactForm] = useState({ name: '', email: '', message: '' });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

    const handleContactSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!contactForm.email || !contactForm.message) return;

        setIsSubmitting(true);
        setSubmitStatus('idle');

        try {
            const { error } = await supabase.functions.invoke('send-contact-email', {
                body: {
                    user_name: contactForm.name || 'Anonymous',
                    user_email: contactForm.email,
                    message: contactForm.message,
                    user_id: 'guest'
                }
            });

            if (error) throw error;
            setSubmitStatus('success');
            setContactForm({ name: '', email: '', message: '' });

            // Reset success message after 5 seconds
            setTimeout(() => setSubmitStatus('idle'), 5000);
        } catch (err) {
            console.error('Error submitting contact form:', err);
            setSubmitStatus('error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const features = [
        {
            icon: ScanIcon,
            title: isRtl ? 'סריקת חוזים' : 'Contract Scanning',
            desc: isRtl ? 'חילוץ אוטומטי של הצמדות ותנאי חוזה' : 'Automated extraction of linkages and contract terms',
            longDesc: isRtl
                ? 'מערכת AI מתקדמת המנתחת חוזי שכירות, מזהה סעיפי הצמדה למדד, תאריכי חידוש ומפיקה תובנות מיידיות. חוסכת עד 95% מזמן העבודה הידני.'
                : 'Advanced AI system that analyzes rental contracts, identifies CPI linkage clauses, renewal dates, and generates instant insights. Saves up to 95% of manual work time.',
            features: [
                isRtl ? 'זיהוי אוטומטי של סעיפי הצמדה' : 'Automatic CPI clause detection',
                isRtl ? 'ניתוח תאריכי חידוש וסיום' : 'Renewal and end date analysis',
                isRtl ? 'חילוץ נתונים פיננסיים' : 'Financial data extraction'
            ]
        },
        {
            icon: ChartIcon,
            title: isRtl ? 'חישוב מדד' : 'CPI Calculation',
            desc: isRtl ? 'סנכרון עם נתוני הלמ"ס וחישוב אוטומטי' : 'Sync with CBS data and automatic calculation',
            longDesc: isRtl
                ? 'חיבור ישיר לנתוני הלשכה המרכזית לסטטיסטיקה. המערכת מחשבת אוטומטית הפרשי הצמדה, מייצרת דרישות תשלום ושומרת היסטוריה מלאה.'
                : 'Direct connection to Central Bureau of Statistics data. The system automatically calculates CPI differences, generates payment demands, and maintains complete history.',
            features: [
                isRtl ? 'סנכרון אוטומטי עם נתוני למ"ס' : 'Auto-sync with CBS data',
                isRtl ? 'חישוב רטרואקטיבי מדויק' : 'Accurate retroactive calculation',
                isRtl ? 'הפקת דרישות תשלום בלחיצת כפתור' : 'One-click payment demand generation'
            ]
        },
        {
            icon: DocumentIcon,
            title: isRtl ? 'ניהול מסמכים' : 'Document Management',
            desc: isRtl ? 'זיהוי וסיווג אוטומטי של מסמכים' : 'Automatic document recognition and classification',
            longDesc: isRtl
                ? 'טכנולוגיית OCR מתקדמת המזהה חשבונות חשמל, ארנונה וקבלות. המערכת מחלצת סכומים, תאריכים ומעדכנת את מאזן הנכס אוטומטית.'
                : 'Advanced OCR technology that recognizes electricity bills, property tax, and receipts. The system extracts amounts, dates, and automatically updates property balance.',
            features: [
                isRtl ? 'זיהוי אוטומטי של סכומים ותאריכים' : 'Automatic amount and date detection',
                isRtl ? 'סיווג חכם לפי סוג הוצאה' : 'Smart categorization by expense type',
                isRtl ? 'ארכיון דיגיטלי מאובטח' : 'Secure digital archive'
            ]
        },
        {
            icon: Bell,
            title: isRtl ? 'תזכורות חכמות' : 'Smart Reminders',
            desc: isRtl ? 'התראות חכמות על מועדים חשובים' : 'Smart alerts for important dates',
            longDesc: isRtl
                ? 'המערכת שולחת התראות חכמות לוואטסאפ ולאימייל על מועדי חידוש אופציות, שינויי מדד ודרישות תשלום. לעולם לא תפספסו עדכון שכר דירה.'
                : 'The system sends smart alerts to WhatsApp and email about option renewal dates, CPI changes, and payment demands. You\'ll never miss a rent update.',
            features: [
                isRtl ? 'התראות לוואטסאפ ולאימייל' : 'WhatsApp and email alerts',
                isRtl ? 'מעקב אוטומטי אחר אופציות' : 'Automated option tracking',
                isRtl ? 'תזכורות לדרישות תשלום' : 'Payment demand reminders'
            ]
        },
    ];

    return (
        <div className={`min-h-screen bg-white dark:bg-[#0a0a0a] ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>

            {/* Header */}
            <header className="border-b border-gray-100 dark:border-neutral-800 bg-white/80 dark:bg-[#0a0a0a]/80 backdrop-blur-md sticky top-0 z-50">
                <div className="max-w-6xl mx-auto px-6 h-20 flex items-center justify-between">
                    <div className="flex items-center gap-2 md:gap-3 shrink-0">
                        <img src={effectiveTheme === 'dark' ? logoIconDark : logoIconOnly} alt="RentMate Icon" className="h-8 md:h-10 w-auto object-contain flex-shrink-0" />
                        <span className="text-lg md:text-xl lg:text-[1.5rem] tracking-tighter text-black dark:text-white leading-none">
                            <span className="font-black">Rent</span>
                            <span className="font-normal">Mate</span>
                        </span>
                    </div>

                    <div className="flex items-center gap-4 lg:gap-8 shrink-0">
                        <nav className="hidden lg:flex items-center gap-6">
                            <button
                                onClick={() => setActiveTab('home')}
                                className={cn("text-sm font-medium transition-colors", activeTab === 'home' ? "text-black" : "text-gray-500 hover:text-black")}
                            >
                                {isRtl ? 'בית' : 'Home'}
                            </button>
                            <button
                                onClick={() => setActiveTab('blog')}
                                className={cn("text-sm font-medium transition-colors", activeTab === 'blog' ? "text-black" : "text-gray-500 hover:text-black")}
                            >
                                {isRtl ? 'בלוג' : 'Blog'}
                            </button>
                            <button
                                onClick={() => setActiveTab('demo')}
                                className={cn("text-sm font-medium transition-colors", activeTab === 'demo' ? "text-black" : "text-gray-500 hover:text-black")}
                            >
                                {isRtl ? 'הסברים והדגמה' : 'Demo'}
                            </button>
                            <button
                                onClick={() => setActiveTab('calculator')}
                                className={cn("text-sm font-medium transition-colors", activeTab === 'calculator' ? "text-black" : "text-gray-500 hover:text-black")}
                            >
                                {isRtl ? 'מחשבון הצמדה' : 'Index Calculator'}
                            </button>
                            <button
                                onClick={() => setActiveTab('about')}
                                className={cn("text-sm font-medium transition-colors", activeTab === 'about' ? "text-black" : "text-gray-500 hover:text-black")}
                            >
                                {isRtl ? 'אודות' : 'About'}
                            </button>
                            <button
                                onClick={() => setActiveTab('contact')}
                                className={cn("text-sm font-medium transition-colors", activeTab === 'contact' ? "text-black" : "text-gray-500 hover:text-black")}
                            >
                                {isRtl ? 'צור קשר' : 'Contact'}
                            </button>
                        </nav>

                        {/* Desktop Actions */}
                        <div className="hidden lg:flex items-center gap-3">
                            <ThemeToggle />
                            <LanguageToggle />
                            <div className="flex items-center gap-4 ps-6 border-s border-gray-100 dark:border-neutral-800">
                                <button
                                    onClick={() => navigate('/login')}
                                    className="text-sm font-semibold hover:text-gray-600 dark:hover:text-gray-300 transition-colors text-black dark:text-white"
                                >
                                    {isRtl ? 'כניסה' : 'Sign in'}
                                </button>
                                <button
                                    onClick={() => navigate('/login?mode=signup')}
                                    className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-xl hover:bg-gray-800 dark:hover:bg-gray-100 transition-all active:scale-95"
                                >
                                    {isRtl ? 'התחל' : 'Get started'}
                                </button>
                            </div>
                        </div>

                        {/* Mobile Actions */}
                        <div className="lg:hidden flex items-center gap-2">
                            <ThemeToggle className="scale-90" />
                            <LanguageToggle className="scale-90" />
                            <button
                                className="p-2 text-black dark:text-white"
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                            >
                                {isMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
                            </button>
                        </div>
                    </div>
                </div>

                {/* Mobile Menu Overlay */}
                <AnimatePresence>
                    {isMenuOpen && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="lg:hidden border-t border-gray-100 dark:border-neutral-800 bg-white dark:bg-[#0a0a0a] overflow-hidden"
                        >
                            <div className="px-6 py-8 flex flex-col gap-6">
                                <nav className="flex flex-col gap-4">
                                    {[
                                        { id: 'home', label: isRtl ? 'בית' : 'Home' },
                                        { id: 'blog', label: isRtl ? 'בלוג' : 'Blog' },
                                        { id: 'demo', label: isRtl ? 'הסברים והדגמה' : 'Demo' },
                                        { id: 'calculator', label: isRtl ? 'מחשבון הצמדה' : 'Index Calculator' },
                                        { id: 'about', label: isRtl ? 'אודות' : 'About' },
                                        { id: 'contact', label: isRtl ? 'צור קשר' : 'Contact' },
                                    ].map((tab) => (
                                        <button
                                            key={tab.id}
                                            onClick={() => {
                                                setActiveTab(tab.id as any);
                                                setIsMenuOpen(false);
                                            }}
                                            className={cn(
                                                "text-lg font-medium transition-colors text-start",
                                                activeTab === tab.id ? "text-black" : "text-gray-500"
                                            )}
                                        >
                                            {tab.label}
                                        </button>
                                    ))}
                                </nav>
                                <div className="pt-6 border-t border-gray-100 dark:border-neutral-800 flex flex-col gap-4">
                                    <div className="flex items-center justify-between">
                                        <span className="text-sm font-medium text-gray-500 dark:text-gray-400">{isRtl ? 'שפה' : 'Language'}</span>
                                        <LanguageToggle />
                                    </div>
                                    <button
                                        onClick={() => navigate('/login')}
                                        className="w-full py-3 text-center font-semibold border border-black dark:border-white text-black dark:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-neutral-900 transition-colors"
                                    >
                                        {isRtl ? 'כניסה' : 'Sign in'}
                                    </button>
                                    <button
                                        onClick={() => navigate('/login?mode=signup')}
                                        className="w-full py-3 text-center font-bold bg-black dark:bg-white text-white dark:text-black rounded-xl hover:bg-neutral-800 dark:hover:bg-gray-100 transition-colors"
                                    >
                                        {isRtl ? 'התחל עכשיו' : 'Get started'}
                                    </button>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </header>

            <main className="flex-1">
                <AnimatePresence mode="wait">
                    {activeTab === 'home' && (
                        <motion.div
                            key="home"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            transition={{ duration: 0.3 }}
                        >
                            {/* Hero */}
                            <section className="max-w-4xl mx-auto px-6 pt-32 pb-24">
                                <motion.div
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    className="text-center space-y-8"
                                >
                                    <h1 className="text-6xl md:text-7xl font-light text-black dark:text-white leading-tight">
                                        {isRtl ? 'ניהול נכסים,' : 'Property management,'}
                                        <br />
                                        <span className="font-bold">{isRtl ? 'פשוט.' : 'simplified.'}</span>
                                    </h1>

                                    <p className="text-xl text-gray-600 dark:text-gray-400 max-w-2xl mx-auto leading-relaxed font-light">
                                        {isRtl
                                            ? 'ניהול נכסים חכם, פשוט ומתקדם. הפתרון המקיף לבעלי דירות בישראל לניהול הדירות והשוכרים במקום אחד.'
                                            : 'Smart, simple, and advanced property management. The comprehensive solution for Israeli landlords to manage apartments and tenants in one place.'}
                                    </p>

                                    <div className="flex items-center justify-center gap-4 pt-4">
                                        <button
                                            onClick={() => navigate('/login?mode=signup')}
                                            className="group px-6 py-3 bg-black dark:bg-white text-white dark:text-black text-sm font-medium rounded-lg hover:bg-neutral-800 dark:hover:bg-gray-100 transition-all flex items-center gap-2"
                                        >
                                            {isRtl ? 'התחל בחינם' : 'Start free trial'}
                                            <ArrowRight className={`w-4 h-4 group-hover:translate-x-0.5 transition-transform ${isRtl ? 'rotate-180' : ''}`} />
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('demo')}
                                            className="px-6 py-3 text-sm font-medium text-gray-700 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors"
                                        >
                                            {isRtl ? 'צפה בהדגמה' : 'Watch demo'}
                                        </button>
                                    </div>
                                </motion.div>
                            </section>

                            {/* Contract Scanning Animation */}
                            <section className="max-w-3xl mx-auto px-6 py-16">
                                <motion.div
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.3 }}
                                    className="relative"
                                >
                                    <svg viewBox="0 0 600 400" className="w-full h-auto">
                                        <defs>
                                            <linearGradient id="scan-line" x1="0%" y1="0%" x2="0%" y2="100%">
                                                <stop offset="0%" stopColor="black" stopOpacity="0" />
                                                <stop offset="50%" stopColor="black" stopOpacity="0.3" />
                                                <stop offset="100%" stopColor="black" stopOpacity="0" />
                                            </linearGradient>
                                            <linearGradient id="highlight" x1="0%" y1="0%" x2="100%" y2="0%">
                                                <stop offset="0%" stopColor="black" stopOpacity="0" />
                                                <stop offset="50%" stopColor="black" stopOpacity="0.1" />
                                                <stop offset="100%" stopColor="black" stopOpacity="0" />
                                            </linearGradient>
                                        </defs>
                                        <rect x="100" y="50" width="400" height="300" rx="8" fill="white" stroke="black" strokeWidth="1.5" />
                                        <text x="300" y="85" fontSize="14" fontWeight="600" fill="black" textAnchor="middle">
                                            {isRtl ? 'הסכם שכירות' : 'RENTAL AGREEMENT'}
                                        </text>
                                        <line x1="120" y1="95" x2="480" y2="95" stroke="black" strokeWidth="0.5" opacity="0.2" />
                                        <g opacity="0.4">
                                            <line x1="120" y1="120" x2="380" y2="120" stroke="black" strokeWidth="1" />
                                            <line x1="120" y1="140" x2="420" y2="140" stroke="black" strokeWidth="1" />
                                            <line x1="120" y1="160" x2="350" y2="160" stroke="black" strokeWidth="1" />
                                        </g>
                                        <motion.g
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1, duration: 0.5 }}
                                        >
                                            <rect x="115" y="185" width="370" height="40" rx="4" fill="url(#highlight)" />
                                            <text
                                                x={isRtl ? "480" : "120"}
                                                y="200"
                                                fontSize="11"
                                                fontWeight="500"
                                                fill="black"
                                                textAnchor={isRtl ? "end" : "start"}
                                                style={{ direction: 'ltr' }}
                                            >
                                                {isRtl ? 'סעיף הצמדה למדד' : 'CPI Linkage Clause'}
                                            </text>
                                            <line x1={isRtl ? "220" : "120"} y1="210" x2={isRtl ? "480" : "380"} y2="210" stroke="black" strokeWidth="1" opacity="0.6" />
                                            <line x1={isRtl ? "180" : "120"} y1="220" x2={isRtl ? "480" : "420"} y2="220" stroke="black" strokeWidth="1" opacity="0.4" />
                                            <motion.circle
                                                cx={isRtl ? "135" : "465"}
                                                cy="205"
                                                r="4"
                                                fill="black"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: [0, 1.2, 1] }}
                                                transition={{ delay: 1.3, duration: 0.4 }}
                                            />
                                        </motion.g>
                                        <g opacity="0.4">
                                            <line x1="120" y1="245" x2="360" y2="245" stroke="black" strokeWidth="1" />
                                            <line x1="120" y1="265" x2="400" y2="265" stroke="black" strokeWidth="1" />
                                        </g>
                                        <motion.g
                                            initial={{ opacity: 0 }}
                                            animate={{ opacity: 1 }}
                                            transition={{ delay: 1.8, duration: 0.5 }}
                                        >
                                            <rect x="115" y="280" width="370" height="25" rx="4" fill="url(#highlight)" />
                                            <text
                                                x={isRtl ? "480" : "120"}
                                                y="295"
                                                fontSize="11"
                                                fontWeight="500"
                                                fill="black"
                                                textAnchor={isRtl ? "end" : "start"}
                                                style={{ direction: 'ltr' }}
                                            >
                                                {isRtl ? 'תאריך חידוש: 01/01/2027' : 'Renewal Date: 01/01/2027'}
                                            </text>
                                            <motion.circle
                                                cx={isRtl ? "175" : "425"}
                                                cy="292"
                                                r="4"
                                                fill="black"
                                                initial={{ scale: 0 }}
                                                animate={{ scale: [0, 1.2, 1] }}
                                                transition={{ delay: 2.1, duration: 0.4 }}
                                            />
                                        </motion.g>
                                        <motion.rect
                                            x="100"
                                            y="50"
                                            width="400"
                                            height="30"
                                            fill="url(#scan-line)"
                                            initial={{ y: 50 }}
                                            animate={{ y: [50, 320, 50] }}
                                            transition={{
                                                duration: 3,
                                                repeat: Infinity,
                                                ease: "linear",
                                                repeatDelay: 1
                                            }}
                                        />
                                        <motion.g
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.5 }}
                                        >
                                            <rect x="220" y="365" width="160" height="24" rx="12" fill="black" />
                                            <text x="300" y="381" fontSize="11" fontWeight="500" fill="white" textAnchor="middle">
                                                {isRtl ? 'סורק...' : 'Scanning...'}
                                            </text>
                                            <motion.circle
                                                cx={isRtl ? "365" : "235"}
                                                cy="377"
                                                r="3"
                                                fill="white"
                                                animate={{ opacity: [1, 0.3, 1] }}
                                                transition={{ duration: 1.5, repeat: Infinity }}
                                            />
                                        </motion.g>
                                    </svg>
                                    <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                                        {isRtl
                                            ? 'AI מזהה ומנתח סעיפים קריטיים בחוזה אוטומטית'
                                            : 'AI automatically identifies and analyzes critical contract clauses'}
                                    </p>
                                </motion.div>
                            </section>

                            {/* Features */}
                            <section className="max-w-5xl mx-auto px-6 py-24">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-12">
                                    {features.map((feature, i) => (
                                        <motion.div
                                            key={i}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.1 }}
                                            onClick={() => setSelectedFeature(feature)}
                                            className="cursor-pointer group"
                                        >
                                            <div className="w-10 h-10 text-gray-400 group-hover:text-black dark:group-hover:text-white transition-colors mb-6">
                                                <feature.icon />
                                            </div>
                                            <h3 className="text-lg font-medium mb-2 group-hover:text-black dark:group-hover:text-white transition-colors text-black dark:text-white">
                                                {feature.title}
                                            </h3>
                                            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">
                                                {feature.desc}
                                            </p>
                                        </motion.div>
                                    ))}
                                </div>
                            </section>

                            {/* Bill Scanning Animation */}
                            <section className="max-w-3xl mx-auto px-6 py-24 border-t border-gray-100">
                                <motion.div
                                    initial={{ opacity: 0, y: 40 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                    className="space-y-8"
                                >
                                    <div className="text-center space-y-4">
                                        <h2 className="text-3xl font-medium">
                                            {isRtl ? 'סרוק מסמכים בשנייה' : 'Scan documents in seconds'}
                                        </h2>
                                        <p className="text-gray-600 max-w-xl mx-auto">
                                            {isRtl
                                                ? 'פשוט צלם את החשבון והמערכת תחלץ את כל הנתונים אוטומטית'
                                                : 'Simply photograph the bill and the system extracts all data automatically'}
                                        </p>
                                    </div>
                                    <BillScanningAnimation isRtl={isRtl} />
                                </motion.div>
                            </section>

                            {/* Security & Services */}
                            <section className="max-w-5xl mx-auto px-6 py-24 border-t border-gray-100">
                                <div className="text-center mb-16 space-y-4">
                                    <h2 className="text-3xl font-medium">
                                        {isRtl ? 'אבטחה וטכנולוגיה ברמה הגבוהה ביותר' : 'Enterprise-Grade Security'}
                                    </h2>
                                    <p className="text-gray-600 max-w-2xl mx-auto">
                                        {isRtl
                                            ? 'המידע שלך מוגן באמצעות הטכנולוגיות המתקדמות ביותר בשוק, בסטנדרטים המחמירים ביותר.'
                                            : 'Your data is protected by the most advanced technologies, following the strictest industry standards.'}
                                    </p>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                                    <div className="p-6 bg-gray-50 dark:bg-neutral-900 rounded-xl space-y-3">
                                        <div className="text-black dark:text-white font-semibold">Supabase Auth</div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {isRtl ? 'אימות זהות מאובטח עם תמיכה ב-MFA והצפנה מקצה לקצה.' : 'Secure authentication with MFA support and end-to-end encryption.'}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-gray-50 dark:bg-neutral-900 rounded-xl space-y-3">
                                        <div className="text-black dark:text-white font-semibold">AES-256</div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {isRtl ? 'הצפנת מסמכים ברמה צבאית השומרת על פרטיות החוזים שלך.' : 'Military-grade document encryption keeping your contracts private.'}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-gray-50 dark:bg-neutral-900 rounded-xl space-y-3">
                                        <div className="text-black dark:text-white font-semibold">Row-Level Security</div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {isRtl ? 'הפרדה מוחלטת של נתונים ברמת מסד הנתונים - המידע שלך שייך רק לך.' : 'Complete data isolation at the database level - your info belongs only to you.'}
                                        </p>
                                    </div>
                                    <div className="p-6 bg-gray-50 dark:bg-neutral-900 rounded-xl space-y-3">
                                        <div className="text-black dark:text-white font-semibold">SSL/TLS</div>
                                        <p className="text-sm text-gray-600 dark:text-gray-400">
                                            {isRtl ? 'תקשורת מוצפנת ומאובטחת בכל רגע נתון מול השרתים שלנו.' : 'Encrypted and secure communication at all times with our servers.'}
                                        </p>
                                    </div>
                                </div>
                            </section>

                            {/* Stats */}
                            <section className="max-w-5xl mx-auto px-6 py-24 border-t border-gray-100">
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-12 text-center">
                                    <div>
                                        <div className="text-4xl font-light mb-2">AI Analysis</div>
                                        <div className="text-sm text-gray-600">{isRtl ? 'ניתוח בינה מלאכותית' : 'Smart Processing'}</div>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-light mb-2">24/7</div>
                                        <div className="text-sm text-gray-600">{isRtl ? 'תמיכה' : 'Support'}</div>
                                    </div>
                                    <div>
                                        <div className="text-4xl font-light mb-2">Supabase</div>
                                        <div className="text-sm text-gray-600">{isRtl ? 'תשתית מאובטחת' : 'Secure Infrastructure'}</div>
                                    </div>
                                </div>
                            </section>
                        </motion.div>
                    )}

                    {activeTab === 'blog' && (
                        <motion.div
                            key="blog"
                            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                            className="max-w-6xl mx-auto px-6 py-20"
                        >
                            <div className="mb-12 text-center">
                                <h2 className="text-4xl font-medium mb-4">{isRtl ? 'מרכז הידע של RentMate' : 'RentMate Knowledge Base'}</h2>
                                <p className="text-gray-600">{isRtl ? 'כל מה שצריך לדעת על ניהול נכסים, מיסוי וחוקי שכירות' : 'Everything you need to know about property management, taxation, and rental laws'}</p>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                                {articles.map((article) => (
                                    <motion.div
                                        key={article.slug}
                                        whileHover={{ y: -4 }}
                                        className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl overflow-hidden cursor-pointer shadow-sm hover:shadow-xl transition-all"
                                        onClick={() => navigate(`/article/${article.slug}`)}
                                    >
                                        <div className="p-6 space-y-4">
                                            <div className="flex items-center gap-2 text-xs font-semibold text-gray-400 dark:text-gray-500 uppercase tracking-wider">
                                                <Tag className="w-3 h-3" />
                                                {isRtl ? article.category_he : article.category}
                                            </div>
                                            <h3 className="text-xl font-bold leading-tight text-foreground dark:text-white hover:text-black dark:hover:text-white transition-colors">
                                                {isRtl ? article.title_he : article.title_en}
                                            </h3>
                                            <p className="text-sm text-gray-500 dark:text-gray-400 line-clamp-3">
                                                {isRtl ? article.description_he : article.description_en}
                                            </p>
                                            <div className="flex items-center justify-between pt-4 border-t border-gray-50 dark:border-neutral-800">
                                                <div className="flex items-center gap-2 text-xs text-gray-400 dark:text-gray-500">
                                                    <Clock className="w-3 h-3" />
                                                    {article.readTime} min read
                                                </div>
                                                <div className="text-xs font-bold flex items-center gap-1 text-black dark:text-white">
                                                    {isRtl ? 'קרא עוד' : 'Read more'}
                                                    <ArrowRight className={cn("w-3 h-3", isRtl && "rotate-180")} />
                                                </div>
                                            </div>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'demo' && (
                        <motion.div
                            key="demo"
                            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                            className="max-w-4xl mx-auto px-6 py-20"
                        >
                            <div className="text-center space-y-12">
                                <div className="space-y-4">
                                    <h2 className="text-4xl font-medium">{isRtl ? 'איך זה עובד?' : 'How it Works'}</h2>
                                    <p className="text-gray-600 max-w-2xl mx-auto">
                                        {isRtl
                                            ? 'RentMate הופכת את ניהול הנכסים לאוטומטי, שקוף ופשוט. צפו בהדגמה הקצרה שלנו וראו איך אנחנו חוסכים לכם זמן וכסף.'
                                            : 'RentMate automates property management, making it transparent and simple. Watch our short demo and see how we save you time and money.'}
                                    </p>
                                </div>

                                <div className="aspect-video bg-gray-50 dark:bg-neutral-900 rounded-3xl border border-gray-100 dark:border-neutral-800 flex items-center justify-center relative overflow-hidden group cursor-pointer shadow-2xl">
                                    <div className="absolute inset-0 bg-black/5 group-hover:bg-black/10 transition-colors" />
                                    <div className="w-20 h-20 bg-white dark:bg-neutral-800 rounded-full flex items-center justify-center shadow-2xl group-hover:scale-110 transition-transform">
                                        <Play className="w-8 h-8 text-black dark:text-white fill-current ml-1" />
                                    </div>
                                    <p className="absolute bottom-8 text-sm font-medium text-gray-500 dark:text-gray-400">
                                        {isRtl ? 'סרטון הדגמה בקרוב' : 'Demo video coming soon'}
                                    </p>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 pt-12">
                                    {[
                                        { i: 1, t: isRtl ? 'מעלים חוזה' : 'Upload Contract', d: isRtl ? 'מעלים את החוזה הקיים למערכת' : 'Upload your existing contract' },
                                        { i: 2, t: isRtl ? 'AI מנתח' : 'AI Analyzes', d: isRtl ? 'המערכת מחלצת הצמדות ותנאים' : 'The system extracts linkage and terms' },
                                        { i: 3, t: isRtl ? 'ניהול חכם' : 'Smart Management', d: isRtl ? 'מקבלים התראות ומחשבים מדד' : 'Get alerts and calculate CPI' }
                                    ].map((step, i) => (
                                        <div key={i} className="space-y-4">
                                            <div className="w-10 h-10 bg-black text-white rounded-full flex items-center justify-center font-bold mx-auto">
                                                {step.i}
                                            </div>
                                            <h4 className="font-bold">{step.t}</h4>
                                            <p className="text-sm text-gray-500">{step.d}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'calculator' && (
                        <motion.div
                            key="calculator"
                            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                            className="max-w-4xl mx-auto px-6 py-20"
                        >
                            <BasicCalculatorView isRtl={isRtl} />
                        </motion.div>
                    )}

                    {activeTab === 'about' && (
                        <motion.div
                            key="about"
                            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                            className="max-w-3xl mx-auto px-6 py-20 space-y-12"
                        >
                            <div className="space-y-6">
                                <h2 className="text-4xl font-medium">{isRtl ? 'על RentMate' : 'About RentMate'}</h2>
                                <p className="text-lg text-gray-600 leading-relaxed">
                                    {isRtl
                                        ? 'RentMate הוקמה כדי לפתור את הכאב הממושך של בעלי דירות ומשכירים בניהול נכסים בישראל. אנחנו מאמינים שטכנולוגיה צריכה לשרת את האדם, ולא להפך.'
                                        : 'RentMate was established to solve the long-standing pain of landlords and property owners in Israel. We believe technology should serve people, not vice-versa.'}
                                </p>
                                <p className="text-lg text-gray-600 leading-relaxed">
                                    {isRtl
                                        ? 'המשימה שלנו היא להפוך את שוק השכירות בישראל ליותר שקוף, הוגן ודיגיטלי. באמצעות בינה מלאכותית מתקדמת, אנחנו עוזרים לאלפי משכירים לנהל את החוזים, המדדים והתשלומים שלהם בביטחון מלא.'
                                        : 'Our mission is to make the Israeli rental market more transparent, fair, and digital. Using advanced AI, we help thousands of landlords manage their contracts, indices, and payments with full confidence.'}
                                </p>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 pt-12 border-t border-gray-100">
                                <div className="space-y-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                                        <Search className="w-6 h-6 text-black" />
                                    </div>
                                    <h4 className="font-bold text-xl">{isRtl ? 'החזון שלנו' : 'Our Vision'}</h4>
                                    <p className="text-gray-500">
                                        {isRtl ? 'להיות התשתית הדיגיטלית המובילה לניהול נכסים במזרח התיכון.' : 'To be the leading digital infrastructure for property management in the Middle East.'}
                                    </p>
                                </div>
                                <div className="space-y-4">
                                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center">
                                        <ShieldIcon />
                                    </div>
                                    <h4 className="font-bold text-xl">{isRtl ? 'הערכים שלנו' : 'Our Values'}</h4>
                                    <p className="text-gray-500">
                                        {isRtl ? 'אמינות, חדשנות, ופשטות מעל הכל.' : 'Reliability, innovation, and simplicity above all.'}
                                    </p>
                                </div>
                            </div>
                        </motion.div>
                    )}

                    {activeTab === 'contact' && (
                        <motion.div
                            key="contact"
                            initial={{ opacity: 0, x: isRtl ? -20 : 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: isRtl ? 20 : -20 }}
                            className="max-w-4xl mx-auto px-6 py-20"
                        >
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-20">
                                <div className="space-y-8">
                                    <div className="space-y-4">
                                        <h2 className="text-4xl font-medium">{isRtl ? 'נדבר?' : 'Let\'s Talk'}</h2>
                                        <p className="text-gray-600">
                                            {isRtl
                                                ? 'יש לכם שאלות? רוצים לדעת עוד על המערכת? הצוות שלנו זמין עבורכם.'
                                                : 'Got questions? Want to know more about the system? Our team is here for you.'}
                                        </p>
                                    </div>

                                    <div className="space-y-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-50 dark:bg-neutral-900 rounded-full flex items-center justify-center">
                                                <Mail className="w-5 h-5 text-black dark:text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">Email</p>
                                                <p className="font-medium">support@rentmate.co.il</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <div className="w-10 h-10 bg-gray-50 dark:bg-neutral-900 rounded-full flex items-center justify-center">
                                                <MessageSquare className="w-5 h-5 text-black dark:text-white" />
                                            </div>
                                            <div>
                                                <p className="text-xs text-gray-400">WhatsApp</p>
                                                <p className="font-medium">+972 (50) 123-4567</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <form className="space-y-4 p-8 bg-gray-50 dark:bg-neutral-900 rounded-3xl" onSubmit={handleContactSubmit}>
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">{isRtl ? 'שם' : 'Name'}</label>
                                            <input
                                                type="text"
                                                value={contactForm.name}
                                                onChange={(e) => setContactForm({ ...contactForm, name: e.target.value })}
                                                className="w-full bg-white dark:bg-neutral-800 text-black dark:text-white border-transparent focus:border-black dark:focus:border-white rounded-xl p-3 outline-none transition-all"
                                                placeholder={isRtl ? 'השם שלך' : 'Your name'}
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">{isRtl ? 'אימייל' : 'Email'}</label>
                                            <input
                                                type="email"
                                                required
                                                value={contactForm.email}
                                                onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                                                className="w-full bg-white dark:bg-neutral-800 text-black dark:text-white border-transparent focus:border-black dark:focus:border-white rounded-xl p-3 outline-none transition-all"
                                                placeholder="email@example.com"
                                            />
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase">{isRtl ? 'הודעה' : 'Message'}</label>
                                        <textarea
                                            rows={4}
                                            required
                                            value={contactForm.message}
                                            onChange={(e) => setContactForm({ ...contactForm, message: e.target.value })}
                                            className="w-full bg-white dark:bg-neutral-800 text-black dark:text-white border-transparent focus:border-black dark:focus:border-white rounded-xl p-3 outline-none transition-all resize-none"
                                            placeholder={isRtl ? 'איך אפשר לעזור?' : 'How can we help?'}
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        disabled={isSubmitting}
                                        className="w-full bg-black dark:bg-white text-white dark:text-black py-4 rounded-xl font-bold hover:bg-gray-800 dark:hover:bg-gray-200 transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                                    >
                                        {isSubmitting ? (
                                            <Loader2 className="w-5 h-5 animate-spin" />
                                        ) : (
                                            isRtl ? 'שלח הודעה' : 'Send Message'
                                        )}
                                    </button>

                                    {submitStatus === 'success' && (
                                        <p className="text-sm text-green-600 dark:text-green-400 text-center font-medium animate-in fade-in slide-in-from-top-2">
                                            {isRtl ? 'ההודעה נשלחה בהצלחה! נחזור אליך בהקדם.' : 'Message sent successfully! We\'ll get back to you soon.'}
                                        </p>
                                    )}
                                    {submitStatus === 'error' && (
                                        <p className="text-sm text-red-600 dark:text-red-400 text-center font-medium animate-in fade-in slide-in-from-top-2">
                                            {isRtl ? 'שגיאה בשליחת ההודעה. נסה שוב מאוחר יותר.' : 'Error sending message. Please try again later.'}
                                        </p>
                                    )}
                                </form>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </main>

            {/* Feature Modal */}
            <AnimatePresence>
                {selectedFeature && (
                    <motion.div
                        className="fixed inset-0 z-50 flex items-center justify-center p-4"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        <motion.div
                            className="absolute inset-0 bg-black/5 backdrop-blur-sm"
                            onClick={() => setSelectedFeature(null)}
                        />

                        <motion.div
                            className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
                            initial={{ scale: 0.95, y: 20 }}
                            animate={{ scale: 1, y: 0 }}
                            exit={{ scale: 0.95, y: 20 }}
                        >
                            <div className="p-12 space-y-8">
                                <div className="flex items-start justify-between">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 text-black">
                                            <selectedFeature.icon />
                                        </div>
                                        <div>
                                            <h2 className="text-2xl font-medium">{selectedFeature.title}</h2>
                                            <p className="text-gray-600 text-sm mt-1">{selectedFeature.desc}</p>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => setSelectedFeature(null)}
                                        className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                    >
                                        <X className="w-5 h-5 text-gray-400" />
                                    </button>
                                </div>

                                <p className="text-gray-700 leading-relaxed">
                                    {selectedFeature.longDesc}
                                </p>

                                <div className="space-y-3">
                                    {selectedFeature.features.map((item: string, idx: number) => (
                                        <div key={idx} className="flex items-center gap-3">
                                            <div className="w-5 h-5 rounded-full bg-black flex items-center justify-center flex-shrink-0">
                                                <Check className="w-3 h-3 text-white" />
                                            </div>
                                            <span className="text-sm text-gray-700">{item}</span>
                                        </div>
                                    ))}
                                </div>

                                <button
                                    onClick={() => navigate('/login?mode=signup')}
                                    className="w-full py-3 bg-black text-white text-sm font-medium rounded-lg hover:bg-gray-800 transition-colors"
                                >
                                    {isRtl ? 'התחל עכשיו' : 'Get started'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Footer */}
            <footer className="border-t border-gray-100 py-12 px-6 mt-32">
                <div className="max-w-5xl mx-auto">
                    <div className="flex flex-col md:flex-row justify-between items-center gap-6">
                        <div className="flex items-end gap-2 grayscale opacity-40">
                            <img src={logoIconOnly} alt="RentMate Logo" className="h-6 w-auto object-contain" />
                            <span className="text-lg tracking-tight text-black dark:text-gray-400">
                                <span className="font-black">Rent</span>
                                <span className="font-normal">Mate</span>
                            </span>
                        </div>

                        <div className="flex gap-8 text-sm text-gray-500">
                            <a href="/legal/terms" className="hover:text-black transition-colors">
                                {isRtl ? 'תנאי שימוש' : 'Terms'}
                            </a>
                            <a href="/legal/privacy" className="hover:text-black transition-colors">
                                {isRtl ? 'פרטיות' : 'Privacy'}
                            </a>
                            <a href="/accessibility" className="hover:text-black transition-colors">
                                {isRtl ? 'נגישות' : 'Accessibility'}
                            </a>
                        </div>

                        <p className="text-sm text-gray-400">
                            © 2026 RentMate
                        </p>
                    </div>
                </div>
            </footer>
        </div >
    );
}

function BasicCalculatorView({ isRtl }: { isRtl: boolean }) {
    const [amount, setAmount] = useState('5000');
    const [linkageType, setLinkageType] = useState<'cpi' | 'housing' | 'construction' | 'usd' | 'eur'>('cpi');
    const [baseDate, setBaseDate] = useState('');
    const [targetDate, setTargetDate] = useState('');
    const [result, setResult] = useState<any>(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleCalculate = async () => {
        setLoading(true);
        setError(null);
        setResult(null);
        try {
            const res = await calculateStandard({
                baseRent: parseFloat(amount),
                linkageType,
                baseDate: baseDate.slice(0, 7),
                targetDate: targetDate.slice(0, 7),
                partialLinkage: 100,
                isIndexBaseMinimum: false
            });
            if (res) {
                setResult(res);
            } else {
                setError(isRtl ? 'לא נמצאו נתוני מדד לתאריכים אלו' : 'No index data found for these dates');
            }
        } catch (err) {
            console.error(err);
            setError(isRtl ? 'אירעה שגיאה בחישוב' : 'Error calculating results');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-12">
            <div className="text-center space-y-4">
                <h2 className="text-4xl font-medium">{isRtl ? 'מחשבון הצמדה בסיסי' : 'Basic Index Calculator'}</h2>
                <p className="text-gray-600">{isRtl ? 'חשבו הפרשי הצמדה בקלות ובמהירות' : 'Calculate index differences quickly and easily'}</p>
            </div>

            <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-3xl p-8 md:p-12 shadow-2xl max-w-2xl mx-auto space-y-8">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{isRtl ? 'סכום בסיס' : 'Base Amount'}</label>
                        <input
                            type="number"
                            value={amount}
                            onChange={(e) => setAmount(e.target.value)}
                            className="w-full bg-gray-50 dark:bg-neutral-800 text-black dark:text-white border-transparent focus:bg-white dark:focus:bg-neutral-700 focus:border-black dark:focus:border-white rounded-xl p-4 outline-none transition-all font-bold text-lg"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{isRtl ? 'סוג מדד' : 'Index Type'}</label>
                        <select
                            value={linkageType}
                            onChange={(e) => setLinkageType(e.target.value as any)}
                            className="w-full bg-gray-50 dark:bg-neutral-800 text-black dark:text-white border-transparent focus:bg-white dark:focus:bg-neutral-700 focus:border-black dark:focus:border-white rounded-xl p-4 outline-none transition-all font-bold"
                        >
                            <option value="cpi">{isRtl ? 'מדד המחירים לצרכן' : 'Consumer Price Index'}</option>
                            <option value="housing">{isRtl ? 'מדד שירותי דיור' : 'Housing Services'}</option>
                            <option value="construction">{isRtl ? 'מדד תשומות הבנייה' : 'Construction Inputs'}</option>
                            <option value="usd">{isRtl ? 'דולר ארה"ב' : 'USD'}</option>
                            <option value="eur">{isRtl ? 'אירו' : 'EUR'}</option>
                        </select>
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{isRtl ? 'תאריך בסיס' : 'Base Date'}</label>
                        <DatePicker
                            value={baseDate ? parseISO(baseDate) : undefined}
                            onChange={(date) => setBaseDate(date ? format(date, 'yyyy-MM-dd') : '')}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider">{isRtl ? 'תאריך יעד' : 'Target Date'}</label>
                        <DatePicker
                            value={targetDate ? parseISO(targetDate) : undefined}
                            onChange={(date) => setTargetDate(date ? format(date, 'yyyy-MM-dd') : '')}
                            className="w-full"
                        />
                    </div>
                </div>

                <button
                    onClick={handleCalculate}
                    disabled={loading || !baseDate || !targetDate}
                    className="w-full bg-black dark:bg-white text-white dark:text-black py-5 rounded-2xl font-bold text-lg hover:bg-gray-800 dark:hover:bg-gray-200 transition-all shadow-xl disabled:opacity-50 flex items-center justify-center"
                >
                    {loading ? (isRtl ? 'מחשב...' : 'Calculating...') : (isRtl ? 'חשב עכשיו' : 'Calculate Now')}
                </button>

                {error && (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-2xl text-center text-sm font-medium"
                    >
                        {error}
                    </motion.div>
                )}

                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="pt-8 border-t border-gray-100 dark:border-neutral-800 space-y-6"
                    >
                        <div className="grid grid-cols-2 gap-4">
                            <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-2xl">
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mb-1">{isRtl ? 'סכום מעודכן' : 'Updated Amount'}</p>
                                <p className="text-2xl font-black text-black dark:text-white">₪{result.newRent.toLocaleString()}</p>
                            </div>
                            <div className="bg-gray-50 dark:bg-neutral-800 p-4 rounded-2xl">
                                <p className="text-xs text-gray-400 dark:text-gray-500 font-bold uppercase mb-1">{isRtl ? 'הפרש' : 'Difference'}</p>
                                <p className="text-2xl font-black text-black dark:text-white">₪{result.absoluteChange.toLocaleString()}</p>
                            </div>
                        </div>
                        <div className="p-4 bg-black dark:bg-white text-white dark:text-black rounded-2xl">
                            <p className="text-xs opacity-60 font-medium mb-1">{isRtl ? 'נוסחת חישוב' : 'Formula'}</p>
                            <p className="text-sm font-bold">{result.formula}</p>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}
