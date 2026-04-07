import { useEffect, useState } from 'react';
import { X, TrendingUp, Calculator, Calendar, Loader2 } from 'lucide-react';
import { calculatorService } from '../../services/CalculatorService';
import { useTranslation } from '../../hooks/useTranslation';
import { LINKAGE_TYPES } from '../../constants/linkageTypes';

interface IndexedRentModalProps {
    isOpen: boolean;
    onClose: () => void;
    contract: {
        base_rent: number;
        linkage_type: string;
        base_index_date: string | null;
        base_index_value: number | null;
        currency?: string;
    } | null;
}

export function IndexedRentModal({ isOpen, onClose, contract }: IndexedRentModalProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [calculation, setCalculation] = useState<{
        currentIndex: number;
        currentIndexDate: string;
        newRent: number;
        percentageChange: number;
    } | null>(null);

    useEffect(() => {
        if (isOpen && contract) {
            calculate();
        }
    }, [isOpen, contract]);

    const calculate = async () => {
        if (!contract) return;
        setLoading(true);
        try {
            // Default to CPI if linkage_type is missing or 'none' but we still want to show something? 
            // Actually request implies "updated indexed monthly rent (by contract details)"
            // If contract has no linkage, we should probably just show the base rent with a message.

            if (contract.linkage_type === 'none' || !contract.linkage_type) {
                setCalculation(null);
                setLoading(false);
                return;
            }

            // Determine index type
            const indexType = contract.linkage_type; // 'cpi', 'usd', 'eur'

            // Get latest known index
            const previousMonth = calculatorService.getPreviousKnownMonth();
            const currentIndexValue = await calculatorService.getIndexValue(indexType, previousMonth);

            if (currentIndexValue && contract.base_index_value) {
                // Formula: Base Rent * (Current Index / Base Index)
                const ratio = currentIndexValue / contract.base_index_value;
                const newRent = Math.round(contract.base_rent * ratio);
                const change = ((newRent - contract.base_rent) / contract.base_rent) * 100;

                setCalculation({
                    currentIndex: currentIndexValue,
                    currentIndexDate: previousMonth,
                    newRent,
                    percentageChange: change
                });
            }
        } catch (error) {
            console.error('Failed to calculate indexed rent', error);
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-6 mt-auto">
            <div 
                className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" 
                onClick={onClose}
            />
            <div className="relative w-full max-w-md bg-white dark:bg-gray-800 rounded-t-3xl sm:rounded-2xl shadow-xl overflow-hidden mt-auto sm:mt-0 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b border-border dark:border-gray-700 shrink-0">
                    <button onClick={onClose} className="p-2 hover:bg-muted dark:hover:bg-gray-700 rounded-xl transition-colors">
                        <X className="w-5 h-5 text-muted-foreground" />
                    </button>
                    <h3 className="text-lg font-bold flex items-center gap-2 text-foreground">
                        Indexed Rent Calculator
                        <TrendingUp className="w-5 h-5 text-primary" />
                    </h3>
                </div>

                <div className="p-6 space-y-6 overflow-y-auto custom-scrollbar flex-1 pb-10 sm:pb-6">
                    {/* Base Details */}
                    <div className="flex items-center justify-between p-6 bg-secondary dark:bg-foreground/50 rounded-xl border border-border dark:border-gray-700">
                        <div>
                            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Base Rent</p>
                            <p className="text-xl font-mono font-bold">₪{contract?.base_rent.toLocaleString()}</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-muted-foreground uppercase font-medium mb-1">Base Index</p>
                            <p className="font-mono text-gray-700 dark:text-gray-300">
                                {contract?.base_index_value?.toFixed(2) || 'N/A'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {contract?.base_index_date || '-'}
                            </p>
                        </div>
                    </div>

                    {loading ? (
                        <div className="py-8 text-center space-y-3">
                            <Loader2 className="w-8 h-8 text-primary animate-spin mx-auto" />
                            <p className="text-sm text-muted-foreground">Retrieving latest index data...</p>
                        </div>
                    ) : calculation ? (
                        <div className="space-y-6">
                            {/* Result Card */}
                            <div className="bg-gradient-to-br from-primary to-indigo-600 rounded-2xl p-6 text-white text-center shadow-lg shadow-blue-500/20">
                                <p className="text-blue-100 text-sm font-medium mb-2">Updated Monthly Rent</p>
                                <div className="text-4xl font-bold font-mono tracking-tight mb-2">
                                    ₪{calculation.newRent.toLocaleString()}
                                </div>
                                <div className="inline-flex items-center gap-2 px-2 sm:px-6 py-1 bg-white/20 rounded-full text-xs font-medium">
                                    <TrendingUp className="w-3 h-3" />
                                    {calculation.percentageChange > 0 ? '+' : ''}{calculation.percentageChange.toFixed(2)}%
                                    from start
                                </div>
                            </div>

                            {/* Calculation Breakdown */}
                            <div className="space-y-4">
                                <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground flex items-center gap-2">
                                        <Calendar className="w-4 h-4" />
                                        Latest Known Index ({calculation.currentIndexDate})
                                    </span>
                                    <span className="font-mono font-medium">{calculation.currentIndex.toFixed(2)}</span>
                                </div>
                                <div className="text-xs text-muted-foreground text-center pt-2">
                                    מחושב לפי הצמדה ל-{t(LINKAGE_TYPES.find(l => l.id === contract?.linkage_type)?.labelKey as any || contract?.linkage_type as any)}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="text-center py-6 text-muted-foreground">
                            <Calculator className="w-12 h-12 mx-auto text-gray-300 mb-2" />
                            <p>No linkage defined for this contract.</p>
                            <p className="text-xs mt-1">Rent remains fixed at ₪{contract?.base_rent.toLocaleString()}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
