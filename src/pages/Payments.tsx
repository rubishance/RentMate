import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { format, subMonths, addMonths, isAfter, isBefore, startOfDay } from 'date-fns';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type { Payment } from '../types/database';
import { AddPaymentModal } from '../components/modals/AddPaymentModal';
import { PaymentDetailsModal } from '../components/modals/PaymentDetailsModal';
import { BulkCheckModal } from '../components/modals/BulkCheckModal';
import { DatePicker } from '../components/ui/DatePicker';
import { RegeneratePaymentsModal } from '../components/modals/RegeneratePaymentsModal';
import { useTranslation } from '../hooks/useTranslation';
import { useDataCache } from '../contexts/DataCacheContext';
import { useToast } from '../hooks/useToast';
import { usePaymentRepair } from '../hooks/usePaymentRepair';
import { Skeleton } from '../components/ui/Skeleton';
import {
    RotateCcw, X, ArrowUpRight, Plus, CalendarCheck, Search,
    Layout, Calendar, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Wallet,
    Clock, ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { MultiSelect } from '../components/ui/MultiSelect';

export function Payments() {
    const { t, lang } = useTranslation();
    const { scanAndRepair } = usePaymentRepair();
    const toast = useToast();
    const { get, set, clear } = useDataCache();
    const [payments, setPayments] = useState<any[]>([]);

    // Auto-repair on mount
    useEffect(() => {
        const runRepair = async () => {
            const repaired = await scanAndRepair(true); // silent mode initially
            if (repaired) {
                fetchPayments();
            }
        };
        runRepair();
    }, [scanAndRepair]);

    const [loading, setLoading] = useState(true);
    const [periodFilter, setPeriodFilter] = useState<'all' | '3m' | '6m' | '1y' | 'next3m' | 'next6m' | 'next1y' | 'currentWindow'>('all');
    const [stats, setStats] = useState({
        monthlyExpected: 0,
        monthlyIndexSum: 0,
        pending: 0,
        overdue: 0
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isBulkCheckModalOpen, setIsBulkCheckModalOpen] = useState(false);
    const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
    const [detailsModalProps, setDetailsModalProps] = useState<{ editMode: boolean, status?: any }>({ editMode: false });
    const [filters, setFilters] = useState({
        tenantIds: [] as string[],
        propertyIds: [] as string[],
        startDate: '',
        endDate: '',
        paymentMethods: [] as string[],
        types: [] as string[]
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
                .eq('user_id', user.id)
                .order('due_date', { ascending: true });

            if (error) {
                console.error('Supabase error:', error);
            }

            if (data) {
                const rentPayments = (data as any[]).map(p => ({
                    ...p,
                    displayType: 'rent'
                }));

                const { data: bills } = await supabase
                    .from('property_documents')
                    .select('*, properties(id, address, city)')
                    .eq('user_id', user.id)
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

                allItems.sort((a, b) => {
                    // 1. Status priority: pending (expected/overdue) comes first
                    if (a.status === 'pending' && b.status !== 'pending') return -1;
                    if (a.status !== 'pending' && b.status === 'pending') return 1;

                    // 2. For same status:
                    if (a.status === 'pending') {
                        // For pending, we want oldest first (overdue) to appear at the top
                        return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
                    } else {
                        // For paid/bill, we want newest first (recently paid)
                        return new Date(b.due_date).getTime() - new Date(a.due_date).getTime();
                    }
                });

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

    async function handleInstaPay(payment: any) {
        setSelectedPayment(payment);
        setDetailsModalProps({
            editMode: true,
            status: 'paid'
        });
        setIsDetailsModalOpen(true);
    }

    function calculateStats(data: any[]) {
        const now = new Date();
        const currentMonth = now.getMonth();
        const currentYear = now.getFullYear();

        let monthly = 0;
        let indexSum = 0;
        let pending = 0;
        let overdue = 0;

        data.forEach(p => {
            const dueDate = new Date(p.due_date);

            if (p.status === 'pending') {
                pending += p.amount;
                // If it's pending AND the due date is in the past (before today)
                if (dueDate < new Date(now.getFullYear(), now.getMonth(), now.getDate())) {
                    overdue += p.amount;
                }
            }

            if (dueDate.getMonth() === currentMonth && dueDate.getFullYear() === currentYear) {
                monthly += p.amount;
                if (p.original_amount && p.amount > p.original_amount) {
                    indexSum += (p.amount - p.original_amount);
                }
            }
        });

        setStats({
            monthlyExpected: monthly,
            monthlyIndexSum: indexSum,
            pending: pending,
            overdue: overdue
        });
    }

    const filteredPayments = payments.filter(payment => {
        const p = payment as any;
        if (filters.types.length > 0 && !filters.types.includes(p.displayType)) return false;

        if (filters.tenantIds.length > 0) {
            const tenantsArray = Array.isArray(p.contracts?.tenants) ? p.contracts.tenants : (p.contracts?.tenants ? [p.contracts.tenants] : []);
            const matches = tenantsArray.some((t: any) =>
                filters.tenantIds.includes(t.id) ||
                filters.tenantIds.includes(t.id_number) ||
                filters.tenantIds.includes(t.name)
            );
            if (!matches) return false;
        }

        if (filters.propertyIds.length > 0) {
            const propertyId = p.contracts?.properties?.id || p.property_id;
            if (!filters.propertyIds.includes(propertyId)) return false;
        }

        if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(p.payment_method)) return false;
        if (filters.startDate && p.due_date < filters.startDate) return false;
        if (filters.endDate && p.due_date > filters.endDate) return false;

        if (periodFilter !== 'all') {
            const dueDate = new Date(p.due_date);
            const now = startOfDay(new Date());

            if (periodFilter === '3m') {
                const threshold = subMonths(now, 3);
                if (isBefore(dueDate, threshold) || isAfter(dueDate, now)) return false;
            } else if (periodFilter === '6m') {
                const threshold = subMonths(now, 6);
                if (isBefore(dueDate, threshold) || isAfter(dueDate, now)) return false;
            } else if (periodFilter === '1y') {
                const threshold = subMonths(now, 12);
                if (isBefore(dueDate, threshold) || isAfter(dueDate, now)) return false;
            } else if (periodFilter === 'next3m') {
                const threshold = addMonths(now, 3);
                if (isAfter(dueDate, threshold) || isBefore(dueDate, now)) return false;
            } else if (periodFilter === 'next6m') {
                const threshold = addMonths(now, 6);
                if (isAfter(dueDate, threshold) || isBefore(dueDate, now)) return false;
            } else if (periodFilter === 'next1y') {
                const threshold = addMonths(now, 12);
                if (isAfter(dueDate, threshold) || isBefore(dueDate, now)) return false;
            } else if (periodFilter === 'currentWindow') {
                const start = subMonths(now, 1);
                const end = addMonths(now, 3);
                if (isBefore(dueDate, start) || isAfter(dueDate, end)) return false;
            }
        }

        return true;
    });

    const uniqueTenants = Array.from(new Set(payments.flatMap(p => {
        const t = (p as any).contracts?.tenants;
        return Array.isArray(t) ? t : [t];
    }).filter(Boolean).map(t => JSON.stringify({
        id: t.id || t.id_number || t.name,
        name: t.name
    })))).map(s => JSON.parse(s as string));

    const uniqueProperties = Array.from(new Set(payments.map(p => {
        const pr = (p as any).contracts?.properties || {
            id: (p as any).property_id,
            address: (p as any).contracts?.properties?.address,
            city: (p as any).contracts?.properties?.city
        };
        return pr.id ? JSON.stringify(pr) : null;
    }).filter(Boolean))).map(s => JSON.parse(s as string));

    const resetFilters = () => {
        setFilters({
            tenantIds: [],
            propertyIds: [],
            startDate: '',
            endDate: '',
            paymentMethods: [],
            types: []
        });
        setPeriodFilter('all');
    };

    if (loading) {
        return (
            <div className="pb-40 pt-16 px-4 md:px-8 space-y-12">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-32 rounded-full" />
                    <Skeleton className="h-12 w-64 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Skeleton className="h-44 rounded-[2.5rem]" />
                    <Skeleton className="h-44 rounded-[2.5rem]" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-[2rem]" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="pb-40 pt-8 px-4 md:px-8 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-1">
                        <CalendarCheck className="w-3 h-3 text-indigo-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                            {t('financialOverview')}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight lowercase">
                        {t('payments')}
                    </h1>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex items-center gap-3">
                        <Button
                            variant="secondary"
                            onClick={() => setIsBulkCheckModalOpen(true)}
                            className="hidden sm:flex"
                        >
                            <Wallet className="w-4 h-4 mr-2 text-amber-500" />
                            {t('bulkCheckEntryTitle')}
                        </Button>

                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="shadow-jewel"
                        >
                            <Plus className="w-5 h-5" />
                        </Button>
                    </div>
                </div>
            </div>

            {/* Inline Filters */}
            <Card glass className="relative z-50 rounded-[2rem] border shadow-minimal bg-slate-500/5 border-slate-500/10 overflow-visible">
                <CardContent className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                        <div className="space-y-3">
                            <Select
                                label={t('timePeriod')}
                                value={periodFilter}
                                onChange={(value) => setPeriodFilter(value as any)}
                                options={[
                                    { value: 'all', label: t('allTime') },
                                    { value: '3m', label: t('last3Months') },
                                    { value: '6m', label: t('last6Months') },
                                    { value: '1y', label: t('lastYear') },
                                    { value: 'next3m', label: t('next3Months') || 'Next 3 Months' },
                                    { value: 'next6m', label: t('next6Months') || 'Next 6 Months' },
                                    { value: 'next1y', label: t('nextYear') || 'Next Year' },
                                    { value: 'currentWindow', label: t('currentWindow') || 'Current Window' }
                                ]}
                            />
                        </div>

                        <MultiSelect
                            label={t('paymentType')}
                            selected={filters.types}
                            onChange={(value) => setFilters(prev => ({ ...prev, types: value as any }))}
                            options={[
                                { value: 'rent', label: t('rent') },
                                { value: 'bill', label: t('bills') }
                            ]}
                            placeholder={t('allTypes')}
                        />

                        <MultiSelect
                            label={t('tenant')}
                            selected={filters.tenantIds}
                            onChange={(value) => setFilters(prev => ({ ...prev, tenantIds: value }))}
                            options={uniqueTenants.map((t: any) => ({ value: t.id, label: t.name }))}
                            placeholder={t('allTenants')}
                        />

                        <MultiSelect
                            label={t('asset')}
                            selected={filters.propertyIds}
                            onChange={(value) => setFilters(prev => ({ ...prev, propertyIds: value }))}
                            options={uniqueProperties.map((p: any) => ({ value: p.id, label: p.address }))}
                            placeholder={t('allAssets')}
                        />

                        <MultiSelect
                            label={t('paymentMethod')}
                            selected={filters.paymentMethods}
                            onChange={(value) => setFilters(prev => ({ ...prev, paymentMethods: value }))}
                            options={[
                                { value: 'bank_transfer', label: t('bank_transfer') },
                                { value: 'check', label: t('check') },
                                { value: 'cash', label: t('cash') },
                                { value: 'bit', label: t('bit') },
                                { value: 'credit_card', label: t('credit_card') },
                                { value: 'other', label: t('other') }
                            ]}
                            placeholder={t('allMethods') || 'All Methods'}
                        />

                        <div className="space-y-3">
                            <label className="text-sm font-medium text-foreground ml-1">{t('period')}</label>
                            <div className="grid grid-cols-2 gap-3">
                                <DatePicker
                                    placeholder={t('from')}
                                    value={filters.startDate ? new Date(filters.startDate) : undefined}
                                    onChange={(date) => setFilters(prev => ({
                                        ...prev,
                                        startDate: date ? format(date, 'yyyy-MM-dd') : ''
                                    }))}
                                />
                                <DatePicker
                                    placeholder={t('to')}
                                    value={filters.endDate ? new Date(filters.endDate) : undefined}
                                    onChange={(date) => setFilters(prev => ({
                                        ...prev,
                                        endDate: date ? format(date, 'yyyy-MM-dd') : ''
                                    }))}
                                />
                            </div>
                        </div>

                        <div className="flex items-end">
                            <Button
                                variant="ghost"
                                onClick={resetFilters}
                                className="w-full h-11 text-xs font-bold text-muted-foreground hover:text-primary"
                            >
                                <RotateCcw className="w-4 h-4 mr-2" />
                                {t('reset')}
                            </Button>
                        </div>
                    </div>
                </CardContent>
            </Card>

            {/* Active Filters Summary (Quick remove) */}
            {(periodFilter !== 'all' || filters.tenantIds.length > 0 || filters.propertyIds.length > 0 || filters.types.length > 0 || filters.startDate || filters.endDate) && (
                <div className="flex flex-wrap gap-2">
                    {periodFilter !== 'all' && (
                        <div className="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-brand-100 dark:border-brand-900/30">
                            {periodFilter === '3m' ? t('last3Months') :
                                periodFilter === '6m' ? t('last6Months') :
                                    periodFilter === '1y' ? t('lastYear') :
                                        periodFilter === 'next3m' ? (t('next3Months') || 'Next 3 Months') :
                                            periodFilter === 'next6m' ? (t('next6Months') || 'Next 6 Months') :
                                                periodFilter === 'next1y' ? (t('nextYear') || 'Next Year') :
                                                    periodFilter === 'currentWindow' ? (t('currentWindow') || 'Current Window') :
                                                        t('allTime')}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setPeriodFilter('all')} />
                        </div>
                    )}
                    {filters.types.map(type => (
                        <div key={type} className="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-brand-100 dark:border-brand-900/30">
                            {t(type as any)}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, types: f.types.filter(t => t !== type) }))} />
                        </div>
                    ))}
                    {filters.tenantIds.map(id => {
                        const name = uniqueTenants.find(t => t.id === id)?.name || id;
                        return (
                            <div key={id} className="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-brand-100 dark:border-brand-900/30">
                                {name}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, tenantIds: f.tenantIds.filter(t => t !== id) }))} />
                            </div>
                        );
                    })}
                    {filters.propertyIds.map(id => {
                        const address = uniqueProperties.find(p => p.id === id)?.address || id;
                        return (
                            <div key={id} className="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-brand-100 dark:border-brand-900/30">
                                {address}
                                <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, propertyIds: f.propertyIds.filter(t => t !== id) }))} />
                            </div>
                        );
                    })}
                    {filters.paymentMethods.map(method => (
                        <div key={method} className="px-4 py-2 bg-brand-50 dark:bg-brand-900/20 text-brand-600 rounded-full text-[10px] font-black uppercase flex items-center gap-2 border border-brand-100 dark:border-brand-900/30">
                            {t(method as any)}
                            <X className="w-3 h-3 cursor-pointer" onClick={() => setFilters(f => ({ ...f, paymentMethods: f.paymentMethods.filter(m => m !== method) }))} />
                        </div>
                    ))}
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <Card glass className="rounded-[2.5rem] border shadow-sm bg-indigo-500/5 border-indigo-500/10">
                    <CardContent className="p-8 flex items-center gap-8">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                            <CalendarCheck className="w-8 h-8 text-indigo-500" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground opacity-60 mb-1 block">{t('monthlyExpected')}</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-black text-foreground opacity-40">₪</span>
                                <span className="text-4xl font-black text-foreground tracking-tighter">{stats.monthlyExpected.toLocaleString()}</span>
                            </div>
                            {stats.monthlyIndexSum > 0 && (
                                <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded-full border border-emerald-500/20 text-[9px] font-bold uppercase tracking-wide">
                                    <ArrowUpRight className="w-3 h-3" />
                                    + ₪{stats.monthlyIndexSum.toLocaleString()} {t('indexSum')}
                                </div>
                            )}
                        </div>
                    </CardContent>
                </Card>

                <Card glass className="rounded-[2.5rem] border shadow-sm bg-orange-500/5 border-orange-500/10">
                    <CardContent className="p-8 flex items-center gap-8">
                        <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10">
                            <Clock className="w-8 h-8 text-orange-500" />
                        </div>
                        <div>
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60 mb-1 block">{t('pending')}</span>
                            <div className="flex items-baseline gap-1">
                                <span className="text-sm font-black text-orange-500 opacity-40">₪</span>
                                <span className="text-4xl font-black text-orange-500 tracking-tighter">{stats.pending.toLocaleString()}</span>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>


            {/* Payments List */}
            <div className="space-y-4">
                {filteredPayments.length === 0 ? (
                    <div className="py-40 text-center space-y-8">
                        <div className="w-24 h-24 glass-premium rounded-[2.5rem] flex items-center justify-center mx-auto shadow-minimal">
                            <AlertCircle className="w-10 h-10 text-muted-foreground/20" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tighter text-foreground lowercase opacity-40">{t('noPaymentsFound')}</h3>
                            <p className="text-sm text-muted-foreground max-w-xs mx-auto">{t('addPaymentDesc')}</p>
                        </div>
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="shadow-premium"
                        >
                            {t('addFirstPayment')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-3">
                        {filteredPayments.map(payment => (
                            <Card
                                key={payment.id}
                                onClick={() => {
                                    if (payment.displayType === 'rent') {
                                        setSelectedPayment(payment);
                                        setDetailsModalProps({ editMode: false });
                                        setIsDetailsModalOpen(true);
                                    }
                                }}
                                hoverEffect
                                glass
                                className="group p-0 rounded-[2rem] border-white/5 cursor-pointer"
                            >
                                <CardContent className="p-4 md:p-6 flex items-center justify-between gap-4">
                                    <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                                        <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl glass-premium flex flex-col items-center justify-center shrink-0 border border-white/10 group-hover:scale-105 transition-all duration-300">
                                            <span className="text-lg md:text-xl font-black text-foreground leading-none">{format(new Date(payment.due_date), 'dd')}</span>
                                            <span className="text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-60 mt-0.5">{format(new Date(payment.due_date), 'MMM')}</span>
                                        </div>

                                        <div className="flex-1 min-w-0 space-y-1">
                                            <div className="flex items-center gap-2">
                                                <h3 className="text-base md:text-lg font-black tracking-tight text-foreground truncate">
                                                    {Array.isArray(payment.contracts?.tenants)
                                                        ? (payment.contracts.tenants[0]?.name || t('unnamedTenant'))
                                                        : (payment.contracts?.tenants?.name || t('unnamedTenant'))}
                                                </h3>
                                                <span className={cn(
                                                    "text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border shrink-0",
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

                                    <div className="flex items-center gap-4 md:gap-8">
                                        <div className="text-right">
                                            <div className="flex items-baseline gap-1 justify-end">
                                                <span className="text-[10px] font-black text-foreground opacity-40">₪</span>
                                                <span className="text-lg md:text-2xl font-black text-foreground tracking-tight">
                                                    {(payment.paid_amount || payment.amount).toLocaleString()}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {payment.status === 'pending' && (
                                                <Button
                                                    size="icon"
                                                    variant="ghost"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleInstaPay(payment);
                                                    }}
                                                    className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl w-10 h-10 md:w-11 md:h-11 shadow-sm"
                                                    title={t('markAsPaid')}
                                                >
                                                    <CalendarCheck className="w-5 h-5" />
                                                </Button>
                                            )}

                                            <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                                                <ArrowRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", lang === 'he' ? 'rotate-180' : '')} />
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                )}
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
            <BulkCheckModal
                isOpen={isBulkCheckModalOpen}
                onClose={() => setIsBulkCheckModalOpen(false)}
                onSuccess={fetchPayments}
            />
            <RegeneratePaymentsModal
                isOpen={isRegenerateModalOpen}
                onClose={() => setIsRegenerateModalOpen(false)}
                onSuccess={fetchPayments}
            />
        </div>
    );
}
