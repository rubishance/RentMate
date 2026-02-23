import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
    ArrowRight,
    Zap,
    FileSearch,
    Calculator,
    Bell,
    TrendingUp,
    ShieldCheck,
    Sparkles,
    LayoutDashboard,
    PlayCircle
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { BotFullBody } from '../components/chat/BotFullBody';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageToggle } from '../components/common/LanguageToggle';

export default function WelcomeLandingStitch() {
    const navigate = useNavigate();
    const [scrolled, setScrolled] = useState(false);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const features = [
        {
            title: "סריקת חוזים בבינה מלאכותית",
            description: "ה-AI שלנו קורא את החוזה עבורך, מחלץ את הסעיפים החשובים ומזין את הנתונים למערכת באופן אוטומטי.",
            icon: <FileSearch className="w-8 h-8" />,
            color: "from-blue-500 to-indigo-600",
            tag: "בלעדי"
        },
        {
            title: "מחשבון מדד חכם",
            description: "סנכרון מלא עם נתוני הלמ״ס. חישוב מדויק של הפרשי הצמדה וריבית בקליק אחד.",
            icon: <Calculator className="w-8 h-8" />,
            color: "from-amber-400 to-orange-500",
            tag: "חדש"
        },
        {
            title: "תזכורות חכמות",
            description: "תזכורות אוטומטיות לחידוש חוזה, עדכון שכר דירה ותשלומים חשובים. אנחנו נדאג שלא תפספס כלום.",
            icon: <Bell className="w-8 h-8" />,
            color: "from-rose-500 to-pink-600",
            tag: "אוטומטי"
        },
        {
            title: "ניהול הוצאות ב-AI",
            description: "מעקב וסיווג הוצאות הנכס בצורה חכמה. הפקת דוחות וזיהוי הזדמנויות לחיסכון.",
            icon: <TrendingUp className="w-8 h-8" />,
            color: "from-emerald-400 to-teal-500",
            tag: "חכם"
        }
    ];

    return (
        <div className="min-h-screen bg-[#050505] text-white selection:bg-indigo-500/30 selection:text-indigo-200" dir="rtl">
            {/* Navigation */}
            <nav className={cn(
                "fixed top-0 left-0 right-0 z-50 transition-all duration-500 px-6 py-4",
                scrolled ? "bg-black/60 backdrop-blur-xl border-b border-white/5 py-3" : "bg-transparent"
            )}>
                <div className="max-w-7xl mx-auto flex items-center justify-between">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-2 cursor-pointer group" onClick={() => navigate('/')}>
                            <div className="w-10 h-10 bg-gradient-to-tr from-indigo-600 to-violet-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20 group-hover:scale-110 transition-transform">
                                <LayoutDashboard className="w-6 h-6 text-white" />
                            </div>
                            <span className="text-2xl font-black tracking-tighter uppercase">
                                Rent<span className="text-indigo-500">Mate</span>
                            </span>
                        </div>

                        <div className="hidden md:flex items-center gap-6 text-sm font-medium text-white/60">
                            <a href="#features" className="hover:text-white transition-colors">פיצ'רים</a>
                            <a href="#about" className="hover:text-white transition-colors">עלינו</a>
                            <a href="#pricing" className="hover:text-white transition-colors">מחירים</a>
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <ThemeToggle />
                        <LanguageToggle />
                        <button
                            onClick={() => navigate('/login')}
                            className="text-sm font-bold text-white/80 hover:text-white px-4 py-2 transition-colors"
                        >
                            התחברות
                        </button>
                        <Button
                            onClick={() => navigate('/login?mode=signup')}
                            className="bg-white text-black hover:bg-white/90 font-black text-xs uppercase tracking-widest px-8 rounded-full h-11"
                        >
                            הרשמה חינם
                        </Button>
                    </div>
                </div>
            </nav>

            {/* Hero Section */}
            <section className="relative pt-32 pb-20 overflow-hidden lg:pt-48 lg:pb-32 min-h-screen flex items-center">
                {/* Background Gradients */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full max-w-7xl h-full pointer-events-none">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-indigo-600/20 blur-[120px] rounded-full animate-pulse" />
                    <div className="absolute bottom-[20%] right-[-5%] w-[40%] h-[40%] bg-violet-600/10 blur-[120px] rounded-full animate-pulse delay-700" />
                </div>

                <div className="max-w-7xl mx-auto px-6 relative z-10">
                    <div className="grid lg:grid-cols-12 gap-16 items-center">
                        <div className="lg:col-span-7 space-y-10">
                            <motion.div
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8 }}
                                className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
                            >
                                <Sparkles className="w-4 h-4 text-amber-400" />
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-white/60">
                                    הדור הבא של ניהול נדל״ן מבוסס AI
                                </span>
                            </motion.div>

                            <motion.h1
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.2 }}
                                className="text-6xl md:text-8xl lg:text-[6.5rem] font-black tracking-tighter leading-[0.85] text-white"
                            >
                                ניהול שכירות <br />
                                <span className="bg-gradient-to-r from-indigo-400 via-violet-400 to-indigo-500 bg-clip-text text-transparent">
                                    על אוטומט.
                                </span>
                            </motion.h1>

                            <motion.p
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.4 }}
                                className="text-xl md:text-2xl text-white/50 max-w-2xl leading-relaxed font-medium"
                            >
                                שדרגו את ניהול הנכסים שלכם עם הכלים המתקדמים ביותר בישראל. <br />
                                סריקת חוזי שכירות, חישובי מדד אוטומיים וניהול הוצאות חכם – הכל במקום אחד.
                            </motion.p>

                            <motion.div
                                initial={{ opacity: 0, y: 30 }}
                                animate={{ opacity: 1, y: 0 }}
                                transition={{ duration: 0.8, delay: 0.6 }}
                                className="flex flex-wrap gap-6"
                            >
                                <Button
                                    onClick={() => navigate('/login?mode=signup')}
                                    className="h-16 px-10 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-sm uppercase tracking-widest rounded-3xl shadow-2xl shadow-indigo-600/30 group"
                                >
                                    התחל עכשיו חינם
                                    <ArrowRight className="mr-3 w-5 h-5 transition-transform group-hover:-translate-x-1" />
                                </Button>
                                <Button
                                    variant="outline"
                                    className="h-16 px-10 border-white/10 bg-white/5 hover:bg-white/10 text-white font-black text-sm uppercase tracking-widest rounded-3xl backdrop-blur-md flex gap-3"
                                >
                                    <PlayCircle className="w-5 h-5 text-indigo-400" />
                                    ראה איך זה עובד
                                </Button>
                            </motion.div>

                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ duration: 1, delay: 1 }}
                                className="flex items-center gap-8 pt-8 grayscale opacity-40"
                            >
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black tracking-tighter">1,200+</span>
                                    <span className="text-[10px] uppercase tracking-widest font-bold">משתמשים פעילים</span>
                                </div>
                                <div className="w-px h-10 bg-white/10" />
                                <div className="flex flex-col">
                                    <span className="text-2xl font-black tracking-tighter">₪45M</span>
                                    <span className="text-[10px] uppercase tracking-widest font-bold">נוהלו במערכת</span>
                                </div>
                            </motion.div>
                        </div>

                        <div className="lg:col-span-5 relative flex justify-center">
                            <motion.div
                                initial={{ opacity: 0, scale: 0.8, rotate: 5 }}
                                animate={{ opacity: 1, scale: 1, rotate: 0 }}
                                transition={{ duration: 1.2, ease: "easeOut" }}
                                className="relative z-10"
                            >
                                {/* 3D-ish Bot Placeholder/Visual */}
                                <div className="relative group">
                                    <div className="absolute inset-0 bg-indigo-600/20 blur-[100px] rounded-full scale-150 group-hover:scale-175 transition-transform duration-1000" />
                                    <BotFullBody size={450} />
                                </div>
                            </motion.div>

                            {/* Floating UI Elements */}
                            <motion.div
                                animate={{ y: [0, -15, 0] }}
                                transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                className="absolute top-10 right-0 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-emerald-500/20 flex items-center justify-center">
                                        <TrendingUp className="w-5 h-5 text-emerald-400" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-white/40 uppercase font-black">תשלום התקבל</div>
                                        <div className="text-sm font-black">₪5,400</div>
                                    </div>
                                </div>
                            </motion.div>

                            <motion.div
                                animate={{ y: [0, 15, 0] }}
                                transition={{ repeat: Infinity, duration: 5, ease: "easeInOut", delay: 1 }}
                                className="absolute bottom-20 left-0 bg-black/40 backdrop-blur-xl border border-white/10 p-4 rounded-2xl shadow-2xl"
                            >
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                        <Sparkles className="w-5 h-5 text-indigo-400" />
                                    </div>
                                    <div>
                                        <div className="text-[10px] text-white/40 uppercase font-black">AI מנתח חוזה...</div>
                                        <div className="w-20 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
                                            <motion.div animate={{ x: [-80, 80] }} transition={{ repeat: Infinity, duration: 1.5 }} className="w-1/2 h-full bg-indigo-500 rounded-full" />
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Features Grid */}
            <section id="features" className="py-32 relative bg-white/[0.02] border-y border-white/5">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center max-w-3xl mx-auto mb-20 space-y-4">
                        <h2 className="text-4xl md:text-6xl font-black tracking-tighter">כל מה שצריך כדי לישון בשקט.</h2>
                        <p className="text-lg text-white/50">בנינו את RentMate במיוחד עבור השוק הישראלי, עם התמקדות באוטומציה מלאה וביטחון לדייר ולמשכיר.</p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-8 focus:outline-none">
                        {features.map((feature, idx) => (
                            <motion.div
                                key={idx}
                                whileHover={{ y: -10 }}
                                className="group p-10 rounded-[3rem] bg-white/[0.03] border border-white/5 hover:bg-white/[0.05] hover:border-white/10 transition-all duration-500"
                            >
                                <div className="flex items-start justify-between mb-10">
                                    <div className={cn(
                                        "w-16 h-16 rounded-2xl bg-gradient-to-tr flex items-center justify-center shadow-lg",
                                        feature.color
                                    )}>
                                        {feature.icon}
                                    </div>
                                    <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-white/60 group-hover:text-white transition-colors">
                                        {feature.tag}
                                    </span>
                                </div>

                                <h3 className="text-2xl font-black tracking-tighter mb-4 group-hover:text-indigo-400 transition-colors">
                                    {feature.title}
                                </h3>
                                <p className="text-white/40 text-lg leading-relaxed group-hover:text-white/60 transition-colors">
                                    {feature.description}
                                </p>
                            </motion.div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Trust / Call to Action */}
            <section className="py-40 relative overflow-hidden">
                <div className="max-w-5xl mx-auto px-6 text-center space-y-12">
                    <motion.div
                        initial={{ opacity: 0 }}
                        whileInView={{ opacity: 1 }}
                        viewport={{ once: true }}
                        className="space-y-6"
                    >
                        <h2 className="text-5xl md:text-7xl font-black tracking-tighter">מוכנים להתקדם?</h2>
                        <p className="text-xl text-white/50 max-w-2xl mx-auto">
                            הצטרפו למאות בעלי נכסים שכבר עברו לניהול חכם, שקוף ואוטומטי. <br />
                            הרשמה של דקה אחת, וכל המידע אצלכם בכף היד.
                        </p>
                    </motion.div>

                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        whileInView={{ opacity: 1, y: 0 }}
                        viewport={{ once: true }}
                        className="flex flex-col items-center gap-6"
                    >
                        <Button
                            onClick={() => navigate('/login?mode=signup')}
                            className="h-20 px-16 bg-white text-black hover:bg-white/90 font-black text-xl uppercase tracking-tighter rounded-[2.5rem] shadow-2xl shadow-white/10 group"
                        >
                            להרשמה חינם עכשיו
                            <ArrowRight className="mr-4 w-6 h-6 transition-transform group-hover:-translate-x-2" />
                        </Button>
                        <div className="flex items-center gap-4 text-white/30 text-sm font-medium">
                            <ShieldCheck className="w-5 h-5" />
                            אין צורך בכרטיס אשראי • ביטול בכל עת
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* Social Proof */}
            <footer className="py-20 border-t border-white/5 bg-black/40">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="flex flex-col md:flex-row items-center justify-between gap-10">
                        <div className="flex items-center gap-2">
                            <LayoutDashboard className="w-5 h-5 text-indigo-500" />
                            <span className="text-lg font-black tracking-tighter uppercase">
                                Rent<span className="text-indigo-500">Mate</span>
                            </span>
                        </div>

                        <div className="flex gap-8 text-[10px] font-black uppercase tracking-widest text-white/40">
                            <a href="/legal/terms" className="hover:text-white transition-colors">תנאי שימוש</a>
                            <a href="/legal/privacy" className="hover:text-white transition-colors">פרטיות</a>
                            <a href="/contact" className="hover:text-white transition-colors">צור קשר</a>
                        </div>

                        <div className="text-[10px] font-medium text-white/20 uppercase tracking-[0.3em]">
                            © 2026 RentMate. All Rights Reserved.
                        </div>
                    </div>
                </div>
            </footer>
        </div>
    );
}
