import { useEffect, useState } from 'react';

import { CalendarIcon as CalendarCheck, ClockIcon as Clock, AlertCircleIcon as AlertCircle, FilterIcon as SlidersHorizontal, ArrowRightIcon as ArrowRight, PlusIcon as Plus } from '../components/icons/NavIcons';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import type { Payment } from '../types/database';
import { AddPaymentModal } from '../components/modals/AddPaymentModal';
import { PaymentDetailsModal } from '../components/modals/PaymentDetailsModal';
import { DatePicker } from '../components/ui/DatePicker';
import { PageHeader } from '../components/common/PageHeader';
import { useTranslation } from '../hooks/useTranslation';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { cn } from '../lib/utils';


export function Payments() {
    const { t } = useTranslation();
    const [payments, setPayments] = useState<Payment[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [periodFilter, setPeriodFilter] = useState<'all' | '3m' | '6m' | '1y'>('3m');
    const [stats, setStats] = useState({
        monthlyExpected: 0,
        pending: 0,
        overdue: 0
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        tenantId: 'all',
        propertyId: 'all',
        startDate: '',
        endDate: '',
        paymentMethod: 'all'
    });

    useEffect(() => {
        fetchPayments();
    }, []);

    async function fetchPayments() {
        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    contracts (
                        id,
                        properties (id, title, address, city),
                        tenants (id, name)
                    )
                `)
                .order('due_date', { ascending: true });

            if (error) {
                console.error('Supabase error:', error);
            }

            if (data) {
                const paymentData = data as any[];
                setPayments(paymentData);
                calculateStats(paymentData);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    }

    function calculateStats(data: Payment[]) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let monthly = 0;
        let pending = 0;

        data.forEach(p => {
            const dueDate = new Date(p.due_date);

            // Monthly Expected (This month)
            if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
                monthly += p.amount;
            }

            // Pending (Future or Unpaid)
            if (p.status === 'pending') {
                pending += p.amount;
            }
        });

        setStats({
            monthlyExpected: monthly,
            pending: pending,
            overdue: 0 // Kept in state for type compatibility but always 0
        });
    }

    // --- Filtering Logic ---
    const uniqueTenants = Array.from(new Set(
        payments.map(p => {
            const t = (p as any).contracts?.tenants;
            return t ? JSON.stringify({ id: t.id, name: t.name }) : null;
        })
    )).filter(Boolean).map(s => JSON.parse(s!));

    const uniqueProperties = Array.from(new Set(
        payments.map(p => {
            const prop = (p as any).contracts?.properties;
            return prop ? JSON.stringify({ id: prop.id, address: `${prop.city}, ${prop.address}` }) : null;
        })
    )).filter(Boolean).map(s => JSON.parse(s!));

    const filteredPayments = payments.filter(payment => {
        // Tenant Filter
        if (filters.tenantId !== 'all') {
            const tId = (payment as any).contracts?.tenants?.id;
            if (tId !== filters.tenantId) return false;
        }

        // Property Filter
        if (filters.propertyId !== 'all') {
            const pId = (payment as any).contracts?.properties?.id;
            if (pId !== filters.propertyId) return false;
        }

        // Payment Method Filter
        if (filters.paymentMethod !== 'all') {
            if (payment.payment_method !== filters.paymentMethod) return false;
        }

        // Date Range
        if (filters.startDate) {
            if (new Date(payment.due_date) < new Date(filters.startDate)) return false;
        }
        if (filters.endDate) {
            if (new Date(payment.due_date) > new Date(filters.endDate)) return false;
        }

        return true;
    });

    // --- Filtered Stats ---
    const totalExpected = filteredPayments.reduce((sum, p) => sum + p.amount, 0);
    const totalActual = filteredPayments.reduce((sum, p) => {
        if (p.status === 'paid') return sum + (p.paid_amount || p.amount);
        return sum + (p.paid_amount || 0);
    }, 0);


    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-white dark:bg-[#0a0a0a]">
                <div className="animate-pulse flex flex-col items-center gap-4">
                    <div className="w-16 h-16 bg-gray-100 dark:bg-neutral-800 rounded-[1.5rem] shadow-sm"></div>
                    <div className="h-3 w-32 bg-gray-100 dark:bg-neutral-800 rounded-full"></div>
                </div>
            </div>
        );
    }

    return (
        <div className="space-y-6 px-4 pt-6">
            <PageHeader
                title={t('paymentsTitle')}
                subtitle={t('trackFuturePayments')}
                action={
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-black dark:bg-white text-white dark:text-black p-3.5 rounded-2xl hover:opacity-90 transition-all shadow-xl active:scale-95 flex items-center justify-center"
                        aria-label={t('addPayment')}
                    >
                        <Plus className="w-6 h-6" />
                    </button>
                }
            />

            {/* Filters Row */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {(['3m', '6m', '1y', 'all'] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriodFilter(p)}
                        className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest border transition-all whitespace-nowrap active:scale-95 ${periodFilter === p
                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-lg'
                            : 'bg-white dark:bg-neutral-900 text-gray-500 dark:text-gray-400 border-gray-100 dark:border-neutral-800 hover:border-gray-300 dark:hover:border-neutral-600'
                            }`}
                    >
                        {p === '3m' ? t('last3Months') :
                            p === '6m' ? t('last6Months') :
                                p === '1y' ? t('lastYear') :
                                    t('allTime')}
                    </button>
                ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-2 gap-4">
                <Card className="bg-primary/5 border-primary/10">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <CalendarCheck className="w-6 h-6 text-primary mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-primary/60 mb-1">{t('monthlyExpected')}</span>
                        <span className="text-2xl font-black text-primary tracking-tighter">₪{stats.monthlyExpected.toLocaleString()}</span>
                    </CardContent>
                </Card>

                <Card className="bg-orange-50/50 dark:bg-orange-950/20 border-orange-100 dark:border-orange-900/30">
                    <CardContent className="p-6 flex flex-col items-center text-center">
                        <Clock className="w-6 h-6 text-orange-600 dark:text-orange-400 mb-3" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-orange-600/60 dark:text-orange-400/60 mb-1">{t('pending')}</span>
                        <span className="text-2xl font-black text-orange-600 dark:text-orange-400 tracking-tighter">₪{stats.pending.toLocaleString()}</span>
                    </CardContent>
                </Card>
            </div>



            <div className="bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-[2rem] shadow-sm overflow-hidden mt-8">
                <div className="p-6 border-b border-gray-50 dark:border-neutral-800 flex items-center justify-between">
                    <h3 className="font-black text-xs uppercase tracking-widest text-gray-500 dark:text-gray-400">{t('upcomingPayments')}</h3>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-xl transition-all ${showFilters ? 'bg-black dark:bg-white text-white dark:text-black' : 'bg-gray-50 dark:bg-neutral-800 text-gray-400 hover:text-black dark:hover:text-white'}`}
                    >
                        <SlidersHorizontal className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters Panel - Embedded */}
                {showFilters && (
                    <div className="p-8 border-b border-gray-50 dark:border-neutral-800 bg-gray-50/30 dark:bg-neutral-800/20 space-y-8 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
                            {/* Tenant */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('tenant')}</label>
                                <select
                                    className="w-full p-4 rounded-2xl border border-transparent bg-white dark:bg-neutral-900 text-sm font-bold text-black dark:text-white outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none shadow-sm"
                                    value={filters.tenantId}
                                    onChange={(e) => setFilters(prev => ({ ...prev, tenantId: e.target.value }))}
                                >
                                    <option value="all">{t('allTenants')}</option>
                                    {uniqueTenants.map((t: any) => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Property */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('asset')}</label>
                                <select
                                    className="w-full p-4 rounded-2xl border border-transparent bg-white dark:bg-neutral-900 text-sm font-bold text-black dark:text-white outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none shadow-sm"
                                    value={filters.propertyId}
                                    onChange={(e) => setFilters(prev => ({ ...prev, propertyId: e.target.value }))}
                                >
                                    <option value="all">{t('allAssets')}</option>
                                    {uniqueProperties.map((p: any) => (
                                        <option key={p.id} value={p.id}>{p.address}</option>
                                    ))}
                                </select>
                            </div>

                            {/* Payment Method */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('method')}</label>
                                <select
                                    className="w-full p-4 rounded-2xl border border-transparent bg-white dark:bg-neutral-900 text-sm font-bold text-black dark:text-white outline-none focus:ring-2 focus:ring-black dark:focus:ring-white transition-all appearance-none shadow-sm"
                                    value={filters.paymentMethod}
                                    onChange={(e) => setFilters(prev => ({ ...prev, paymentMethod: e.target.value }))}
                                >
                                    <option value="all">{t('allMethods')}</option>
                                    <option value="bank_transfer">{t('transfer')}</option>
                                    <option value="bit">{t('bit')}</option>
                                    <option value="paybox">{t('paybox')}</option>
                                    <option value="check">{t('check')}</option>
                                    <option value="cash">{t('cash')}</option>
                                    <option value="credit_card">{t('creditCard')}</option>
                                    <option value="other">{t('other')}</option>
                                </select>
                            </div>

                            {/* Period */}
                            <div className="space-y-3">
                                <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500 block ml-1">{t('period')}</label>
                                <div className="flex gap-3">
                                    <DatePicker
                                        placeholder={t('from')}
                                        value={filters.startDate ? new Date(filters.startDate) : undefined}
                                        onChange={(date) => setFilters(prev => ({
                                            ...prev,
                                            startDate: date ? format(date, 'yyyy-MM-dd') : ''
                                        }))}
                                        className="w-full"
                                    />
                                    <DatePicker
                                        placeholder={t('to')}
                                        value={filters.endDate ? new Date(filters.endDate) : undefined}
                                        onChange={(date) => setFilters(prev => ({
                                            ...prev,
                                            endDate: date ? format(date, 'yyyy-MM-dd') : ''
                                        }))}
                                        className="w-full"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Filter Stats Summary */}
                        <div className="flex gap-8 p-6 bg-white dark:bg-neutral-900 rounded-[2rem] border border-gray-100 dark:border-neutral-800 shadow-xl">
                            <div className="flex-1">
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest block mb-1">{t('totalExpected')}</span>
                                <div className="text-xl font-black text-black dark:text-white">₪{totalExpected.toLocaleString()}</div>
                            </div>
                            <div className="flex-1 border-x border-gray-50 dark:border-neutral-800 px-8">
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest block mb-1">{t('totalActual')}</span>
                                <div className={`text-xl font-black ${totalActual < totalExpected ? 'text-orange-500' : 'text-green-500'}`}>
                                    ₪{totalActual.toLocaleString()}
                                </div>
                            </div>
                            <div className="flex-1 text-right">
                                <span className="text-[10px] text-gray-400 dark:text-gray-500 uppercase font-black tracking-widest block mb-1">{t('collectionRate')}</span>
                                <div className="text-xl font-black text-black dark:text-white">
                                    {totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0}%
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {filteredPayments.length === 0 ? (
                    <div className="p-12 text-center">
                        <div className="w-16 h-16 bg-gray-50 dark:bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 opacity-20">
                            <CalendarCheck className="w-8 h-8 text-black dark:text-white" />
                        </div>
                        <p className="text-sm font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                            {t('noPaymentsFound')}
                        </p>
                    </div>
                ) : (
                    <div className="divide-y divide-gray-50 dark:divide-neutral-800">
                        {filteredPayments.map(payment => (
                            <div
                                key={payment.id}
                                onClick={() => {
                                    setSelectedPayment(payment);
                                    setIsDetailsModalOpen(true);
                                }}
                                className="p-6 flex items-center justify-between hover:bg-gray-50 dark:hover:bg-neutral-800/10 transition-all group cursor-pointer"
                            >
                                <div className="space-y-1">
                                    <div className="flex items-center gap-3">
                                        <span className="font-black text-black dark:text-white text-lg">
                                            {formatDate(payment.due_date)}
                                        </span>
                                        <span className={`text-[8px] px-2.5 py-0.5 rounded-full uppercase font-black tracking-widest ${payment.status === 'paid' ? 'bg-green-50 dark:bg-green-900/20 text-green-600' :
                                            payment.status === 'overdue' ? 'bg-red-50 dark:bg-red-900/20 text-red-600' :
                                                'bg-orange-50 dark:bg-orange-900/20 text-orange-600'
                                            }`}>
                                            {payment.status}
                                        </span>
                                    </div>
                                    <div className="flex flex-col">
                                        <p className="text-xs font-bold text-gray-500 dark:text-neutral-400">
                                            {(payment as any).contracts?.properties?.city}, {(payment as any).contracts?.properties?.address}
                                        </p>
                                        <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                            {(payment as any).contracts?.tenants?.name}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-8">
                                    <div className="text-right">
                                        {payment.status === 'paid' && payment.paid_amount ? (
                                            <>
                                                <div className="font-black text-2xl text-green-500">
                                                    ₪{payment.paid_amount.toLocaleString()}
                                                </div>
                                                {Math.abs(payment.paid_amount - payment.amount) > 0.01 && (
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                                        {t('exp')}: ₪{payment.amount.toLocaleString()}
                                                        <span className={payment.paid_amount < payment.amount ? "text-red-500 ml-1" : "text-green-500 ml-1"}>
                                                            ({(payment.paid_amount - payment.amount).toFixed(2)})
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="font-black text-2xl text-black dark:text-white">
                                                    ₪{payment.amount.toLocaleString()}
                                                </div>
                                                {payment.original_amount && payment.amount !== payment.original_amount && (
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-400 dark:text-gray-500">
                                                        {t('base')}: ₪{payment.original_amount.toLocaleString()}
                                                        <span className="text-black dark:text-white ml-2 opacity-50 underline decoration-dotted">
                                                            ({payment.index_linkage_rate?.toFixed(2)}%)
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <button className="p-3 bg-gray-50 dark:bg-neutral-800 rounded-2xl text-black dark:text-white opacity-0 group-hover:opacity-100 transition-all active:scale-90">
                                        <ArrowRight className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <AddPaymentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchPayments}
            />

            <PaymentDetailsModal
                isOpen={isDetailsModalOpen}
                payment={selectedPayment}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedPayment(null);
                }}
                onSuccess={fetchPayments}
            />
        </div>
    );
}
