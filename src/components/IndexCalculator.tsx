import { useState, useEffect } from 'react';
import { Calculator, Loader2 } from 'lucide-react';
import { calculatorService } from '../services/CalculatorService';
import { DatePicker } from './ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { useTranslation } from '../hooks/useTranslation';


export function IndexCalculator() {
    const { t, lang } = useTranslation();
    const [loading, setLoading] = useState(false);

    // State
    const [indexType, setIndexType] = useState<'cpi' | 'housing' | 'construction' | 'usd' | 'eur'>('cpi');
    const [baseDate, setBaseDate] = useState('');
    const [currentDate, setCurrentDate] = useState('');
    const [baseRent, setBaseRent] = useState('');
    const [annualCeiling, setAnnualCeiling] = useState('');
    const [isFloorChecked, setIsFloorChecked] = useState(false);

    // Fetched Indices
    const [baseIndexValue, setBaseIndexValue] = useState<number | null>(null);
    const [currentIndexValue, setCurrentIndexValue] = useState<number | null>(null);
    const [calculatedRent, setCalculatedRent] = useState<number | null>(null);

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

    // Helper: Claculate Known Index Date
    const getKnownIndexDate = (dateStr: string): string => {
        if (!dateStr) return '';

        // Note: Parsing YYYY-MM-DD manually is safer to avoid timezone shifts
        const [y, m, d] = dateStr.split('-').map(Number);
        const targetDate = new Date(y, m - 1, d);
        const monthsToSubtract = d < 15 ? 2 : 1;
        targetDate.setMonth(targetDate.getMonth() - monthsToSubtract);
        return targetDate.toISOString().slice(0, 7); // YYYY-MM
    };

    const effectiveBaseDate = getKnownIndexDate(baseDate);
    const effectiveCurrentDate = getKnownIndexDate(currentDate);

    // Effect: Fetch indices when EFFECTIVE dates or type change
    useEffect(() => {
        async function fetchIndices() {
            if (!effectiveBaseDate || !effectiveCurrentDate) return;

            setLoading(true);
            try {
                // Use the effective "Known Index" dates
                const [baseVal, currentVal] = await Promise.all([
                    calculatorService.getIndexValue(indexType, effectiveBaseDate),
                    calculatorService.getIndexValue(indexType, effectiveCurrentDate)
                ]);

                setBaseIndexValue(baseVal);
                setCurrentIndexValue(currentVal);
            } catch (err) {
                console.error('Error fetching indices:', err);
            } finally {
                setLoading(false);
            }
        }

        // Debounce slightly or just run
        const timer = setTimeout(fetchIndices, 500);
        return () => clearTimeout(timer);
    }, [indexType, effectiveBaseDate, effectiveCurrentDate]);



    useEffect(() => {
        async function runCalculation() {
            if (!baseIndexValue || !currentIndexValue || !baseRent) {
                setCalculatedRent(null);
                return;
            }
            const rent = parseFloat(baseRent);
            if (isNaN(rent) || rent <= 0) {
                setCalculatedRent(null);
                return;
            }

            try {
                const res = await calculatorService.calculateLinkage(
                    rent,
                    baseIndexValue,
                    currentIndexValue,
                    effectiveBaseDate,     // Use Effective Known Index Date
                    effectiveCurrentDate,  // Use Effective Known Index Date
                    indexType,
                    annualCeiling ? parseFloat(annualCeiling) : null,
                    isFloorChecked ? 0 : null
                );
                setCalculatedRent(res);
            } catch (err) {
                console.error("Calculation error:", err);
                setCalculatedRent(null);
            }
        }
        runCalculation();
    }, [baseIndexValue, currentIndexValue, baseRent, effectiveBaseDate, effectiveCurrentDate, indexType, annualCeiling, isFloorChecked]);

    const result = calculatedRent;
    const percentChange = baseIndexValue && currentIndexValue
        ? ((currentIndexValue - baseIndexValue) / baseIndexValue) * 100
        : null;

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
                    {effectiveBaseDate && (
                        <div className="text-[10px] text-muted-foreground text-right px-1">
                            Effective Index: <span className="font-mono">{effectiveBaseDate}</span>
                        </div>
                    )}
                </div>

                {/* Current Date */}
                <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Index Date</label>
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
                    {effectiveCurrentDate && (
                        <div className="text-[10px] text-muted-foreground text-right px-1">
                            Effective Index: <span className="font-mono">{effectiveCurrentDate}</span>
                        </div>
                    )}
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
            {result !== null && (
                <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <span>Change:</span>
                        <span className={`font-bold ${percentChange! >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {percentChange! > 0 ? '+' : ''}{percentChange!.toFixed(2)}%
                        </span>
                    </div>

                    <div className="flex items-center gap-3 bg-primary/5 px-4 py-2 rounded-xl border border-primary/10">
                        <span className="text-sm font-medium">New Rent:</span>
                        <span className="text-2xl font-bold text-primary font-mono">
                            ₪{result.toLocaleString()}
                        </span>
                    </div>
                </div>
            )}

            {(baseIndexValue === null || currentIndexValue === null) && !loading && baseDate && currentDate && (
                <div className="text-xs text-red-500 bg-red-50 dark:bg-red-900/20 p-2 rounded">
                    Missing index data for selected dates. Please try different dates.
                </div>
            )}
        </div>
    );
}
