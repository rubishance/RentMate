import { useEffect, useState } from 'react';
import { CalendarIcon as CalendarCheck, ClockIcon as Clock, AlertCircleIcon as AlertCircle, FilterIcon as SlidersHorizontal, ArrowRightIcon as ArrowRight, PlusIcon as Plus } from '../components/icons/NavIcons';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type { Payment } from '../types/database';
import { AddPaymentModal } from '../components/modals/AddPaymentModal';
import { PaymentDetailsModal } from '../components/modals/PaymentDetailsModal';
import { DatePicker } from '../components/ui/DatePicker';
import { useTranslation } from '../hooks/useTranslation';
import { motion, AnimatePresence } from 'framer-motion';
import { useDataCache } from '../contexts/DataCacheContext';

export function Payments() {
    const { t } = useTranslation();
    const { clear } = useDataCache();
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
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
        paymentMethod: 'all',
        type: 'all' as 'all' | 'rent' | 'bills'
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
                .eq('user_id', (await supabase.auth.getUser()).data.user?.id) // STRICTLY enforce ownership
                .order('due_date', { ascending: true });

            if (error) {
                console.error('Supabase error:', error);
            }

            if (data) {
                const rentPayments = (data as any[]).map(p => ({
                    ...p,
                    displayType: 'rent'
                }));

                // Fetch Paid Bills
                const { data: bills } = await supabase
                    .from('property_documents')
                    .select('*, properties(id, title, address, city)')
                    .eq('user_id', (await supabase.auth.getUser()).data.user?.id) // STRICTLY enforce ownership
                    .eq('paid', true)
                    .not('amount', 'is', null)
                    .ilike('category', 'utility_%');

                let allItems = [...rentPayments];
                if (bills) {
                    const billPayments = bills.map(b => ({
                        ...b,
                        id: b.id,
                        amount: b.amount,
                        due_date: b.document_date || b.created_at,
                        status: 'paid',
                        payment_method: 'bank_transfer',
                        displayType: 'bill',
                        contracts: {
                            properties: b.properties,
                            tenants: { name: b.vendor_name || t('bills') }
                        }
                    }));
                    allItems = [...allItems, ...billPayments];
                }

                allItems.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

                setPayments(allItems);
                calculateStats(rentPayments);
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

            if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
                monthly += p.amount;
            }

            if (p.status === 'pending') {
                pending += p.amount;
            }
        });

        setStats({
            monthlyExpected: monthly,
            pending: pending,
            overdue: 0
        });
    }

    const filteredPayments = payments.filter(payment => {
        const p = payment as any;
        if (filters.type !== 'all' && p.displayType !== filters.type) return false;
        if (filters.tenantId !== 'all' && p.contracts?.tenants?.id !== filters.tenantId) return false;
        if (filters.propertyId !== 'all' && p.contracts?.properties?.id !== filters.propertyId) return false;
        if (filters.paymentMethod !== 'all' && p.payment_method !== filters.paymentMethod) return false;
        if (filters.startDate && p.due_date < filters.startDate) return false;
        if (filters.endDate && p.due_date > filters.endDate) return false;

        if (periodFilter !== 'all') {
            const dueDate = new Date(p.due_date);
            const now = new Date();
            const months = periodFilter === '3m' ? 3 : periodFilter === '6m' ? 6 : 12;
            const threshold = new Date();
            threshold.setMonth(now.getMonth() - months);
            if (dueDate < threshold) return false;
        }

        return true;
    });

    const uniqueTenants = Array.from(new Set(payments.map(p => (p as any).contracts?.tenants).filter(Boolean).map(t => JSON.stringify(t)))).map(s => JSON.parse(s as string));
    const uniqueProperties = Array.from(new Set(payments.map(p => (p as any).contracts?.properties).filter(Boolean).map(pr => JSON.stringify(pr)))).map(s => JSON.parse(s as string));

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
            </div>
        );
    }

    return (
        <div className="pb-40 pt-16 space-y-20 animate-in fade-in slide-in-from-bottom-6 duration-700">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-8">
                <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-slate-50 dark:bg-neutral-900 rounded-full border border-slate-100 dark:border-neutral-800 shadow-minimal">
                        <CalendarCheck className="w-3 h-3 text-muted-foreground" />
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground">{t('financialOverview')}</span>
                    </div>
                    <h1 className="text-6xl font-black tracking-tighter text-foreground lowercase">
                        {t('payments')}
                    </h1>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "h-16 px-6 rounded-[1.5rem] transition-all flex items-center justify-center border-2",
                            showFilters
                                ? "bg-foreground text-background border-foreground shadow-premium-dark"
                                : "bg-white dark:bg-neutral-900 text-muted-foreground border-slate-100 dark:border-neutral-800 hover:border-slate-200 dark:hover:border-neutral-700 shadow-minimal"
                        )}
                    >
                        <SlidersHorizontal className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-16 px-10 bg-foreground text-background font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] hover:scale-105 active:scale-95 transition-all shadow-premium-dark flex items-center justify-center gap-4 group"
                    >
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        {t('addPayment')}
                    </button>
                </div>
            </div>

            {/* Filter Tabs */}
            <div className="flex gap-2 p-1.5 bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-full w-fit mx-8 shadow-minimal overflow-x-auto hide-scrollbar">
                {(['3m', '6m', '1y', 'all'] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriodFilter(p)}
                        className={cn(
                            "px-8 py-3 text-[10px] font-black uppercase tracking-[0.2em] rounded-full transition-all duration-500 whitespace-nowrap",
                            periodFilter === p
                                ? "bg-white dark:bg-neutral-800 text-foreground shadow-premium"
                                : "text-muted-foreground hover:text-foreground"
                        )}
                    >
                        {p === '3m' ? t('last3Months') : p === '6m' ? t('last6Months') : p === '1y' ? t('lastYear') : t('allTime')}
                    </button>
                ))}
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-8">
                <div className="p-12 rounded-[3rem] bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 flex items-center gap-10 shadow-minimal group hover:shadow-premium transition-all duration-700">
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-neutral-800 flex items-center justify-center shadow-minimal group-hover:scale-110 group-hover:rotate-3 transition-transform duration-700 border border-slate-100 dark:border-neutral-800">
                        <CalendarCheck className="w-9 h-9 text-foreground" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 mb-2 block">{t('monthlyExpected')}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-foreground opacity-40">₪</span>
                            <span className="text-5xl font-black text-foreground tracking-tighter lowercase">{stats.monthlyExpected.toLocaleString()}</span>
                        </div>
                    </div>
                </div>

                <div className="p-12 rounded-[3rem] bg-orange-50/20 dark:bg-orange-950/5 border border-orange-100/30 dark:border-orange-900/10 flex items-center gap-10 shadow-minimal group hover:shadow-premium transition-all duration-700">
                    <div className="w-20 h-20 rounded-3xl bg-white dark:bg-neutral-800 flex items-center justify-center shadow-minimal group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-700 border border-orange-100/50 dark:border-orange-900/20">
                        <Clock className="w-9 h-9 text-orange-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 opacity-60 mb-2 block">{t('pending')}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-orange-500 opacity-40">₪</span>
                            <span className="text-5xl font-black text-orange-500 tracking-tighter lowercase">{stats.pending.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filters Panel - Embedded */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden px-8"
                    >
                        <div className="p-12 bg-slate-50 dark:bg-neutral-900/50 rounded-[3rem] border border-slate-100 dark:border-neutral-800 space-y-12">
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-10">
                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('paymentType')}</label>
                                    <select
                                        className="w-full h-16 px-8 rounded-2xl border-2 border-transparent bg-white dark:bg-neutral-900 text-xs font-black text-foreground shadow-minimal focus:border-foreground transition-all outline-none appearance-none"
                                        value={filters.type}
                                        onChange={(e) => setFilters(prev => ({ ...prev, type: e.target.value as any }))}
                                    >
                                        <option value="all">{t('allTypes')}</option>
                                        <option value="rent">{t('rent')}</option>
                                        <option value="bills">{t('bills')}</option>
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('tenant')}</label>
                                    <select
                                        className="w-full h-16 px-8 rounded-2xl border-2 border-transparent bg-white dark:bg-neutral-900 text-xs font-black text-foreground shadow-minimal focus:border-foreground transition-all outline-none appearance-none"
                                        value={filters.tenantId}
                                        onChange={(e) => setFilters(prev => ({ ...prev, tenantId: e.target.value }))}
                                    >
                                        <option value="all">{t('allTenants')}</option>
                                        {uniqueTenants.map((t: any) => (
                                            <option key={t.id} value={t.id}>{t.name}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('asset')}</label>
                                    <select
                                        className="w-full h-16 px-8 rounded-2xl border-2 border-transparent bg-white dark:bg-neutral-900 text-xs font-black text-foreground shadow-minimal focus:border-foreground transition-all outline-none appearance-none"
                                        value={filters.propertyId}
                                        onChange={(e) => setFilters(prev => ({ ...prev, propertyId: e.target.value }))}
                                    >
                                        <option value="all">{t('allAssets')}</option>
                                        {uniqueProperties.map((p: any) => (
                                            <option key={p.id} value={p.id}>{p.address}</option>
                                        ))}
                                    </select>
                                </div>

                                <div className="space-y-4">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('period')}</label>
                                    <div className="flex gap-4">
                                        <DatePicker
                                            placeholder={t('from')}
                                            value={filters.startDate ? new Date(filters.startDate) : undefined}
                                            onChange={(date) => setFilters(prev => ({
                                                ...prev,
                                                startDate: date ? format(date, 'yyyy-MM-dd') : ''
                                            }))}
                                            className="w-full h-16"
                                        />
                                        <DatePicker
                                            placeholder={t('to')}
                                            value={filters.endDate ? new Date(filters.endDate) : undefined}
                                            onChange={(date) => setFilters(prev => ({
                                                ...prev,
                                                endDate: date ? format(date, 'yyyy-MM-dd') : ''
                                            }))}
                                            className="w-full h-16"
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Payments List */}
            <div className="px-8 space-y-8">
                <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[3rem] shadow-premium overflow-hidden">
                    <div className="p-10 border-b border-slate-50 dark:border-neutral-800">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40">{t('paymentHistory')}</h3>
                    </div>

                    {filteredPayments.length === 0 ? (
                        <div className="py-40 text-center space-y-10">
                            <div className="w-32 h-32 bg-slate-50 dark:bg-neutral-900 rounded-[3rem] flex items-center justify-center mx-auto shadow-minimal">
                                <AlertCircle className="w-12 h-12 text-slate-200" />
                            </div>
                            <h3 className="text-3xl font-black tracking-tighter text-foreground lowercase opacity-40">{t('noPaymentsFound')}</h3>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-neutral-800">
                            {filteredPayments.map(payment => (
                                <div
                                    key={payment.id}
                                    onClick={() => {
                                        if (payment.displayType === 'rent') {
                                            setSelectedPayment(payment);
                                            setIsDetailsModalOpen(true);
                                        }
                                    }}
                                    className="p-10 flex flex-col lg:flex-row lg:items-center justify-between gap-10 hover:bg-slate-50/50 dark:hover:bg-neutral-800/10 transition-all group cursor-pointer relative overflow-hidden"
                                >
                                    <div className="absolute top-0 right-0 w-24 h-24 bg-slate-50 dark:bg-neutral-800/30 rounded-bl-[3rem] -translate-y-full group-hover:translate-y-0 transition-transform duration-700 pointer-events-none" />

                                    <div className="flex flex-col md:flex-row items-center gap-10">
                                        <div className="w-20 h-20 rounded-2xl bg-slate-50 dark:bg-neutral-800 flex flex-col items-center justify-center shrink-0 border border-slate-100 dark:border-neutral-700 group-hover:scale-105 transition-transform duration-700">
                                            <span className="text-xl font-black text-foreground leading-none">{format(new Date(payment.due_date), 'dd')}</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mt-1">{format(new Date(payment.due_date), 'MMM').toLowerCase()}</span>
                                        </div>

                                        <div className="text-center md:text-left rtl:md:text-right space-y-3">
                                            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4">
                                                <h3 className="text-2xl font-black tracking-tighter text-foreground lowercase">
                                                    {payment.contracts?.tenants?.name || t('unnamedTenant')}
                                                </h3>
                                                <span className={cn(
                                                    "text-[8px] px-3 py-1 rounded-full uppercase font-black tracking-[0.2em] shadow-minimal border",
                                                    payment.displayType === 'bill' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                        payment.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                            payment.status === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                )}>
                                                    {payment.displayType === 'bill' ? t('bills') : payment.status}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground text-sm font-medium opacity-60">
                                                {payment.contracts?.properties?.address}, {payment.contracts?.properties?.city}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-center lg:justify-end gap-12">
                                        <div className="text-center md:text-right space-y-2">
                                            <span className="text-[9px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 block">{t('amount')}</span>
                                            <div className="flex items-baseline gap-2 justify-center md:justify-end">
                                                <span className="text-xs font-black text-foreground opacity-40">₪</span>
                                                <span className="text-3xl font-black text-foreground tracking-tighter">
                                                    {(payment.paid_amount || payment.amount).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        <button className="h-14 w-14 bg-slate-50 dark:bg-neutral-800 rounded-2xl text-slate-300 group-hover:bg-foreground group-hover:text-background group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 shadow-minimal flex items-center justify-center">
                                            <ArrowRight className="w-7 h-7" />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AddPaymentModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    clear();
                    fetchPayments();
                }}
            />

            <PaymentDetailsModal
                isOpen={isDetailsModalOpen}
                payment={selectedPayment}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedPayment(null);
                }}
                onSuccess={() => {
                    clear();
                    fetchPayments();
                }}
            />
        </div>
    );
}
