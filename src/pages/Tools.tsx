import { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Calculator } from './Calculator';
import { Analytics } from './Analytics';
import { RentalTrends } from '../components/tools/RentalTrends';
import { Calculator as CalcIcon, BarChart2, TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../hooks/useTranslation';

export function Tools() {
    const { lang } = useTranslation();
    const [activeTab, setActiveTab] = useState<'calculator' | 'analytics' | 'trends'>('calculator');

    return (
        <div className="space-y-12 px-4 pt-12 pb-32 animate-in fade-in duration-1000">
            <div className="space-y-4 px-4 md:px-0">
                <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-2">
                    <TrendingUp className="w-3 h-3 text-indigo-500" />
                    <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                        {lang === 'he' ? 'מרכז הכלים' : 'Tools Hub'}
                    </span>
                </div>
                <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-tight lowercase">
                    {lang === 'he' ? 'כלים חכמים' : 'Smart Tools'}
                </h1>
                <p className="text-muted-foreground text-lg font-medium leading-relaxed max-w-2xl opacity-60">
                    {lang === 'he' ? 'מחשבון, אנליטיקה ומגמות שוק - הכל במקום אחד' : 'Calculator, Analytics & Market Trends - all in one place'}
                </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex glass-premium dark:bg-neutral-900/40 p-2 rounded-[2.5rem] border-white/5 shadow-minimal max-w-2xl mx-auto">
                <button
                    onClick={() => setActiveTab('calculator')}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all ${activeTab === 'calculator'
                        ? 'button-jewel text-white shadow-jewel'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                >
                    <CalcIcon className="w-4 h-4" />
                    {lang === 'he' ? 'מחשבון' : 'Calculator'}
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all ${activeTab === 'analytics'
                        ? 'button-jewel text-white shadow-jewel'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                >
                    <BarChart2 className="w-4 h-4" />
                    {lang === 'he' ? 'אנליטיקה' : 'Analytics'}
                </button>
                <button
                    onClick={() => setActiveTab('trends')}
                    className={`flex-1 flex items-center justify-center gap-3 py-4 rounded-[1.8rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all ${activeTab === 'trends'
                        ? 'button-jewel text-white shadow-jewel'
                        : 'text-muted-foreground hover:text-foreground hover:bg-white/5'
                        }`}
                >
                    <TrendingUp className="w-4 h-4" />
                    {lang === 'he' ? 'מגמות שוק' : 'Market Trends'}
                </button>
            </div>

            {/* Content Area */}
            <AnimatePresence mode="wait">
                <motion.div
                    key={activeTab}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                >
                    {activeTab === 'calculator' ? (
                        <div className="-mt-6">
                            <Calculator embedMode />
                        </div>
                    ) : activeTab === 'analytics' ? (
                        <div className="-mt-6">
                            <Analytics embedMode />
                        </div>
                    ) : (
                        <div className="mt-2">
                            <RentalTrends />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
