import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { X, FileText, Calendar, DollarSign, Wallet, User, Building2, Loader2, Save, ExternalLink, TrendingUp, Shield, Clock, Pen } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import type { Contract } from '../../types/database';
import { useTranslation } from '../../hooks/useTranslation';
import { DatePicker } from '../ui/DatePicker';
import { format, parseISO } from 'date-fns';

interface ContractWithDetails extends Contract {
    properties: { address: string, city: string };
    tenants: { name: string };
}

interface ContractDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    contract: ContractWithDetails | null;
    initialReadOnly?: boolean;
}

export function ContractDetailsModal({ isOpen, onClose, onSuccess, contract, initialReadOnly = true }: ContractDetailsModalProps) {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();
    const [readOnly, setReadOnly] = useState(initialReadOnly);
    const [loading, setLoading] = useState(false);

    // Comprehensive Form State
    const [formData, setFormData] = useState({
        // Dates
        signing_date: '',
        start_date: '',
        end_date: '',

        // Financials
        base_rent: 0,
        currency: 'ILS',
        payment_frequency: 'monthly',
        payment_day: 1, // Default

        // Linkage
        linkage_type: 'none',
        linkage_sub_type: 'known',
        base_index_date: '',
        base_index_value: 0,
        linkage_ceiling: '', // number or empty
        linkage_floor: '',

        // Security
        security_deposit_amount: 0,

        // Status
        status: 'active',

        // Options
        option_periods: [] as {
            length: number;
            unit: 'months' | 'years';
            rentAmount?: number;
            currency?: 'ILS' | 'USD' | 'EUR';
        }[],

        // Variable Rent
        rent_periods: [] as {
            startDate: string;
            amount: number;
            currency: 'ILS' | 'USD' | 'EUR';
        }[]
    });

    useEffect(() => {
        if (isOpen && contract) {
            setFormData({
                signing_date: contract.signing_date || '',
                start_date: contract.start_date || '',
                end_date: contract.end_date || '',

                base_rent: contract.base_rent || 0,
                currency: contract.currency || 'ILS',
                payment_frequency: contract.payment_frequency || 'monthly',
                payment_day: contract.payment_day || 1,

                linkage_type: contract.linkage_type || 'none',
                linkage_sub_type: contract.linkage_sub_type || 'known',
                base_index_date: contract.base_index_date || '',
                base_index_value: contract.base_index_value || 0,
                linkage_ceiling: contract.linkage_ceiling?.toString() || '',
                linkage_floor: contract.linkage_floor?.toString() || '',

                security_deposit_amount: contract.security_deposit_amount || 0,
                status: contract.status || 'active',

                option_periods: contract.option_periods || [],
                rent_periods: contract.rent_periods || []
            });
            setReadOnly(initialReadOnly);
        }
    }, [isOpen, contract, initialReadOnly]);

    if (!isOpen || !contract) return null;

    // Add navigation

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
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
                rent_periods: formData.rent_periods
            };

            const { error } = await supabase
                .from('contracts')
                .update(updates)
                .eq('id', contract.id);

            if (error) throw error;
            onSuccess();
            onClose();

            // Check if archiving (status changed to archived OR date passed)
            const isArchiving = formData.status === 'archived' && contract.status !== 'archived';
            const isEnded = new Date(formData.end_date) < new Date(new Date().setHours(0, 0, 0, 0));

            if ((isArchiving || isEnded) && formData.linkage_type !== 'none') {
                // Slight delay to allow modal to close
                setTimeout(() => {
                    if (window.confirm(lang === 'he'
                        ? 'החוזה הסתיים. האם ברצונך לחשב הפרשי הצמדה סופיים?'
                        : 'Contract ended. Do you want to calculate final index linkage?')) {

                        navigate('/calculator', {
                            state: {
                                contractData: {
                                    baseRent: Number(formData.base_rent),
                                    linkageType: formData.linkage_type,
                                    baseIndexDate: formData.base_index_date,
                                    startDate: formData.start_date,
                                    endDate: formData.end_date
                                }
                            }
                        });
                    }
                }, 300);
            }

        } catch (error) {
            console.error('Error updating contract:', error);
            alert('Failed to update contract');
        } finally {
            setLoading(false);
        }
    };

    return createPortal(
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200" dir="ltr">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-4xl shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="p-6 border-b border-gray-100 dark:border-gray-700 flex items-center justify-between shrink-0 bg-gray-50/50 dark:bg-gray-800/50">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                            <FileText className="w-5 h-5 text-blue-600" />
                            {readOnly ? 'Contract Details' : 'Edit Contract'}
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                {contract.properties.address}, {contract.properties.city}
                            </p>
                            {contract.contract_file_url && (
                                <a
                                    href={contract.contract_file_url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium px-2 py-0.5 bg-blue-50 hover:bg-blue-100 rounded-full transition-colors"
                                >
                                    <ExternalLink className="w-3 h-3" /> View PDF
                                </a>
                            )}
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        {readOnly && (
                            <button
                                onClick={() => setReadOnly(false)}
                                className="p-2 text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-full transition-colors flex items-center gap-2 px-3 bg-blue-50/50"
                            >
                                <Pen className="w-4 h-4" />
                                <span className="text-sm font-medium">{lang === 'he' ? 'ערוך' : 'Edit'}</span>
                            </button>
                        )}
                        <button
                            onClick={onClose}
                            className="p-2 text-gray-400 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                {/* Content */}
                < form onSubmit={handleSave} className="flex-1 overflow-y-auto p-6 space-y-8" >

                    {/* General Section */}
                    < div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-blue-50/50 dark:bg-blue-900/10 p-4 rounded-xl border border-blue-100 dark:border-blue-800/30" >
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 text-blue-600 shadow-sm flex items-center justify-center shrink-0">
                                <User className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Tenant</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{contract.tenants.name}</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-white dark:bg-gray-800 text-purple-600 shadow-sm flex items-center justify-center shrink-0">
                                <Building2 className="w-5 h-5" />
                            </div>
                            <div>
                                <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">Property</p>
                                <p className="font-medium text-gray-900 dark:text-gray-100">{contract.properties.address}</p>
                            </div>
                        </div>
                    </div >

                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">

                        {/* Left Column */}
                        <div className="space-y-8">
                            {/* Dates & Status */}
                            <section className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <Calendar className="w-4 h-4 text-blue-500" /> Contract Period & Status
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500 uppercase">Status</label>
                                        <select
                                            disabled={readOnly}
                                            value={formData.status}
                                            onChange={e => setFormData({ ...formData, status: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                        >
                                            <option value="active">Active</option>
                                            <option value="archived">Archived</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500 uppercase">Signing Date</label>
                                        <DatePicker
                                            value={formData.signing_date ? parseISO(formData.signing_date) : undefined}
                                            onChange={(date) => setFormData({ ...formData, signing_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500 uppercase">Start Date</label>
                                        <DatePicker
                                            value={formData.start_date ? parseISO(formData.start_date) : undefined}
                                            onChange={(date) => setFormData({ ...formData, start_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                            className="w-full"
                                        />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500 uppercase">End Date</label>
                                        <DatePicker
                                            value={formData.end_date ? parseISO(formData.end_date) : undefined}
                                            onChange={(date) => setFormData({ ...formData, end_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                            className="w-full"
                                        />
                                    </div>
                                    {formData.start_date && formData.end_date && (
                                        <div className="col-span-2 text-xs text-gray-500 bg-gray-50 dark:bg-gray-800/50 p-2 rounded-lg flex items-center justify-center gap-2">
                                            <Clock className="w-3 h-3" />
                                            <span>
                                                Duration:
                                                <span className="font-bold text-gray-900 dark:text-white">
                                                    {(() => {
                                                        const start = new Date(formData.start_date);
                                                        const end = new Date(formData.end_date);
                                                        const diffTime = Math.abs(end.getTime() - start.getTime());
                                                        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Include end date

                                                        const months = Math.floor(diffDays / 30);
                                                        const years = Math.floor(months / 12);
                                                        const remainingMonths = months % 12;

                                                        if (years > 0) return ` ${years} Years${remainingMonths > 0 ? ` & ${remainingMonths} Months` : ''}`;
                                                        if (months > 0) return ` ${months} Months`;
                                                        return ` ${diffDays} Days`;
                                                    })()}
                                                </span>
                                            </span>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Financials */}
                            <section className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <DollarSign className="w-4 h-4 text-green-500" /> Financial Details
                                </h3>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500 uppercase">Base Rent</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                disabled={readOnly}
                                                value={formData.base_rent}
                                                onChange={e => setFormData({ ...formData, base_rent: Number(e.target.value) })}
                                                className="w-full pl-3 pr-12 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 text-sm">
                                                {formData.currency}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500 uppercase">Currency</label>
                                        <select
                                            disabled={readOnly}
                                            value={formData.currency}
                                            onChange={e => setFormData({ ...formData, currency: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                        >
                                            <option value="ILS">ILS (₪)</option>
                                            <option value="USD">USD ($)</option>
                                            <option value="EUR">EUR (€)</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500 uppercase">Payment Freq.</label>
                                        <select
                                            disabled={readOnly}
                                            value={formData.payment_frequency}
                                            onChange={e => setFormData({ ...formData, payment_frequency: e.target.value })}
                                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                        >
                                            <option value="monthly">Monthly</option>
                                            <option value="quarterly">Quarterly</option>
                                            <option value="annually">Annually</option>
                                        </select>
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-xs font-medium text-gray-500 uppercase">Payment Day</label>
                                        <div className="relative">
                                            <input
                                                type="number"
                                                min="1"
                                                max="31"
                                                disabled={readOnly}
                                                value={formData.payment_day}
                                                onChange={e => {
                                                    const val = parseInt(e.target.value);
                                                    if (val >= 1 && val <= 31) {
                                                        setFormData({ ...formData, payment_day: val });
                                                    }
                                                }}
                                                className="w-full pl-3 pr-8 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                            />
                                            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-gray-400 text-xs">
                                                Day
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                {/* Variable Rent Steps */}
                                <div className="pt-4 border-t border-gray-100 dark:border-gray-700">
                                    <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Rent Steps (Variable Rent)</h4>
                                    <div className="space-y-2">
                                        {formData.rent_periods.map((period, idx) => (
                                            <div key={idx} className="flex items-center gap-2">
                                                <div className="w-32">
                                                    <DatePicker
                                                        value={period.startDate ? parseISO(period.startDate) : undefined}
                                                        onChange={(date) => {
                                                            const newPeriods = [...formData.rent_periods];
                                                            newPeriods[idx].startDate = date ? format(date, 'yyyy-MM-dd') : '';
                                                            setFormData({ ...formData, rent_periods: newPeriods });
                                                        }}
                                                        className="w-full"
                                                    />
                                                </div>
                                                <input
                                                    type="number"
                                                    disabled={readOnly}
                                                    value={period.amount}
                                                    onChange={e => {
                                                        const newPeriods = [...formData.rent_periods];
                                                        newPeriods[idx].amount = Number(e.target.value);
                                                        setFormData({ ...formData, rent_periods: newPeriods });
                                                    }}
                                                    className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                                                />
                                                <select
                                                    disabled={readOnly}
                                                    value={period.currency}
                                                    onChange={e => {
                                                        const newPeriods = [...formData.rent_periods];
                                                        newPeriods[idx].currency = e.target.value as any;
                                                        setFormData({ ...formData, rent_periods: newPeriods });
                                                    }}
                                                    className="w-20 px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                                                >
                                                    <option value="ILS">ILS</option>
                                                    <option value="USD">USD</option>
                                                    <option value="EUR">EUR</option>
                                                </select>
                                                {!readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newPeriods = formData.rent_periods.filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, rent_periods: newPeriods });
                                                        }}
                                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    >
                                                        <X className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        ))}
                                        {!readOnly && (
                                            <button
                                                type="button"
                                                onClick={() => setFormData({
                                                    ...formData,
                                                    rent_periods: [...formData.rent_periods, { startDate: '', amount: 0, currency: 'ILS' }]
                                                })}
                                                className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                            >
                                                + Add Rent Step
                                            </button>
                                        )}
                                    </div>
                                </div>
                            </section>
                        </div>

                        {/* Right Column */}
                        <div className="space-y-8">
                            {/* Linkage */}
                            <section className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <TrendingUp className="w-4 h-4 text-purple-500" /> Linkage & Adjustments
                                </h3>

                                <div className="space-y-4">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-xs font-medium text-gray-500 uppercase">Linkage Type</label>
                                            <select
                                                disabled={readOnly}
                                                value={formData.linkage_type}
                                                onChange={e => setFormData({ ...formData, linkage_type: e.target.value })}
                                                className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                            >
                                                <option value="none">None</option>
                                                <option value="cpi">CPI (Madad)</option>
                                                <option value="usd">USD Rate</option>
                                                <option value="eur">EUR Rate</option>
                                            </select>
                                        </div>
                                        {formData.linkage_type !== 'none' && (
                                            <div className="space-y-1.5">
                                                <label className="text-xs font-medium text-gray-500 uppercase">Sub-Type</label>
                                                <select
                                                    disabled={readOnly}
                                                    value={formData.linkage_sub_type}
                                                    onChange={e => setFormData({ ...formData, linkage_sub_type: e.target.value })}
                                                    className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                                >
                                                    <option value="known">Known Index</option>
                                                    <option value="respect_of">In Respect Of</option>
                                                </select>
                                            </div>
                                        )}
                                    </div>

                                    {formData.linkage_type !== 'none' && (
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-lg space-y-3">
                                            <div className="grid grid-cols-1 gap-3">
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-500">Base Index Date</label>
                                                    <DatePicker
                                                        value={formData.base_index_date ? parseISO(formData.base_index_date) : undefined}
                                                        onChange={(date) => setFormData({ ...formData, base_index_date: date ? format(date, 'yyyy-MM-dd') : '' })}
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>
                                            <div className="grid grid-cols-2 gap-3 pt-2 border-t border-gray-200 dark:border-gray-700">
                                                <div className="space-y-1 flex flex-col justify-end">
                                                    <label className="flex items-center gap-2 cursor-pointer">
                                                        <input
                                                            type="checkbox"
                                                            disabled={readOnly}
                                                            checked={formData.linkage_floor === '0'}
                                                            onChange={e => setFormData({
                                                                ...formData,
                                                                linkage_floor: e.target.checked ? '0' : ''
                                                            })}
                                                            className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                                        />
                                                        <span className="text-xs font-medium text-gray-700 dark:text-gray-300">Base Index is Minimum</span>
                                                    </label>
                                                </div>
                                                <div className="space-y-1">
                                                    <label className="text-xs text-gray-500">Ceiling (Max %)</label>
                                                    <input
                                                        type="number"
                                                        disabled={readOnly}
                                                        value={formData.linkage_ceiling}
                                                        onChange={e => setFormData({ ...formData, linkage_ceiling: e.target.value })}
                                                        className="w-full px-2 py-1 text-sm border border-gray-200 rounded"
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </section>

                            {/* Option Periods */}
                            <section className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <Clock className="w-4 h-4 text-orange-500" /> Option Periods
                                </h3>
                                <div className="space-y-3">
                                    {formData.option_periods.map((opt, idx) => (
                                        <div key={idx} className="bg-gray-50 dark:bg-gray-800 p-3 rounded-lg space-y-3">
                                            <div className="flex items-center justify-between">
                                                <span className="text-xs font-medium text-gray-500 uppercase">Option {idx + 1}</span>
                                                {!readOnly && (
                                                    <button
                                                        type="button"
                                                        onClick={() => {
                                                            const newOpts = formData.option_periods.filter((_, i) => i !== idx);
                                                            setFormData({ ...formData, option_periods: newOpts });
                                                        }}
                                                        className="text-red-500 hover:bg-red-50 p-1 rounded"
                                                    >
                                                        <X className="w-3 h-3" />
                                                    </button>
                                                )}
                                            </div>
                                            <div className="grid grid-cols-2 gap-2">
                                                <div className="relative">
                                                    <input
                                                        type="number"
                                                        disabled={readOnly}
                                                        value={opt.length}
                                                        onChange={e => {
                                                            const newOpts = [...formData.option_periods];
                                                            newOpts[idx].length = Number(e.target.value);
                                                            setFormData({ ...formData, option_periods: newOpts });
                                                        }}
                                                        className="w-full pl-2 pr-12 py-1.5 text-xs border border-gray-200 rounded-lg"
                                                    />
                                                    <select
                                                        disabled={readOnly}
                                                        value={opt.unit}
                                                        onChange={e => {
                                                            const newOpts = [...formData.option_periods];
                                                            newOpts[idx].unit = e.target.value as any;
                                                            setFormData({ ...formData, option_periods: newOpts });
                                                        }}
                                                        className="absolute inset-y-0 right-0 text-xs bg-transparent border-0 px-1 text-gray-500 focus:ring-0"
                                                    >
                                                        <option value="months">Mos</option>
                                                        <option value="years">Yrs</option>
                                                    </select>
                                                </div>
                                                <div className="flex gap-1">
                                                    <input
                                                        type="number"
                                                        disabled={readOnly}
                                                        value={opt.rentAmount || ''}
                                                        onChange={e => {
                                                            const newOpts = [...formData.option_periods];
                                                            newOpts[idx].rentAmount = Number(e.target.value);
                                                            setFormData({ ...formData, option_periods: newOpts });
                                                        }}
                                                        className="flex-1 px-2 py-1.5 text-xs border border-gray-200 rounded-lg"
                                                    />
                                                    <select
                                                        disabled={readOnly}
                                                        value={opt.currency || 'ILS'}
                                                        onChange={e => {
                                                            const newOpts = [...formData.option_periods];
                                                            newOpts[idx].currency = e.target.value as any;
                                                            setFormData({ ...formData, option_periods: newOpts });
                                                        }}
                                                        className="w-16 px-1 py-1.5 text-xs border border-gray-200 rounded-lg"
                                                    >
                                                        <option value="ILS">ILS</option>
                                                        <option value="USD">USD</option>
                                                        <option value="EUR">EUR</option>
                                                    </select>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                    {!readOnly && (
                                        <button
                                            type="button"
                                            onClick={() => setFormData({
                                                ...formData,
                                                option_periods: [...formData.option_periods, { length: 1, unit: 'years', rentAmount: 0, currency: 'ILS' }]
                                            })}
                                            className="text-xs text-blue-600 hover:text-blue-700 font-medium flex items-center gap-1"
                                        >
                                            + Add Option Period
                                        </button>
                                    )}
                                </div>
                            </section>

                            {/* Security Deposit */}
                            <section className="space-y-4">
                                <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 pb-2 border-b border-gray-100 dark:border-gray-700">
                                    <Shield className="w-4 h-4 text-gray-400" /> Security
                                </h3>
                                <div className="space-y-1.5">
                                    <label className="text-xs font-medium text-gray-500 uppercase">Deposit Amount</label>
                                    <input
                                        type="number"
                                        disabled={readOnly}
                                        value={formData.security_deposit_amount}
                                        onChange={e => setFormData({ ...formData, security_deposit_amount: Number(e.target.value) })}
                                        className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 disabled:bg-gray-50 disabled:text-gray-500"
                                    />
                                </div>
                            </section>
                        </div>
                    </div>
                </form >

                {/* Footer */}
                < div className="p-6 border-t border-gray-100 dark:border-gray-700 flex justify-end gap-3 shrink-0 bg-white dark:bg-gray-800 z-10" >
                    {
                        readOnly ? (
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-6 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-900 dark:text-white rounded-xl font-medium transition-colors"
                            >
                                Close
                            </button>
                        ) : (
                            <>
                                <button
                                    type="button"
                                    onClick={onClose}
                                    className="px-4 py-2 text-gray-700 bg-white border border-gray-200 hover:bg-gray-50 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-300 rounded-xl font-medium transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={loading}
                                    className="px-6 py-2 bg-blue-600 text-white hover:bg-blue-700 rounded-xl font-medium transition-colors shadow-lg shadow-blue-500/30 flex items-center gap-2"
                                >
                                    {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                                    Save Changes
                                </button>
                            </>
                        )
                    }
                </div >
            </div >
        </div >
        , document.body);
}
