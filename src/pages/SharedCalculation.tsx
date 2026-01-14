import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calculator, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import type { SavedCalculation } from '../types/database';

export function SharedCalculation() {
    const { id } = useParams();
    const [calculation, setCalculation] = useState<SavedCalculation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCalculation = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('saved_calculations')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;
                if (data) {
                    setCalculation(data);
                } else {
                    setError('Calculation not found');
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || 'Error fetching calculation');
            } finally {
                setLoading(false);
            }
        };

        fetchCalculation();
    }, [id]);

    if (loading) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">Loading calculation...</p>
            </div>
        );
    }

    if (error || !calculation) {
        return (
            <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center">
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-bold mb-2">Calculation Not Found</h1>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    The requested calculation could not be found. It may have been deleted or the link is invalid.
                </p>
                <Link
                    to="/"
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                    Go Home
                </Link>
            </div>
        );
    }

    // Reconstruct the result view manually since IndexCalculator component is interactive.
    // We will build a read-only view here using the saved data.
    const { input_data, result_data } = calculation;

    // Format helpers
    const formatCurrency = (amount: number) => `₪${amount.toLocaleString()}`;

    const isReconciliation = 'totalBackPayOwed' in result_data;

    return (
        <div className="min-h-screen bg-background py-8 px-4">
            <div className="max-w-md mx-auto space-y-6">
                {/* Branding Header */}
                <div className="text-center space-y-2 mb-8">
                    <div className="flex items-center justify-center gap-2 text-primary font-bold text-2xl">
                        <Calculator className="w-8 h-8" />
                        <span>RentMate</span>
                    </div>
                    <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
                        {isReconciliation ? 'Official Reconciliation Statement' : 'Official Index Calculation'}
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
                    <div className="p-6 space-y-6">

                        {!isReconciliation ? (
                            // STANDARD CALCULATION VIEW
                            <>
                                {/* Header Section */}
                                <div className="text-center pb-6 border-b border-border">
                                    <h2 className="text-3xl font-bold text-primary mb-1">
                                        {formatCurrency(result_data.newRent)}
                                    </h2>
                                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                                        Updated Rent Amount
                                    </p>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase">Base Rent</span>
                                        <p className="font-semibold text-lg">{formatCurrency(Number(input_data.baseRent))}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase">Linkage</span>
                                        <p className="font-semibold text-lg capitalize">{input_data.linkageType}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase">Base Date</span>
                                        <p className="font-semibold">{input_data.baseDate}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase">Target Date</span>
                                        <p className="font-semibold">{input_data.targetDate}</p>
                                    </div>
                                </div>

                                {/* Changes Summary */}
                                <div className="bg-secondary/30 rounded-2xl p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Index Change</span>
                                        <span className="font-bold flex items-center gap-1">
                                            {(result_data.percentageChange).toFixed(2)}%
                                            {result_data.percentageChange > 0 ? (
                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-b-[6px] border-b-green-500" />
                                            ) : (
                                                <div className="w-0 h-0 border-l-[4px] border-l-transparent border-r-[4px] border-r-transparent border-t-[6px] border-t-red-500" />
                                            )}
                                        </span>
                                    </div>
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">Amount Added</span>
                                        <span className="font-bold text-primary">
                                            +{formatCurrency(Math.round(result_data.absoluteChange))}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            // RECONCILIATION VIEW
                            <>
                                {/* Header Section */}
                                <div className="text-center pb-6 border-b border-border">
                                    <h2 className="text-4xl font-bold text-red-600 mb-1">
                                        {formatCurrency(result_data.totalBackPayOwed)}
                                    </h2>
                                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                                        Total Back-Pay Owed
                                    </p>
                                </div>

                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="bg-secondary/30 p-3 rounded-xl">
                                        <div className="text-2xl font-bold">{result_data.totalMonths}</div>
                                        <div className="text-xs text-muted-foreground uppercase">Months</div>
                                    </div>
                                    <div className="bg-secondary/30 p-3 rounded-xl">
                                        <div className="text-2xl font-bold">{formatCurrency(result_data.averageUnderpayment)}</div>
                                        <div className="text-xs text-muted-foreground uppercase">Avg / Month</div>
                                    </div>
                                </div>

                                {/* Monthly Breakdown Label */}
                                <div className="mt-4 mb-2">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Monthly Breakdown</h3>
                                </div>

                                {/* Scrollable Table */}
                                <div className="border border-border rounded-xl overflow-hidden text-sm">
                                    <div className="max-h-60 overflow-y-auto">
                                        <table className="w-full">
                                            <thead className="bg-secondary/50 sticky top-0">
                                                <tr className="text-xs text-muted-foreground">
                                                    <th className="p-3 text-left font-medium">Month</th>
                                                    <th className="p-3 text-right font-medium">Diff</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {result_data.monthlyBreakdown.map((item: any, idx: number) => (
                                                    <tr key={idx} className="bg-card">
                                                        <td className="p-3">{item.month}</td>
                                                        <td className={`p-3 text-right font-medium ${item.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                                            {formatCurrency(item.difference)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            </>
                        )}

                    </div>

                    {/* Footer / Disclaimer */}
                    <div className="bg-secondary/10 p-4 border-t border-border text-center">
                        <p className="text-[10px] text-muted-foreground leading-relaxed max-w-xs mx-auto">
                            This calculation was generated automatically based on the Consumer Price Index (CPI) or other selected index data published by the relevant authorities.
                        </p>
                    </div>
                </div>

                {/* Sign up CTA */}
                <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">Landlord using RentMate?</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-primary font-medium hover:underline text-sm"
                    >
                        Create your own calculation <ArrowRight className="w-4 h-4" />
                    </Link>
                </div>
            </div>
        </div>
    );
}
