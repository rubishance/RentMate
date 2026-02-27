import { useState, useEffect } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { calculateStandard } from '../services/calculator.service';
import { getIndexValue } from '../services/index-data.service';
import { DatePicker } from './ui/DatePicker';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Switch } from './ui/Switch';
import { SegmentedControl } from './ui/SegmentedControl';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../hooks/useTranslation';
import { useSearchParams } from 'react-router-dom';
import { UrlCompression } from '../lib/url-compression';
import { Share2, Copy, Check } from 'lucide-react';


export function IndexCalculator() {
    const { t, lang } = useTranslation();
    const [searchParams, setSearchParams] = useSearchParams();
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    // State
    const [indexType, setIndexType] = useState<'cpi' | 'housing' | 'construction' | 'usd' | 'eur'>('cpi');
    const [linkageSubType, setLinkageSubType] = useState<'known' | 'respect_of' | 'base'>('known');
    const [baseDate, setBaseDate] = useState('');
    const [currentDate, setCurrentDate] = useState('');
    const [baseRent, setBaseRent] = useState('');
    const [annualCeiling, setAnnualCeiling] = useState('');
    const [isFloorChecked, setIsFloorChecked] = useState(false);

    // Fetched Indices
    const [baseIndexValue, setBaseIndexValue] = useState<number | null>(null);
    const [currentIndexValue, setCurrentIndexValue] = useState<number | null>(null);
    const [calculatedResult, setCalculatedResult] = useState<{
        newRent: number;
        percentageChange: number;
        formula: string;
        linkageCoefficient: number;
    } | null>(null);

    // Initial load - set defaults or load from share
    useEffect(() => {
        const shareData = searchParams.get('share');
        if (shareData) {
            const data = UrlCompression.decompress(shareData);
            if (data?.input) {
                const i = data.input;
                if (i.lt) setIndexType(i.lt as any);
                if (i.lst) setLinkageSubType(i.lst as any);
                if (i.bd) setBaseDate(i.bd);
                if (i.td) setCurrentDate(i.td);
                if (i.br) setBaseRent(i.br.toString());
                if (i.mix) setAnnualCeiling(i.mix.toString());
                if (i.ibm !== undefined) setIsFloorChecked(i.ibm);
                return;
            }
        }

        const today = new Date();
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const yearAgo = new Date(today.getFullYear() - 1, today.getMonth() - 1, 1);

        const toDateStr = (d: Date) => d.toISOString().slice(0, 10);
        setCurrentDate(toDateStr(prevMonth));
        setBaseDate(toDateStr(yearAgo));
    }, []);

    const handleShare = () => {
        const input = {
            lt: indexType,
            lst: linkageSubType,
            bd: baseDate,
            td: currentDate,
            br: baseRent ? parseFloat(baseRent) : 0,
            mix: annualCeiling ? parseFloat(annualCeiling) : undefined,
            ibm: isFloorChecked
        };
        const compressed = UrlCompression.compress({ input });
        const url = `${window.location.origin}${window.location.pathname}?share=${compressed}`;
        const fullMessage = `${t('shareMessage')}\n${url}`;

        navigator.clipboard.writeText(fullMessage);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    // Effect: Fetch indices when dates or types change
    useEffect(() => {
        async function fetchIndices() {
            // Only fetch if dates are valid YYYY-MM-DD
            if (baseDate.length !== 10 || currentDate.length !== 10) return;

            setLoading(true);
            try {
                // Adjust dates for "Known Index" (15th threshold) if needed for display purposes
                // The new calculator service handles this internally for CALCULATION, 
                // but we want to show the user the values they will get.

                let effectiveBaseDate = baseDate;
                let effectiveCurrentDate = currentDate;

                if (linkageSubType === 'known') {
                    // Manually replicate logic to show user strictly what index is being pulled
                    const getEffective = (dStr: string) => {
                        const d = new Date(dStr);
                        if (d.getDate() <= 15) {
                            d.setMonth(d.getMonth() - 1);
                        }
                        return d.toISOString().slice(0, 7);
                    };
                    effectiveBaseDate = getEffective(baseDate);
                    effectiveCurrentDate = getEffective(currentDate);
                } else {
                    effectiveBaseDate = baseDate.slice(0, 7);
                    effectiveCurrentDate = currentDate.slice(0, 7);
                }

                const [baseVal, currentVal] = await Promise.all([
                    getIndexValue(indexType, effectiveBaseDate),
                    getIndexValue(indexType, effectiveCurrentDate)
                ]);

                setBaseIndexValue(baseVal);
                setCurrentIndexValue(currentVal);
            } catch (err) {
                console.error('Error fetching indices:', err);
                setBaseIndexValue(null);
                setCurrentIndexValue(null);
            } finally {
                setLoading(false);
            }
        }

        const timer = setTimeout(fetchIndices, 500);
        return () => clearTimeout(timer);
    }, [indexType, linkageSubType, baseDate, currentDate]);



    useEffect(() => {
        async function runCalculation() {
            if (!baseRent) {
                setCalculatedResult(null);
                return;
            }
            const rent = parseFloat(baseRent);
            if (isNaN(rent) || rent <= 0) {
                setCalculatedResult(null);
                return;
            }

            // Wait for indices to be ready? 
            // Actually calculateStandard fetches internally if needed, 
            // but we want to use the displayed dates so passing manual won't reflect 
            // the Known Index logic if we override.
            // Best approach: Let calculateStandard do the work.

            if (!baseDate || !currentDate) return;

            try {
                const res = await calculateStandard({
                    baseRent: rent,
                    linkageType: indexType as any,
                    linkageSubType: linkageSubType,
                    baseDate: baseDate.slice(0, 7), // Pass YYYY-MM
                    targetDate: currentDate.slice(0, 7), // Pass YYYY-MM
                    linkageCeiling: annualCeiling ? parseFloat(annualCeiling) : undefined,
                    isIndexBaseMinimum: isFloorChecked
                });

                if (res) {
                    setCalculatedResult({
                        newRent: res.newRent,
                        percentageChange: res.percentageChange,
                        formula: res.formula,
                        linkageCoefficient: res.linkageCoefficient
                    });
                    // Re-sync UI indices with what the calculator used (e.g. chaining adjusted)
                    // Actually calculateStandard returns used values.
                } else {
                    setCalculatedResult(null);
                }
            } catch (err) {
                console.error("Calculation error:", err);
                setCalculatedResult(null);
            }
        }
        runCalculation();
    }, [baseRent, baseDate, currentDate, indexType, linkageSubType, annualCeiling, isFloorChecked]);


    return (
        <div className="bg-card border border-border rounded-xl p-5 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <Calculator className="w-5 h-5 text-primary" />
                    <h3 className="font-black text-xs uppercase tracking-widest text-muted-foreground">{t('indexCalculator')}</h3>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {/* Index Type */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">{t('linkageType')}</label>
                    <select
                        value={indexType}
                        onChange={(e) => setIndexType(e.target.value as any)}
                        className="w-full px-4 py-3 bg-gray-50 dark:bg-neutral-800 border-2 border-transparent focus:border-black dark:focus:border-white rounded-[1.25rem] text-sm font-bold outline-none appearance-none transition-all"
                    >
                        <option value="cpi">{t('cpi')}</option>
                        <option value="housing">{t('housingServices')}</option>
                        <option value="construction">{t('constructionInputs')}</option>
                        <option value="usd">{t('usdRate')}</option>
                        <option value="eur">{t('eurRate')}</option>
                    </select>
                </div>

                {/* Linkage Sub Type */}
                {(indexType === 'cpi' || indexType === 'housing' || indexType === 'construction') && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">{t('linkageCalculationMethod')}</label>
                        <SegmentedControl
                            options={[
                                { label: t('knownIndex'), value: 'known' },
                                { label: t('inRespectOf'), value: 'respect_of' }
                            ]}
                            value={linkageSubType}
                            onChange={(val) => setLinkageSubType(val as any)}
                        />
                    </div>
                )}

                {/* Base Date */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">{t('baseDate')}</label>
                    <div className="relative group">
                        <DatePicker
                            variant="compact"
                            value={baseDate ? parseISO(baseDate) : undefined}
                            onChange={(date) => setBaseDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        />
                        {baseIndexValue !== null ? (
                            <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-black bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded-full shadow-sm z-10">
                                {baseIndexValue.toFixed(1)}
                            </span>
                        ) : (
                            !loading && <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-500 z-10">N/A</span>
                        )}
                    </div>
                </div>

                {/* Current Date */}
                <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 ml-1">{t('paymentDate')}</label>
                    <div className="relative group">
                        <DatePicker
                            variant="compact"
                            value={currentDate ? parseISO(currentDate) : undefined}
                            onChange={(date) => setCurrentDate(date ? format(date, 'yyyy-MM-dd') : '')}
                        />
                        {currentIndexValue !== null ? (
                            <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-black bg-black dark:bg-white text-white dark:text-black px-2 py-1 rounded-full shadow-sm z-10">
                                {currentIndexValue.toFixed(1)}
                            </span>
                        ) : (
                            !loading && <span className="absolute right-12 top-1/2 -translate-y-1/2 text-[10px] font-black text-red-500 z-10">N/A</span>
                        )}
                    </div>
                </div>

                <Input
                    label={t('baseRent')}
                    type="number"
                    value={baseRent}
                    onChange={(e) => setBaseRent(e.target.value)}
                    placeholder="5,000"
                    leftIcon={<span className="font-bold text-slate-300">₪</span>}
                />
                <Input
                    label={t('maxIncrease')}
                    type="number"
                    value={annualCeiling}
                    onChange={(e) => setAnnualCeiling(e.target.value)}
                    placeholder="5"
                    rightIcon={<span className="font-bold text-slate-300">%</span>}
                />

                {/* Floor Switch */}
                <div className="flex flex-col justify-end gap-3 pb-2 px-2">
                    <div className="flex items-center justify-between gap-4">
                        <span className="text-[10px] font-black uppercase tracking-widest text-black dark:text-white">{t('floorIndex')}</span>
                        <Switch
                            checked={isFloorChecked}
                            onChange={setIsFloorChecked}
                        />
                    </div>
                </div>
            </div>

            {/* Result Section */}
            {calculatedResult && (
                <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span className="font-black uppercase text-[10px] tracking-widest">{t('change')}:</span>
                            <span className={`font-bold ${calculatedResult.percentageChange >= 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                                {calculatedResult.percentageChange > 0 ? '+' : ''}{calculatedResult.percentageChange.toFixed(2)}%
                            </span>
                        </div>

                        <div className="flex items-center gap-3 bg-primary/5 px-6 py-3 rounded-2xl border border-primary/10">
                            <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">{t('newRent')}:</span>
                            <span className="text-2xl font-black text-foreground">
                                ₪{calculatedResult.newRent.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Detailed Formula Display handled by Service */}
                    <div className="bg-secondary/20 p-3 rounded-lg text-xs font-mono text-muted-foreground overflow-x-auto whitespace-nowrap flex items-center justify-between">
                        <span>{calculatedResult.formula}</span>
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={handleShare}
                            className="h-8 gap-2 ml-4 flex-shrink-0"
                        >
                            {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Share2 className="w-3.5 h-3.5" />}
                            {copied ? t('copied') : t('shareResult')}
                        </Button>
                    </div>
                </div>
            )}

            {(baseIndexValue === null || currentIndexValue === null) && !loading && baseDate && currentDate && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    Missing index data for selected dates.
                </div>
            )}
        </div>
    );
}
