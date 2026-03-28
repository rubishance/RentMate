import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { format, subMonths, addMonths, isBefore, isAfter, startOfDay, parseISO } from 'date-fns';
import { he } from 'date-fns/locale';
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
    Clock, ArrowRight, Receipt as ReceiptIcon
} from 'lucide-react';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { LINKAGE_TYPES, LINKAGE_SUB_TYPES } from "../constants/linkageTypes";
import { getPaymentStatusConfig } from "../constants/statusConfig";
import { PAYMENT_METHODS } from '../constants/paymentMethods';

export function Payments() {
    const { t, lang } = useTranslation();
    const { scanAndRepair, isRepairing } = usePaymentRepair();
    const toast = useToast();
    const [viewStyle, setViewStyle] = useState<'cards' | 'table'>('cards');
    const { get, set, clear } = useDataCache();
    const [payments, setPayments] = useState<any[]>([]);
    const { indexedAmounts, loading: indexingLoading } = useIndexedPayments(payments);

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
    const [displayMode, setDisplayMode] = useState<'expected' | 'actual' | 'all'>('all');
    const [stats, setStats] = useState({
        monthlyExpected: 0,
        monthlyIndexedTotal: 0,
        monthlyIndexSum: 0,
        pending: 0,
        basePending: 0,
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
        propertyId: 'all',
        startDate: '',
        endDate: '',
        paymentMethods: [] as string[],
        contractStatus: 'active'
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

                const allItems = [...rentPayments];
                allItems.sort((a, b) => new Date(b.due_date).getTime() - new Date(a.due_date).getTime());

                setPayments(allItems);
                set(CACHE_KEY, allItems, { persist: true });
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

    async function handleQuickApproveFromList(payment: any) {
        setLoading(true);
        try {
            const expectedAmount = payment.displayType === 'rent' && indexedAmounts[payment.id] ? indexedAmounts[payment.id] : payment.amount;
            const defaultMethod = payment.payment_method || payment.contracts?.payment_method || null;

            const { error } = await supabase
                .from("payments")
                .update({
                    status: "paid",
                    paid_amount: expectedAmount,
                    payment_method: defaultMethod,
                    paid_date: payment.due_date,
                })
                .eq("id", payment.id);

            if (error) throw error;
            
            // Refresh data
            fetchPayments();
            toast.success(t("paymentSaved") || "התשלום עודכן בהצלחה");
        } catch (error) {
            console.error("Error quick approving payment:", error);
            toast.error(t("error") || "שגיאה בעדכון התשלום");
        } finally {
            setLoading(false);
        }
    }

    useEffect(() => {
        if (payments.length > 0) {
            calculateStats(payments);
        }
    }, [payments, indexedAmounts]);

    function calculateStats(data: any[]) {
        const now = new Date();
        const yearMonth = format(now, 'yyyy-MM');
        const today = startOfDay(now);

        let monthlyBase = 0;
        let monthlyIndexedTotal = 0;
        let indexSum = 0;
        let pending = 0;
        let basePending = 0;
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

            const dynamicIndexedAmount = isRent && indexedAmounts[p.id] ? indexedAmounts[p.id] : p.amount;
            const baseAmount = p.original_amount || p.amount;

            // Monthly Expected (Total for this month)
            if (pYearMonth === yearMonth) {
                const currentDiff = Math.max(0, dynamicIndexedAmount - baseAmount);

                monthlyBase += baseAmount;
                monthlyIndexedTotal += dynamicIndexedAmount;
                indexSum += currentDiff;

                if (isRent) contractBreakdown[contractId].monthlyExpected += dynamicIndexedAmount;
            }

            // Pending (Future or Today, not paid)
            if (p.status === 'pending') {
                pending += dynamicIndexedAmount;
                basePending += baseAmount;
                if (isRent) contractBreakdown[contractId].pending += dynamicIndexedAmount;
            }

            // Overdue (Past, not paid/cancelled)
            if (p.status === 'overdue' || (p.status === 'pending' && dueDate < today)) {
                overdue += dynamicIndexedAmount;
            }

            // Partial Debt
            if (p.status === 'paid' && p.paid_amount != null) {
                const diff = dynamicIndexedAmount! - p.paid_amount;
                if (diff > 1) {
                    partialDebt += diff;
                }
            }
        });

        setStats({
            monthlyExpected: monthlyBase, // Legacy prop name, but now stores base
            monthlyIndexedTotal: monthlyIndexedTotal,
            monthlyIndexSum: indexSum,
            pending: pending,
            basePending: basePending,
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

        if (filters.contractStatus && filters.contractStatus !== 'all') {
            if (p.contracts && p.contracts.status !== filters.contractStatus) return false;
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

        if (filters.propertyId && filters.propertyId !== 'all') {
            const propertyId = p.contracts?.properties?.id || p.property_id;
            if (propertyId !== filters.propertyId) return false;
        }

        if (filters.paymentMethods.length > 0 && !filters.paymentMethods.includes(p.payment_method)) return false;

        if (filters.startDate && p.due_date < filters.startDate) return false;
        if (filters.endDate && p.due_date > filters.endDate) return false;



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
            propertyId: 'all',
            startDate: '',
            endDate: '',
            paymentMethods: [],
            contractStatus: 'active'
        });
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

    const renderPaymentCard = (payment: any, isActionNeeded: boolean) => {
        const canApprove = payment.status === 'pending';
        const isPaid = payment.status === 'paid';
        const isRent = payment.displayType === 'rent';

        const tenant = Array.isArray(payment.contracts?.tenants)
            ? payment.contracts.tenants[0]
            : payment.contracts?.tenants;

        const property = payment.contracts?.properties || {
            address: payment.property_address || payment.file_name || payment.title || '',
            city: payment.property_city || ''
        };

        return (
            <div
                key={payment.id}
                onClick={() => {
                    if (isRent) {
                        setSelectedPayment(payment);
                        setDetailsModalProps({ editMode: false });
                        setIsDetailsModalOpen(true);
                    }
                }}
                className={cn(
                    "bg-white dark:bg-neutral-900 rounded-2xl sm:rounded-[20px] shadow-sm border border-slate-100 dark:border-white/5 p-4 flex items-center justify-between w-full transition-all group overflow-hidden relative",
                    isRent ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:shadow-md" : ""
                )}
            >
                {/* Right Column: Date & Tenant */}
                <div className="flex flex-col items-start w-[90px] sm:w-[120px] shrink-0">
                    <span className="text-xl sm:text-2xl font-bold text-indigo-950 dark:text-indigo-100 leading-tight">
                        {format(new Date(payment.due_date), 'dd/MM/yy')}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 truncate w-full text-right">
                        {tenant?.name || t('unnamedTenant')}
                    </span>
                </div>

                {/* Center Column: Status Badge */}
                <div className="flex flex-1 justify-center px-1 sm:px-2 min-w-0">
                    {!isRent && (
                        <h3 className="text-xs sm:text-sm font-bold tracking-tight text-foreground truncate min-w-0 mr-2 hidden sm:block">
                            {payment.title || payment.file_name || t('financeBills')}
                        </h3>
                    )}
                    {(() => {
                        const config = getPaymentStatusConfig(payment.status);
                        return (
                            <span className={cn(
                                "px-3 py-1 sm:py-1.5 rounded-full text-[11px] sm:text-xs font-bold tracking-wide border whitespace-nowrap",
                                payment.displayType === 'bill' ? 'bg-primary/10 text-primary border-primary/20' : 
                                cn(config.bg, config.color, config.border)
                            )}>
                                {payment.displayType === 'bill' ? t('bills') :
                                    isPaid ? t('financeActual') : t('financeExpected')}
                            </span>
                        );
                    })()}
                </div>

                {/* Left Column: Amount & Property */}
                <div className="flex flex-col items-end w-[90px] sm:w-[120px] shrink-0 relative">
                    <span className="text-xl sm:text-2xl font-bold text-indigo-950 dark:text-indigo-100 leading-tight">
                        {formatCurrency(payment.paid_amount || payment.amount)}
                    </span>
                    <span className="text-sm font-semibold text-slate-500 dark:text-slate-400 truncate w-full text-left rtl:text-right">
                        {property.address}
                    </span>
                    
                    {/* Quick Approve Button (Replaces Swipe) */}
                    {canApprove && (
                        <div className="absolute -top-1 -left-1 sm:-left-3 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    handleInstaPay(payment);
                                }}
                                className="bg-success/10 hover:bg-success text-success hover:text-white rounded-full w-8 h-8 shrink-0 flex items-center justify-center shadow-sm"
                                title={t('markAsPaid')}
                            >
                                <CheckCircle2 className="w-5 h-5" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    const renderTable = (paymentsList: any[]) => (
        <div className="overflow-x-auto glass-premium rounded-2xl border border-white/5 shadow-low bg-white/30 dark:bg-neutral-900/30">
            <table className="w-full text-left border-collapse min-w-[600px]">
                <thead>
                    <tr className="border-b border-black/5 dark:border-white/5 bg-background0/5 text-xs uppercase font-black tracking-widest text-muted-foreground">
                        <th className={cn("p-6", lang === 'he' ? "rounded-tr-2xl" : "rounded-tl-2xl")}>{t('date') || 'Date'}</th>
                        <th className="p-6">{t('tenant') || 'Tenant'}</th>
                        <th className="p-6">{t('asset') || 'Asset'}</th>
                        <th className="p-6">{t('status') || 'Status'}</th>
                        <th className="p-6">{t('method') || 'Method'}</th>
                        <th className={cn("p-6", lang === 'he' ? "text-left rounded-tl-2xl" : "text-right rounded-tr-2xl")}>{t('amount') || 'Amount'}</th>
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
                                <div className="font-bold text-base tracking-tight">{format(new Date(payment.due_date), 'dd/MM/yyyy')}</div>
                            </td>
                            <td className="p-6">
                                <span className="font-bold text-base block truncate max-w-[150px]">
                                    {Array.isArray(payment.contracts?.tenants)
                                        ? (payment.contracts.tenants[0]?.name || t('unnamedTenant'))
                                        : (payment.contracts?.tenants?.name || t('unnamedTenant'))}
                                </span>
                            </td>
                            <td className="p-6 text-sm font-semibold text-muted-foreground max-w-[150px] truncate">
                                {payment.contracts?.properties?.address}
                            </td>
                            <td className="p-6">
                                {(() => {
                                    const config = getPaymentStatusConfig(payment.status);
                                    return (
                                        <span className={cn(
                                            "text-xs px-2.5 py-1 rounded-full uppercase font-black tracking-widest border shrink-0 inline-block",
                                            payment.displayType === 'bill' ? 'bg-primary/10 text-primary border-primary/20' : 
                                            cn(config.bg, config.color, config.border)
                                        )}>
                                            {payment.displayType === 'bill' ? t('bills') : t(config.labelKey as any)}
                                        </span>
                                    );
                                })()}
                            </td>
                            <td className="p-6 text-xs font-black uppercase tracking-widest opacity-90">
                                <div className="flex items-center gap-2">
                                    <span>{payment.payment_method ? t(payment.payment_method) : '-'}</span>
                                    {payment.receipt_url && (
                                        <div className="w-6 h-6 rounded-md bg-primary/10 flex items-center justify-center shrink-0" title={t('receiptAttached') || 'קבלה מצורפת'}>
                                            <ReceiptIcon className="w-3.5 h-3.5 text-primary" />
                                        </div>
                                    )}
                                </div>
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
                                        className="bg-success/10 hover:bg-success text-success hover:text-white rounded-xl w-8 h-8 opacity-0 group-hover:opacity-100 transition-opacity"
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
                                                    <span className="text-xs text-muted-foreground font-medium leading-none mt-1">
                                                        {t('indexed')}: ₪{formatCurrency(indexedAmounts[payment.id]!)}
                                                    </span>
                                                )}
                                                {isPaid && Math.abs(diff) > 1 && (
                                                    <span className={cn("text-xs font-black leading-none mt-1", diff > 0 ? "text-success" : "text-destructive")}>
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
                        <div className="flex items-center gap-4 py-3.5 px-2 opacity-60">
                            <div className="h-px flex-1 bg-border/50" />
                            <span className="text-xs font-black uppercase tracking-[0.2em] text-muted-foreground">{format(pDate, 'MMMM yyyy', { locale: lang === 'he' ? he : undefined })}</span>
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
            <div className="pt-16 px-5 space-y-12">
                <div className="space-y-4">
                    <Skeleton className="h-4 w-32 rounded-full" />
                    <Skeleton className="h-12 w-64 rounded-xl" />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <Skeleton className="h-44 rounded-2xl" />
                    <Skeleton className="h-44 rounded-2xl" />
                </div>
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <Skeleton key={i} className="h-24 rounded-2xl" />
                    ))}
                </div>
            </div>
        );
    }

    return (
        <div className="pt-2 pb-24 md:pb-8 md:pt-8 px-5 space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-300 w-full max-w-[100vw] overflow-x-hidden">
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-end gap-4 w-full">
                    {/* Placeholder for layout */}
                    <div className="h-14 w-14 shrink-0 opacity-0 pointer-events-none" />
                </div>
                
                {/* Floating Action Button - FIXED so it never moves */}
                <div className={cn(
                    "fixed z-[60]",
                    lang === 'he' ? 'left-5' : 'right-5',
                    "top-[88px] md:top-[144px]"
                )}>
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-14 w-14 rounded-2xl p-0 shrink-0 bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center"
                        title={t('addPayment')}
                    >
                        <Plus className="w-7 h-7" />
                    </Button>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                        {/* displayMode toggle removed - relocated to hidden filters */}

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="hidden sm:flex p-1 bg-background0/5 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-500/10 h-12">
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
                                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    {tab.label}
                                </button>
                            ))}
                        </div>

                        <div className="hidden sm:flex p-1 bg-background0/5 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-500/10 h-12">
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
                                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                            : "text-muted-foreground hover:text-foreground"
                                    )}
                                    title={tab.label}
                                >
                                    {tab.icon}
                                </button>
                            ))}
                        </div>

                        <div className="relative flex-1 sm:flex-none">
                            <button
                                onClick={() => setShowFilters(!showFilters)}
                                className={`text-sm font-bold flex items-center justify-center gap-2 px-6 h-12 rounded-2xl transition-all w-full ${
                                    showFilters 
                                        ? 'bg-primary text-primary-foreground shadow-md' 
                                        : 'text-muted-foreground hover:text-primary bg-background0/5 dark:bg-white/5 border border-border/10 hover:border-primary/20'
                                }`}
                            >
                                <Filter className="w-4 h-4" />
                                {lang === 'he' ? 'מסננים' : 'Filters'}
                            </button>
                        </div>

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
                        animate={{ height: 'auto', opacity: 1, marginBottom: 0 }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-visible"
                    >
                        <Card glass className="relative z-50 rounded-[2rem] border shadow-minimal bg-background0/5 border-slate-500/10 overflow-visible">
                            <CardContent className="p-6">
                                <div className="flex flex-col gap-6">
                                    <div className="flex justify-between items-center -mb-2">
                                        <h3 className="text-sm font-black uppercase tracking-widest text-foreground">{t('filters') || 'Filters'}</h3>
                                        {(displayMode !== 'all' || filters.tenantIds.length > 0 || filters.propertyId !== 'all' || filters.paymentMethods.length > 0 || filters.startDate || filters.endDate || filters.contractStatus !== 'active') && (
                                            <button
                                                onClick={resetFilters}
                                                className="text-xs font-black uppercase tracking-widest text-primary hover:opacity-80 flex items-center gap-1.5 transition-opacity whitespace-nowrap bg-background0/80 backdrop-blur-md px-2 py-1 rounded-xl border border-primary/10 shadow-sm"
                                            >
                                                <RotateCcw className="w-3 h-3" />
                                                {t('resetFilters') || 'Reset'}
                                            </button>
                                        )}
                                    </div>
                                    <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
                                        <div className="space-y-2 min-w-0">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70 block px-2">{t('status')} {t('payments') || 'Payment'}</label>
                                            <Select
                                                value={displayMode}
                                                onChange={(v: any) => setDisplayMode(v)}
                                                options={[
                                                    { value: 'all', label: t('all') || 'Both' },
                                                    { value: 'expected', label: t('financeExpected') || 'Expected' },
                                                    { value: 'actual', label: t('financeActual') || 'Actual' }
                                                ]}
                                            />
                                        </div>

                                        <div className="space-y-2 min-w-0">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70 block px-2">{t('tenant')}</label>
                                            <MultiSelect
                                                placeholder={t('allTenants')}
                                                options={uniqueTenants.map((t: any) => ({ value: t.id, label: t.name }))}
                                                selected={filters.tenantIds}
                                                onChange={(vals) => setFilters(prev => ({ ...prev, tenantIds: vals }))}
                                            />
                                        </div>

                                        <div className="space-y-2 min-w-0">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70 block px-2">{t('asset')}</label>
                                            <Select
                                                value={filters.propertyId}
                                                onChange={(val: any) => setFilters(prev => ({ ...prev, propertyId: val }))}
                                                options={[
                                                    { value: 'all', label: t('allAssets') || 'All Assets' },
                                                    ...uniqueProperties.map((p: any) => ({ value: p.id, label: p.address }))
                                                ]}
                                            />
                                        </div>

                                        <div className="space-y-2 min-w-0">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70 block px-2">{t('method')}</label>
                                            <MultiSelect
                                                placeholder={t('allMethods')}
                                                options={PAYMENT_METHODS.map(pm => ({
                                                    value: pm.id,
                                                    label: t(pm.labelKey as any) || pm.labelKey
                                                }))}
                                                selected={filters.paymentMethods}
                                                onChange={(vals) => setFilters(prev => ({ ...prev, paymentMethods: vals }))}
                                            />
                                        </div>

                                        <div className="space-y-2 min-w-0">
                                            <label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70 block px-2">{t('status')} {t('contract')}</label>
                                            <Select
                                                value={filters.contractStatus}
                                                onChange={(val: any) => setFilters(prev => ({ ...prev, contractStatus: val }))}
                                                options={[
                                                    { value: 'all', label: t('all') || 'All' },
                                                    { value: 'active', label: t('active') || 'Active' },
                                                    { value: 'archived', label: t('archived') || 'Archived' }
                                                ]}
                                            />
                                        </div>
                                    </div>

                                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-4 border-t border-slate-500/10 w-full">
                                        <div className="flex-1 w-full min-w-0">
                                            <div className="flex items-start gap-4 w-full">
                                                <div className="flex-1 space-y-2 min-w-0">
                                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70 block px-2">החל מתאריך</label>
                                                    <DatePicker
                                                        placeholder={t('from')}
                                                        value={filters.startDate ? new Date(filters.startDate) : undefined}
                                                        onChange={(date) => setFilters(prev => ({
                                                            ...prev,
                                                            startDate: date ? format(date, 'yyyy-MM-dd') : ''
                                                        }))}
                                                        className="w-full text-xs font-bold"
                                                        hideIcon
                                                    />
                                                </div>
                                                <div className="flex-1 space-y-2 min-w-0">
                                                    <label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70 block px-2">עד תאריך</label>
                                                    <DatePicker
                                                        placeholder={t('to')}
                                                        value={filters.endDate ? new Date(filters.endDate) : undefined}
                                                        onChange={(date) => setFilters(prev => ({
                                                            ...prev,
                                                            endDate: date ? format(date, 'yyyy-MM-dd') : ''
                                                        }))}
                                                        className="w-full text-xs font-bold"
                                                        hideIcon
                                                    />
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Filters Summary (Quick remove) */}
            {(filters.tenantIds.length > 0 || filters.propertyId !== 'all') && (
                <div className="flex flex-wrap gap-2">

                </div>
            )}

            {/* Stats Unified Card */}
            <Card glass className="rounded-2xl border shadow-low bg-primary/5 border-primary/10 overflow-hidden">
                <div className="flex flex-col md:flex-row divide-y md:divide-y-0 md:divide-x md:divide-x-reverse divide-primary/10">
                    {/* Expected Income Section */}
                    <div className="flex-[1.2] py-4 px-5 lg:px-6 lg:py-5 flex flex-col justify-center relative">
                        {/* Decorative glow */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-primary/20 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none" />
                        
                        <div className="flex flex-col w-full relative z-10 gap-1.5 sm:gap-2">
                            <h3 className="text-sm font-black text-center uppercase tracking-[0.2em] text-foreground w-full">
                                {t('monthlyExpectedTitle') || 'צפי חודשי'}
                            </h3>
                            <div className="flex w-full items-start justify-between gap-2">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-muted-foreground opacity-90 block">
                                        {t('withoutLinkage') || 'ללא הצמדה'}
                                    </span>
                                    <div className="flex items-baseline">
                                        {indexingLoading ? (
                                            <Skeleton className="h-8 w-24 rounded-lg bg-black/10 dark:bg-white/10" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tighter">{(stats.monthlyExpected || 0).toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex flex-col text-left rtl:text-right items-end sm:items-start gap-0.5">
                                    <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-muted-foreground opacity-90 block">
                                        {t('includingLinkage') || 'כולל הצמדה'}
                                    </span>
                                    <div className="flex items-baseline">
                                        {indexingLoading ? (
                                            <Skeleton className="h-8 w-24 rounded-lg bg-primary/20 dark:bg-primary/20" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-primary tracking-tighter">{(stats.monthlyIndexedTotal || 0).toLocaleString()}</span>
                                        )}
                                    </div>
                                    {!indexingLoading && stats.monthlyIndexSum > 0 && (
                                        <div className="mt-1 inline-flex items-center gap-1 text-success text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                                            <ArrowUpRight className="w-2.5 h-2.5" />
                                            + {(stats.monthlyIndexSum || 0).toLocaleString()} {t('indexSum')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Per-contract Breakdown */}
                        {Object.values(stats.contractBreakdown).filter(c => c.isRent && c.monthlyExpected > 0).length > 1 && (
                            <div className="w-full mt-4 bg-primary/5 rounded-2xl p-4 border border-primary/10 relative z-10">
                                <div className="text-xs font-black uppercase tracking-widest text-primary/60 mb-3">{t('contractBreakdown') || 'Breakdown'}</div>
                                <div className="space-y-2">
                                    {Object.values(stats.contractBreakdown)
                                        .filter(c => c.isRent && c.monthlyExpected > 0)
                                        .map(contract => (
                                            <div key={contract.id} className="flex items-center justify-between gap-4">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-foreground truncate">{contract.name || t('unnamedTenant')}</span>
                                                    <span className="text-xs text-muted-foreground truncate">{contract.properties?.address}</span>
                                                </div>
                                                <div className="text-xs font-black text-primary dark:text-primary shrink-0">
                                                    {indexingLoading ? <Skeleton className="h-4 w-12 bg-primary/20" /> : `₪${contract.monthlyExpected.toLocaleString()}`}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Pending Section */}
                    <div className="flex-1 py-4 px-5 lg:px-6 lg:py-5 flex flex-col justify-center relative bg-white/40 dark:bg-black/20">
                        {/* Decorative glow */}
                        <div className="absolute bottom-0 left-0 w-32 h-32 bg-orange-500/10 rounded-full blur-3xl translate-y-1/2 -translate-x-1/2 pointer-events-none" />

                        <div className="flex flex-col w-full relative z-10 gap-1.5 sm:gap-2">
                            <h3 className="text-sm font-black text-center uppercase tracking-[0.2em] text-foreground w-full">
                                {t('totalPendingToPay') || 'סה״כ ממתין לתשלום'}
                            </h3>
                            <div className="flex items-start justify-between w-full gap-2">
                                <div className="flex flex-col gap-0.5">
                                    <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-muted-foreground opacity-90 block">
                                        {t('withoutLinkage') || 'ללא הצמדה'}
                                    </span>
                                    <div className="flex items-baseline">
                                        {indexingLoading ? (
                                            <Skeleton className="h-8 w-24 rounded-lg bg-black/10 dark:bg-white/10" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tighter">{(stats.basePending || 0).toLocaleString()}</span>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="flex flex-col text-left rtl:text-right items-end sm:items-start gap-0.5">
                                    <span className="text-xs sm:text-sm font-black uppercase tracking-[0.2em] text-muted-foreground opacity-90 block">
                                        {t('includingLinkage') || 'כולל הצמדה'}
                                    </span>
                                    <div className="flex items-baseline">
                                        {indexingLoading ? (
                                            <Skeleton className="h-8 w-24 rounded-lg bg-warning/20 dark:bg-warning/20" />
                                        ) : (
                                            <span className="text-2xl sm:text-3xl lg:text-4xl font-black text-warning tracking-tighter">{stats.pending.toLocaleString()}</span>
                                        )}
                                    </div>
                                    {!indexingLoading && stats.partialDebt > 1 && (
                                        <div className="mt-1 inline-flex items-center gap-1 text-destructive text-[10px] sm:text-xs font-bold uppercase tracking-wide">
                                            <ArrowUpRight className="w-2.5 h-2.5" />
                                            + {Math.round(stats.partialDebt).toLocaleString()} {t('remainingDebt')}
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Per-contract Breakdown (Pending) */}
                        {Object.values(stats.contractBreakdown).filter(c => c.isRent && c.pending > 0).length > 1 && (
                            <div className="w-full mt-6 bg-warning/5 rounded-2xl p-4 border border-warning/10 relative z-10">
                                <div className="text-xs font-black uppercase tracking-widest text-warning/60 mb-3">{t('contractBreakdown') || 'Breakdown'}</div>
                                <div className="space-y-2">
                                    {Object.values(stats.contractBreakdown)
                                        .filter(c => c.isRent && c.pending > 0)
                                        .map(contract => (
                                            <div key={contract.id} className="flex items-center justify-between gap-4">
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-xs font-bold text-foreground truncate">{contract.name || t('unnamedTenant')}</span>
                                                    <span className="text-xs text-muted-foreground truncate">{contract.properties?.address}</span>
                                                </div>
                                                <div className="text-xs font-black text-warning shrink-0">
                                                    {indexingLoading ? <Skeleton className="h-4 w-12 bg-warning/20" /> : `₪${contract.pending.toLocaleString()}`}
                                                </div>
                                            </div>
                                        ))}
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </Card>



            {/* Payments List */}
            <div className="space-y-4 -mt-2">
                {sortedFilteredPayments.length === 0 ? (
                    <div className="py-40 text-center space-y-8">
                        <div className="w-24 h-24 glass-premium rounded-[2.5rem] flex items-center justify-center mx-auto shadow-minimal">
                            <AlertCircle className="w-10 h-10 text-muted-foreground/20" />
                        </div>
                        <div className="space-y-2">
                            <h3 className="text-2xl font-black tracking-tighter text-foreground lowercase opacity-70">{t('noPaymentsFound')}</h3>
                        </div>
                        <Button
                            onClick={() => setIsAddModalOpen(true)}
                            className="shadow-premium"
                        >
                            {t('addFirstPayment')}
                        </Button>
                    </div>
                ) : viewStyle === 'table' ? (
                    <div className="space-y-12">
                        {actionNeededPayments.length > 0 && (
                            <div className="space-y-4 relative">
                                <div className="flex items-center gap-3 px-2">
                                    <div className="w-8 h-8 rounded-full bg-destructive/10 flex items-center justify-center">
                                        <AlertCircle className="w-4 h-4 text-destructive" />
                                    </div>
                                    <h2 className="text-xl font-black text-destructive tracking-tight">{t('actionNeeded') || 'Action Needed'}</h2>
                                </div>
                                {renderTable(actionNeededPayments)}
                            </div>
                        )}

                        {regularPayments.length > 0 && (
                            <div className="space-y-4 relative pb-4">
                                {actionNeededPayments.length > 0 && (
                                    <div className="flex items-center gap-3 px-2 pt-4">
                                        <div className="w-8 h-8 rounded-full bg-success/10 flex items-center justify-center">
                                            <CheckCircle2 className="w-4 h-4 text-success" />
                                        </div>
                                        <h2 className="text-xl font-black text-foreground tracking-tight">{t('upcomingAndPaid') || 'Upcoming & Paid'}</h2>
                                    </div>
                                )}
                                {renderTable(regularPayments)}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="space-y-3 sm:space-y-4 pt-2">
                        {sortedFilteredPayments.map(p => {
                            const isActionNeeded = p.status === 'overdue' || (p.status === 'pending' && new Date(p.due_date) < nowForRender);
                            return renderPaymentCard(p, isActionNeeded);
                        })}
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
                onSuccess={async () => {
                    clear();
                    await fetchPayments();
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
