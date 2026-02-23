import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Folder, Zap, ShieldCheck, TrendingUp, Mic, User, Signal, Wifi, Battery, ArrowRight } from 'lucide-react';
import { BotFullBody } from '../chat/BotFullBody';

/**
 * BillScanningAnimation Component (v6.1 - "iPhone 16 Pro Max Edition")
 * 
 * Major updates:
 * - iPhone 16 Pro Bezel with ultra-thin titanium borders.
 * - Dynamic Island implementation with interactive state.
 * - No background container (fully transparent).
 * - Modern iOS-inspired UI for RentMate.
 * - Refined animations and glass effects.
 */

interface BillScanningAnimationProps {
    isRtl?: boolean;
}

type Step = 'DASHBOARD' | 'RENTY_GREET' | 'USER_VOICE' | 'SCANNING' | 'SUCCESS';

export const BillScanningAnimation = ({ isRtl = false }: BillScanningAnimationProps) => {
    const [step, setStep] = useState<Step>('DASHBOARD');

    useEffect(() => {
        let isMounted = true;
        const play = async () => {
            if (!isMounted) return;
            setStep('DASHBOARD');
            await new Promise(r => setTimeout(r, 4000));
            if (!isMounted) return;
            setStep('RENTY_GREET');
            await new Promise(r => setTimeout(r, 2500));
            if (!isMounted) return;
            setStep('USER_VOICE');
            await new Promise(r => setTimeout(r, 3500));
            if (!isMounted) return;
            setStep('SCANNING');
            await new Promise(r => setTimeout(r, 3500));
            if (!isMounted) return;
            setStep('SUCCESS');
            await new Promise(r => setTimeout(r, 4500));
            if (isMounted) play();
        };
        play();
        return () => { isMounted = false; };
    }, []);

    return (
        <div className="relative w-full h-full flex items-center justify-center">
            {/* PHONE MOCKUP (iPhone 16 Pro Titanium Style) */}
            <motion.div
                className="relative w-[300px] h-[620px] bg-neutral-900 rounded-[58px] p-[2px] shadow-[0_50px_100px_rgba(0,0,0,0.5)] border border-white/10"
            >
                {/* Titanium Bezel Silk Edge */}
                <div className="absolute inset-x-2 inset-y-2 rounded-[56px] border border-white/10 pointer-events-none z-10" />

                {/* Inner Screen (Glassmorphic) */}
                <div
                    className="w-full h-full bg-white/5 dark:bg-black/20 backdrop-blur-2xl rounded-[56px] overflow-hidden relative border border-white/5 isolate"
                    style={{
                        transformStyle: 'flat',
                        clipPath: 'inset(0 0 0 0 rounded 56px)',
                        WebkitMaskImage: '-webkit-radial-gradient(white, black)'
                    }}
                >

                    {/* STATUS BAR */}
                    <div className="absolute top-4 inset-x-0 h-8 flex items-center justify-between px-10 z-[100]">
                        <span className="text-[12px] font-bold text-foreground drop-shadow-sm">9:41</span>
                        <div className="flex gap-2 items-center opacity-80">
                            <Signal className="w-3.5 h-3.5 text-foreground" />
                            <Wifi className="w-3.5 h-3.5 text-foreground" />
                            <Battery className="w-4.5 h-4.5 text-foreground" />
                        </div>
                    </div>

                    {/* DYNAMIC ISLAND (iPhone 16 Pro Style) */}
                    <motion.div
                        className="absolute left-1/2 -translate-x-1/2 bg-black rounded-full z-[110] flex items-center justify-center shadow-2xl ring-1 ring-white/10"
                        animate={{
                            width: step === 'SCANNING' ? '160px' : step === 'USER_VOICE' ? '120px' : '95px',
                            height: step === 'SCANNING' ? '36px' : step === 'USER_VOICE' ? '32px' : '30px',
                            top: '12px'
                        }}
                        transition={{ type: 'spring', stiffness: 180, damping: 22 }}
                    >
                        {step === 'SCANNING' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="flex items-center gap-2 px-3"
                            >
                                <div className="w-2.5 h-2.5 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_10px_#34d399]" />
                                <span className="text-[9px] font-black text-white uppercase tracking-tighter">SCANNING</span>
                            </motion.div>
                        )}
                        {step === 'USER_VOICE' && (
                            <motion.div
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                className="w-full flex justify-center items-center h-full"
                            >
                                <div className="flex gap-1.5 items-center h-full">
                                    {[0.5, 1, 0.4, 0.8, 0.3].map((v, i) => (
                                        <motion.div
                                            key={i}
                                            className="w-1.5 bg-secondary rounded-full"
                                            animate={{ height: ['4px', `${v * 16}px`, '4px'] }}
                                            transition={{ duration: 0.5, repeat: Infinity, delay: i * 0.1 }}
                                        />
                                    ))}
                                </div>
                            </motion.div>
                        )}
                    </motion.div>

                    {/* SCREEN CONTENT CONTAINER (Transparent / Glass) */}
                    <div className="w-full h-full p-8 pt-20 flex flex-col relative">

                        {/* APP HEADER */}
                        <div className={`flex justify-between items-center mb-8 transition-all duration-500 ${step !== 'DASHBOARD' ? 'opacity-10 blur-md translate-y-2' : 'opacity-100 translate-y-0'}`}>
                            <div className="space-y-1">
                                <div className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground font-black">
                                    {isRtl ? 'בוקר טוב, ישראל' : 'MORNING, ISRAEL'}
                                </div>
                                <div className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2">
                                    RentMate
                                    <div className="w-2 h-2 bg-secondary rounded-full" />
                                </div>
                            </div>
                            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center border border-white/10 shadow-lg">
                                <User className="w-6 h-6 text-muted-foreground" />
                            </div>
                        </div>

                        {/* DASHBOARD WIDGETS */}
                        <div className={`space-y-6 transition-all duration-700 ${step !== 'DASHBOARD' ? 'opacity-10 blur-xl scale-90 translate-y-10' : 'opacity-100 scale-100 translate-y-0'}`}>
                            <div className="bg-white/10 backdrop-blur-xl p-8 rounded-[3rem] shadow-2xl border border-white/10">
                                <div className="flex justify-between items-center mb-4">
                                    <span className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em]">{isRtl ? 'הכנסה חודשית' : 'MONTHLY REVENUE'}</span>
                                    <TrendingUp className="w-5 h-5 text-emerald-400" />
                                </div>
                                <div className="text-5xl font-black text-foreground tracking-tighter leading-none mb-6">₪15,200</div>
                                <div className="h-2 w-full bg-black/20 dark:bg-white/5 rounded-full overflow-hidden">
                                    <motion.div
                                        className="h-full bg-secondary"
                                        initial={{ width: '0%' }}
                                        animate={{ width: '85%' }}
                                        transition={{ duration: 1.5, delay: 0.5 }}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="bg-white/10 backdrop-blur-lg p-6 rounded-[2.5rem] border border-white/10 aspect-square flex flex-col justify-between group overflow-hidden relative shadow-xl">
                                    <Folder className="w-8 h-8 text-muted-foreground/40" />
                                    <div className="w-14 h-3 bg-foreground rounded-full opacity-20" />
                                </div>
                                <div className="bg-black/40 backdrop-blur-lg p-6 rounded-[2.5rem] border border-white/10 aspect-square flex flex-col justify-between shadow-2xl relative overflow-hidden">
                                    <Zap className="w-8 h-8 text-secondary animate-pulse" />
                                    <div className="w-14 h-3 bg-white rounded-full opacity-40" />
                                </div>
                            </div>

                            {/* NEW: Renty App Icon Widget */}
                            <motion.div
                                className="bg-gradient-to-br from-indigo-600 to-purple-700 p-4 rounded-3xl shadow-lg border border-white/20 flex items-center gap-4 relative overflow-hidden"
                                whileHover={{ scale: 1.02 }}
                            >
                                <div className="w-10 h-10 bg-white/20 rounded-xl backdrop-blur-md flex items-center justify-center shrink-0 border border-white/30">
                                    <div className="scale-150 transform">
                                        <BotFullBody size={20} />
                                    </div>
                                </div>
                                <div className="min-w-0">
                                    <div className="text-[9px] font-black text-white/60 uppercase tracking-widest leading-none mb-1">AI ASSISTANT</div>
                                    <div className="text-[13px] font-bold text-white truncate">Ask Renty Ready</div>
                                </div>
                                <motion.div
                                    className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white/10 flex items-center justify-center"
                                    animate={{ x: [0, 5, 0] }}
                                    transition={{ repeat: Infinity, duration: 2 }}
                                >
                                    <ArrowRight className="w-3 h-3 text-white" />
                                </motion.div>
                            </motion.div>
                        </div>

                        {/* CHAT INTERFACE OVERLAY */}
                        <AnimatePresence>
                            {step !== 'DASHBOARD' && (
                                <motion.div
                                    className="absolute inset-x-0 bottom-0 z-[80] flex flex-col items-center pb-12"
                                    initial={{ opacity: 0, y: 50 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, y: 50 }}
                                >
                                    {/* BLUR BACKGROUND */}
                                    <div className="absolute inset-0 bg-white/40 dark:bg-black/60 backdrop-blur-md -z-10" />

                                    {/* RENTY CHARACTER */}
                                    <motion.div
                                        animate={{ y: step === 'SCANNING' || step === 'SUCCESS' ? 140 : 0 }}
                                        transition={{ type: 'spring', damping: 20, stiffness: 100 }}
                                        className="relative z-10"
                                    >
                                        <BotFullBody size={130} />
                                    </motion.div>

                                    {/* DIALOGUE BUBBLE */}
                                    <AnimatePresence>
                                        {(step === 'RENTY_GREET' || step === 'USER_VOICE') && (
                                            <motion.div
                                                className="absolute top-[-60px] left-1/2 -translate-x-1/2 w-[85%] bg-neutral-900 dark:bg-white text-white dark:text-black p-4 rounded-2xl text-[10px] font-bold shadow-2xl border border-white/10 z-20 text-center"
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                            >
                                                {isRtl ? 'שלום! אני רנטי - בוט ה-AI של RentMate. כיצד אפשר לעזור?' : 'Hi! I\'m Renty - RentMate\'s AI bot. How can I help?'}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>

                                    {/* USER VOICE / COMMAND */}
                                    <AnimatePresence>
                                        {(step === 'USER_VOICE' || step === 'SCANNING') && (
                                            <motion.div
                                                className="absolute top-[-10px] left-1/2 -translate-x-1/2 w-[60%] bg-secondary text-primary-foreground p-3 rounded-xl shadow-xl border border-white/20 z-20 text-center"
                                                initial={{ scale: 0, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                exit={{ scale: 0, opacity: 0 }}
                                            >
                                                {step === 'USER_VOICE' ? (
                                                    <div className="text-[9px] font-black tracking-widest uppercase flex items-center justify-center gap-2">
                                                        <div className="w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />
                                                        {isRtl ? 'מקליט...' : 'LISTENING...'}
                                                    </div>
                                                ) : (
                                                    <div className="text-[9px] font-black truncate">{isRtl ? 'מתייק חשבון...' : 'Filing Bill...'}</div>
                                                )}
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* SCANNING MODAL */}
                        <AnimatePresence>
                            {(step === 'SCANNING') && (
                                <motion.div
                                    className="absolute inset-x-4 top-24 bg-white dark:bg-neutral-900 rounded-[3rem] shadow-[0_40px_80px_rgba(0,0,0,0.5)] border border-neutral-100 dark:border-neutral-800 z-[100] p-8 overflow-hidden"
                                    initial={{ y: 350, opacity: 0, scale: 0.95 }}
                                    animate={{ y: 0, opacity: 1, scale: 1 }}
                                    exit={{ y: 350, opacity: 0, scale: 0.95 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 120 }}
                                >
                                    <div className="flex justify-between items-center mb-8">
                                        <div>
                                            <div className="text-[10px] font-black text-blue-500 uppercase tracking-widest mb-1">{isRtl ? 'חברת החשמל' : 'IEC ISRAEL'}</div>
                                            <div className="text-3xl font-black dark:text-white tracking-tighter">₪324.50</div>
                                        </div>
                                        <Zap className="w-8 h-8 text-secondary drop-shadow-[0_0_10px_rgba(69,147,103,0.5)]" />
                                    </div>
                                    <div className="space-y-3 mb-6">
                                        <div className="h-2.5 w-full bg-neutral-100 dark:bg-neutral-800 rounded-full" />
                                        <div className="h-2.5 w-1/2 bg-neutral-100 dark:bg-neutral-800 rounded-full" />
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-black text-neutral-400 tracking-tighter">
                                        <span className="bg-neutral-100 dark:bg-neutral-800 px-2.5 py-1 rounded-lg">15/01/2026</span>
                                        <span className="text-red-500">{isRtl ? 'ממתין לתשלום' : 'PENDING'}</span>
                                    </div>
                                    {/* Scanning High-Tec Beam */}
                                    <motion.div
                                        className="absolute inset-x-0 h-1 bg-gradient-to-r from-transparent via-secondary to-transparent shadow-[0_0_20px_rgba(69,147,103,0.5)]"
                                        animate={{ top: ['0%', '100%', '0%'] }}
                                        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                                    />
                                </motion.div>
                            )}
                        </AnimatePresence>

                        {/* SUCCESS FEEDBACK */}
                        <AnimatePresence>
                            {step === 'SUCCESS' && (
                                <motion.div
                                    className="absolute inset-0 z-[120] flex flex-col items-center justify-center p-8 bg-neutral-900/80 backdrop-blur-md"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                >
                                    <motion.div
                                        className="w-28 h-28 bg-secondary rounded-[2.5rem] flex items-center justify-center shadow-[0_0_60px_rgba(69,147,103,0.3)] relative"
                                        initial={{ scale: 0, rotate: -45 }}
                                        animate={{ scale: 1, rotate: 0 }}
                                        transition={{ type: 'spring', damping: 10 }}
                                    >
                                        <ShieldCheck className="w-14 h-14 text-primary-foreground" />
                                        <motion.div
                                            className="absolute -top-3 -right-3 w-10 h-10 bg-black border-4 border-secondary rounded-full flex items-center justify-center"
                                            animate={{ scale: [1, 1.2, 1] }}
                                            transition={{ repeat: Infinity, duration: 2 }}
                                        >
                                            <Zap className="w-5 h-5 text-secondary" />
                                        </motion.div>
                                    </motion.div>
                                    <motion.div
                                        className="mt-8 text-center"
                                        initial={{ y: 20, opacity: 0 }}
                                        animate={{ y: 0, opacity: 1 }}
                                        transition={{ delay: 0.2 }}
                                    >
                                        <div className="text-secondary font-black text-2xl mb-2 tracking-tighter">{isRtl ? 'הקובץ תויק!' : 'SUCCESSFULLY FILED'}</div>
                                        <div className="text-white/40 text-[10px] uppercase font-bold tracking-[0.2em]">
                                            {isRtl ? 'תיקיית חשבונות חשמל 2026' : 'ELECTRICITY BILLS 2026'}
                                        </div>
                                    </motion.div>
                                </motion.div>
                            )}
                        </AnimatePresence>

                    </div>
                </div>

                {/* iPhone 16 Pro Home Bar */}
                <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-32 h-1.5 bg-white/20 rounded-full backdrop-blur-3xl z-[130]" />
            </motion.div>

            {/* EXTERNAL PROGRESS BAR */}
            <div className="absolute bottom-4 flex gap-1 items-center">
                {['DASHBOARD', 'RENTY_GREET', 'USER_VOICE', 'SCANNING', 'SUCCESS'].map((s) => (
                    <motion.div
                        key={s}
                        className={`h-1.5 rounded-full ${step === s ? 'bg-secondary' : 'bg-neutral-800'}`}
                        animate={{ width: step === s ? '40px' : '10px' }}
                        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                    />
                ))}
            </div>
        </div>
    );
};

export default BillScanningAnimation;
