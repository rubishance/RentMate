import { useState, useEffect } from 'react';
import { supabase } from '../../../lib/supabase';
import { Property, Payment, Contract } from '../../../types/database';
import { useTranslation } from '../../../hooks/useTranslation';
import { format, isWithinInterval, parseISO, addDays } from 'date-fns';
import { cn, formatDate } from '../../../lib/utils';
import {
    CalendarIcon,
    WalletIcon,
    ChevronDownIcon,
    FilterIcon,
    ArrowRightIcon,
    FileTextIcon,
    AlertCircleIcon,
    DollarSignIcon,
    ClockIcon,
    CheckCircle2Icon
} from 'lucide-react';
import { DatePicker } from '../../ui/DatePicker';

interface WalletTabProps {
    propertyId: string;
    property: Property;
}

type TypeFilter = 'actual' | 'expected' | 'both';
type CategoryFilter = 'rent' | 'bills' | 'both';

export function WalletTab({ propertyId, property }: WalletTabProps) {
    const { t, lang } = useTranslation();
    const [loading, setLoading] = useState(true);
    const [contracts, setContracts] = useState<Contract[]>([]);
    const [payments, setPayments] = useState<any[]>([]);

    // Filters
    const [selectedContractId, setSelectedContractId] = useState<string>('all');
    const [typeFilter, setTypeFilter] = useState<TypeFilter>('both');
    const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('both');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
    const [showFilters, setShowFilters] = useState(false);

    useEffect(() => {
        fetchData();
    }, [propertyId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            // 1. Fetch Contracts
            const { data: contractsData } = await supabase
                .from('contracts')
                .select('*')
                .eq('property_id', propertyId)
                .eq('user_id', user.id)
                .order('start_date', { ascending: false });

            setContracts(contractsData || []);

            // 1b. Default to active contract
            const activeContract = contractsData?.find(c => c.status === 'active');
            if (activeContract) {
                setSelectedContractId(activeContract.id);
            }

            // 2. Fetch Payments
            const { data: paymentsData } = await supabase
                .from('payments')
                .select('*')
                .eq('user_id', user.id)
                .in('contract_id', (contractsData || []).map(c => c.id));

            // 3. Fetch Bills (property_documents marked as paid)
            const { data: billsData } = await supabase
                .from('property_documents')
                .select('*')
                .eq('property_id', propertyId)
                .eq('user_id', user.id)
                .eq('paid', true)
                .not('amount', 'is', null)
                .ilike('category', 'utility_%');

            // 4. Combine and Sort
            const rentItems = (paymentsData || []).map(p => ({
                ...p,
                displayType: 'rent',
                date: p.due_date
            }));

            const billItems = (billsData || []).map(b => ({
                ...b,
                displayType: 'bill',
                date: b.document_date || b.created_at,
                due_date: b.document_date || b.created_at,
                status: 'paid'
            }));

            const allItems = [...rentItems, ...billItems].sort((a, b) =>
                new Date(b.date).getTime() - new Date(a.date).getTime()
            );

            setPayments(allItems);
        } catch (error) {
            console.error('Error fetching wallet data:', error);
        } finally {
            setLoading(false);
        }
    };

    const filteredPayments = payments.filter(item => {
        // Contract Filter
        if (selectedContractId !== 'all') {
            if (item.displayType === 'rent') {
                if (item.contract_id !== selectedContractId) return false;
            } else {
                // Bill: check if it fits in specified contract dates
                const contract = contracts.find(c => c.id === selectedContractId);
                if (contract) {
                    const itemDate = parseISO(item.date);
                    const start = parseISO(contract.start_date);
                    const end = parseISO(contract.end_date);
                    if (!isWithinInterval(itemDate, { start, end })) return false;
                }
            }
        }

        // Type Filter (Actual = Paid, Expected = Pending/Overdue)
        if (typeFilter !== 'both') {
            const isPaid = item.status === 'paid';
            if (typeFilter === 'actual' && !isPaid) return false;
            if (typeFilter === 'expected' && isPaid) return false;
        }

        // Category Filter
        if (categoryFilter !== 'both') {
            if (categoryFilter === 'rent' && item.displayType !== 'rent') return false;
            if (categoryFilter === 'bills' && item.displayType !== 'bill') return false;
        }

        // Date Range
        if (startDate && item.date < startDate) return false;
        if (endDate && item.date > endDate) return false;

        return true;
    });

    if (loading) {
        return (
            <div className="p-12 flex justify-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Filter Bar */}
            <div className="bg-white dark:bg-neutral-900 rounded-[2rem] border border-slate-100 dark:border-neutral-800 p-4 shadow-minimal">
                <div className="flex flex-wrap items-center gap-3">
                    {/* Contract Select */}
                    <div className="relative flex-1 min-w-[200px]">
                        <select
                            value={selectedContractId}
                            onChange={(e) => setSelectedContractId(e.target.value)}
                            className="w-full h-12 pl-10 pr-4 bg-slate-50 dark:bg-neutral-800 border-none rounded-2xl text-xs font-bold appearance-none focus:ring-2 focus:ring-primary/20 outline-none"
                        >
                            <option value="all">{t('allContracts')}</option>
                            {contracts.map(c => {
                                const tenant = Array.isArray(c.tenants) ? c.tenants[0] : (c as any).tenants;
                                return (
                                    <option key={c.id} value={c.id}>
                                        {formatDate(c.start_date)} - {tenant?.name || t('unnamed')}
                                    </option>
                                );
                            })}
                        </select>
                        <FileTextIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                        <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-50" />
                    </div>

                    {/* Filter Toggle Button */}
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={cn(
                            "h-12 px-6 rounded-2xl border transition-all flex items-center gap-2 text-xs font-bold",
                            showFilters
                                ? "bg-primary text-white border-primary shadow-lg shadow-primary/20"
                                : "bg-white dark:bg-neutral-800 text-muted-foreground border-slate-100 dark:border-neutral-700"
                        )}
                    >
                        <FilterIcon className="w-4 h-4" />
                        {t('filters')}
                    </button>
                </div>

                {/* Expanded Filters */}
                {showFilters && (
                    <div className="pt-4 mt-4 border-t border-slate-50 dark:border-neutral-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-top-2 duration-300">
                        {/* Type Toggle */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 ml-2">
                                {t('paymentType')}
                            </label>
                            <div className="flex p-1 bg-slate-50 dark:bg-neutral-800 rounded-xl">
                                {(['actual', 'expected', 'both'] as const).map(type => (
                                    <button
                                        key={type}
                                        onClick={() => setTypeFilter(type)}
                                        className={cn(
                                            "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                                            typeFilter === type
                                                ? "bg-white dark:bg-neutral-700 text-primary shadow-sm"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {type === 'actual' ? t('financeActual') :
                                            type === 'expected' ? t('financeExpected') :
                                                t('financeAll')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Category Toggle */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 ml-2">
                                {t('category')}
                            </label>
                            <div className="flex p-1 bg-slate-50 dark:bg-neutral-800 rounded-xl">
                                {(['rent', 'bills', 'both'] as const).map(cat => (
                                    <button
                                        key={cat}
                                        onClick={() => setCategoryFilter(cat)}
                                        className={cn(
                                            "flex-1 py-2 text-[10px] font-black uppercase rounded-lg transition-all",
                                            categoryFilter === cat
                                                ? "bg-white dark:bg-neutral-700 text-primary shadow-sm"
                                                : "text-muted-foreground"
                                        )}
                                    >
                                        {cat === 'rent' ? t('financeRent') :
                                            cat === 'bills' ? t('financeBills') :
                                                t('financeAll')}
                                    </button>
                                ))}
                            </div>
                        </div>

                        {/* Dates */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-60 ml-2">
                                {t('dateRange')}
                            </label>
                            <div className="flex gap-2">
                                <DatePicker
                                    value={startDate ? parseISO(startDate) : undefined}
                                    onChange={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                    placeholder={t('startDate')}
                                    className="flex-1"
                                />
                                <DatePicker
                                    value={endDate ? parseISO(endDate) : undefined}
                                    onChange={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                    placeholder={t('endDate')}
                                    className="flex-1"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Timeline List */}
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 shadow-premium overflow-hidden">
                {filteredPayments.length === 0 ? (
                    <div className="py-24 text-center space-y-4">
                        <div className="w-20 h-20 bg-slate-50 dark:bg-neutral-800 rounded-3xl flex items-center justify-center mx-auto shadow-minimal">
                            <AlertCircleIcon className="w-8 h-8 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-foreground opacity-40">
                            {t('noPaymentsFound') ?? (lang === 'he' ? 'לא נמצאו תשלומים' : 'No payments found')}
                        </h3>
                    </div>
                ) : (
                    <div className="divide-y divide-slate-50 dark:divide-neutral-800/50">
                        {filteredPayments.map((item, idx) => {
                            const isPaid = item.status === 'paid';
                            const isRent = item.displayType === 'rent';

                            return (
                                <div
                                    key={item.id}
                                    className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 hover:bg-slate-50/50 dark:hover:bg-neutral-800/10 transition-all group"
                                >
                                    <div className="flex items-center gap-6">
                                        {/* Date Circle */}
                                        <div className="w-16 h-16 rounded-2xl bg-white dark:bg-neutral-800 flex flex-col items-center justify-center shrink-0 border border-slate-100 dark:border-neutral-700 shadow-minimal group-hover:scale-105 transition-transform duration-500">
                                            <span className="text-lg font-black text-foreground">
                                                {format(parseISO(item.date), 'dd')}
                                            </span>
                                            <span className="text-[8px] font-black uppercase tracking-widest text-muted-foreground">
                                                {format(parseISO(item.date), 'MMM').toLowerCase()}
                                            </span>
                                        </div>

                                        <div className="space-y-1.5">
                                            <div className="flex items-center gap-3">
                                                <h4 className="text-base font-black tracking-tight text-foreground">
                                                    {isRent ? t('financeRent') : (item.title || item.file_name || t('financeBills'))}
                                                </h4>
                                                <span className={cn(
                                                    "text-[8px] px-2 py-0.5 rounded-full uppercase font-black tracking-widest",
                                                    isPaid ? "bg-emerald-500/10 text-emerald-500" : "bg-amber-500/10 text-amber-500"
                                                )}>
                                                    {isPaid ? t('financeActual') : t('financeExpected')}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-2 text-xs font-bold text-muted-foreground opacity-60">
                                                {isRent ? <DollarSignIcon className="w-3 h-3" /> : <FileTextIcon className="w-3 h-3" />}
                                                <span>{isRent ? (lang === 'he' ? 'שירותי דיור' : 'Housing') : (lang === 'he' ? 'חשבונות ותחזוקה' : 'Bills & Maintenance')}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between md:justify-end gap-10">
                                        <div className="text-right">
                                            <div className="flex items-baseline gap-1.5 justify-end">
                                                <span className="text-xs font-black text-foreground opacity-30">₪</span>
                                                <span className="text-2xl font-black text-foreground tracking-tighter">
                                                    {item.amount?.toLocaleString()}
                                                </span>
                                            </div>
                                            <p className="text-[9px] font-bold text-muted-foreground opacity-40 uppercase tracking-widest">
                                                {formatDate(item.date)}
                                            </p>
                                        </div>

                                        <div className={cn(
                                            "w-10 h-10 rounded-xl flex items-center justify-center transition-all",
                                            isPaid ? "bg-emerald-500/10 text-emerald-500" : "bg-slate-100 dark:bg-neutral-800 text-slate-300"
                                        )}>
                                            {isPaid ? <CheckCircle2Icon className="w-5 h-5" /> : <ClockIcon className="w-5 h-5" />}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
