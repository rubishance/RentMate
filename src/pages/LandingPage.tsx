import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { format, subMonths, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';
import { motion } from 'framer-motion';
import '../styles/marketing.css';
import { CalculatorService } from '../services/CalculatorService';
import { getIndexRange, seedIndexData } from '../services/index-data.service';
import { ContractScanner } from '../components/ContractScanner';
import type { ExtractedField } from '../types/database';

export function LandingPage() {
    const [user, setUser] = useState<any>(null);

    // Calculator State
    const [calcBaseRent, setCalcBaseRent] = useState<number>(5000);
    const [calcBaseDate, setCalcBaseDate] = useState<string>(format(subMonths(new Date(), 12), 'yyyy-MM-dd'));
    const [calcResult, setCalcResult] = useState<number | null>(null);
    const [isCalculating, setIsCalculating] = useState(false);

    // Index Data State
    const [rentScenarioData, setRentScenarioData] = useState<any[]>([]);
    const [indexData, setIndexData] = useState<any[]>([]);
    const [monthsToShow, setMonthsToShow] = useState<number>(12);

    // AI Scanner State
    const [showScanner, setShowScanner] = useState(false);

    useEffect(() => {
        // Auth check
        supabase.auth.getSession().then(({ data: { session } }) => {
            setUser(session?.user || null);
        });

        const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
            setUser(session?.user || null);
        });

        // Load Index Data for Chart
        loadIndexData(monthsToShow);

        return () => subscription.unsubscribe();
    }, [monthsToShow]);

    const loadIndexData = async (months: number) => {
        const endDate = format(new Date(), 'yyyy-MM');
        const startDate = format(subMonths(new Date(), months), 'yyyy-MM');

        try {
            let data = await getIndexRange('cpi', startDate, endDate);

            // If no data found, try to seed it (self-healing for demo/dev)
            if (!data || data.length === 0) {
                console.warn('No index data found. Attempting to seed default data...');
                try {
                    await seedIndexData();
                    // Retry fetch
                    data = await getIndexRange('cpi', startDate, endDate);
                } catch (seedError) {
                    console.error('Failed to seed index data:', seedError);
                }
            }

            // Transform for chart
            // Scenario: 8000 NIS base rent starting 12 months ago
            const baseRent = 8000;
            if (!data || data.length === 0) {
                // Fallback: Generate mock data for demo (when DB is empty or user is not authenticated)
                console.warn('Using fallback mock data for rent index chart');
                const mockData = [];
                const baseIndex = 113.0;
                const monthlyIncrease = 0.15; // ~1.8% annual

                for (let i = 0; i <= months; i++) {
                    const date = subMonths(new Date(), months - i);
                    const indexValue = baseIndex + (i * monthlyIncrease);
                    mockData.push({
                        date: format(date, 'MMM yy', { locale: he }),
                        fullDate: format(date, 'yyyy-MM'),
                        indexValue: Number(indexValue.toFixed(2)),
                        rentValue: Math.round(baseRent * (indexValue / baseIndex))
                    });
                }
                setRentScenarioData(mockData);
                return;
            }

            const baseIndexVal = data.length > 0 ? data[0].value : 100;

            const transformed = data.map(item => {
                const ratio = item.value / baseIndexVal;
                return {
                    date: format(parseISO(item.date + '-01'), 'MMM yy', { locale: he }),
                    fullDate: item.date,
                    indexValue: item.value,
                    rentValue: Math.round(baseRent * ratio)
                };
            });

            setIndexData(data);
            setRentScenarioData(transformed);
        } catch (error) {
            console.error('Failed to load index data', error);
        }
    };

    // Calculator Logic
    const handleCalculate = async () => {
        setIsCalculating(true);
        try {
            const calculator = CalculatorService.getInstance();
            // Simplify: assume current index is latest available
            // In a real app we'd fetch the specific indices

            // Get base index
            const baseDateStr = format(parseISO(calcBaseDate), 'yyyy-MM');
            const baseIndex = await calculator.getIndexValue('cpi', baseDateStr);

            // Get current index (latest)
            const latestIndexData = await getIndexRange('cpi', format(subMonths(new Date(), 1), 'yyyy-MM'), format(new Date(), 'yyyy-MM'));
            const currentIndex = latestIndexData[latestIndexData.length - 1]?.value;

            if (baseIndex && currentIndex) {
                const ratio = currentIndex / baseIndex;
                setCalcResult(Math.round(calcBaseRent * ratio));
            } else {
                // Fallback if data missing
                setCalcResult(Math.round(calcBaseRent * 1.03)); // Mock 3% increase
            }
        } catch (e) {
            console.error(e);
        } finally {
            setIsCalculating(false);
        }
    };

    return (
        <div className="marketing-page" dir="rtl">
            {/* Nav */}
            <nav className="fixed top-0 w-full z-50 glass-panel border-b-0 rounded-none px-6 py-4 flex justify-between items-center">
                <div className="flex items-center gap-2">
                    <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">RentMate</span>
                </div>
                <div className="hidden md:flex gap-8 text-gray-600 font-medium">
                    <a href="#features" className="hover:text-blue-600 transition">תכונות</a>
                    <a href="#ai-scanner" className="hover:text-blue-600 transition">סריקת AI</a>
                    <a href="#index-chart" className="hover:text-blue-600 transition">מדד השכירות</a>
                    <a href="#calculator" className="hover:text-blue-600 transition">מחשבון</a>
                </div>
                <div className="flex gap-4">
                    {user ? (
                        <Link to="/dashboard" className="btn-glass-primary text-sm px-6 py-2">
                            למערכת
                        </Link>
                    ) : (
                        <Link to="/login" className="btn-glass-outline text-sm px-6 py-2 rounded-full border border-blue-600 text-blue-600 hover:bg-blue-50">
                            כניסה
                        </Link>
                    )}
                </div>
            </nav>

            {/* Hero */}
            <section className="hero-section relative min-h-[90vh] flex items-center justify-center pt-32">
                <div className="hero-bg-glow"></div>
                <div className="hero-shape shape-1"></div>
                <div className="hero-shape shape-2"></div>

                <div className="container mx-auto px-4 z-10 grid md:grid-cols-2 gap-12 items-center">
                    <div className="text-right space-y-6">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <h1 className="text-5xl md:text-7xl font-bold leading-tight mb-4">
                                ניהול נכסים <br />
                                <span className="text-gradient-primary">חכם ופשוט</span>
                            </h1>
                            <p className="text-xl text-gray-600 max-w-lg leading-relaxed">
                                המערכת המתקדמת לניהול שכירויות. חישובי הצמדה אוטומטיים, סריקת חוזים ב-AI, וניהול שוטף במקום אחד.
                            </p>
                        </motion.div>

                        <motion.div
                            className="flex flex-col sm:flex-row gap-4 pt-4"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6, delay: 0.2 }}
                        >
                            {user ? (
                                <Link to="/dashboard" className="btn-glass-primary">
                                    חזרה לדאשבורד
                                    <i className="ph ph-arrow-left mr-2"></i>
                                </Link>
                            ) : (
                                <Link to="/login" className="btn-glass-primary">
                                    התחל בחינם
                                    <i className="ph ph-arrow-left mr-2"></i>
                                </Link>
                            )}
                            <a href="#demo" className="btn-glass-outline">
                                איך זה עובד?
                            </a>
                        </motion.div>

                        <div className="text-sm text-gray-500 pt-2 flex items-center gap-2">
                            <i className="ph ph-check-circle text-green-500"></i> 14 ימי ניסיון חינם
                            <span className="mx-2">•</span>
                            <i className="ph ph-check-circle text-green-500"></i> ללא צורך באשראי
                        </div>
                    </div>

                    <motion.div
                        className="relative"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8 }}
                    >
                        {/* AI Contract Scanning Visual */}
                        <div className="glass-panel p-6 md:p-8 bg-gradient-to-br from-purple-50/80 to-blue-50/80 backdrop-blur-xl">
                            <div className="text-center mb-6">
                                <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-100 text-purple-700 rounded-full text-sm font-semibold mb-4">
                                    <i className="ph ph-magic-wand"></i>
                                    סריקת חוזים אוטומטית
                                </div>
                            </div>

                            {/* Scanner Animation */}
                            <div className="relative">
                                {/* Document being scanned */}
                                <div className="relative w-full max-w-sm mx-auto">
                                    <div className="bg-white rounded-2xl shadow-2xl p-6 border-2 border-purple-200">
                                        {/* Document header */}
                                        <div className="flex items-center gap-3 mb-4 pb-4 border-b border-gray-200">
                                            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                                                <i className="ph ph-file-text text-white text-xl"></i>
                                            </div>
                                            <div className="flex-1">
                                                <div className="h-3 w-24 bg-gray-200 rounded mb-1.5"></div>
                                                <div className="h-2 w-16 bg-gray-100 rounded"></div>
                                            </div>
                                        </div>

                                        {/* Document content lines */}
                                        <div className="space-y-2.5">
                                            <div className="h-2.5 w-full bg-gray-100 rounded"></div>
                                            <div className="h-2.5 w-5/6 bg-gray-100 rounded"></div>
                                            <div className="h-2.5 w-full bg-gray-100 rounded"></div>
                                            <div className="h-2.5 w-4/5 bg-gray-100 rounded"></div>
                                            <div className="h-2.5 w-full bg-gray-100 rounded"></div>
                                            <div className="h-2.5 w-3/4 bg-gray-100 rounded"></div>
                                        </div>

                                        {/* Scanning beam effect */}
                                        <motion.div
                                            className="absolute left-0 right-0 h-20 pointer-events-none"
                                            style={{
                                                background: 'linear-gradient(to bottom, rgba(147, 51, 234, 0), rgba(147, 51, 234, 0.15), rgba(147, 51, 234, 0))',
                                                top: '-10%'
                                            }}
                                            animate={{
                                                top: ['-10%', '110%']
                                            }}
                                            transition={{
                                                duration: 2.5,
                                                repeat: Infinity,
                                                ease: "easeInOut",
                                                repeatDelay: 0.5
                                            }}
                                        >
                                            <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-purple-500 shadow-[0_0_20px_rgba(147,51,234,0.8)]"></div>
                                        </motion.div>
                                    </div>

                                    {/* Extracted data particles */}
                                    <div className="absolute inset-0 pointer-events-none">
                                        {[...Array(8)].map((_, i) => (
                                            <motion.div
                                                key={i}
                                                className="absolute w-2 h-2 bg-purple-500 rounded-full"
                                                initial={{ opacity: 0, y: '50%', x: `${20 + i * 10}%` }}
                                                animate={{
                                                    opacity: [0, 1, 0],
                                                    y: ['50%', '-20%'],
                                                }}
                                                transition={{
                                                    duration: 2,
                                                    repeat: Infinity,
                                                    delay: i * 0.3,
                                                    ease: "easeOut"
                                                }}
                                            />
                                        ))}
                                    </div>
                                </div>

                                {/* Extracted fields preview */}
                                <motion.div
                                    className="mt-6 grid grid-cols-2 gap-3"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.5 }}
                                >
                                    {[
                                        { icon: 'ph-user', label: 'שם שוכר' },
                                        { icon: 'ph-map-pin', label: 'כתובת' },
                                        { icon: 'ph-currency-circle-dollar', label: 'דמי שכירות' },
                                        { icon: 'ph-calendar', label: 'תאריכים' }
                                    ].map((field, index) => (
                                        <motion.div
                                            key={index}
                                            className="bg-white/60 backdrop-blur-sm rounded-lg p-3 border border-purple-100"
                                            initial={{ opacity: 0, scale: 0.8 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            transition={{ delay: 0.7 + index * 0.1 }}
                                        >
                                            <div className="flex items-center gap-2">
                                                <i className={`${field.icon} text-purple-600`}></i>
                                                <span className="text-xs text-gray-600">{field.label}</span>
                                            </div>
                                            <div className="h-2 w-16 bg-purple-200 rounded mt-2"></div>
                                        </motion.div>
                                    ))}
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </section>

            {/* AI Scanner Showcase Section */}
            <section id="ai-scanner" className="py-24 bg-gradient-to-br from-purple-50 via-blue-50 to-indigo-50 relative overflow-hidden">
                {/* Background decoration */}
                <div className="absolute top-0 right-0 w-96 h-96 bg-purple-300/20 rounded-full blur-3xl"></div>
                <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-300/20 rounded-full blur-3xl"></div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="text-center mb-16">
                        <motion.span
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            className="text-purple-600 font-semibold tracking-wider text-sm uppercase mb-2 block"
                        >
                            טכנולוגיית AI מתקדמת
                        </motion.span>
                        <motion.h2
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.1 }}
                            className="text-4xl font-bold mb-4"
                        >
                            סריקת חוזים חכמה ב-AI
                        </motion.h2>
                        <motion.p
                            initial={{ opacity: 0, y: 20 }}
                            whileInView={{ opacity: 1, y: 0 }}
                            viewport={{ once: true }}
                            transition={{ delay: 0.2 }}
                            className="text-xl text-gray-600 max-w-2xl mx-auto"
                        >
                            העלו חוזה שכירות והמערכת תחלץ אוטומטית את כל הפרטים החשובים תוך שניות
                        </motion.p>
                    </div>

                    <div className="grid md:grid-cols-2 gap-12 items-center max-w-6xl mx-auto">
                        {/* Left: Scanner Animation Preview */}
                        <motion.div
                            initial={{ opacity: 0, x: -50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="relative"
                        >
                            <div className="glass-panel p-8 bg-white/80 backdrop-blur-xl">
                                <div className="mb-6 text-center">
                                    <h3 className="text-2xl font-bold mb-2">ניתוח מיידי</h3>
                                    <p className="text-gray-600 text-sm">המערכת מנתחת את החוזה בזמן אמת</p>
                                </div>

                                {/* Scanner Animation Placeholder */}
                                <div className="flex justify-center">
                                    <div className="transform scale-125">
                                        <div className="relative w-32 h-40 mx-auto">
                                            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full animate-pulse"></div>
                                            <div className="relative h-full bg-white rounded-xl shadow-xl border border-slate-100 p-4">
                                                <div className="flex gap-2 mb-2">
                                                    <div className="w-6 h-6 rounded-full bg-slate-100"></div>
                                                    <div className="flex-1 space-y-1">
                                                        <div className="w-12 h-1.5 bg-slate-200 rounded"></div>
                                                        <div className="w-8 h-1 bg-slate-100 rounded"></div>
                                                    </div>
                                                </div>
                                                <div className="space-y-1.5">
                                                    <div className="w-full h-1.5 bg-slate-100 rounded"></div>
                                                    <div className="w-5/6 h-1.5 bg-slate-100 rounded"></div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded"></div>
                                                    <div className="w-4/5 h-1.5 bg-slate-100 rounded"></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex justify-center gap-3 text-xs text-gray-500">
                                    <span className="flex items-center gap-1">
                                        <i className="ph ph-shield-check text-green-500"></i>
                                        מאובטח
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <i className="ph ph-lightning text-yellow-500"></i>
                                        מהיר
                                    </span>
                                    <span className="flex items-center gap-1">
                                        <i className="ph ph-check-circle text-blue-500"></i>
                                        מדויק
                                    </span>
                                </div>
                            </div>
                        </motion.div>

                        {/* Right: Features & CTA */}
                        <motion.div
                            initial={{ opacity: 0, x: 50 }}
                            whileInView={{ opacity: 1, x: 0 }}
                            viewport={{ once: true }}
                            className="space-y-6"
                        >
                            <div className="space-y-4">
                                {[
                                    {
                                        icon: 'ph-scan',
                                        title: 'סריקה תוך שניות',
                                        description: 'העלו PDF או תמונה של החוזה והמערכת תעבד אותו מיידית'
                                    },
                                    {
                                        icon: 'ph-brain',
                                        title: 'חילוץ אוטומטי של נתונים',
                                        description: 'AI מתקדם מזהה ומחלץ שמות, כתובות, תאריכים, סכומים ועוד'
                                    },
                                    {
                                        icon: 'ph-eye-slash',
                                        title: 'הגנת פרטיות מובנית',
                                        description: 'אפשרות להשחיר פרטים רגישים לפני העלאה לענן'
                                    },
                                    {
                                        icon: 'ph-check-square',
                                        title: 'אימות ידני',
                                        description: 'סקירה ואישור של כל שדה לפני השמירה למערכת'
                                    }
                                ].map((feature, index) => (
                                    <motion.div
                                        key={index}
                                        initial={{ opacity: 0, y: 20 }}
                                        whileInView={{ opacity: 1, y: 0 }}
                                        viewport={{ once: true }}
                                        transition={{ delay: index * 0.1 }}
                                        className="flex gap-4 items-start"
                                    >
                                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white shrink-0">
                                            <i className={`ph ${feature.icon} text-2xl`}></i>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-gray-800 mb-1">{feature.title}</h4>
                                            <p className="text-sm text-gray-600">{feature.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>

                            <motion.button
                                initial={{ opacity: 0, y: 20 }}
                                whileInView={{ opacity: 1, y: 0 }}
                                viewport={{ once: true }}
                                transition={{ delay: 0.4 }}
                                onClick={() => setShowScanner(true)}
                                className="w-full btn-glass-primary justify-center py-4 text-lg shadow-xl shadow-purple-500/20 hover:shadow-purple-500/40"
                            >
                                <i className="ph ph-scan-smiley ml-2"></i>
                                נסו את הסורק החכם
                            </motion.button>

                            <p className="text-center text-xs text-gray-500">
                                ללא צורך בהרשמה • ניסיון חינם
                            </p>
                        </motion.div>
                    </div>
                </div>
            </section>

            {/* How It Works Section */}
            <section id="demo" className="py-24 relative overflow-hidden">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <span className="text-blue-600 font-semibold tracking-wider text-sm uppercase mb-2 block">תהליך פשוט ומהיר</span>
                        <h2 className="text-4xl font-bold mb-4">איך זה עובד?</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            שלושה צעדים פשוטים והנכס שלכם מנוהל בצורה חכמה ואוטומטית
                        </p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        {[
                            {
                                icon: 'ph-house-line',
                                title: 'הוסיפו נכס',
                                description: 'הזינו את פרטי הנכס והחוזה הקיים שלכם למערכת'
                            },
                            {
                                icon: 'ph-chart-line-up',
                                title: 'מעקב אוטומטי',
                                description: 'המערכת עוקבת אחר מדד המחירים ומעדכנת את שווי השכירות'
                            },
                            {
                                icon: 'ph-bell-ringing',
                                title: 'קבלו התראות',
                                description: 'ניידע אתכם בדיוק מתי צריך לעדכן את המחיר ולחדש חוזה'
                            }
                        ].map((step, index) => (
                            <div key={index} className="glass-panel p-8 text-center relative group hover:-translate-y-2 transition-transform duration-300">
                                <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center text-3xl mx-auto mb-6 group-hover:scale-110 transition-transform">
                                    <i className={`ph ${step.icon}`}></i>
                                </div>
                                <h3 className="text-xl font-bold mb-3">{step.title}</h3>
                                <p className="text-gray-600 leading-relaxed">
                                    {step.description}
                                </p>

                                {/* Step Number */}
                                <div className="absolute top-4 right-4 text-6xl font-black text-gray-100 -z-10 select-none">
                                    0{index + 1}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Index Data Section */}
            <section id="index-chart" className="py-24 bg-white/50 relative">
                <div className="container mx-auto px-4">
                    <div className="text-center mb-16">
                        <h2 className="text-4xl font-bold mb-4">מדד המחירים לצרכן</h2>
                        <p className="text-xl text-gray-600 max-w-2xl mx-auto">
                            ראו כיצד שכר הדירה מתעדכן לאורך זמן. הנתונים מתעדכנים אוטומטית לפי פרסומי הלמ"ס.
                        </p>
                    </div>

                    <div className="glass-panel p-8 max-w-5xl mx-auto">
                        {/* Month Range Slider */}
                        <div className="mb-8 pb-6 border-b border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <label className="text-sm font-semibold text-gray-700">
                                    תקופת תצוגה: {monthsToShow} חודשים
                                </label>
                                <div className="flex gap-2">
                                    {[6, 12, 24, 36].map(months => (
                                        <button
                                            key={months}
                                            onClick={() => setMonthsToShow(months)}
                                            className={`px-3 py-1 rounded-lg text-sm font-medium transition-all ${monthsToShow === months
                                                ? 'bg-blue-600 text-white shadow-md'
                                                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                }`}
                                        >
                                            {months}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <input
                                type="range"
                                min="6"
                                max="36"
                                step="1"
                                value={monthsToShow}
                                onChange={(e) => setMonthsToShow(Number(e.target.value))}
                                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
                            />
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                                <span>6 חודשים</span>
                                <span>36 חודשים</span>
                            </div>
                        </div>

                        <div className="flex flex-col md:flex-row gap-8 items-center">
                            <div className="w-full md:w-2/3 h-[300px] md:h-[400px]">
                                <h3 className="text-lg font-semibold mb-4 text-gray-700">מדד המחירים לצרכן - {monthsToShow} חודשים אחרונים</h3>
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={rentScenarioData}>
                                        <defs>
                                            <linearGradient id="colorRent" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#007AFF" stopOpacity={0.3} />
                                                <stop offset="95%" stopColor="#007AFF" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E5E5EA" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fill: '#86868B', fontSize: 12 }} dy={10} />
                                        <YAxis
                                            domain={['auto', 'auto']}
                                            axisLine={false}
                                            tickLine={false}
                                            tick={{ fill: '#007AFF', fontSize: 12 }}
                                            label={{ value: 'שכ"ד (₪)', angle: -90, position: 'insideLeft', fill: '#007AFF' }}
                                        />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}
                                            formatter={(value: any) => [`₪${value}`, 'שכ"ד']}
                                        />
                                        <Area
                                            type="monotone"
                                            dataKey="rentValue"
                                            stroke="#007AFF"
                                            strokeWidth={3}
                                            fillOpacity={1}
                                            fill="url(#colorRent)"
                                            activeDot={{ r: 6 }}
                                        />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>

                            <div className="w-full md:w-1/3 space-y-6">
                                <div className="stat-box">
                                    <div className="stat-value text-3xl mb-1">
                                        {rentScenarioData.length > 0 ?
                                            ((rentScenarioData[rentScenarioData.length - 1].rentValue - 8000) / 8000 * 100).toFixed(1) + '%'
                                            : '0%'}
                                    </div>
                                    <div className="stat-label">סה"כ עלייה ב-% לתקופה</div>
                                </div>
                                <div className="stat-box">
                                    <div className="stat-value text-3xl mb-1 text-purple-600">
                                        ₪{rentScenarioData.length > 0 ? (rentScenarioData[rentScenarioData.length - 1].rentValue - 8000) : 0}
                                    </div>
                                    <div className="stat-label">תוספת חודשית לשכ"ד</div>
                                </div>
                                <div className="bg-blue-50 p-4 rounded-xl text-sm text-blue-800">
                                    <i className="ph ph-info mr-1"></i>
                                    הנתונים מחושבים בזמן אמת ע"ב נתוני הלמ"ס ומדגימים הצמדה מלאה למדד.
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Quick Calculator */}
            <section id="calculator" className="py-24 relative overflow-hidden">
                {/* Decorative background circle */}
                <div className="absolute top-1/2 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] -translate-x-1/2 -translate-y-1/2 z-0"></div>

                <div className="container mx-auto px-4 relative z-10">
                    <div className="grid md:grid-cols-2 gap-16 items-center">
                        <div>
                            <span className="text-blue-600 font-semibold tracking-wider text-sm uppercase mb-2 block">בדיקה מהירה</span>
                            <h2 className="text-4xl font-bold mb-6">כמה שכר הדירה שלך שווה היום?</h2>
                            <p className="text-xl text-gray-600 mb-8">
                                השתמשו במחשבון המהיר שלנו כדי לבדוק את שווי שכר הדירה העדכני בהתבסס על תאריך החתימה המקורי.
                            </p>

                            <ul className="space-y-4">
                                {[
                                    'חישוב מדויק לפי נתוני הלמ"ס',
                                    'תמיכה במדד ידוע ומדד בגין',
                                    'חישוב הצמדות שליליות (אופציונלי)',
                                    'התקזזות על תשלומים תוך שניות!'
                                ].map((item, i) => (
                                    <li key={i} className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center text-green-600">
                                            <i className="ph ph-check"></i>
                                        </div>
                                        <span className="font-medium text-gray-700">{item}</span>
                                    </li>
                                ))}
                            </ul>
                        </div>

                        <div className="calc-widget">
                            <div className="space-y-6">
                                <div className="calc-input-group">
                                    <label>סכום חוזה מקורי (₪)</label>
                                    <input
                                        type="number"
                                        value={calcBaseRent}
                                        onChange={(e) => setCalcBaseRent(Number(e.target.value))}
                                        className="calc-input"
                                    />
                                </div>
                                <div className="calc-input-group">
                                    <label>תאריך חתימה/בסיס</label>
                                    <input
                                        type="date"
                                        value={calcBaseDate}
                                        onChange={(e) => setCalcBaseDate(e.target.value)}
                                        className="calc-input"
                                    />
                                </div>

                                <button
                                    onClick={handleCalculate}
                                    disabled={isCalculating}
                                    className="w-full btn-glass-primary justify-center py-4 text-lg"
                                >
                                    {isCalculating ? 'מחשב...' : 'חשב הצמדה עכשיו'}
                                </button>

                                {calcResult && (
                                    <motion.div
                                        initial={{ opacity: 0, scale: 0.9 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        className="calc-result-box"
                                    >
                                        <div className="text-blue-100 text-sm mb-2">סכום מוערך להיום</div>
                                        <div className="result-amount">₪{calcResult.toLocaleString()}</div>
                                        <div className="text-blue-100 text-xs">
                                            עליה של {((calcResult - calcBaseRent) / calcBaseRent * 100).toFixed(1)}% מאז תאריך הבסיס
                                        </div>
                                    </motion.div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </section>

            {/* Footer */}
            <footer className="bg-white border-t border-gray-100 py-12">
                <div className="container mx-auto px-4 text-center text-gray-500">
                    <div className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600 mb-6 inline-block">RentMate</div>
                    <div className="flex justify-center gap-8 mb-8">
                        <a href="#" className="hover:text-blue-600">תנאי שימוש</a>
                        <a href="#" className="hover:text-blue-600">מדיניות פרטיות</a>
                        <a href="#" className="hover:text-blue-600">צור קשר</a>
                    </div>
                    <p>&copy; {new Date().getFullYear()} RentMate. כל הזכויות שמורות.</p>
                </div>
            </footer>

            {/* AI Contract Scanner Modal */}
            {showScanner && (
                <ContractScanner
                    mode="modal"
                    skipReview={false}
                    onScanComplete={(_fields: ExtractedField[], _url: string) => {
                        // For landing page demo, just show success and close
                        setShowScanner(false);
                        // Could show a success message or redirect to signup
                        alert('סריקה הושלמה בהצלחה! הירשמו כדי לשמור את הנתונים.');
                    }}
                    onCancel={() => setShowScanner(false)}
                />
            )}
        </div>
    );
}
