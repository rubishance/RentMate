import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Calendar, DollarSign, Wallet, User, Building2,
    Loader2, Save, ExternalLink, TrendingUp, Shield, Clock, Pen, X
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Contract } from '../../types/database';
import { useTranslation } from '../../hooks/useTranslation';
import { DatePicker } from '../ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';
import { useDataCache } from '../../contexts/DataCacheContext';
import { propertyService } from '../../services/property.service';

interface ContractHubProps {
    contractId: string;
    initialReadOnly?: boolean;
}

export function ContractHub({ contractId, initialReadOnly = true }: ContractHubProps) {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const { clear } = useDataCache();
    const [contract, setContract] = useState<any>(null);
    const [readOnly, setReadOnly] = useState(initialReadOnly);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const [formData, setFormData] = useState({
        signing_date: '',
        start_date: '',
        end_date: '',
        base_rent: 0,
        currency: 'ILS',
        payment_frequency: 'monthly',
        payment_day: 1,
        linkage_type: 'none',
        linkage_sub_type: 'known',
        base_index_date: '',
        base_index_value: 0,
        linkage_ceiling: '',
        linkage_floor: '',
        security_deposit_amount: 0,
        status: 'active',
        option_periods: [] as any[],
        rent_periods: [] as any[]
    });

    useEffect(() => {
        const fetchContract = async () => {
            setLoading(true);
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    *,
                    properties (address, city),
                    tenants (name, full_name)
                `)
                .eq('id', contractId)
                .single();

            if (error) {
                console.error('Error fetching contract:', error);
            } else {
                setContract(data);
                setFormData({
                    signing_date: data.signing_date || '',
                    start_date: data.start_date || '',
                    end_date: data.end_date || '',
                    base_rent: data.base_rent || 0,
                    currency: data.currency || 'ILS',
                    payment_frequency: data.payment_frequency || 'monthly',
                    payment_day: data.payment_day || 1,
                    linkage_type: data.linkage_type || 'none',
                    linkage_sub_type: data.linkage_sub_type || 'known',
                    base_index_date: data.base_index_date || '',
                    base_index_value: data.base_index_value || 0,
                    linkage_ceiling: data.linkage_ceiling?.toString() || '',
                    linkage_floor: data.linkage_floor?.toString() || '',
                    security_deposit_amount: data.security_deposit_amount || 0,
                    status: data.status || 'active',
                    option_periods: data.option_periods || [],
                    rent_periods: data.rent_periods || []
                });
            }
            setLoading(false);
        };

        fetchContract();
    }, [contractId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            const updates: any = {
                signing_date: formData.signing_date || null,
                start_date: formData.start_date,
                end_date: formData.end_date,
                base_rent: Number(formData.base_rent),
                currency: formData.currency,
                payment_frequency: formData.payment_frequency,
                payment_day: Number(formData.payment_day),
                linkage_type: formData.linkage_type,
                linkage_sub_type: formData.linkage_sub_type || null,
                base_index_date: formData.base_index_date || null,
                base_index_value: formData.linkage_type !== 'none' ? Number(formData.base_index_value) : null,
                linkage_ceiling: formData.linkage_ceiling ? Number(formData.linkage_ceiling) : null,
                linkage_floor: formData.linkage_floor ? Number(formData.linkage_floor) : null,
                security_deposit_amount: Number(formData.security_deposit_amount),
                status: formData.status,
                option_periods: formData.option_periods,
                rent_periods: formData.rent_periods,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabase
                .from('contracts')
                .update(updates)
                .eq('id', contractId);

            if (error) throw error;

            // Sync property occupancy status if status changed
            if (formData.status !== contract.status) {
                await propertyService.syncOccupancyStatus(contract.property_id);
            }

            setReadOnly(true);
            clear(); // Sync cache

            // Re-fetch to update the UI with property/tenant info
            const { data } = await supabase
                .from('contracts')
                .select('*, properties(address, city), tenants(name, full_name)')
                .eq('id', contractId)
                .single();
            if (data) setContract(data);

        } catch (error) {
            console.error('Error updating contract:', error);
            alert('Failed to update contract');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-12 min-h-[400px]">
                <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
                <p className="text-muted-foreground font-medium animate-pulse">{t('loading')}</p>
            </div>
        );
    }

    if (!contract) {
        return (
            <div className="p-12 text-center">
                <p className="text-red-500 font-bold">Contract not found</p>
            </div>
        );
    }

    const tenantNames = contract.tenants ? (Array.isArray(contract.tenants) ? contract.tenants.map((t: any) => t.name || t.full_name).join(', ') : (contract.tenants.name || contract.tenants.full_name)) : 'N/A';

    return (
        <div className="flex flex-col bg-slate-50 dark:bg-black min-h-full" dir={lang === 'he' ? 'rtl' : 'ltr'}>
            {/* Header Content */}
            <div className="px-6 py-6 border-b border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-sm">
                <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-4">
                        <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                            <FileText className="w-6 h-6" />
                        </div>
                        <div>
                            <h1 className="text-2xl font-black tracking-tight text-foreground">
                                {readOnly ? t('contractDetails') : t('editContract')}
                            </h1>
                            <p className="text-muted-foreground font-medium flex items-center gap-2">
                                <Building2 className="w-4 h-4" />
                                {contract.properties?.address}, {contract.properties?.city}
                            </p>
                        </div>
                    </div>
                    {readOnly && (
                        <button
                            onClick={() => setReadOnly(false)}
                            className="p-3 bg-white dark:bg-neutral-800 rounded-2xl border border-slate-100 dark:border-neutral-700 text-primary shadow-sm hover:scale-105 active:scale-95 transition-all"
                        >
                            <Pen className="w-5 h-5" />
                        </button>
                    )}
                </div>

                <div className="flex flex-wrap gap-2 mt-4">
                    <div className={cn(
                        "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2",
                        contract.status === 'active' ? "bg-emerald-500/10 text-emerald-600" : "bg-slate-500/10 text-slate-500"
                    )}>
                        <div className={cn("w-1.5 h-1.5 rounded-full", contract.status === 'active' ? "bg-emerald-500" : "bg-slate-500")} />
                        {t(contract.status)}
                    </div>
                    {contract.contract_file_url && (
                        <a
                            href={contract.contract_file_url}
                            target="_blank"
                            rel="noreferrer"
                            className="px-3 py-1 bg-primary/10 text-primary rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary/20 transition-all"
                        >
                            <ExternalLink className="w-3.5 h-3.5" />
                            {lang === 'he' ? 'צפייה בחוזה' : 'View PDF'}
                        </a>
                    )}
                </div>
            </div>

            {/* Form Content */}
            <form onSubmit={handleSave} className="flex-1 p-6 space-y-8 pb-32">
                {/* Tenant & Property Overview */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-slate-100 dark:border-neutral-700 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-neutral-900 flex items-center justify-center text-slate-400">
                            <User className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('tenant')}</p>
                            <p className="font-bold text-foreground">{tenantNames}</p>
                        </div>
                    </div>
                    <div className="p-4 bg-white dark:bg-neutral-800 rounded-2xl border border-slate-100 dark:border-neutral-700 shadow-sm flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-50 dark:bg-neutral-900 flex items-center justify-center text-slate-400">
                            <Building2 className="w-5 h-5" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">{t('asset')}</p>
                            <p className="font-bold text-foreground">{contract.properties?.address}</p>
                        </div>
                    </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {/* Period & Status */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-primary flex items-center gap-2">
                            <Calendar className="w-4 h-4" /> {t('contractPeriodStatus')}
                        </label>
                        <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-slate-100 dark:border-neutral-700 p-6 space-y-6 shadow-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('startDate')}</label>
                                    <DatePicker
                                        readonly={readOnly}
                                        value={formData.start_date ? parseISO(formData.start_date) : undefined}
                                        onChange={(date) => setFormData({ ...formData, start_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('endDate')}</label>
                                    <DatePicker
                                        readonly={readOnly}
                                        value={formData.end_date ? parseISO(formData.end_date) : undefined}
                                        onChange={(date) => setFormData({ ...formData, end_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('signingDate')}</label>
                                    <DatePicker
                                        readonly={readOnly}
                                        value={formData.signing_date ? parseISO(formData.signing_date) : undefined}
                                        onChange={(date) => setFormData({ ...formData, signing_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                        className="w-full"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('status')}</label>
                                    <select
                                        disabled={readOnly}
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value })}
                                        className="w-full h-10 px-3 py-2 text-sm border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 disabled:opacity-50"
                                    >
                                        <option value="active">{t('active')}</option>
                                        <option value="archived">{t('archived')}</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Financials */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-emerald-600 flex items-center gap-2">
                            <DollarSign className="w-4 h-4" /> {t('paymentDetails')}
                        </label>
                        <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-slate-100 dark:border-neutral-700 p-6 space-y-6 shadow-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('baseRent')}</label>
                                    <div className="relative">
                                        <input
                                            type="number"
                                            disabled={readOnly}
                                            value={formData.base_rent}
                                            onChange={e => setFormData({ ...formData, base_rent: Number(e.target.value) })}
                                            className="w-full h-10 pl-3 pr-10 py-2 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 disabled:opacity-50 font-bold"
                                        />
                                        <div className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground text-xs font-black">
                                            {formData.currency}
                                        </div>
                                    </div>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('paymentFreq')}</label>
                                    <select
                                        disabled={readOnly}
                                        value={formData.payment_frequency}
                                        onChange={e => setFormData({ ...formData, payment_frequency: e.target.value })}
                                        className="w-full h-10 px-3 py-2 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 disabled:opacity-50"
                                    >
                                        <option value="monthly">{t('monthly')}</option>
                                        <option value="quarterly">{t('quarterly')}</option>
                                        <option value="annually">{t('annually')}</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('paymentDay')}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        disabled={readOnly}
                                        value={formData.payment_day}
                                        onChange={e => setFormData({ ...formData, payment_day: Number(e.target.value) })}
                                        className="w-full h-10 px-3 py-2 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 disabled:opacity-50"
                                    />
                                </div>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground uppercase">{t('depositAmount')}</label>
                                    <input
                                        type="number"
                                        disabled={readOnly}
                                        value={formData.security_deposit_amount}
                                        onChange={e => setFormData({ ...formData, security_deposit_amount: Number(e.target.value) })}
                                        className="w-full h-10 px-3 py-2 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 disabled:opacity-50"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Linkage */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-purple-600 flex items-center gap-2">
                            <TrendingUp className="w-4 h-4" /> {t('linkageAdjustments')}
                        </label>
                        <div className="bg-white dark:bg-neutral-800 rounded-3xl border border-slate-100 dark:border-neutral-700 p-6 space-y-6 shadow-sm">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('linkageType')}</label>
                                    <select
                                        disabled={readOnly}
                                        value={formData.linkage_type}
                                        onChange={e => setFormData({ ...formData, linkage_type: e.target.value })}
                                        className="w-full h-10 px-3 py-2 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 disabled:opacity-50"
                                    >
                                        <option value="none">{t('notLinked')}</option>
                                        <option value="cpi">{t('linkedToCpi')}</option>
                                        <option value="housing">{t('linkedToHousing')}</option>
                                        <option value="construction">{t('linkedToConstruction')}</option>
                                        <option value="usd">{t('linkedToUsd')}</option>
                                        <option value="eur">{t('linkedToEur')}</option>
                                    </select>
                                </div>
                                {formData.linkage_type !== 'none' && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground">Sub-Type</label>
                                        <select
                                            disabled={readOnly}
                                            value={formData.linkage_sub_type}
                                            onChange={e => setFormData({ ...formData, linkage_sub_type: e.target.value })}
                                            className="w-full h-10 px-3 py-2 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 disabled:opacity-50"
                                        >
                                            <option value="known">{t('knownIndex')}</option>
                                            <option value="respect_of">{t('inRespectOf')}</option>
                                        </select>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>

                {!readOnly && (
                    <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/80 dark:bg-black/80 backdrop-blur-xl border-t border-slate-100 dark:border-neutral-800 z-50">
                        <div className="max-w-7xl mx-auto flex gap-4">
                            <button
                                type="button"
                                onClick={() => setReadOnly(true)}
                                className="flex-1 py-4 bg-slate-100 dark:bg-neutral-800 text-foreground font-black uppercase tracking-widest rounded-2xl hover:bg-slate-200 transition-all"
                            >
                                {t('cancel')}
                            </button>
                            <button
                                type="submit"
                                disabled={saving}
                                className="flex-[2] py-4 bg-primary text-white font-black uppercase tracking-widest rounded-2xl shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-95 transition-all disabled:opacity-50 flex items-center justify-center gap-2"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                                {t('save')}
                            </button>
                        </div>
                    </div>
                )}
            </form>
        </div>
    );
}
