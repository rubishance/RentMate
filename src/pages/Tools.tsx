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
        <div className="space-y-6 px-4 pt-6">
            <PageHeader
                title={lang === 'he' ? 'כלים' : 'Tools'}
                subtitle={lang === 'he' ? 'מחשבון, אנליטיקה ומגמות שוק' : 'Calculator, Analytics & Market Trends'}
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
                <button
                    onClick={() => setActiveTab('trends')}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'trends'
                        ? 'bg-white text-brand-navy shadow-sm'
                        : 'text-muted-foreground hover:text-foreground'
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
