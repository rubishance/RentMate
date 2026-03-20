import { useState, useEffect } from 'react';
import { TrendingUp, ChevronDown, ChevronUp, Share2, Plus } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';
import { DatePicker } from '../ui/DatePicker';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Switch } from '../ui/Switch';
import { SegmentedControl } from '../ui/SegmentedControl';
import { calculateStandard } from '../../services/calculator.service';
import { MessageGeneratorModal } from '../modals/MessageGeneratorModal';
import { format, parseISO } from 'date-fns';
import { motion } from 'framer-motion';
import type { StandardCalculationResult } from '../../types/database';
import { InfoTooltip } from '../ui/InfoTooltip';

interface StandardCalculatorProps {
    initialValues?: {
        baseRent?: string;
        linkageType?: 'cpi' | 'housing' | 'construction' | 'usd' | 'eur';
        baseDate?: string;
        targetDate?: string;
        isIndexBaseMinimum?: boolean;
        linkageCeiling?: string;
    };
    shouldAutoCalculate?: boolean;
}

export function StandardCalculator({ initialValues, shouldAutoCalculate }: StandardCalculatorProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [baseRent, setBaseRent] = useState(initialValues?.baseRent || '5000');
    const [linkageType, setLinkageType] = useState<'cpi' | 'housing' | 'construction' | 'usd' | 'eur'>(initialValues?.linkageType || 'cpi');
    const [baseDate, setBaseDate] = useState(initialValues?.baseDate || '');
    const [targetDate, setTargetDate] = useState(initialValues?.targetDate || '');
    const [partialLinkage, setPartialLinkage] = useState('100');
    const [indexBaseMinimum, setIndexBaseMinimum] = useState(initialValues?.isIndexBaseMinimum || false);
    const [linkageCeiling, setLinkageCeiling] = useState(initialValues?.linkageCeiling || '');
    const [linkageSubType, setLinkageSubType] = useState<'known' | 'respect_of'>('known');

    const [showAdvanced, setShowAdvanced] = useState(false);
    const [result, setResult] = useState<StandardCalculationResult | null>(null);
    const [isGeneratorOpen, setIsGeneratorOpen] = useState(false);

    useEffect(() => {
        if (shouldAutoCalculate && baseRent && baseDate && targetDate) {
            handleCalculate();
        }
    }, [shouldAutoCalculate]);

    const handleCalculate = async () => {
        if (!baseRent || !baseDate || !targetDate) {
            alert(t('fillAllFields')); // Ensure usage of translation key
            return;
        }

        setLoading(true);
        try {
            let processedBaseDate = baseDate.slice(0, 7);
            let processedTargetDate = targetDate.slice(0, 7);

            // Logic for "Known" index (subtract 1 month)
            if (linkageSubType === 'known') {
                const bDate = parseISO(baseDate);
                const tDate = parseISO(targetDate);

                const bPrev = new Date(bDate.getFullYear(), bDate.getMonth() - 1, 1);
                const tPrev = new Date(tDate.getFullYear(), tDate.getMonth() - 1, 1);

                processedBaseDate = format(bPrev, 'yyyy-MM');
                processedTargetDate = format(tPrev, 'yyyy-MM');
            }

            const res = await calculateStandard({
                baseRent: parseFloat(baseRent),
                linkageType: linkageType as any,
                baseDate: processedBaseDate,
                targetDate: processedTargetDate,
                partialLinkage: parseFloat(partialLinkage) || 100,
                isIndexBaseMinimum: indexBaseMinimum,
                linkageCeiling: linkageCeiling ? parseFloat(linkageCeiling) : undefined
            });
            setResult(res);
        } catch (error) {
            console.error('Calculation error:', error);
            alert(t('calculationFailed'));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-10 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <section className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[2.5rem] p-4 md:p-6 shadow-premium space-y-12">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
                    <Input
                        label={t('baseRent')}
                        type="number"
                        value={baseRent}
                        onChange={(e) => setBaseRent(e.target.value)}
                        placeholder="5000"
                        className="h-20 text-3xl font-black rounded-[2rem] bg-slate-50 dark:bg-neutral-800/50 border-2 border-transparent focus:border-primary/20 px-4 md:px-6"
                    />
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">{t('linkageType')}</label>
                        <SegmentedControl
                            options={[
                                { label: t('linkedToCpi'), value: 'cpi' },
                                { label: t('linkedToHousing'), value: 'housing' }
                            ]}
                            value={linkageType}
                            onChange={(val) => setLinkageType(val as any)}
                            className="h-20 rounded-[2rem] bg-slate-50 dark:bg-neutral-800/80 p-2 w-full"
                        />
                        <div className="pt-2">
                            <label className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground block ml-1 mb-2">{t('linkageCalculationMethod')}</label>
                            <SegmentedControl
                                options={[
                                    { label: t('knownIndex'), value: 'known' },
                                    { label: t('inRespectOf'), value: 'respect_of' }
                                ]}
                                value={linkageSubType}
                                onChange={(val) => setLinkageSubType(val as any)}
                                className="h-20 rounded-[2rem] bg-slate-50 dark:bg-neutral-800/80 p-2 w-full"
                            />
                        </div>
                    </div>
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">{t('baseDate')}</label>
                        <DatePicker
                            variant="bento"
                            value={baseDate ? parseISO(baseDate) : undefined}
                            onChange={(date) => setBaseDate(date ? format(date, 'yyyy-MM-dd') : '')}
                            placeholder={t('selectBaseDate')}
                        />
                    </div>
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-[0.3em] text-muted-foreground block ml-1">{t('targetDate')}</label>
                        <DatePicker
                            variant="bento"
                            value={targetDate ? parseISO(targetDate) : undefined}
                            onChange={(date) => setTargetDate(date ? format(date, 'yyyy-MM-dd') : '')}
                            placeholder={t('selectTargetDate')}
                            minDate={baseDate ? parseISO(baseDate) : undefined}
                        />
                    </div>
                </div>

                <div className="flex flex-col gap-6">
                    <button
                        onClick={() => setShowAdvanced(!showAdvanced)}
                        className="flex items-center gap-2 self-start text-xs font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all px-2"
                    >
                        {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                        {t('advancedOptions')}
                    </button>

                    {showAdvanced && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="space-y-4 p-8 rounded-[2rem] bg-background dark:bg-neutral-800/50 border border-slate-100 dark:border-neutral-800"
                        >
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs font-black uppercase tracking-widest text-foreground">
                                        {t('indexBaseMin')}
                                    </span>
                                    <InfoTooltip 
                                        titleKey="indexBaseMin"
                                        textKey="tooltipIndexBaseMinText"
                                        exampleKey="tooltipIndexBaseMinExample"
                                    />
                                </div>
                                <Switch
                                    checked={indexBaseMinimum}
                                    onChange={setIndexBaseMinimum}
                                />
                            </div>

                            <hr className="border-slate-100 dark:border-neutral-800 my-6" />

                            <Input
                                label={
                                    <div className="flex items-center gap-2">
                                        {t('partialLinkage')}
                                        <InfoTooltip 
                                            titleKey="partialLinkage"
                                            textKey="tooltipPartialLinkageText"
                                            exampleKey="tooltipPartialLinkageExample"
                                        />
                                    </div>
                                }
                                type="number"
                                value={partialLinkage}
                                onChange={(e) => setPartialLinkage(e.target.value)}
                                placeholder="100"
                                rightIcon={<span className="font-bold text-sm text-muted-foreground">%</span>}
                            />

                            <hr className="border-slate-100 dark:border-neutral-800 my-6" />

                            <Input
                                label={
                                    <div className="flex items-center gap-2">
                                        {t('maxIncrease')}
                                        <InfoTooltip 
                                            titleKey="maxIncrease"
                                            textKey="tooltipMaxIncreaseText"
                                            exampleKey="tooltipMaxIncreaseExample"
                                        />
                                    </div>
                                }
                                type="number"
                                value={linkageCeiling}
                                onChange={(e) => setLinkageCeiling(e.target.value)}
                                placeholder="5"
                                rightIcon={<span className="font-bold text-sm text-muted-foreground">%</span>}
                            />



                        </motion.div>
                    )}
                </div>

                <Button
                    onClick={handleCalculate}
                    disabled={loading}
                    isLoading={loading}
                    className="w-full h-24 rounded-[2rem] text-xl transition-all shadow-premium-dark flex items-center justify-center gap-4 group"
                >
                    <TrendingUp className="w-6 h-6 group-hover:translate-x-1 group-hover:-translate-y-1 transition-transform" />
                    {t('calculate')}
                </Button>
            </section>

            {result && (
                <section className="relative overflow-hidden bg-white dark:bg-neutral-900 border-y sm:border border-primary/20 dark:border-primary/30 rounded-none sm:rounded-[2.5rem] p-4 md:p-6 shadow-[0_0_40px_-15px_hsl(var(--primary))] space-y-10 animate-in zoom-in-95 duration-700">
                    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/5 dark:bg-primary/10 blur-[100px] rounded-full pointer-events-none -z-10" />
                    
                    <h3 className="relative font-black text-xs uppercase tracking-[0.4em] text-primary text-center">{t('results')}</h3>

                    <div className="relative grid grid-cols-1 md:grid-cols-2 gap-8">
                        <div className="bg-primary p-6 md:p-10 rounded-[2.5rem] text-center space-y-2 border border-primary/20 text-primary-foreground shadow-xl shadow-primary/20">
                            <span className="text-xs font-black uppercase tracking-[0.2em] opacity-80 block">{t('newRent')}</span>
                            <span className="text-5xl font-black">₪{result.newRent.toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-neutral-800/80 p-6 md:p-10 rounded-[2.5rem] text-center space-y-2 border border-slate-100 dark:border-neutral-800">
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground block">{t('linkageCoefficient')}</span>
                            <span className="text-5xl font-black text-foreground">{result.linkageCoefficient.toFixed(2)}%</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-neutral-800/80 p-6 md:p-8 rounded-[2rem] flex justify-between items-center px-6 md:px-10 border border-slate-100 dark:border-neutral-800">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('change')}</span>
                            <span className="text-2xl font-black text-foreground">+₪{Math.round(result.absoluteChange).toLocaleString()}</span>
                        </div>
                        <div className="bg-slate-50 dark:bg-neutral-800/80 p-6 md:p-8 rounded-[2rem] flex justify-between items-center px-6 md:px-10 border border-slate-100 dark:border-neutral-800">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('percentage')}</span>
                            <span className="text-2xl font-black text-foreground">{result.percentageChange.toFixed(2)}%</span>
                        </div>
                    </div>

                    <div className="bg-foreground dark:bg-white p-8 rounded-[2rem] text-background dark:text-foreground">
                        <p className="font-black text-xs uppercase tracking-[0.2em] opacity-70 mb-3">{t('formula')}</p>
                        <p className="text-lg font-bold leading-relaxed">{result.formula}</p>
                    </div>

                    <button
                        onClick={() => setIsGeneratorOpen(true)}
                        className="w-full h-20 bg-white dark:bg-neutral-800 border-2 border-slate-100 dark:border-neutral-700 text-foreground py-5 rounded-[1.5rem] font-black text-xs uppercase tracking-[0.2em] transition-all hover:bg-background dark:hover:bg-neutral-700 flex items-center justify-center gap-4 hover:shadow-minimal"
                    >
                        <Share2 className="w-5 h-5" />
                        {t('shareResult')}
                    </button>
                </section>
            )}

            <MessageGeneratorModal
                isOpen={isGeneratorOpen}
                onClose={() => setIsGeneratorOpen(false)}
                calculationData={{
                    input: {
                        baseRent,
                        linkageType,
                        baseDate,
                        targetDate,
                        partialLinkage: parseFloat(partialLinkage) || 100
                    },
                    result
                }}
            />
        </div >
    );
}
