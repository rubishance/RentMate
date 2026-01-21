import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { Calculator, ArrowRight, Loader2, AlertCircle } from 'lucide-react';
import type { SavedCalculation } from '../types/database';
import { useTranslation } from '../hooks/useTranslation';

export function SharedCalculation() {
    const { id } = useParams();
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';

    const [calculation, setCalculation] = useState<SavedCalculation | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchCalculation = async () => {
            if (!id) return;
            try {
                const { data, error } = await supabase
                    .from('calculation_shares')
                    .select('*')
                    .eq('id', id)
                    .single();

                if (error) throw error;

                if (data) {
                    if (data.expires_at && new Date(data.expires_at) < new Date()) {
                        setError(t('shared_calc_not_found_desc')); // Generic expiry
                        setLoading(false);
                        return;
                    }

                    await supabase
                        .from('calculation_shares')
                        .update({ view_count: (data.view_count || 0) + 1 })
                        .eq('id', id);

                    const calcData = data.calculation_data as any;
                    setCalculation({
                        id: data.id,
                        user_id: data.user_id,
                        input_data: calcData.input,
                        result_data: calcData.result,
                        created_at: data.created_at
                    } as SavedCalculation);
                } else {
                    setError(t('shared_calc_not_found'));
                }
            } catch (err: any) {
                console.error(err);
                setError(err.message || t('error'));
            } finally {
                setLoading(false);
            }
        };

        fetchCalculation();
    }, [id, t]);

    if (loading) {
        return (
            <div className={`min-h-screen bg-background flex flex-col items-center justify-center p-4 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-2" />
                <p className="text-muted-foreground">{t('shared_calc_loading')}</p>
            </div>
        );
    }

    if (error || !calculation) {
        return (
            <div className={`min-h-screen bg-background flex flex-col items-center justify-center p-4 text-center ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
                <div className="bg-red-50 dark:bg-red-900/20 p-4 rounded-full mb-4">
                    <AlertCircle className="w-8 h-8 text-red-500" />
                </div>
                <h1 className="text-xl font-bold mb-2">{t('shared_calc_not_found')}</h1>
                <p className="text-muted-foreground mb-6 max-w-sm">
                    {t('shared_calc_not_found_desc')}
                </p>
                <Link
                    to="/"
                    className="bg-primary text-primary-foreground px-6 py-2.5 rounded-xl font-medium hover:bg-primary/90 transition-colors"
                >
                    {t('shared_calc_go_home')}
                </Link>
            </div>
        );
    }

    const { input_data, result_data } = calculation;
    const formatCurrency = (amount: number) => `₪${amount.toLocaleString()}`;
    const isReconciliation = 'totalBackPayOwed' in result_data;

    return (
        <div className={`min-h-screen bg-background py-8 px-4 ${isRtl ? 'text-right' : 'text-left'}`} dir={isRtl ? 'rtl' : 'ltr'}>
            <div className="max-w-md mx-auto space-y-6">
                {/* Branding Header */}
                <div className="text-center space-y-2 mb-8">
                    <div className="flex items-end justify-center gap-2 text-primary font-bold text-2xl">
                        <Calculator className="w-8 h-8" />
                        <span>RentMate</span>
                    </div>
                    <div className="inline-block bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold tracking-wider uppercase">
                        {isReconciliation ? t('shared_calc_official_reconciliation') : t('shared_calc_official_index')}
                    </div>
                </div>

                {/* Main Card */}
                <div className="bg-card border border-border rounded-3xl shadow-xl overflow-hidden">
                    <div className="p-6 space-y-6">

                        {!isReconciliation ? (
                            <>
                                {/* Header Section */}
                                <div className="text-center pb-6 border-b border-border">
                                    <h2 className="text-3xl font-bold text-primary mb-1">
                                        {formatCurrency(result_data.newRent)}
                                    </h2>
                                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                                        {t('shared_calc_updated_rent')}
                                    </p>
                                </div>

                                {/* Details Grid */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase">{t('shared_calc_base_rent')}</span>
                                        <p className="font-semibold text-lg">{formatCurrency(Number(input_data.baseRent))}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase">{t('shared_calc_linkage')}</span>
                                        <p className="font-semibold text-lg capitalize">{t(input_data.linkageType as any) || input_data.linkageType}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase">{t('shared_calc_base_date')}</span>
                                        <p className="font-semibold">{input_data.baseDate}</p>
                                    </div>
                                    <div className="space-y-1">
                                        <span className="text-xs text-muted-foreground font-medium uppercase">{t('shared_calc_target_date')}</span>
                                        <p className="font-semibold">{input_data.targetDate}</p>
                                    </div>
                                </div>

                                {/* Changes Summary */}
                                <div className="bg-secondary/30 rounded-2xl p-4 space-y-3">
                                    <div className="flex justify-between items-center">
                                        <span className="text-sm text-muted-foreground">{t('shared_calc_index_change')}</span>
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
                                        <span className="text-sm text-muted-foreground">{t('shared_calc_amount_added')}</span>
                                        <span className="font-bold text-primary">
                                            +{formatCurrency(Math.round(result_data.absoluteChange))}
                                        </span>
                                    </div>
                                </div>
                            </>
                        ) : (
                            <>
                                {/* Header Section */}
                                <div className="text-center pb-6 border-b border-border">
                                    <h2 className="text-4xl font-bold text-red-600 mb-1">
                                        {formatCurrency(result_data.totalBackPayOwed)}
                                    </h2>
                                    <p className="text-sm text-muted-foreground font-medium uppercase tracking-wide">
                                        {t('shared_calc_total_backpay')}
                                    </p>
                                </div>

                                {/* Summary Stats */}
                                <div className="grid grid-cols-2 gap-4 text-center">
                                    <div className="bg-secondary/30 p-3 rounded-xl">
                                        <div className="text-2xl font-bold">{result_data.totalMonths}</div>
                                        <div className="text-xs text-muted-foreground uppercase">{t('shared_calc_months')}</div>
                                    </div>
                                    <div className="bg-secondary/30 p-3 rounded-xl">
                                        <div className="text-2xl font-bold">{formatCurrency(result_data.averageUnderpayment)}</div>
                                        <div className="text-xs text-muted-foreground uppercase">{t('shared_calc_avg_month')}</div>
                                    </div>
                                </div>

                                {/* Monthly Breakdown Label */}
                                <div className="mt-4 mb-2">
                                    <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">{t('shared_calc_monthly_breakdown')}</h3>
                                </div>

                                {/* Scrollable Table */}
                                <div className="border border-border rounded-xl overflow-hidden text-sm">
                                    <div className="max-h-60 overflow-y-auto">
                                        <table className="w-full">
                                            <thead className="bg-secondary/50 sticky top-0">
                                                <tr className="text-xs text-muted-foreground">
                                                    <th className={`p-3 font-medium ${isRtl ? 'text-right' : 'text-left'}`}>{t('shared_calc_month')}</th>
                                                    <th className={`p-3 font-medium ${isRtl ? 'text-left' : 'text-right'}`}>{t('shared_calc_diff')}</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-border">
                                                {result_data.monthlyBreakdown.map((item: any, idx: number) => (
                                                    <tr key={idx} className="bg-card">
                                                        <td className="p-3">{item.month}</td>
                                                        <td className={`p-3 font-medium ${isRtl ? 'text-left' : 'text-right'} ${item.difference > 0 ? 'text-red-600' : 'text-green-600'}`}>
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
                            {t('shared_calc_disclaimer')}
                        </p>
                    </div>
                </div>

                {/* Sign up CTA */}
                <div className="text-center space-y-3">
                    <p className="text-sm text-muted-foreground">{t('shared_calc_cta')}</p>
                    <Link
                        to="/"
                        className="inline-flex items-center gap-2 text-primary font-medium hover:underline text-sm"
                    >
                        {t('shared_calc_cta_link')} <ArrowRight className={`w-4 h-4 ${isRtl ? 'rotate-180' : ''}`} />
                    </Link>
                </div>
            </div>
        </div>
    );
}
