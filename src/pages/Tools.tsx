import { useState } from 'react';

import { Calculator } from './Calculator';
import { TrendingUp } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../hooks/useTranslation';

export function Tools() {
    const { lang, t } = useTranslation();
    const isRtl = lang === 'he';

    return (
        <div className="pt-2 pb-24 md:pb-8 md:pt-8 px-5 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-300 w-full max-w-[100vw] overflow-x-hidden relative z-0">
            {/* Ambient Background Glow */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 dark:bg-primary/5 blur-[100px] rounded-full pointer-events-none -z-10" />
            
            <div className="flex flex-col gap-6">
                {/* Header */}
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 dark:bg-primary/10 backdrop-blur-md rounded-full border border-primary/10 shadow-sm mb-1">
                        <TrendingUp className="w-3 h-3 text-primary" />
                        <span className="text-xs font-black uppercase tracking-widest text-primary dark:text-primary">
                            {isRtl ? 'מרכז המחשבונים' : 'Calculators Hub'}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight truncate lowercase">
                        {t('calculator')}
                    </h1>
                </div>

                {/* Content Area */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key="calculator"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.2 }}
                    >
                        <div className="-mt-6">
                            <Calculator embedMode />
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>
        </div>
    );
}
