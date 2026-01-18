import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import { GlassCard } from './GlassCard';

export function HeroSection() {
    return (
        <section className="relative min-h-screen flex items-center justify-center pt-24 pb-12 overflow-hidden">
            {/* Background Animated Orbs */}
            <div className="bionic-bg-glow top-0 right-0 opacity-40"></div>
            <div className="bionic-bg-glow purple bottom-0 left-0 opacity-40"></div>

            <div className="container mx-auto px-4 z-10 relative">
                <div className="grid lg:grid-cols-2 gap-12 items-center">
                    {/* Text Content */}
                    <div className="text-right space-y-8 z-20">
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.8 }}
                        >
                            <h1 className="text-6xl md:text-7xl font-black mb-6 leading-tight text-white drop-shadow-2xl">
                                השכירו בראש <br />
                                <span className="text-gradient-bionic">שקט.</span>
                            </h1>
                            <p className="text-2xl text-blue-100/90 font-light mb-2">
                                ניהול שכירות פשוט במקום אחד
                            </p>
                            <p className="text-lg text-gray-400 max-w-md leading-relaxed">
                                מערכת הניהול המתקדמת בישראל. הצמדה למדד, סריקת חוזים ב-AI וגבייה אוטומטית.
                            </p>
                        </motion.div>

                        <motion.div
                            className="flex flex-col sm:flex-row gap-4"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                        >
                            <Link
                                to="/login"
                                className="px-8 py-4 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full text-white font-bold text-lg shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_35px_rgba(168,85,247,0.5)] transition-all transform hover:-translate-y-1 text-center"
                            >
                                התחילו בחינם
                            </Link>
                            <a
                                href="#demo"
                                className="px-8 py-4 bg-white/5 border border-white/10 rounded-full text-white font-medium hover:bg-white/10 backdrop-blur-sm transition-all text-center"
                            >
                                ראו איך זה עובד
                            </a>
                        </motion.div>

                        <div className="flex items-center gap-6 pt-4 text-sm text-gray-400">
                            <span className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_10px_#4ade80]"></div>
                                תואם חוקי 2025
                            </span>
                            <span className="flex items-center gap-2">
                                <div className="w-2 h-2 rounded-full bg-blue-400 shadow-[0_0_10px_#60a5fa]"></div>
                                ללא צורך באשראי
                            </span>
                        </div>
                    </div>

                    {/* 3D Visual */}
                    <motion.div
                        initial={{ opacity: 0, x: 50 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ duration: 1 }}
                        className="hero-3d-stage hidden lg:block h-[600px] w-full relative"
                    >
                        {/* 3D Container */}
                        <div className="absolute inset-0 flex items-center justify-center">
                            <GlassCard className="hero-dashboard-preview relative z-10 w-[110%] max-w-[800px] !p-0 border-0 bg-transparent">
                                <div className="relative rounded-xl overflow-hidden shadow-2xl bg-[#0f172a]">
                                    {/* Window Controls */}
                                    <div className="absolute top-0 w-full h-8 bg-black/20 backdrop-blur-md flex items-center px-4 gap-2 z-20 border-b border-white/5">
                                        <div className="w-3 h-3 rounded-full bg-red-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                                        <div className="w-3 h-3 rounded-full bg-green-400"></div>
                                    </div>
                                    {/* Real Screenshot */}
                                    <img
                                        src="/assets/marketing/screens/dashboard.png"
                                        alt="RentMate Dashboard"
                                        className="w-full h-auto object-cover opacity-95 hover:opacity-100 transition-opacity"
                                    />

                                    {/* Floating Elements (Parallax) */}
                                    <motion.img
                                        src="/assets/marketing/screens/calculator.png"
                                        animate={{ y: [0, -10, 0] }}
                                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                                        className="absolute -bottom-10 -left-10 w-64 rounded-lg shadow-[0_20px_50px_rgba(0,0,0,0.5)] border border-white/10"
                                    />
                                </div>
                            </GlassCard>
                        </div>
                    </motion.div>
                </div>
            </div>
        </section>
    );
}
