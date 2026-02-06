import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { CalendarIcon as CalendarCheck, ClockIcon as Clock, AlertCircleIcon as AlertCircle, FilterIcon as SlidersHorizontal, ArrowRightIcon as ArrowRight, PlusIcon as Plus } from '../components/icons/NavIcons';
import { format, subMonths } from 'date-fns';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type { Payment } from '../types/database';
import { AddPaymentModal } from '../components/modals/AddPaymentModal';
import { PaymentDetailsModal } from '../components/modals/PaymentDetailsModal';
import { DatePicker } from '../components/ui/DatePicker';
import { useTranslation } from '../hooks/useTranslation';
import { useDataCache } from '../contexts/DataCacheContext';
import { Skeleton } from '../components/ui/Skeleton';
import { FilterDrawer } from '../components/common/FilterDrawer';
import { RotateCcw, X, ArrowUpRight } from 'lucide-react';

export function Payments() {
    const { t } = useTranslation();
    const { get, set, clear } = useDataCache();
    const [payments, setPayments] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [periodFilter, setPeriodFilter] = useState<'all' | '3m' | '6m' | '1y'>('all');
    const [stats, setStats] = useState({
        monthlyExpected: 0,
        monthlyIndexSum: 0,
        pending: 0,
        overdue: 0
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [detailsModalProps, setDetailsModalProps] = useState<{ editMode: boolean, status?: any }>({ editMode: false });
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

    const location = useLocation();
    useEffect(() => {
        if (location.state?.action === 'payment') {
            setIsAddModalOpen(true);
            window.history.replaceState({}, '');
        }
    }, [location.state]);

    async function fetchPayments() {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const CACHE_KEY = `payments_list_v1_${user.id}`;
        const cached = get<any[]>(CACHE_KEY);
        if (cached) {
            setPayments(cached);
            setLoading(false);
        }

        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    contracts (
                        id,
                        tenants,
                    properties (id, address, city)
                )
                `)
                .eq('user_id', user.id) // STRICTLY enforce ownership
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
                    .select('*, properties(id, address, city)')
                    .eq('user_id', user.id) // STRICTLY enforce ownership
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
                set(CACHE_KEY, allItems, { persist: true });
                calculateStats(rentPayments);
            }
        } catch (error) {
            console.error('Error fetching payments:', error);
        } finally {
            setLoading(false);
        }
    }

    function calculateStats(data: any[]) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let monthly = 0;
        let indexSum = 0;
        let pending = 0;

        data.forEach(p => {
            const dueDate = new Date(p.due_date);

            if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
                monthly += p.amount;
                if (p.original_amount && p.amount > p.original_amount) {
                    indexSum += (p.amount - p.original_amount);
                }
            }

            if (p.status === 'pending') {
                pending += p.amount;
            }
        });

        setStats({
            monthlyExpected: monthly,
            monthlyIndexSum: indexSum,
            pending: pending,
            overdue: 0
        });
    }

    const filteredPayments = payments.filter(payment => {
        const p = payment as any;
        if (filters.type !== 'all' && p.displayType !== filters.type) return false;
        if (filters.tenantId !== 'all') {
            const tenantsArray = p.contracts?.tenants;
            if (Array.isArray(tenantsArray)) {
                if (!tenantsArray.some((t: any) => t.id_number === filters.tenantId || t.name === filters.tenantId)) return false;
            } else if (p.contracts?.tenants?.id !== filters.tenantId) {
                return false;
            }
        }
        if (filters.propertyId !== 'all' && p.contracts?.properties?.id !== filters.propertyId) return false;
        if (filters.paymentMethod !== 'all' && p.payment_method !== filters.paymentMethod) return false;
        if (filters.startDate && p.due_date < filters.startDate) return false;
        if (filters.endDate && p.due_date > filters.endDate) return false;

        if (periodFilter !== 'all') {
            const dueDate = new Date(p.due_date);
            const now = new Date();
            const months = periodFilter === '3m' ? 3 : periodFilter === '6m' ? 6 : 12;
            const threshold = subMonths(new Date(), months);
            if (dueDate < threshold) return false;
        }

        return true;
    });

    const uniqueTenants = Array.from(new Set(payments.flatMap(p => {
        const t = (p as any).contracts?.tenants;
        return Array.isArray(t) ? t : [t];
    }).filter(Boolean).map(t => JSON.stringify(t)))).map(s => JSON.parse(s as string));
    const uniqueProperties = Array.from(new Set(payments.map(p => (p as any).contracts?.properties).filter(Boolean).map(pr => JSON.stringify(pr)))).map(s => JSON.parse(s as string));

    const resetFilters = () => {
        setFilters({
            tenantId: 'all',
            propertyId: 'all',
            startDate: '',
            endDate: '',
            paymentMethod: 'all',
            type: 'all'
        });
        setPeriodFilter('all');
    };

    if (loading) {
        return (
            <div className="pb-40 pt-8 space-y-12">
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4 md:px-8">
                    <div className="space-y-2">
                        <Skeleton className="h-6 w-32 rounded-full" />
                        <Skeleton className="h-16 w-64 rounded-xl" />
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-4 md:px-8">
                    <Skeleton className="h-44 w-full rounded-[3rem]" />
                    <Skeleton className="h-44 w-full rounded-[3rem]" />
                </div>

                <div className="px-4 md:px-8 space-y-8">
                    <div className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-[3rem] overflow-hidden">
                        {[1, 2, 3].map(i => (
                            <div key={i} className="p-10 flex border-b border-slate-50 last:border-0 gap-10">
                                <Skeleton className="w-20 h-20 rounded-2xl flex-shrink-0" />
                                <div className="flex-1 space-y-4">
                                    <Skeleton className="h-8 w-1/3" />
                                    <Skeleton className="h-4 w-1/2" />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="pb-40 pt-8 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-4 md:px-8">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-1">
                        <CalendarCheck className="w-3 h-3 text-indigo-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {t('financialOverview')}
                        </span>
                    </div>
                    <h1 className="text-3xl md:text-5xl font-black tracking-tighter text-foreground leading-tight lowercase">
                        {t('payments')}
                    </h1>
                </div>

                <div className="flex gap-4">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "h-14 w-14 rounded-[1.5rem] transition-all flex items-center justify-center border border-white/10 group relative overflow-hidden",
                            showFilters
                                ? "button-jewel shadow-jewel"
                                : "glass-premium hover:shadow-jewel text-muted-foreground"
                        )}
                    >
                        <SlidersHorizontal className="w-6 h-6 group-hover:scale-110 transition-transform" />
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-14 px-10 button-jewel font-black text-xs uppercase tracking-[0.2em] rounded-[1.5rem] hover:scale-105 active:scale-95 transition-all shadow-jewel flex items-center justify-center gap-4 group"
                    >
                        <Plus className="w-5 h-5 transition-transform group-hover:rotate-90" />
                        {t('addPayment')}
                    </button>
                </div>
            </div>

            {/* Active Filters Summary (Quick remove) */}
            {(periodFilter !== 'all' || Object.values(filters).some(v => v !== 'all' && v !== '')) && (
                <div className="flex flex-wrap gap-2 px-4 md:px-8">
                    {periodFilter !== 'all' && (
                        <div className="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-brand-100 dark:border-brand-900/30">
                            {periodFilter === '3m' ? t('last3Months') : periodFilter === '6m' ? t('last6Months') : t('lastYear')}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setPeriodFilter('all')} />
                        </div>
                    )}
                    {filters.type !== 'all' && (
                        <div className="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-brand-100 dark:border-brand-900/30">
                            {t(filters.type as any)}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, type: 'all' }))} />
                        </div>
                    )}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10 px-4 md:px-8">
                <div className="p-10 rounded-[3rem] glass-premium dark:bg-neutral-900/60 border-white/10 flex items-center gap-10 shadow-minimal group hover:shadow-jewel transition-all duration-300">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 dark:bg-neutral-800/40 flex items-center justify-center shadow-minimal group-hover:scale-110 group-hover:rotate-3 transition-all duration-300 border border-white/5">
                        <CalendarCheck className="w-9 h-9 text-indigo-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 mb-2 block lowercase">{t('monthlyExpected')}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-foreground opacity-40">₪</span>
                            <span className="text-5xl font-black text-foreground tracking-tighter lowercase leading-none">{stats.monthlyExpected.toLocaleString()}</span>
                        </div>
                        {stats.monthlyIndexSum > 0 && (
                            <div className="mt-4 inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-500/10 text-emerald-400 rounded-full border border-emerald-500/20 shadow-sm animate-in slide-in-from-left duration-300">
                                <ArrowUpRight className="w-3.5 h-3.5" />
                                <span className="text-[10px] font-black uppercase tracking-widest leading-none">
                                    + ₪{stats.monthlyIndexSum.toLocaleString()} {t('indexSum')}
                                </span>
                            </div>
                        )}
                    </div>
                </div>

                <div className="p-10 rounded-[3rem] glass-premium dark:bg-orange-500/5 border-orange-500/10 flex items-center gap-10 shadow-minimal group hover:shadow-jewel transition-all duration-300">
                    <div className="w-20 h-20 rounded-3xl bg-white/5 dark:bg-orange-500/10 flex items-center justify-center shadow-minimal group-hover:scale-110 group-hover:-rotate-3 transition-all duration-300 border border-orange-500/10">
                        <Clock className="w-9 h-9 text-orange-500" />
                    </div>
                    <div>
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-orange-400 opacity-60 mb-2 block lowercase">{t('pending')}</span>
                        <div className="flex items-baseline gap-2">
                            <span className="text-sm font-black text-orange-500 opacity-40">₪</span>
                            <span className="text-5xl font-black text-orange-500 tracking-tighter lowercase leading-none">{stats.pending.toLocaleString()}</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Filter Drawer */}
            <FilterDrawer
                isOpen={showFilters}
                onClose={() => setShowFilters(false)}
                onReset={resetFilters}
                title={t('paymentFilters')}
            >
                <div className="space-y-10">
                    {/* Period Quick Select in Drawer */}
                    <div className="space-y-4">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('timePeriod')}</label>
                        <div className="grid grid-cols-2 gap-2">
                            {(['3m', '6m', '1y', 'all'] as const).map((p) => (
                                <button
                                    key={p}
                                    onClick={() => setPeriodFilter(p)}
                                    className={cn(
                                        "px-4 py-4 text-[10px] font-black uppercase tracking-widest rounded-2xl border-2 transition-all",
                                        periodFilter === p
                                            ? "bg-foreground text-background border-foreground"
                                            : "bg-background text-muted-foreground border-border hover:border-foreground/20"
                                    )}
                                >
                                    {p === '3m' ? t('last3Months') : p === '6m' ? t('last6Months') : p === '1y' ? t('lastYear') : t('allTime')}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-8">
                        <div className="space-y-4">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('paymentType')}</label>
                            <select
                                className="w-full h-16 px-8 rounded-2xl border-2 border-border bg-background text-xs font-black text-foreground focus:border-foreground transition-all outline-none appearance-none"
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
                                className="w-full h-16 px-8 rounded-2xl border-2 border-border bg-background text-xs font-black text-foreground focus:border-foreground transition-all outline-none appearance-none"
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
                                className="w-full h-16 px-8 rounded-2xl border-2 border-border bg-background text-xs font-black text-foreground focus:border-foreground transition-all outline-none appearance-none"
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
                            <div className="flex flex-col gap-3">
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
            </FilterDrawer>

            {/* Payments List */}
            <div className="px-4 md:px-8 space-y-8">
                <div className="glass-premium dark:bg-neutral-900/40 border-white/5 rounded-[3rem] shadow-minimal overflow-hidden">
                    <div className="p-8 border-b border-white/5">
                        <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40 lowercase">{t('paymentHistory')}</h3>
                    </div>

                    {filteredPayments.length === 0 ? (
                        <div className="py-40 text-center space-y-10">
                            <div className="w-32 h-32 glass-premium rounded-[3rem] flex items-center justify-center mx-auto shadow-minimal">
                                <AlertCircle className="w-12 h-12 text-muted-foreground/20" />
                            </div>
                            <h3 className="text-2xl font-black tracking-tighter text-foreground lowercase opacity-40">{t('noPaymentsFound')}</h3>
                            <button
                                onClick={() => setIsAddModalOpen(true)}
                                className="px-10 py-5 bg-foreground text-background rounded-full font-black uppercase text-[10px] tracking-widest hover:scale-105 active:scale-95 transition-all shadow-premium-dark"
                            >
                                {t('addFirstPayment')}
                            </button>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-50 dark:divide-neutral-800">
                            {filteredPayments.map(payment => (
                                <div
                                    key={payment.id}
                                    onClick={() => {
                                        if (payment.displayType === 'rent') {
                                            setSelectedPayment(payment);
                                            setDetailsModalProps({ editMode: false });
                                            setIsDetailsModalOpen(true);
                                        }
                                    }}
                                    className="p-4 md:p-6 flex items-center justify-between gap-4 md:gap-8 hover:bg-slate-50/50 dark:hover:bg-neutral-800/10 transition-all group cursor-pointer relative overflow-hidden"
                                >
                                    <div className="absolute inset-0 bg-gradient-to-r from-indigo-500/5 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-500 pointer-events-none" />

                                    <div className="flex items-center gap-4 md:gap-8 flex-1 min-w-0">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-xl glass-premium flex flex-col items-center justify-center shrink-0 border border-white/10 group-hover:scale-105 transition-all duration-300">
                                            <span className="text-xl font-black text-foreground leading-none">{format(new Date(payment.due_date), 'dd')}</span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mt-0.5">{format(new Date(payment.due_date), 'MMM').toLowerCase()}</span>
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-3">
                                                <h3 className="text-lg font-black tracking-tight text-foreground truncate lowercase">
                                                    {Array.isArray(payment.contracts?.tenants)
                                                        ? (payment.contracts.tenants[0]?.name || t('unnamedTenant'))
                                                        : (payment.contracts?.tenants?.name || t('unnamedTenant'))}
                                                </h3>
                                                <span className={cn(
                                                    "text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border shrink-0",
                                                    payment.displayType === 'bill' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                                        payment.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                            payment.status === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                                )}>
                                                    {payment.displayType === 'bill' ? t('bills') : payment.status}
                                                </span>
                                            </div>
                                            <p className="text-muted-foreground text-xs font-medium opacity-60 truncate">
                                                {payment.contracts?.properties?.address}, {payment.contracts?.properties?.city}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-6 md:gap-10">
                                        <div className="text-right whitespace-nowrap">
                                            <div className="flex items-baseline gap-1.5 justify-end">
                                                <span className="text-[10px] font-black text-foreground opacity-40">₪</span>
                                                <span className="text-xl md:text-2xl font-black text-foreground tracking-tight">
                                                    {(payment.paid_amount || payment.amount).toLocaleString()}
                                                </span>
                                            </div>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block">{t('amount')}</span>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {payment.status === 'pending' && (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setSelectedPayment(payment);
                                                        setDetailsModalProps({ editMode: true, status: 'paid' });
                                                        setIsDetailsModalOpen(true);
                                                    }}
                                                    className="h-10 w-10 md:h-12 md:w-12 glass-premium border-emerald-500/20 rounded-xl text-emerald-500/80 hover:bg-emerald-500 hover:text-white transition-all duration-500 shadow-minimal flex items-center justify-center shrink-0 group/btn"
                                                    title={t('markAsPaid')}
                                                >
                                                    <CalendarCheck className="w-5 h-5 group-hover/btn:scale-110 transition-transform" />
                                                </button>
                                            )}

                                            <button className="h-10 w-10 md:h-12 md:w-12 glass-premium border-white/10 rounded-xl text-muted-foreground opacity-30 group-hover:opacity-100 group-hover:bg-foreground group-hover:text-background transition-all duration-300 shadow-minimal flex items-center justify-center shrink-0">
                                                <ArrowRight className="w-5 h-5" />
                                            </button>
                                        </div>
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
                initialEditMode={detailsModalProps.editMode}
                initialStatus={detailsModalProps.status}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedPayment(null);
                    setDetailsModalProps({ editMode: false });
                }}
                onSuccess={() => {
                    clear();
                    fetchPayments();
                }}
            />
        </div>
    );
}
