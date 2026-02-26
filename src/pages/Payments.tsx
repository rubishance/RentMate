import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subMonths, addMonths, isBefore, isAfter, startOfDay, parseISO } from 'date-fns';
import { supabase } from '../lib/supabase';
import { cn } from '../lib/utils';
import type { Payment } from '../types/database';
import { AddPaymentModal } from '../components/modals/AddPaymentModal';
import { PaymentDetailsModal } from '../components/modals/PaymentDetailsModal';
import { BulkCheckModal } from '../components/modals/BulkCheckModal';
import { DatePicker } from '../components/ui/DatePicker';
import { MultiSelect } from '../components/ui/MultiSelect';
import { RegeneratePaymentsModal } from '../components/modals/RegeneratePaymentsModal';
import { useTranslation } from '../hooks/useTranslation';
import { useDataCache } from '../contexts/DataCacheContext';
import { useToast } from '../hooks/useToast';
import { usePaymentRepair } from '../hooks/usePaymentRepair';
import { useIndexedPayments } from '../hooks/useIndexedPayments';
import { Skeleton } from '../components/ui/Skeleton';
import { FilterDrawer } from '../components/common/FilterDrawer';
import {
    RotateCcw, X, ArrowUpRight, Plus, CalendarCheck, Search, Filter,
    Layout, Calendar, ChevronRight, CheckCircle2, AlertCircle, RefreshCw, Wallet,
    Clock, ArrowRight
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';

export function Payments() {
    const { t, lang } = useTranslation();
    const { scanAndRepair, isRepairing } = usePaymentRepair();
    const toast = useToast();
    const [viewStyle, setViewStyle] = useState<'cards' | 'table'>('cards');
    const { get, set, clear } = useDataCache();
    const [payments, setPayments] = useState<any[]>([]);
    const { indexedAmounts } = useIndexedPayments(payments);

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
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('asc');
    const [periodFilter, setPeriodFilter] = useState<'all' | '3m' | '6m' | '1y' | 'next3m' | 'next6m' | 'next1y' | 'currentWindow'>('all');
    const [displayMode, setDisplayMode] = useState<'expected' | 'actual' | 'all'>('all');
    const [stats, setStats] = useState({
        monthlyExpected: 0,
        monthlyIndexSum: 0,
        pending: 0,
        overdue: 0,
        partialDebt: 0,
        contractBreakdown: {} as Record<string, { id: string, name: string, properties: any, monthlyExpected: number, pending: number, isRent: boolean }>
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isBulkCheckModalOpen, setIsBulkCheckModalOpen] = useState(false);
    const [isRegenerateModalOpen, setIsRegenerateModalOpen] = useState(false);
    const [detailsModalProps, setDetailsModalProps] = useState<{ editMode: boolean, status?: any }>({ editMode: false });
    const [showFilters, setShowFilters] = useState(false);
    const [filters, setFilters] = useState({
        tenantIds: [] as string[],
        propertyIds: [] as string[],
        startDate: '',
        endDate: '',
        paymentMethods: [] as string[],
        types: [] as string[],
        contractStatus: ['active'] as string[]
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
            calculateStats(cached);
        }

        try {
            const { data, error } = await supabase
                .from('payments')
                .select(`
                    *,
                    contracts!inner (
                        id,
                        tenants,
                        status,
                        properties (id, address, city),
                        linkage_type,
                        base_index_date,
                        base_index_value,
                        linkage_sub_type,
                        linkage_ceiling,
                        linkage_floor,
                        base_rent
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
                        payment_method: 'transfer',
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
        const yearMonth = format(now, 'yyyy-MM');
        const today = startOfDay(now);

        let monthly = 0;
        let indexSum = 0;
        let pending = 0;
        let overdue = 0;
        let partialDebt = 0;
        let contractBreakdown: Record<string, { id: string, name: string, properties: any, monthlyExpected: number, pending: number, isRent: boolean }> = {};

        data.forEach(p => {
            if (!p.due_date || p.status === 'cancelled') return;

            const dueDate = parseISO(p.due_date);
            const pYearMonth = p.due_date.substring(0, 7);
            const contractId = p.contracts?.id || `bill-${p.id}`; // Fallback for bills if needed
            const isRent = p.displayType === 'rent';

            if (!contractBreakdown[contractId] && isRent) {
                contractBreakdown[contractId] = {
                    id: contractId,
                    name: Array.isArray(p.contracts?.tenants) ? p.contracts.tenants[0]?.name : p.contracts?.tenants?.name,
                    properties: p.contracts?.properties,
                    monthlyExpected: 0,
                    pending: 0,
                    isRent: true
                };
            }

            // Monthly Expected (Total for this month)
            if (pYearMonth === yearMonth) {
                monthly += p.amount;
                if (isRent) contractBreakdown[contractId].monthlyExpected += p.amount;
                if (p.original_amount && p.amount > p.original_amount) {
                    indexSum += (p.amount - p.original_amount);
                }
            }

            // Pending (Future or Today, not paid)
            if (p.status === 'pending') {
                pending += p.amount;
                if (isRent) contractBreakdown[contractId].pending += p.amount;
            }

            // Overdue (Past, not paid/cancelled)
            if (p.status === 'overdue' || (p.status === 'pending' && dueDate < today)) {
                overdue += p.amount;
            }

            // Partial Debt
            if (p.status === 'paid' && p.paid_amount != null) {
                const expectedAmount = p.displayType === 'rent' && indexedAmounts[p.id] ? indexedAmounts[p.id] : p.amount;
                const diff = expectedAmount! - p.paid_amount;
                if (diff > 1) {
                    partialDebt += diff;
                }
            }
        });

        setStats({
            monthlyExpected: monthly,
            monthlyIndexSum: indexSum,
            pending: pending,
            overdue: overdue,
            partialDebt: partialDebt,
            contractBreakdown: contractBreakdown
        });
    }

    const filteredPayments = payments.filter(payment => {
        const p = payment as any;

        // Display Mode Filter (Expected vs Actual)
        if (displayMode === 'expected' && p.status !== 'pending' && p.status !== 'overdue') return false;
        if (displayMode === 'actual' && p.status !== 'paid') return false;

        if (filters.types.length > 0 && !filters.types.includes(p.displayType)) return false;

        if (filters.contractStatus && filters.contractStatus.length > 0) {
            if (p.contracts && !filters.contractStatus.includes(p.contracts.status)) return false;
        }

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

            if (periodFilter === '3m' || periodFilter === '6m' || periodFilter === '1y') {
                const months = periodFilter === '3m' ? 3 : periodFilter === '6m' ? 6 : 12;
                const threshold = subMonths(now, months);
                if (isBefore(dueDate, threshold) || isAfter(dueDate, now)) return false;
            } else if (periodFilter === 'next3m' || periodFilter === 'next6m' || periodFilter === 'next1y') {
                const months = periodFilter === 'next3m' ? 3 : periodFilter === 'next6m' ? 6 : 12;
                const threshold = addMonths(now, months);
                if (isAfter(dueDate, threshold) || isBefore(dueDate, now)) return false;
            } else if (periodFilter === 'currentWindow') {
                const start = subMonths(now, 1);
                const end = addMonths(now, 3);
                if (isBefore(dueDate, start) || isAfter(dueDate, end)) return false;
            }
        }

        return true;
    });

    const sortedFilteredPayments = [...filteredPayments].sort((a, b) => {
        const timeA = new Date((a as any).due_date || 0).getTime();
        const timeB = new Date((b as any).due_date || 0).getTime();
        return sortOrder === 'desc' ? timeB - timeA : timeA - timeB;
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
            types: [],
            contractStatus: ['active']
        });
        setPeriodFilter('all');
        setDisplayMode('all');
    };

    const nowForRender = startOfDay(new Date());

    const actionNeededPayments = sortedFilteredPayments.filter((p: any) => {
        const dueDate = new Date(p.due_date);
        return p.status === 'overdue' || (p.status === 'pending' && dueDate < nowForRender);
    });

    const regularPayments = sortedFilteredPayments.filter((p: any) => {
        const dueDate = new Date(p.due_date);
        return !(p.status === 'overdue' || (p.status === 'pending' && dueDate < nowForRender));
    });

    const formatCurrency = (amount: number) => {
        return amount.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 });
    };

    const renderPaymentCard = (payment: any, isActionNeeded: boolean) => (
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
            className={cn("group p-0 rounded-[2rem] border-white/5 cursor-pointer", isActionNeeded ? "bg-rose-500/5 dark:bg-rose-500/10 border-rose-500/20" : "")}
        >
            <CardContent className="p-4 md:p-6 flex items-center justify-between gap-4">
                <div className="flex items-center gap-4 md:gap-6 flex-1 min-w-0">
                    <div className={cn("w-12 h-12 md:w-14 md:h-14 rounded-2xl glass-premium flex flex-col items-center justify-center shrink-0 border border-white/10 group-hover:scale-105 transition-all duration-300", isActionNeeded ? "bg-rose-500/10 text-rose-600" : "")}>
                        <span className="text-lg md:text-xl font-black leading-none">{format(new Date(payment.due_date), 'dd')}</span>
                        <span className="text-[9px] font-black uppercase tracking-widest opacity-60 mt-0.5">{format(new Date(payment.due_date), 'MMM')}</span>
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
                                {payment.displayType === 'bill' ? t('bills') : t(payment.status)}
                            </span>
                        </div>
                        <p className="text-muted-foreground text-xs font-medium opacity-60 truncate">
                            {payment.contracts?.properties?.address}, {payment.contracts?.properties?.city}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4 md:gap-8">
                    <div className="text-right hidden sm:block">
                        <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 block">{payment.payment_method || '-'}</span>
                    </div>
                    <div className="text-right">
                        <div className="flex items-baseline gap-1 justify-end">
                            <span className={cn("text-[10px] font-black opacity-40", isActionNeeded ? "text-rose-500" : "text-foreground")}>₪</span>
                            <div className="flex flex-col items-end">
                                <span className={cn("text-lg md:text-2xl font-black tracking-tight", isActionNeeded ? "text-rose-600" : "text-foreground")}>
                                    {formatCurrency(payment.paid_amount || payment.amount)}
                                </span>
                                {(() => {
                                    const expectedAmount = payment.displayType === 'rent' && indexedAmounts[payment.id] ? indexedAmounts[payment.id] : payment.amount;
                                    const currentPaidAmount = payment.paid_amount || payment.amount;
                                    const isPaid = payment.status === 'paid';
                                    const diff = currentPaidAmount - expectedAmount!;

                                    return (
                                        <>
                                            {payment.displayType === 'rent' && indexedAmounts[payment.id] && (
                                                <span className="text-[10px] text-muted-foreground font-medium leading-none mt-1">
                                                    {t('indexed')}: ₪{formatCurrency(indexedAmounts[payment.id]!)}
                                                </span>
                                            )}
                                            {isPaid && Math.abs(diff) > 1 && (
                                                <span className={cn("text-[10px] font-black leading-none mt-1", diff > 0 ? "text-emerald-500" : "text-rose-500")}>
                                                    {t('diff')} {diff > 0 ? '(עודף)' : '(חסר)'}: {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                                </span>
                                            )}
                                        </>
                                    );
                                })()}
                            </div>
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
                                <CheckCircle2 className="w-5 h-5" />
                            </Button>
                        )}

                        <div className="w-10 h-10 md:w-11 md:h-11 rounded-xl bg-slate-100 dark:bg-neutral-800 flex items-center justify-center text-muted-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300">
                            <ArrowRight className={cn("w-4 h-4 transition-transform group-hover:translate-x-0.5", lang === 'he' ? 'rotate-180' : '')} />
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );

    const renderTable = (paymentsList: any[]) => (
        <div className="overflow-x-auto glass-premium rounded-[2.5rem] border border-white/5 shadow-sm bg-white/30 dark:bg-neutral-900/30">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 bg-slate-500/5 text-[10px] uppercase font-black tracking-widest text-muted-foreground">
                        <th className={cn("p-6", lang === 'he' ? "rounded-tr-[2.5rem]" : "rounded-tl-[2.5rem]")}>{t('date') || 'Date'}</th>
                        <th className="p-6">{t('tenant') || 'Tenant'}</th>
                        <th className="p-6">{t('asset') || 'Asset'}</th>
                        <th className="p-6">{t('status') || 'Status'}</th>
                        <th className="p-6">{t('method') || 'Method'}</th>
                        <th className={cn("p-6", lang === 'he' ? "text-left rounded-tl-[2.5rem]" : "text-right rounded-tr-[2.5rem]")}>{t('amount') || 'Amount'}</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {paymentsList.map((payment) => (
                        <tr
                            key={payment.id}
                            onClick={() => {
                                if (payment.displayType === 'rent') {
                                    setSelectedPayment(payment);
                                    setDetailsModalProps({ editMode: false });
                                    setIsDetailsModalOpen(true);
                                }
                            }}
                            className="group hover:bg-white/50 dark:hover:bg-neutral-800/50 transition-colors cursor-pointer"
                        >
                            <td className="p-6">
                                <div className="font-bold text-sm tracking-tight">{format(new Date(payment.due_date), 'dd/MM/yyyy')}</div>
                            </td>
                            <td className="p-6">
                                <span className="font-bold text-sm block truncate max-w-[150px]">
                                    {Array.isArray(payment.contracts?.tenants)
                                        ? (payment.contracts.tenants[0]?.name || t('unnamedTenant'))
                                        : (payment.contracts?.tenants?.name || t('unnamedTenant'))}
                                </span>
                            </td>
                            <td className="p-6 text-xs font-semibold text-muted-foreground max-w-[150px] truncate">
                                {payment.contracts?.properties?.address}
                            </td>
                            <td className="p-6">
                                <span className={cn(
                                    "text-[9px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest border shrink-0 inline-block",
                                    payment.displayType === 'bill' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                        payment.status === 'paid' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                            payment.status === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                )}>
                                    {payment.displayType === 'bill' ? t('bills') : t(payment.status)}
                                </span>
                            </td>
                            <td className="p-6 text-[10px] font-black uppercase tracking-widest opacity-60">
                                {payment.payment_method || '-'}
                            </td>
                            <td className={cn("p-6 font-black text-base flex items-center gap-4", lang === 'he' ? "flex-row-reverse" : "justify-end")}>
                                {payment.status === 'pending' && (
                                    <Button
                                        size="icon"
                                        variant="ghost"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleInstaPay(payment);
                                        }}
                                        className="bg-emerald-500/10 hover:bg-emerald-500 text-emerald-500 hover:text-white rounded-xl w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title={t('markAsPaid')}
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                    </Button>
                                )}
                                <div className="flex flex-col items-end">
                                    <span>₪{formatCurrency(payment.paid_amount || payment.amount)}</span>
                                    {(() => {
                                        const expectedAmount = payment.displayType === 'rent' && indexedAmounts[payment.id] ? indexedAmounts[payment.id] : payment.amount;
                                        const currentPaidAmount = payment.paid_amount || payment.amount;
                                        const isPaid = payment.status === 'paid';
                                        const diff = currentPaidAmount - expectedAmount!;

                                        return (
                                            <>
                                                {payment.displayType === 'rent' && indexedAmounts[payment.id] && (
                                                    <span className="text-[10px] text-muted-foreground font-medium leading-none mt-1">
                                                        {t('indexed')}: ₪{formatCurrency(indexedAmounts[payment.id]!)}
                                                    </span>
                                                )}
                                                {isPaid && Math.abs(diff) > 1 && (
                                                    <span className={cn("text-[10px] font-black leading-none mt-1", diff > 0 ? "text-emerald-500" : "text-rose-500")}>
                                                        {t('diff')} {diff > 0 ? '(עודף)' : '(חסר)'}: {diff > 0 ? '+' : ''}{formatCurrency(diff)}
                                                    </span>
                                                )}
                                            </>
                                        );
                                    })()}
                                </div>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );

    const renderCardsWithDividers = (paymentsList: any[]) => {
        let currentMonthStr = "";
        return paymentsList.map((payment, index) => {
            const pDate = new Date(payment.due_date);
            const pMonthStr = format(pDate, 'MM yyyy'); // e.g. 02 2026
            const showDivider = pMonthStr !== currentMonthStr;
            if (showDivider) {
                currentMonthStr = pMonthStr;
            }

            return (
                <React.Fragment key={payment.id || index}>
                    {showDivider && index !== 0 && (
                        <div className="flex items-center gap-4 py-6 px-2 opacity-60">
                            <div className="h-px flex-1 bg-border/50" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground">{format(pDate, 'MMMM yyyy')}</span>
                            <div className="h-px flex-1 bg-border/50" />
                        </div>
                    )}
                    {renderPaymentCard(payment, false)}
                </React.Fragment>
            );
        });
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
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 overflow-hidden">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-1">
                            <CalendarCheck className="w-3 h-3 text-indigo-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                {t('financialOverview')}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight truncate lowercase">
                            {t('payments')}
                        </h1>
                    </div>

                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        variant="jewel"
                        className="h-14 w-14 rounded-2xl p-0 flex items-center justify-center shadow-jewel shrink-0"
                        title={t('addPayment')}
                    >
                        <Plus className="w-7 h-7" />
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    <div className="flex p-1 bg-slate-500/5 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-500/10 w-full sm:w-fit">
                        {[
                            { id: 'expected', label: t('financeExpected') || 'Expected' },
                            { id: 'actual', label: t('financeActual') || 'Actual' },
                            { id: 'all', label: t('all') || 'Both' }
                        ].map((tab) => (
                            <button
                                key={tab.id}
                                onClick={() => setDisplayMode(tab.id as any)}
                                className={cn(
                                    "flex-1 sm:flex-none px-6 py-2.5 rounded-xl text-xs font-bold transition-all duration-300",
                                    displayMode === tab.id
                                        ? "bg-white dark:bg-neutral-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-white/10"
                                        : "text-muted-foreground hover:text-foreground"
                                )}
                            >
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="hidden sm:flex p-1 bg-slate-500/5 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-500/10 h-12">
                            {[
                                { id: 'desc', label: t('sortNewestFirst') || 'מהחדש לישן' },
                                { id: 'asc', label: t('sortOldestFirst') || 'מהישן לחדש' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setSortOrder(tab.id as 'asc' | 'desc')}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300",
                                        sortOrder === tab.id
                                            ? "bg-white dark:bg-neutral-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-white/10"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="hidden sm:flex p-1 bg-slate-500/5 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-500/10 h-12">
                            {[
                                { id: 'cards', icon: <Layout className="w-4 h-4" />, label: t('cardsView') || 'Cards' },
                                { id: 'table', icon: <Layout className="w-4 h-4 rotate-90" />, label: t('tableView') || 'Table' }
                            ].map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setViewStyle(tab.id as 'cards' | 'table')}
                                    className={cn(
                                        "px-4 py-2 rounded-xl text-xs font-bold transition-all duration-300 flex items-center justify-center min-w-[3rem]",
                                        viewStyle === tab.id
                                            ? "bg-white dark:bg-neutral-800 text-indigo-600 shadow-sm border border-slate-200 dark:border-white/10"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={tab.label}
                                >
                                    {tab.icon}
                                </button>
                            ))}
                        </div>

                        <Button
                            variant="secondary"
                            onClick={() => setShowFilters(!showFilters)}
                            className={cn(
                                "h-12 px-6 rounded-2xl flex items-center justify-center gap-2 transition-all duration-300 flex-1 sm:flex-none",
                                showFilters ? "bg-indigo-500 text-white shadow-jewel border-indigo-500/50" : "bg-white/50 dark:bg-neutral-800/50 hover:bg-white dark:hover:bg-neutral-800 text-indigo-600 dark:text-indigo-400"
                            )}
                        >
                            <Filter className={cn("w-5 h-5", showFilters ? "text-white" : "text-indigo-500")} />
                            <span className={cn("text-sm font-bold", showFilters ? "text-white" : "text-indigo-600 dark:text-indigo-400")}>{t('filters') || 'Filters'}</span>
                        </Button>

                        <Button
                            variant="secondary"
                            onClick={() => setIsBulkCheckModalOpen(true)}
                            className="hidden sm:flex h-12 px-6 rounded-2xl"
                        >
                            <Wallet className="w-4 h-4 mr-2 text-amber-500" />
                            {t('bulkCheckEntryTitle')}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Inline Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginBottom: 48 }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-visible"
                    >
                        <Card glass className="relative z-50 rounded-[2rem] border shadow-minimal bg-slate-500/5 border-slate-500/10 overflow-visible">
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-6">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('timePeriod')}</label>
                                            <Select
                                                value={periodFilter}
                                                onChange={(v: any) => setPeriodFilter(v)}
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

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('tenant')}</label>
                                            <MultiSelect
                                                placeholder={t('allTenants')}
                                                options={uniqueTenants.map((t: any) => ({ value: t.id, label: t.name }))}
                                                selected={filters.tenantIds}
                                                onChange={(vals) => setFilters(prev => ({ ...prev, tenantIds: vals }))}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('asset')}</label>
                                            <MultiSelect
                                                placeholder={t('allAssets')}
                                                options={uniqueProperties.map((p: any) => ({ value: p.id, label: p.address }))}
                                                selected={filters.propertyIds}
                                                onChange={(vals) => setFilters(prev => ({ ...prev, propertyIds: vals }))}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('method')}</label>
                                            <MultiSelect
                                                placeholder={t('allMethods')}
                                                options={[
                                                    { value: 'transfer', label: t('transfer') },
                                                    { value: 'checks', label: t('check') },
                                                    { value: 'cash', label: t('cash') },
                                                    { value: 'bit', label: t('bit') || 'Bit' }
                                                ]}
                                                selected={filters.paymentMethods}
                                                onChange={(vals) => setFilters(prev => ({ ...prev, paymentMethods: vals }))}
                                            />
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40 block px-2">{t('status')} {t('contract')}</label>
                                            <MultiSelect
                                                placeholder={t('all')}
                                                options={[
                                                    { value: 'active', label: t('active') },
                                                    { value: 'archived', label: t('archived') || 'Archived' },
                                                    { value: 'completed', label: t('completed') || 'Completed' },
                                                    { value: 'draft', label: t('draft') || 'Draft' }
                                                ]}
                                                selected={filters.contractStatus}
                                                onChange={(vals) => setFilters(prev => ({ ...prev, contractStatus: vals }))}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-500/10">
                                        <div className="flex flex-wrap items-center gap-2">
                                            <div className="flex items-center gap-2 bg-slate-500/5 px-4 py-2 rounded-xl border border-slate-500/10">
                                                <DatePicker
                                                    placeholder={t('from')}
                                                    value={filters.startDate ? new Date(filters.startDate) : undefined}
                                                    onChange={(date) => setFilters(prev => ({
                                                        ...prev,
                                                        startDate: date ? format(date, 'yyyy-MM-dd') : ''
                                                    }))}
                                                    className="bg-transparent border-0 h-auto p-0 w-24 text-xs font-bold"
                                                />
                                                <span className="text-muted-foreground text-[10px]">—</span>
                                                <DatePicker
                                                    placeholder={t('to')}
                                                    value={filters.endDate ? new Date(filters.endDate) : undefined}
                                                    onChange={(date) => setFilters(prev => ({
                                                        ...prev,
                                                        endDate: date ? format(date, 'yyyy-MM-dd') : ''
                                                    }))}
                                                    className="bg-transparent border-0 h-auto p-0 w-24 text-xs font-bold"
                                                />
                                            </div>

                                            <Select
                                                value={filters.types.length === 1 ? filters.types[0] : 'all'}
                                                onChange={(v: any) => setFilters(prev => ({ ...prev, types: v === 'all' ? [] : [v] }))}
                                                options={[
                                                    { value: 'all', label: t('allTypes') },
                                                    { value: 'rent', label: t('rent') },
                                                    { value: 'bills', label: t('bills') }
                                                ]}
                                                className="w-32"
                                            />
                                        </div>

                                        {(periodFilter !== 'all' || filters.tenantIds.length > 0 || filters.propertyIds.length > 0 || filters.paymentMethods.length > 0 || filters.startDate || filters.endDate || filters.types.length > 0 || !filters.contractStatus.includes('active') || filters.contractStatus.length !== 1) && (
                                            <Button
                                                variant="ghost"
                                                onClick={resetFilters}
                                                className="text-[10px] font-black uppercase tracking-widest text-indigo-600 hover:text-indigo-700"
                                            >
                                                <RotateCcw className="w-3 h-3 mr-2" />
                                                {t('resetFilters') || 'Reset'}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Filters Summary (Quick remove) */}
            {(periodFilter !== 'all' || filters.tenantIds.length > 0 || filters.propertyIds.length > 0) && (
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
                </div>
            )}

            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-8">
                <Card glass className="rounded-[2.5rem] border shadow-sm bg-indigo-500/5 border-indigo-500/10">
                    <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-full">
                        <div className="flex items-center gap-8">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
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
                        </div>

                        {/* Per-contract Breakdown */}
                        {Object.values(stats.contractBreakdown).filter(c => c.isRent && c.monthlyExpected > 0).length > 1 && (
                            <div className="w-full md:w-auto md:min-w-[40%] bg-indigo-500/5 rounded-2xl p-4 border border-indigo-500/10">
                                <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500/60 mb-3">{t('contractBreakdown') || 'Breakdown'}</div>
                                <div className="space-y-2">
                                    {Object.values(stats.contractBreakdown)
                                        .filter(c => c.isRent && c.monthlyExpected > 0)
                                        .map(contract => (
                                            <div key={contract.id} className="flex items-center justify-between gap-4">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-foreground truncate">{contract.name || t('unnamedTenant')}</span>
                                                    <span className="text-[10px] text-muted-foreground truncate">{contract.properties?.address}</span>
                                                </div>
                                                <div className="text-xs font-black text-indigo-600 dark:text-indigo-400 shrink-0">
                                                    ₪{contract.monthlyExpected.toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card glass className="rounded-[2.5rem] border shadow-sm bg-orange-500/5 border-orange-500/10">
                    <CardContent className="p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-8 h-full">
                        <div className="flex items-center gap-8">
                            <div className="w-16 h-16 rounded-2xl bg-white/10 flex items-center justify-center border border-white/10 shrink-0">
                                <Clock className="w-8 h-8 text-orange-500" />
                            </div>
                            <div>
                                <span className="text-[10px] font-black uppercase tracking-[0.2em] text-orange-500/60 mb-1 block">{t('pending')}</span>
                                <div className="flex items-baseline gap-1">
                                    <span className="text-sm font-black text-orange-500 opacity-40">₪</span>
                                    <span className="text-4xl font-black text-orange-500 tracking-tighter">{stats.pending.toLocaleString()}</span>
                                </div>
                                {stats.partialDebt > 1 && (
                                    <div className="mt-2 inline-flex items-center gap-2 px-2 py-1 bg-rose-500/10 text-rose-500 rounded-full border border-rose-500/20 text-[9px] font-bold uppercase tracking-wide">
                                        <ArrowUpRight className="w-3 h-3" />
                                        + ₪{Math.round(stats.partialDebt).toLocaleString()} {t('remainingDebt')} = ₪{Math.round(stats.pending + stats.partialDebt).toLocaleString()}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Per-contract Breakdown */}
                        {Object.values(stats.contractBreakdown).filter(c => c.isRent && c.pending > 0).length > 1 && (
                            <div className="w-full md:w-auto md:min-w-[40%] bg-orange-500/5 rounded-2xl p-4 border border-orange-500/10">
                                <div className="text-[10px] font-black uppercase tracking-widest text-orange-500/60 mb-3">{t('contractBreakdown') || 'Breakdown'}</div>
                                <div className="space-y-2">
                                    {Object.values(stats.contractBreakdown)
                                        .filter(c => c.isRent && c.pending > 0)
                                        .map(contract => (
                                            <div key={contract.id} className="flex items-center justify-between gap-4">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-foreground truncate">{contract.name || t('unnamedTenant')}</span>
                                                    <span className="text-[10px] text-muted-foreground truncate">{contract.properties?.address}</span>
                                                </div>
                                                <div className="text-xs font-black text-orange-600 dark:text-orange-400 shrink-0">
                                                    ₪{contract.pending.toLocaleString()}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>
            </div>



            {/* Payments List */}
            <div className="space-y-4 pt-4">
                {sortedFilteredPayments.length === 0 ? (
                    <div className="py-40 text-center space-y-8">
                        <div className="w-24 h-24 glass-premium rounded-[2.5rem] flex items-center justify-center mx-auto shadow-minimal">
                            <AlertCircle className="w-10 h-10 text-muted-foreground/20" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tighter text-foreground lowercase opacity-40">{t('noPaymentsFound')}</h3>
                        </div>
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="shadow-premium"
                        >
                            {t('addFirstPayment')}
                        </Button>
                    </div>
                ) : (
                    <div className="space-y-12">
                        {actionNeededPayments.length > 0 && (
                            <div className="space-y-4 relative">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="w-8 h-8 rounded-full bg-rose-500/10 flex items-center justify-center">
                                        <AlertCircle className="w-4 h-4 text-rose-500" />
                                    </div>
                                    <h2 className="text-xl font-black text-rose-500 tracking-tight">{t('actionNeeded') || 'Action Needed'}</h2>
                                </div>
                                {viewStyle === 'table' ? renderTable(actionNeededPayments) : actionNeededPayments.map(p => renderPaymentCard(p, true))}
                            </div>
                        )}

                        {regularPayments.length > 0 && (
                            <div className="space-y-4 relative pb-4">
                                {actionNeededPayments.length > 0 && (
                                    <div className="flex items-center gap-3 px-2 pt-4">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                                        </div>
                                        <h2 className="text-xl font-black text-foreground tracking-tight">{t('upcomingAndPaid') || 'Upcoming & Paid'}</h2>
                                    </div>
                                )}
                                {viewStyle === 'table' ? renderTable(regularPayments) : renderCardsWithDividers(regularPayments)}
                            </div>
                        )}
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
                indexedAmount={selectedPayment ? indexedAmounts[selectedPayment.id] : undefined}
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
