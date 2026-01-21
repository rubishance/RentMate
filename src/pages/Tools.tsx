import { useState } from 'react';
import { PageHeader } from '../components/common/PageHeader';
import { Calculator } from './Calculator';
import { Analytics } from './Analytics';
import { Calculator as CalcIcon, BarChart2 } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../hooks/useTranslation';

export function Tools() {
    const { lang } = useTranslation();
    const [activeTab, setActiveTab] = useState<'calculator' | 'analytics'>('calculator');

    return (
        <div className="space-y-6 px-4 pt-6">
            <PageHeader
                title={lang === 'he' ? 'כלים' : 'Tools'}
                subtitle={lang === 'he' ? 'מחשבון ואנליטיקה' : 'Calculator & Analytics'}
            />

            {/* Tab Switcher */}
            <div className="flex p-1 bg-muted rounded-xl mb-6">
                <button
                    onClick={() => setActiveTab('calculator')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'calculator'
                        ? 'bg-white text-brand-navy shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <CalcIcon className="w-4 h-4" />
                    {lang === 'he' ? 'מחשבון' : 'Calculator'}
                </button>
                <button
                    onClick={() => setActiveTab('analytics')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'analytics'
                        ? 'bg-white text-brand-navy shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
                        }`}
                >
                    <BarChart2 className="w-4 h-4" />
                    {lang === 'he' ? 'אנליטיקה' : 'Analytics'}
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
                        <div className="-mt-6"> {/* Negative margin to offset Calculator's internal padding if needed, or wrap nicely */}
                            <Calculator embedMode />
                        </div>
                    ) : (
                        <div className="-mt-6">
                            <Analytics embedMode />
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}
