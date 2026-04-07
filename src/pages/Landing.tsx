import { useState, useEffect, useRef } from 'react';
import { motion, useScroll, useTransform, AnimatePresence, Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
    Activity, Calculator, Eye, Play, Zap, Globe, ShieldCheck, MonitorSmartphone,
    ArrowRight, ArrowLeft, Share2, Mail, ChevronDown 
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';
import { ThemeToggle } from '../components/common/ThemeToggle';
import { LanguageToggle } from '../components/common/LanguageToggle';
import { useTranslation } from '../hooks/useTranslation';
import { Logo } from '../components/common/Logo';
import { ScrollSequence } from '../components/common/ScrollSequence';
import { LandingArticles } from '../components/landing/LandingArticles';

export default function Landing() {
    const navigate = useNavigate();
    const { lang } = useTranslation();
    const [scrolled, setScrolled] = useState(false);
    const [activeCardIndex, setActiveCardIndex] = useState(0);
    const isRtl = lang === 'he';

    // Scroll progress for Cinematic background parallax
    const { scrollYProgress } = useScroll();
    const overlayOpacity = useTransform(scrollYProgress, [0, 1], [0.5, 0.9]);

    useEffect(() => {
        const handleScroll = () => setScrolled(window.scrollY > 20);
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    // Carousel logic
    useEffect(() => {
        const interval = setInterval(() => {
            setActiveCardIndex((prev) => (prev + 1) % 3);
        }, 3500);
        return () => clearInterval(interval);
    }, []);

    const content = {
        he: {
            nav: { properties: "הנכסים שלנו", services: "שירותים", about: "אודות", contact: "צור קשר", login: "התחברות" },
            hero: {
                badge: "Architectural Property Management",
                titleLine1: "השקט הנפשי שלך",
                titleLine2: "מקבל שדרוג",
                subtitle: `העלה את החוזה הראשון שלך ללא עלות וקבל ניתחו מלא מיד. פלטפורמה חכמה לניהול, אופטימיזציה ומעקב אחרי הפורטפוליו שלך.`,
                ctaMain: "העלה חוזה חינם",
                ctaSec: "למידע נוסף"
            },
            carousel: [
                { title: "מעקב הכנסות", desc: "ניהול וצפייה בזמן אמת ברווחי הפורטפוליו" },
                { title: "מחשבון מדד אוטומטי", desc: "חישוב מהיר ומדויק של הצמדות למדד המחירים לצרכן" },
                { title: "מעקב אסמכתאות פשוט", desc: "ריכוז חשבונות וקבלות באופן מסודר במקום אחד" },
            ],
            video: { title: "פחות ניהול, יותר רווח", desc: "הצצה לדרך שבה RentMate משנה את כללי המשחק עבור המשקיע המודרני" },
            features: [
                { title: "מעקב בזמן אמת", desc: "קבל התראות על תשלומים, חוזים שמתקרבים לסיום ותחזוקה שוטפת ישירות לנייד שלך. שקיפות מלאה בכל רגע נתון.", icon: Activity },
                { title: "מחשבון מדד אוטומטי ומדויק", desc: "בצע חישוב מהיר ומדויק של הפרשי הצמדה למדד המחירים לצרכן עבור כל עסקת שכירות, בהתבסס על נתוני הלמ״ס המעודכנים ביותר.", icon: Calculator },
                { title: "שקיפות מקסימלית", desc: "שיתוף דוחות עם שותפים או רואי חשבון בלחיצת כפתור אחת. הכל מתועד, מאובטח ונגיש מכל מקום בעולם.", icon: Eye },
            ],
            bento: {
                title: "יתרונות למשקיעים",
                subtitle: "למה הלקוחות המובחרים שלנו בוחרים ב-RentMate לניהול הפורטפוליו שלהם",
                cards: [
                    { title: "ריכוז מלא של התיק", desc: "כל החוזים, מסמכים, חשבונות ותשלומים מרוכזים במקום אחד ונגישים כל הזמן. מעלים קובץ והמידע מוזן אוטומטית.", cta: "לפרטים נוספים" },
                    { title: "סורק חוזים מבוסס AI", desc: "העלה את חוזה השכירות ותן לבינה המלאכותית שלנו לאתר את כל התאריכים והסעיפים החשובים תוך 10 שניות, ללא צורך בהקלדה חוזרת." },
                    { title: "ביצועים", desc: "מערכת שרצה במהירות שיא לחוויית ניהול מושלמת." },
                    { title: "זמינות מלאה", desc: "כל הנתונים והמסמכים זמינים מכל מכשיר, בממשק מאובטח המסונכרן בענן לתצוגה שקופה תמיד מכל מקום." }
                ]
            },
            final: {
                titleLine1: "מוכן לקחת את הניהול",
                titleLine2: "צעד קדימה?",
                subtitle: "הצטרף למאות משקיעים שכבר חוסכים זמן וכסף כל חודש.",
                ctaMain: "צור חשבון חינם",
                ctaSec: "דבר עם מומחה"
            },
            footer: { rights: "© 2024 רנטמייט - ניהול נכסים בסטנדרט פרימיום", links: ["תנאי שימוש", "מדיניות פרטיות", "נגישות", "שאלות נפוצות", "מרכז עזרה"] },
            assistant: "צריכים עזרה?"
        },
        en: {
            nav: { properties: "Our Properties", services: "Services", about: "About Us", contact: "Contact", login: "Login" },
            hero: {
                badge: "Architectural Property Management",
                titleLine1: "Complete Control",
                titleLine2: "of Your Properties",
                subtitle: `A smart platform to manage, optimize, and track your real estate portfolio. 
                          All the information you need, in one place, with full transparency.`,
                ctaMain: "Start for Free",
                ctaSec: "Watch Demo"
            },
            carousel: [
                { title: "Income & Yield Tracking", desc: "Real-time view of portfolio profits" },
                { title: "Smart Contract Management", desc: "Automated alerts for renewals and CPI linkage" },
                { title: "Digital Tenant Portal", desc: "Fast communication and maintenance tracking" },
            ],
            video: { title: "Less Management, More Profit", desc: "A glimpse into how RentMate changes the game for modern investors" },
            features: [
                { title: "Real-time Tracking", desc: "Get alerts on payments, expiring contracts, and maintenance directly to your mobile. Full transparency at all times.", icon: Activity },
                { title: "Smart Yield Calculation", desc: "Advanced algorithm analyzes maintenance expenses vs income and suggests ways to improve yields and reduce unnecessary costs.", icon: Calculator },
                { title: "Maximum Transparency", desc: "Share reports with partners or accountants with one click. Everything is documented, secure, and accessible from anywhere.", icon: Eye },
            ],
            bento: {
                title: "Investor Benefits",
                subtitle: "Why our premium clients choose RentMate to manage their portfolios",
                cards: [
                    { title: "Quiet Investing", desc: "We handle all logistics, from renting the property to fixing the smallest issue. You just watch the profits roll in with peace of mind.", cta: "Learn More" },
                    { title: "Premium Guarantee", desc: "Full coverage for damages and income protection even during evictions. Your peace of mind is our primary mission." },
                    { title: "Performance", desc: "A lightning-fast system for a perfect management experience." },
                    { title: "Global", desc: "Manage your properties from anywhere in the world effortlessly." }
                ]
            },
            final: {
                titleLine1: "Ready to take management",
                titleLine2: "a step forward?",
                subtitle: "Join hundreds of investors who save time and money every month.",
                ctaMain: "Create Free Account",
                ctaSec: "Talk to an Expert"
            },
            footer: { rights: "© 2024 RentMate - Premium Property Management", links: ["Terms of Service", "Privacy Policy", "Accessibility", "FAQ", "Help Center"] },
            assistant: "Need Help?"
        }
    };

    const text = content[lang as 'he' | 'en'] || content.he;
    
    // Framer Motion shared variants
    const revealVariant: Variants = {
        hidden: { opacity: 0, y: 40 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, type: "spring", bounce: 0.4 } }
    };

    return (
        <div className="relative min-h-screen text-foreground selection:bg-secondary selection:text-primary overflow-x-hidden antialiased" dir={isRtl ? "rtl" : "ltr"}>
            
            {/* Cinematic Background System */}
            <div className="fixed inset-0 w-full h-screen z-0 overflow-hidden pointer-events-none bg-slate-950">
                <ScrollSequence 
                    frameCount={192} 
                    imagePathTemplate={(i) => `/Background/ezgif-frame-${String(i).padStart(3, '0')}.webp`} 
                />
                <motion.div 
                    className="absolute inset-0 bg-gradient-to-b from-primary/80 to-primary/95"
                    style={{ opacity: overlayOpacity }}
                />
                {/* Particles/Grid Overlay */}
                <div className="absolute inset-0 z-[2] opacity-10" style={{ backgroundImage: 'radial-gradient(circle, hsl(var(--secondary)) 1px, transparent 1px)', backgroundSize: '100px 100px', maskImage: 'linear-gradient(to bottom, black, transparent)' }} />
            </div>

            {/* Top Navigation */}
            <nav className={cn(
                "fixed top-6 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-3rem)] max-w-6xl transition-all duration-500 rounded-xl",
                scrolled ? "bg-white/90 dark:bg-slate-900/80 backdrop-blur-xl shadow-premium border border-border" : "bg-transparent border-transparent"
            )}>
                <div className="flex items-center justify-between px-6 py-4">
                    <div className="cursor-pointer" onClick={() => navigate('/')}>
                        <Logo />
                    </div>
                    
                    <div className="hidden md:flex items-center gap-8 font-medium text-base">
                        <a href="#" className="text-primary dark:text-white border-b-2 border-primary dark:border-white pb-1">{text.nav.properties}</a>
                        <a href="#" className="text-secondary-foreground hover:text-primary dark:text-slate-300 dark:hover:text-white transition-colors">{text.nav.services}</a>
                        <a href="#" className="text-secondary-foreground hover:text-primary dark:text-slate-300 dark:hover:text-white transition-colors">{text.nav.about}</a>
                        <a href="#" className="text-secondary-foreground hover:text-primary dark:text-slate-300 dark:hover:text-white transition-colors">{text.nav.contact}</a>
                    </div>

                    <div className="flex items-center gap-4">
                        <LanguageToggle />
                        <ThemeToggle />
                        <Button onClick={() => navigate('/login?mode=signup')} className="bg-primary hover:bg-primary/90 text-primary-foreground font-bold px-8 h-10 shadow-lg hidden sm:flex">
                            {text.nav.login}
                        </Button>
                    </div>
                </div>
            </nav>

            <main className="relative z-10 pt-32 pb-16">
                
                {/* Hero Section */}
                <section className="min-h-[85vh] flex flex-col items-center justify-center px-6 text-center">
                    <motion.div initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.1 } } }} className="max-w-5xl mx-auto">
                        
                        <motion.span variants={revealVariant} className="inline-block px-4 sm:px-6 py-2 mb-8 text-xs font-bold tracking-[0.2em] uppercase text-secondary-foreground bg-secondary/30 rounded-full border border-secondary/20 backdrop-blur-sm">
                            {text.hero.badge}
                        </motion.span>
                        
                        <motion.h1 variants={revealVariant} className="text-6xl md:text-[8rem] font-[900] text-white leading-[0.9] tracking-tighter mb-8">
                            {text.hero.titleLine1} <br/>
                            <span className="text-secondary">{text.hero.titleLine2}</span>
                        </motion.h1>
                        
                        <motion.p variants={revealVariant} className="text-xl md:text-2xl text-slate-300 max-w-2xl mx-auto mb-12 leading-relaxed">
                            {text.hero.subtitle}
                        </motion.p>
                        
                        <motion.div variants={revealVariant} className="flex flex-col sm:flex-row items-center justify-center gap-4">
                            <Button onClick={() => navigate('/login?mode=signup')} className="w-full sm:w-auto h-14 px-10 bg-secondary hover:bg-secondary/90 text-secondary-foreground font-bold text-lg shadow-premium rounded-xl">
                                {text.hero.ctaMain}
                            </Button>
                            <Button variant="outline" className="w-full sm:w-auto h-14 px-10 bg-white/10 hover:bg-white/20 text-white border-white/20 backdrop-blur-md font-bold text-lg rounded-xl">
                                {text.hero.ctaSec}
                            </Button>
                        </motion.div>
                    </motion.div>

                    {/* Feature Showcase Grid (Static Mockups) */}
                    <motion.div initial={{ opacity: 0, y: 100 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 1, delay: 0.4 }} className="mt-32 w-full max-w-5xl mx-auto px-4 grid md:grid-cols-3 gap-6">
                         {[1, 2, 3].map((v, idx) => (
                             <div key={idx} className={cn("rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6 flex flex-col items-start gap-4 shadow-2xl transition-transform hover:-translate-y-2",
                                idx === 1 ? "md:-translate-y-8" : ""
                             )}>
                                <div className="w-12 h-12 rounded-full bg-secondary/20 flex items-center justify-center">
                                    {idx === 0 && <Activity className="w-6 h-6 text-secondary" />}
                                    {idx === 1 && <Calculator className="w-6 h-6 text-secondary" />}
                                    {idx === 2 && <ShieldCheck className="w-6 h-6 text-secondary" />}
                                </div>
                                <div>
                                    <h3 className="text-white font-bold text-lg">{text.carousel[idx].title}</h3>
                                    <p className="text-slate-400 text-sm mt-1 leading-relaxed">{text.carousel[idx].desc}</p>
                                </div>
                             </div>
                         ))}
                    </motion.div>
                </section>

                {/* Features Section */}
                <section className="py-32 px-6">
                    <div className="max-w-7xl mx-auto flex flex-col md:flex-row gap-16 items-start">
                        <div className="w-full md:w-1/2 space-y-8">
                            {text.features.map((feature, idx) => (
                                <motion.div key={idx} initial="hidden" whileInView="visible" viewport={{ once: true, margin: "-100px" }} variants={revealVariant} 
                                    className={cn(
                                        "p-8 lg:p-10 rounded-2xl transition-all duration-300",
                                        idx === 0 
                                            ? "bg-white dark:bg-slate-900 shadow-premium border-l-8 lg:border-l-0 lg:border-r-8 border-secondary z-10 relative" 
                                            : "bg-black/20 backdrop-blur-md border border-white/10 text-white hover:bg-black/30"
                                    )}
                                >
                                    <feature.icon className={cn("w-12 h-12 mb-6", idx === 0 ? "text-secondary" : "text-white")} />
                                    <h3 className={cn("text-3xl font-black mb-4 tracking-tight", idx === 0 ? "text-primary dark:text-white" : "text-white")}>{feature.title}</h3>
                                    <p className={cn("text-lg leading-relaxed", idx === 0 ? "text-muted-foreground" : "text-slate-300")}>{feature.desc}</p>
                                </motion.div>
                            ))}
                        </div>
                        
                        {/* Sticky Mobile App Mockup */}
                        <div className="w-full md:w-1/2 flex justify-center sticky top-32">
                            <motion.div initial={{ opacity: 0, scale: 0.9 }} whileInView={{ opacity: 1, scale: 1 }} transition={{ type: "spring" }} className="relative w-80 h-[640px] bg-slate-950 rounded-[3.5rem] border-[12px] border-slate-900 shadow-2xl p-4 overflow-hidden">
                                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-36 h-7 bg-slate-900 rounded-b-2xl z-20" />
                                <div className="w-full h-full bg-background rounded-2xl overflow-hidden p-6 space-y-6 relative">
                                    <div className="w-full h-32 bg-secondary/10 rounded-2xl animate-pulse" />
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="h-24 bg-card shadow-sm border border-border rounded-xl" />
                                        <div className="h-24 bg-card shadow-sm border border-border rounded-xl" />
                                    </div>
                                    <div className="space-y-3 pt-4">
                                        <div className="h-4 w-full bg-muted rounded-full" />
                                        <div className="h-4 w-4/5 bg-muted rounded-full" />
                                    </div>
                                </div>
                            </motion.div>
                        </div>
                    </div>
                </section>

                {/* Video / Blueprint Section */}
                <section className="py-32 px-6">
                    <div className="max-w-6xl mx-auto relative relative">
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariant} className="relative rounded-2xl overflow-hidden shadow-2xl aspect-video group bg-primary">
                            <img src="/Background/ezgif-frame-100.jpg" onError={(e) => { e.currentTarget.src = 'https://images.unsplash.com/photo-1600596542815-ffad4c1539a9?q=80&w=2000&auto=format&fit=crop' }} alt="Demo" className="w-full h-full object-cover opacity-60 mix-blend-overlay group-hover:opacity-80 group-hover:mix-blend-normal transition-all duration-700" />
                            <div className="absolute inset-0 flex items-center justify-center group-hover:bg-black/20 transition-colors">
                                <button className="w-24 h-24 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center text-white border border-white/40 hover:scale-110 transition-transform shadow-glass">
                                    <Play className="w-10 h-10 ml-2" fill="currentColor" />
                                </button>
                            </div>
                        </motion.div>
                        <motion.div initial="hidden" whileInView="visible" viewport={{ once: true }} variants={revealVariant} className="mt-16 text-center">
                            <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">{text.video.title}</h2>
                            <p className="text-slate-300 mt-4 text-xl">{text.video.desc}</p>
                        </motion.div>
                    </div>
                </section>

                {/* Bento Grid (Investor Benefits) */}
                <section className="py-32 px-6 relative">
                    <div className="max-w-7xl mx-auto relative z-10">
                        <div className="mb-16 md:text-right text-center">
                            <motion.h2 initial="hidden" whileInView="visible" variants={revealVariant} className="text-5xl md:text-6xl font-black mb-4 tracking-tight text-white">{text.bento.title}</motion.h2>
                            <motion.p initial="hidden" whileInView="visible" variants={revealVariant} className="text-xl text-slate-400 font-light max-w-2xl mx-auto md:mx-0 md:mr-auto">{text.bento.subtitle}</motion.p>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 auto-rows-[250px]">
                            {/* Large Card */}
                            <motion.div initial="hidden" whileInView="visible" variants={revealVariant} className="md:col-span-2 md:row-span-2 rounded-2xl bg-white/10 backdrop-blur-xl border border-white/20 p-10 lg:p-12 flex flex-col justify-between group shadow-glass relative overflow-hidden">
                                <div className="relative z-10">
                                    <h3 className="text-4xl lg:text-5xl font-black text-white mb-6 tracking-tighter">{text.bento.cards[0].title}</h3>
                                    <p className="text-xl text-slate-200 leading-relaxed font-light">{text.bento.cards[0].desc}</p>
                                </div>
                                <div className="mt-12 relative z-10">
                                    <button className="bg-white text-primary px-8 py-4 rounded-xl font-bold flex items-center gap-2 sm:gap-4 hover:gap-4 sm:gap-6 transition-all shadow-lg active:scale-95">
                                        {text.bento.cards[0].cta} 
                                        {isRtl ? <ArrowLeft className="w-5 h-5" /> : <ArrowRight className="w-5 h-5" />}
                                    </button>
                                </div>
                                <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-secondary/30 rounded-full blur-[100px] group-hover:bg-secondary/40 transition-colors" />
                            </motion.div>

                            {/* Medium Card */}
                            <motion.div initial="hidden" whileInView="visible" variants={revealVariant} className="md:col-span-2 rounded-2xl bg-secondary text-secondary-foreground p-10 lg:p-12 flex flex-col justify-center relative shadow-premium overflow-hidden">
                                <ShieldCheck className="w-12 h-12 mb-6" />
                                <h3 className="text-3xl font-black tracking-tight mb-4">{text.bento.cards[1].title}</h3>
                                <p className="text-secondary-foreground/80 text-lg font-medium leading-relaxed">{text.bento.cards[1].desc}</p>
                                <div className="absolute right-0 top-0 w-64 h-64 bg-white/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
                            </motion.div>

                            {/* Small Card 1 */}
                            <motion.div initial="hidden" whileInView="visible" variants={revealVariant} className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-glass hover:bg-white/10 transition-colors">
                                <Zap className="w-10 h-10 text-secondary mb-6" />
                                <h4 className="text-2xl font-black text-white mb-2 sm:mb-4">{text.bento.cards[2].title}</h4>
                                <p className="text-slate-400">{text.bento.cards[2].desc}</p>
                            </motion.div>

                            {/* Small Card 2 */}
                            <motion.div initial="hidden" whileInView="visible" variants={revealVariant} className="bg-white/5 backdrop-blur-md border border-white/10 p-8 rounded-2xl shadow-glass hover:bg-white/10 transition-colors">
                                <MonitorSmartphone className="w-10 h-10 text-secondary mb-6" />
                                <h4 className="text-2xl font-black text-white mb-2 sm:mb-4">{text.bento.cards[3].title}</h4>
                                <p className="text-slate-400">{text.bento.cards[3].desc}</p>
                            </motion.div>
                        </div>
                    </div>
                </section>

                <LandingArticles />

                {/* Final CTA */}
                <section className="py-32 px-6">
                    <motion.div initial="hidden" whileInView="visible" variants={revealVariant} className="max-w-5xl mx-auto p-16 lg:p-24 bg-primary text-primary-foreground rounded-2xl text-center relative overflow-hidden shadow-2xl border border-white/10">
                        <div className="absolute inset-0 bg-secondary/10 mix-blend-overlay" />
                        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-secondary/20 rounded-full blur-[100px] -translate-y-1/2 translate-x-1/4" />
                        
                        <div className="relative z-10">
                            <h2 className="text-5xl md:text-7xl font-black mb-8 tracking-tighter">
                                {text.final.titleLine1} <br/> {text.final.titleLine2}
                            </h2>
                            <p className="text-xl md:text-2xl text-primary-foreground/80 mb-12 max-w-2xl mx-auto">{text.final.subtitle}</p>
                            <div className="flex flex-col sm:flex-row gap-4 justify-center">
                                <Button onClick={() => navigate('/login?mode=signup')} className="h-16 px-12 bg-white hover:bg-slate-100 text-primary rounded-xl text-lg font-bold shadow-xl">
                                    {text.final.ctaMain}
                                </Button>
                                <Button variant="outline" className="h-16 px-12 bg-primary-foreground/10 hover:bg-primary-foreground/20 text-primary-foreground border-primary-foreground/20 rounded-xl text-lg font-bold backdrop-blur-md">
                                    {text.final.ctaSec}
                                </Button>
                            </div>
                        </div>
                    </motion.div>
                </section>
            </main>

            {/* Footer */}
            <footer className="bg-card border-t border-border mt-auto relative z-10">
                <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between px-6 py-12 gap-8">
                    <div className="flex flex-col items-center md:items-start gap-4">
                        <div className="text-3xl font-black text-primary tracking-tighter"><Logo /></div>
                        <p className="text-muted-foreground text-sm font-medium">{text.footer.rights}</p>
                    </div>
                    
                    <div className="flex flex-wrap justify-center gap-6 md:gap-8 font-medium text-sm">
                        {text.footer.links.map((link, i) => (
                            <a key={i} href="#" className="text-muted-foreground hover:text-primary transition-colors">{link}</a>
                        ))}
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all">
                            <Share2 className="w-4 h-4" />
                        </button>
                        <button className="w-10 h-10 rounded-full bg-muted flex items-center justify-center hover:bg-secondary hover:text-secondary-foreground transition-all">
                            <Mail className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </footer>


        </div>
    );
}
