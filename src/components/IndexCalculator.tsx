import { useState, useEffect } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { calculateStandard } from '../services/calculator.service';
import { getIndexValue } from '../services/index-data.service';
import { DatePicker } from './ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../hooks/useTranslation';


export function IndexCalculator() {
    const { t, lang } = useTranslation();
    const [loading, setLoading] = useState(false);

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

    // Initial load - set defaults
    useEffect(() => {
        const today = new Date();
        const prevMonth = new Date(today.getFullYear(), today.getMonth() - 1, 1); // e.g. 1st of last month
        const yearAgo = new Date(today.getFullYear() - 1, today.getMonth() - 1, 1); // e.g. 1st of last month, last year

        // Format YYYY-MM-DD
        const toDateStr = (d: Date) => d.toISOString().slice(0, 10);

        setCurrentDate(toDateStr(prevMonth));
        setBaseDate(toDateStr(yearAgo));
    }, []);

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
                    linkageType: indexType,
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
                    <h3 className="font-bold text-lg">Index Calculator</h3>
                </div>
                {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Index Type */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Linkage Type</label>
                    <select
                        value={indexType}
                        onChange={(e) => setIndexType(e.target.value as any)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary"
                    >
                        <option value="cpi">Consumer Price Index (CPI)</option>
                        <option value="housing">Housing Price Index</option>
                        <option value="construction">Construction Inputs</option>
                        <option value="usd">USD Exchange Rate</option>
                        <option value="eur">EUR Exchange Rate</option>
                    </select>
                </div>

                {/* Linkage Sub Type (Israeli Standard) */}
                {(indexType === 'cpi' || indexType === 'housing' || indexType === 'construction') && (
                    <div className="space-y-1">
                        <label className="text-xs font-medium text-muted-foreground">Index Calculation</label>
                        <select
                            value={linkageSubType}
                            onChange={(e) => setLinkageSubType(e.target.value as any)}
                            className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary"
                        >
                            <option value="known">Known Index (מדד ידוע)</option>
                            <option value="respect_of">In Respect Of (מדד בגין)</option>
                        </select>
                    </div>
                )}

                {/* Base Date */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Base Date</label>
                    <div className="relative">
                        <DatePicker
                            value={baseDate ? parseISO(baseDate) : undefined}
                            onChange={(date) => setBaseDate(date ? format(date, 'yyyy-MM-dd') : '')}
                            className="w-full"
                        />
                        {baseIndexValue !== null ? (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-green-600 font-bold">
                                {baseIndexValue.toFixed(1)}
                            </span>
                        ) : (
                            !loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-400">N/A</span>
                        )}
                    </div>
                </div>

                {/* Current Date */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Payment Date</label>
                    <div className="relative">
                        <DatePicker
                            value={currentDate ? parseISO(currentDate) : undefined}
                            onChange={(date) => setCurrentDate(date ? format(date, 'yyyy-MM-dd') : '')}
                            className="w-full"
                        />
                        {currentIndexValue !== null ? (
                            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-mono text-green-600 font-bold">
                                {currentIndexValue.toFixed(1)}
                            </span>
                        ) : (
                            !loading && <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-red-400">N/A</span>
                        )}
                    </div>
                </div>

                {/* Base Rent */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">{t('monthlyRent')}</label>
                    <input
                        type="number"
                        value={baseRent}
                        onChange={(e) => setBaseRent(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary"
                        placeholder="0"
                    />
                </div>

                {/* Annual Ceiling */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Annual Ceiling (%)</label>
                    <input
                        type="number"
                        value={annualCeiling}
                        onChange={(e) => setAnnualCeiling(e.target.value)}
                        className="w-full px-3 py-2 bg-background border border-border rounded-lg text-sm focus:ring-1 focus:ring-primary"
                        placeholder="e.g. 5"
                    />
                </div>

                {/* Floor Checkbox */}
                <div className="flex items-end pb-2">
                    <label className="flex items-center gap-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isFloorChecked}
                            onChange={(e) => setIsFloorChecked(e.target.checked)}
                            className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                        />
                        <span className="text-xs font-medium text-muted-foreground">{t('floorIndex')}</span>
                    </label>
                </div>
            </div>

            {/* Result Section */}
            {calculatedResult && (
                <div className="mt-4 pt-4 border-t border-border flex flex-col gap-3 animate-in fade-in slide-in-from-top-2">

                    <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <span>Total Increase:</span>
                            <span className={`font-bold ${calculatedResult.percentageChange >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                                {calculatedResult.percentageChange > 0 ? '+' : ''}{calculatedResult.percentageChange.toFixed(2)}%
                            </span>
                        </div>

                        <div className="flex items-center gap-3 bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                            <span className="text-sm font-medium">New Rent:</span>
                            <span className="text-2xl font-bold text-primary font-mono">
                                ₪{calculatedResult.newRent.toLocaleString()}
                            </span>
                        </div>
                    </div>

                    {/* Detailed Formula Display handled by Service */}
                    <div className="bg-secondary/20 p-3 rounded-lg text-xs font-mono text-muted-foreground overflow-x-auto whitespace-nowrap">
                        {calculatedResult.formula}
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
