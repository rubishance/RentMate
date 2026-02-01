import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    FileText, Calendar, DollarSign, Wallet, User, Building2,
    Loader2, Save, ExternalLink, TrendingUp, Shield, Clock, Pen, X,
    Wind, ShieldCheck, Car, Box, ArrowUpDown, Accessibility,
    Mail, Phone, CreditCard, GitBranch, Coins, ArrowLeft
} from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Contract } from '../../types/database';
import { useTranslation } from '../../hooks/useTranslation';
import { DatePicker } from '../ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { cn } from '../../lib/utils';
import { useDataCache } from '../../contexts/DataCacheContext';
import { propertyService } from '../../services/property.service';
import { getPropertyPlaceholder } from '../../lib/property-placeholders';

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
        rent_periods: [] as any[],
        tenants: [] as any[],
        pets_allowed: true,
        special_clauses: '',
        guarantees: '',
        guarantors_info: '',
        needs_painting: false,
        option_notice_days: ''
    });

    useEffect(() => {
        const fetchContract = async () => {
            if (!contractId) return;
            setLoading(true);
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    *,
                    properties (address, city)
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
                    rent_periods: data.rent_periods || [],
                    tenants: data.tenants || [],
                    pets_allowed: data.pets_allowed ?? true,
                    special_clauses: data.special_clauses || '',
                    guarantees: data.guarantees || '',
                    guarantors_info: data.guarantors_info || '',
                    needs_painting: data.needs_painting ?? false,
                    option_notice_days: data.option_notice_days?.toString() || ''
                });
            }
            setLoading(false);
        };

        fetchContract();
    }, [contractId]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!contractId) {
            console.error('[ContractHub] Critical: Attempted to save contract without a contractId. This would cause a Supabase error.');
            alert(t('error_missing_id') || 'System Error: Missing Contract ID');
            return;
        }

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
                tenants: formData.tenants,
                pets_allowed: formData.pets_allowed,
                special_clauses: formData.special_clauses,
                guarantees: formData.guarantees,
                guarantors_info: formData.guarantors_info,
                needs_painting: formData.needs_painting,
                option_notice_days: formData.option_notice_days ? Number(formData.option_notice_days) : null,
                updated_at: new Date().toISOString()
            };

            console.log('[DEBUG] Attempting to update contract:', contractId, updates);

            if (!contractId) {
                throw new Error('Missing contract ID for update');
            }

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

            // Re-fetch to update the UI with property info
            const { data, error: fetchError } = await supabase
                .from('contracts')
                .select('*, properties(address, city)')
                .eq('id', contractId)
                .single();

            if (fetchError) console.error('Error re-fetching contract:', fetchError);
            if (data) setContract(data);

        } catch (error: any) {
            console.error('Error updating contract:', error);
            alert(`Failed to update contract: ${error.message || 'Unknown error'}`);
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
                        <button
                            onClick={() => navigate(-1)}
                            className="p-2 -ml-2 rounded-xl text-muted-foreground hover:bg-slate-100 dark:hover:bg-neutral-800 transition-colors"
                        >
                            <ArrowLeft className="w-6 h-6" />
                        </button>
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
                {/* 1. Property Details Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <Building2 className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">{t('propertyDetails')}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Contract Header Info */}
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm space-y-4">
                            <div className="flex justify-between items-start">
                                <div>
                                    <h2 className="text-xl font-bold">{contract?.properties?.address || 'Address'}</h2>
                                    <p className="text-sm text-neutral-500">{contract?.properties?.city || 'City'}</p>
                                </div>
                                <div className={`px-3 py-1 rounded-full text-xs font-bold ${formData.status === 'active' ? 'bg-green-100 text-green-700' :
                                    formData.status === 'draft' ? 'bg-yellow-100 text-yellow-700' :
                                        'bg-neutral-100 text-neutral-700'
                                    }`}>
                                    {t(formData.status)}
                                </div>
                            </div>

                            {contract?.properties?.image_url && (
                                <div className="w-full h-40 rounded-xl overflow-hidden mt-4">
                                    <img
                                        src={contract.properties.image_url || getPropertyPlaceholder(contract.properties.property_type)}
                                        alt="Property"
                                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-500"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            const placeholder = getPropertyPlaceholder(contract.properties.property_type);
                                            if (target.src !== placeholder) {
                                                target.src = placeholder;
                                            }
                                        }}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Amenities & Specs */}
                        {(!readOnly || contract?.properties?.has_balcony || contract?.properties?.has_safe_room || contract?.properties?.has_parking || contract?.properties?.has_storage) && (
                            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase mb-4">{t('amenities')}</h4>
                                <div className="grid grid-cols-2 gap-4">
                                    {[
                                        { label: t('balcony'), icon: Wind, active: contract?.properties?.has_balcony },
                                        { label: t('safeRoom'), icon: ShieldCheck, active: contract?.properties?.has_safe_room },
                                        { label: t('parking'), icon: Car, active: contract?.properties?.has_parking },
                                        { label: t('storage'), icon: Box, active: contract?.properties?.has_storage },
                                    ].filter(item => !readOnly || item.active).map((item, i) => (
                                        <div key={i} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${item.active
                                            ? 'border-primary/20 bg-primary/5 text-primary'
                                            : 'border-slate-100 dark:border-neutral-700 text-muted-foreground opacity-50'
                                            }`}>
                                            <item.icon className="w-4 h-4" />
                                            <span className="text-sm font-medium">{item.label}</span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 2. Tenant Details Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <User className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">{t('tenantDetails')}</h3>
                    </div>

                    <div className="space-y-4">
                        {formData.tenants.length > 0 ? (
                            formData.tenants.map((tenant: any, idx: number) => (
                                <div key={idx} className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm relative group">
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                        {(!readOnly || tenant.name || tenant.full_name) && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-muted-foreground">{t('fullName')}</label>
                                                <input
                                                    type="text"
                                                    readOnly={readOnly}
                                                    value={tenant.name || tenant.full_name || ''}
                                                    onChange={(e) => {
                                                        const newTenants = [...formData.tenants];
                                                        newTenants[idx] = { ...newTenants[idx], name: e.target.value };
                                                        setFormData({ ...formData, tenants: newTenants });
                                                    }}
                                                    className="w-full h-10 px-3 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 font-medium"
                                                    placeholder={t('name')}
                                                />
                                            </div>
                                        )}
                                        {(!readOnly || tenant.email) && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-muted-foreground">{t('email')}</label>
                                                <div className="flex items-center gap-2 h-10 px-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-100 dark:border-neutral-700 text-sm">
                                                    <Mail className="w-4 h-4 text-muted-foreground" />
                                                    <span>{tenant.email || '-'}</span>
                                                </div>
                                            </div>
                                        )}
                                        {(!readOnly || tenant.phone) && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-muted-foreground">{t('phone')}</label>
                                                <div className="flex items-center gap-2 h-10 px-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-100 dark:border-neutral-700 text-sm">
                                                    <Phone className="w-4 h-4 text-muted-foreground" />
                                                    <span dir="ltr">{tenant.phone || '-'}</span>
                                                </div>
                                            </div>
                                        )}
                                        {(!readOnly || tenant.id_number) && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-bold text-muted-foreground">{t('idNumber')}</label>
                                                <div className="flex items-center gap-2 h-10 px-3 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-100 dark:border-neutral-700 text-sm font-mono">
                                                    <CreditCard className="w-4 h-4 text-muted-foreground" />
                                                    <span>{tenant.id_number || '-'}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm text-center">
                                <p className="text-muted-foreground">{t('noTenantsListed')}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* 3. Contract Dates Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <Calendar className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">{t('contractPeriod')}</h3>
                    </div>

                    <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground">{t('startDate')}</label>
                                <DatePicker
                                    value={formData.start_date ? parseISO(formData.start_date) : undefined}
                                    onChange={(date) => setFormData({ ...formData, start_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                    readonly={readOnly}
                                    placeholder={t('startDate')}
                                />
                            </div>
                            <div className="space-y-1.5">
                                <label className="text-xs font-bold text-muted-foreground">{t('endDate')}</label>
                                <DatePicker
                                    value={formData.end_date ? parseISO(formData.end_date) : undefined}
                                    onChange={(date) => setFormData({ ...formData, end_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                    readonly={readOnly}
                                    placeholder={t('endDate')}
                                />
                            </div>
                            {(!readOnly || formData.signing_date) && (
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('signingDate')}</label>
                                    <DatePicker
                                        value={formData.signing_date ? parseISO(formData.signing_date) : undefined}
                                        onChange={(date) => setFormData({ ...formData, signing_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                        readonly={readOnly}
                                        placeholder={t('signingDate')}
                                    />
                                </div>
                            )}
                        </div>

                        {/* Duration Display */}
                        {formData.start_date && formData.end_date && (
                            <div className="mt-4 p-3 bg-secondary/20 rounded-xl flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                <Clock className="w-4 h-4" />
                                <span>{t('duration')}: </span>
                                <span className="font-bold text-foreground">
                                    {(() => {
                                        const start = new Date(formData.start_date);
                                        const end = new Date(formData.end_date);
                                        const diffTime = Math.abs(end.getTime() - start.getTime());
                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                        const months = Math.floor(diffDays / 30);
                                        return diffDays > 360 ? `~${(diffDays / 365).toFixed(1)} ${t('years')}` : `${months} ${t('months')}`;
                                    })()}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                {/* 4. Options & Extensions Section */}
                {(formData.option_periods.length > 0 || !readOnly) && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <GitBranch className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-lg">{t('optionPeriods')}</h3>
                        </div>

                        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm space-y-4">
                            {/* Notice Days Header */}
                            {(!readOnly || formData.option_notice_days) ? (
                                <div className="flex justify-between items-center pb-4 border-b border-border/50">
                                    <span className="text-sm font-medium text-muted-foreground">{t('extensionNoticeDays')}</span>
                                    {!readOnly ? (
                                        <div className="flex items-center gap-2">
                                            <input
                                                type="number"
                                                value={formData.option_notice_days}
                                                onChange={e => setFormData({ ...formData, option_notice_days: e.target.value })}
                                                className="w-20 h-8 px-2 text-center border border-slate-100 dark:border-neutral-700 rounded-lg bg-slate-50 dark:bg-neutral-900 font-bold"
                                            />
                                            <span className="text-xs font-bold text-muted-foreground">{t('days')}</span>
                                        </div>
                                    ) : (
                                        <span className="font-bold text-lg">{formData.option_notice_days || 0} {t('days')}</span>
                                    )}
                                </div>
                            ) : null}

                            {formData.option_periods.length > 0 ? (
                                <div className="space-y-3">
                                    {formData.option_periods.map((option: any, idx: number) => (
                                        <div key={idx} className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-100 dark:border-neutral-800">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold text-sm">
                                                    {idx + 1}
                                                </div>
                                                <div>
                                                    <p className="font-bold text-sm">{t('optionPeriod')} {idx + 1}</p>
                                                    <p className="text-xs text-muted-foreground">{option.length} {t('months')}</p>
                                                </div>
                                            </div>

                                            <div className="flex gap-6">
                                                {option.rentAmount && (
                                                    <div className="text-right">
                                                        <span className="text-xs text-muted-foreground block">{t('monthlyRent')}</span>
                                                        <span className="font-bold">
                                                            {option.currency === 'USD' ? '$' : '₪'}{Number(option.rentAmount).toLocaleString()}
                                                        </span>
                                                    </div>
                                                )}
                                                {option.endDate && (
                                                    <div className="text-right">
                                                        <span className="text-xs text-muted-foreground block">{t('endDate')}</span>
                                                        <span className="font-medium">
                                                            {format(parseISO(option.endDate), 'dd/MM/yyyy')}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center p-4 text-muted-foreground text-sm italic">
                                    {t('noOptionsDefined')}
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* 5. Payments & Linkage Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <Coins className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">{t('paymentDetails')}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Base Payment Info */}
                        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm space-y-4">
                            <h4 className="text-xs font-bold text-muted-foreground uppercase">{t('rent')}</h4>
                            <div className="flex gap-4">
                                <div className="flex-1 space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('amount')}</label>
                                    <div className="relative">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                                            {formData.currency === 'USD' ? '$' : '₪'}
                                        </span>
                                        <input
                                            type="number"
                                            readOnly={readOnly}
                                            value={formData.base_rent}
                                            onChange={e => setFormData({ ...formData, base_rent: Number(e.target.value) })}
                                            className="w-full h-10 pl-8 pr-3 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 font-bold text-lg"
                                        />
                                    </div>
                                </div>
                                <div className="w-1/3 space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('currency')}</label>
                                    <select
                                        disabled={readOnly}
                                        value={formData.currency}
                                        onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                        className="w-full h-10 px-3 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900"
                                    >
                                        <option value="ILS">₪ ILS</option>
                                        <option value="USD">$ USD</option>
                                        <option value="EUR">€ EUR</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4 pt-2">
                                <div className="space-y-1.5">
                                    <label className="text-xs font-bold text-muted-foreground">{t('paymentFrequency')}</label>
                                    <select
                                        disabled={readOnly}
                                        value={formData.payment_frequency}
                                        onChange={e => setFormData({ ...formData, payment_frequency: e.target.value })}
                                        className="w-full h-10 px-3 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 text-sm"
                                    >
                                        <option value="monthly">{t('monthly')}</option>
                                        <option value="quarterly">{t('quarterly')}</option>
                                        <option value="annually">{t('annually')}</option>
                                    </select>
                                </div>
                                <div className="space-y-1.5">
                                    {/* Payment Method - assuming it exists or adding later */}
                                    <label className="text-xs font-bold text-muted-foreground">{t('paymentDay')}</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="31"
                                        disabled={readOnly}
                                        value={formData.payment_day}
                                        onChange={e => setFormData({ ...formData, payment_day: Number(e.target.value) })}
                                        className="w-full h-10 px-3 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 text-sm"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Linkage Info */}
                        {(!readOnly || formData.linkage_type !== 'none') && (
                            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm space-y-4">
                                <h4 className="text-xs font-bold text-muted-foreground uppercase flex items-center gap-2">
                                    <TrendingUp className="w-3 h-3 text-purple-500" />
                                    {t('linkage')}
                                </h4>

                                <div className="space-y-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground">{t('linkageType')}</label>
                                        <select
                                            disabled={readOnly}
                                            value={formData.linkage_type}
                                            onChange={e => setFormData({ ...formData, linkage_type: e.target.value })}
                                            className="w-full h-10 px-3 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 text-sm"
                                        >
                                            <option value="none">{t('notLinked')}</option>
                                            <option value="cpi">{t('linkedToCpi')}</option>
                                            <option value="usd">{t('linkedToUsd')}</option>
                                        </select>
                                    </div>

                                    {formData.linkage_type !== 'none' && (
                                        <div className="grid grid-cols-2 gap-4 p-3 bg-secondary/10 rounded-xl">
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">{t('baseIndex')}</label>
                                                <input
                                                    type="number"
                                                    readOnly={readOnly}
                                                    value={formData.base_index_value || ''}
                                                    onChange={e => setFormData({ ...formData, base_index_value: Number(e.target.value) })}
                                                    className="w-full h-8 px-2 text-sm bg-transparent border-b border-border/50 focus:border-primary outline-none"
                                                    placeholder="0.00"
                                                />
                                            </div>
                                            <div>
                                                <label className="text-[10px] font-bold text-muted-foreground uppercase block mb-1">{t('baseDate')}</label>
                                                <DatePicker
                                                    value={formData.base_index_date ? parseISO(formData.base_index_date) : undefined}
                                                    onChange={(date) => setFormData({ ...formData, base_index_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                    readonly={readOnly}
                                                    className="w-full"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                </div>

                {/* 5.5 Rent Steps Section (Conditional) */}
                {(formData.rent_periods.length > 0) && (
                    <div className="space-y-4">
                        <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                            <TrendingUp className="w-5 h-5 text-primary" />
                            <h3 className="font-bold text-lg">{t('rentSteps')}</h3>
                        </div>

                        <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm">
                            <div className="space-y-3">
                                {formData.rent_periods.map((step: any, idx: number) => (
                                    <div key={idx} className="flex justify-between items-center p-4 bg-slate-50 dark:bg-neutral-900 rounded-xl border border-slate-100 dark:border-neutral-800">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                                                {idx + 1}
                                            </div>
                                            <div>
                                                <p className="font-bold text-sm">{t('step')} {idx + 1}</p>
                                                <p className="text-xs text-muted-foreground">
                                                    {t('effectiveDate')}: {step.startDate ? format(parseISO(step.startDate), 'dd/MM/yyyy') : '-'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-xs text-muted-foreground block">{t('newRentAmount')}</span>
                                            <span className="font-bold text-lg text-primary">
                                                {step.currency === 'USD' ? '$' : '₪'}{Number(step.amount).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}

                {/* 6. Security & Extras Section */}
                <div className="space-y-4">
                    <div className="flex items-center gap-2 pb-2 border-b border-border/50">
                        <Shield className="w-5 h-5 text-primary" />
                        <h3 className="font-bold text-lg">{t('securityAndExtras')}</h3>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {/* Deposit & Guarantees */}
                        {(!readOnly || formData.security_deposit_amount || formData.guarantees) && (
                            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm space-y-4">
                                {(!readOnly || formData.security_deposit_amount) && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">{t('securityDeposit')}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-bold">
                                                {formData.currency === 'USD' ? '$' : '₪'}
                                            </span>
                                            <input
                                                type="number"
                                                readOnly={readOnly}
                                                value={formData.security_deposit_amount}
                                                onChange={e => setFormData({ ...formData, security_deposit_amount: Number(e.target.value) })}
                                                className="w-full h-10 pl-8 pr-3 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 font-bold"
                                            />
                                        </div>
                                    </div>
                                )}

                                {(!readOnly || formData.guarantees) && (
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">{t('guarantees')}</label>
                                        <textarea
                                            readOnly={readOnly}
                                            value={formData.guarantees}
                                            onChange={e => setFormData({ ...formData, guarantees: e.target.value })}
                                            className="w-full h-24 px-3 py-2 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 text-sm resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder={t('guaranteesPlaceholder')}
                                        />
                                    </div>
                                )}
                            </div>
                        )}

                        {/* Additional Clauses */}
                        {(!readOnly || formData.pets_allowed || formData.needs_painting || formData.special_clauses) && (
                            <div className="bg-white dark:bg-neutral-800 rounded-2xl p-6 border border-slate-100 dark:border-neutral-700 shadow-sm space-y-4">
                                {(!readOnly || formData.pets_allowed) && (
                                    <div className="flex items-start justify-between border-b border-slate-100 dark:border-neutral-700 pb-4">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-bold">{t('petsAllowed')}</label>
                                            <p className="text-xs text-muted-foreground">{t('petsAllowedDesc')}</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            disabled={readOnly}
                                            checked={formData.pets_allowed}
                                            onChange={e => setFormData({ ...formData, pets_allowed: e.target.checked })}
                                            className="w-5 h-5 rounded-md border-slate-300 text-primary focus:ring-primary"
                                        />
                                    </div>
                                )}

                                {(!readOnly || formData.needs_painting) && (
                                    <div className="flex items-start justify-between border-b border-slate-100 dark:border-neutral-700 pb-4">
                                        <div className="space-y-0.5">
                                            <label className="text-sm font-bold">{t('needsPainting')}</label>
                                            <p className="text-xs text-muted-foreground">{t('needsPaintingDesc')}</p>
                                        </div>
                                        <input
                                            type="checkbox"
                                            disabled={readOnly}
                                            checked={formData.needs_painting}
                                            onChange={e => setFormData({ ...formData, needs_painting: e.target.checked })}
                                            className="w-5 h-5 rounded-md border-slate-300 text-primary focus:ring-primary"
                                        />
                                    </div>
                                )}

                                {(!readOnly || formData.special_clauses) && (
                                    <div className="space-y-1.5 pt-2">
                                        <label className="text-xs font-bold text-muted-foreground uppercase">{t('specialClauses')}</label>
                                        <textarea
                                            readOnly={readOnly}
                                            value={formData.special_clauses}
                                            onChange={e => setFormData({ ...formData, special_clauses: e.target.value })}
                                            className="w-full h-24 px-3 py-2 border border-slate-100 dark:border-neutral-700 rounded-xl bg-slate-50 dark:bg-neutral-900 text-sm resize-none focus:ring-2 focus:ring-primary/20 outline-none"
                                            placeholder={t('specialClausesPlaceholder')}
                                        />
                                    </div>
                                )}
                            </div>
                        )}
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
