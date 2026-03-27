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
    CheckCircle2Icon,
    ReceiptIcon
} from 'lucide-react';
import { PaymentDetailsModal } from '../../modals/PaymentDetailsModal';
import { DatePicker } from '../../ui/DatePicker';
import { Button } from '../../ui/Button';
import { Card, CardContent } from '../../ui/Card';
import { motion, AnimatePresence } from 'framer-motion';

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
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>(format(addDays(new Date(), 30), 'yyyy-MM-dd'));
    const [showFilters, setShowFilters] = useState(false);

    const [selectedPayment, setSelectedPayment] = useState<any>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [detailsModalProps, setDetailsModalProps] = useState<{ editMode: boolean, status?: any }>({ editMode: false });

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
            const rentItems = (paymentsData || []).map(p => {
                const contract = contractsData?.find(c => c.id === p.contract_id);
                return {
                    ...p,
                    displayType: 'rent',
                    date: p.due_date,
                    contracts: contract ? {
                        ...contract,
                        properties: {
                            id: propertyId,
                            address: property.address,
                            city: property.city
                        }
                    } : {
                        property_id: propertyId,
                        properties: {
                            id: propertyId,
                            address: property.address,
                            city: property.city
                        }
                    }
                };
            });

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
        <div className="space-y-6 pb-16">
            {/* Filter Bar */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                <div className="flex items-center gap-3 w-full sm:w-auto">
                    {/* Filter Toggle Button */}
                    <Button
                        variant="primary"
                        noEffects
                        onClick={() => setShowFilters(!showFilters)}
                        className="h-12 px-6 rounded-2xl flex items-center justify-center gap-2 flex-1 sm:flex-none font-bold"
                    >
                        <FilterIcon className="w-5 h-5" />
                        <span>{t('filters')}</span>
                    </Button>
                </div>

                {/* Contract Select */}
                <div className="relative flex-1 min-w-0 w-full sm:min-w-[200px]">
                    <select
                        value={selectedContractId}
                        onChange={(e) => setSelectedContractId(e.target.value)}
                        className="w-full h-12 pl-10 pr-4 bg-background0/5 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-500/10 text-xs font-bold appearance-none focus:ring-2 focus:ring-primary/20 outline-none transition-all hover:bg-white/50 dark:hover:bg-neutral-800/50 truncate"
                    >
                        <option value="all">{t('allContracts')}</option>
                        {contracts.map(c => {
                            const tenant = Array.isArray(c.tenants) ? c.tenants[0] : (c as any).tenants;
                            return (
                                <option key={c.id} value={c.id}>
                                    {tenant?.name || t('unnamed')}
                                </option>
                            );
                        })}
                    </select>
                    <FileTextIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-80" />
                    <ChevronDownIcon className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-80" />
                </div>
            </div>

            {/* Expanded Filters */}
            <AnimatePresence>
                {showFilters && (
                    <motion.div
                        initial={{ height: 0, opacity: 0, marginBottom: 0 }}
                        animate={{ height: 'auto', opacity: 1, marginBottom: 0 }}
                        exit={{ height: 0, opacity: 0, marginBottom: 0 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                        className="overflow-visible"
                    >
                        <Card glass className="relative z-50 rounded-[2rem] border shadow-minimal bg-background0/5 border-slate-500/10 overflow-visible mt-4">
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {/* Type Toggle */}
                                    <div className="space-y-2 min-w-0">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70 block px-2">
                                            {t('paymentType')}
                                        </label>
                                        <div className="flex p-1 bg-background0/5 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-500/10 w-full overflow-x-auto no-scrollbar snap-x">
                                            {(['actual', 'expected', 'both'] as const).map(type => (
                                                <button
                                                    key={type}
                                                    onClick={() => setTypeFilter(type)}
                                                    className={cn(
                                                        "flex-1 px-2 py-2.5 rounded-xl text-xs font-bold transition-all duration-300 snap-center whitespace-nowrap",
                                                        typeFilter === type
                                                            ? "bg-primary text-primary-foreground shadow-sm shadow-primary/20"
                                                            : "text-muted-foreground hover:text-foreground"
                                                    )}
                                                >
                                                    {type === 'actual' ? t('financeActual') :
                                                        type === 'expected' ? t('financeExpected') :
                                                            t('financeAll')}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Dates */}
                                    <div className="space-y-2 min-w-0">
                                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground opacity-70 block px-2">
                                            {t('dateRange')}
                                        </label>
                                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 px-1">
                                                    {lang === 'he' ? 'מתאריך:' : 'From:'}
                                                </span>
                                                <DatePicker
                                                    value={startDate ? parseISO(startDate) : undefined}
                                                    onChange={(date) => setStartDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                                    placeholder={t('startDate')}
                                                />
                                            </div>
                                            <div className="flex-1 min-w-0 flex flex-col gap-1">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-70 px-1">
                                                    {lang === 'he' ? 'עד תאריך:' : 'Until:'}
                                                </span>
                                                <DatePicker
                                                    value={endDate ? parseISO(endDate) : undefined}
                                                    onChange={(date) => setEndDate(date ? format(date, 'yyyy-MM-dd') : '')}
                                                    placeholder={t('endDate')}
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Timeline List */}
            <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 shadow-premium overflow-hidden">
                {filteredPayments.length === 0 ? (
                    <div className="py-24 text-center space-y-4">
                        <div className="w-20 h-20 bg-background dark:bg-neutral-800 rounded-2xl flex items-center justify-center mx-auto shadow-minimal">
                            <AlertCircleIcon className="w-8 h-8 text-slate-200" />
                        </div>
                        <h3 className="text-xl font-black tracking-tight text-foreground opacity-40">
                            {t('noPaymentsFound') ?? (lang === 'he' ? 'לא נמצאו תשלומים' : 'No payments found')}
                        </h3>
                    </div>
                ) : (
                    <div className="flex flex-col gap-3 pb-2">
                        {filteredPayments.map((item, idx) => {
                            const isPaid = item.status === 'paid';
                            const isRent = item.displayType === 'rent';
                            const itemContract = contracts.find(c => c.id === item.contract_id);
                            const tenant = itemContract ? (Array.isArray(itemContract.tenants) ? itemContract.tenants[0] : (itemContract as any).tenants) : null;

                            return (
                                <div
                                    key={item.id}
                                    onClick={() => {
                                        if (isRent) {
                                            const contract = itemContract || {};
                                            setSelectedPayment({
                                                ...item,
                                                contracts: {
                                                    ...contract,
                                                    properties: property
                                                },
                                            });
                                            setDetailsModalProps({ editMode: false });
                                            setIsDetailsModalOpen(true);
                                        }
                                    }}
                                    className={cn(
                                        "p-3 sm:p-4 md:p-5 flex items-start justify-between w-full transition-all group overflow-hidden",
                                        "bg-white/80 dark:bg-neutral-900/60 rounded-2xl border border-black/[0.04] dark:border-white/[0.04] shadow-sm",
                                        isRent ? "cursor-pointer hover:bg-neutral-50 dark:hover:bg-neutral-800/80 hover:shadow-md" : ""
                                    )}
                                >
                                    {/* Date & Tenant Column (Right - RTL first) */}
                                    <div className="flex flex-col items-start shrink-0 w-[7rem] sm:w-[9rem]">
                                        <div className="h-10 md:h-12 w-full flex items-center px-0">
                                            <div className="w-full h-full rounded-[14px] glass-premium flex items-center justify-center border border-white/10 group-hover:scale-105 transition-all duration-300 shadow-[0_4px_12px_rgba(0,0,0,0.02)]">
                                                <span className="text-base sm:text-lg md:text-xl font-black tracking-tight text-foreground leading-none">
                                                    {format(parseISO(item.date), 'dd/MM/yy')}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-6 flex items-end justify-center w-full px-1">
                                            {isRent && (
                                                <span className="text-xs sm:text-sm font-bold text-muted-foreground/80 tracking-wide text-center truncate w-full">
                                                    {tenant?.name || t('unnamed')}
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Status Badge Column (Center) */}
                                    <div className="flex flex-1 flex-col items-center justify-start min-w-0 px-2 text-center mt-1 sm:mt-1.5">
                                        <div className="h-8 sm:h-9 flex items-center justify-center min-w-0">
                                            {!isRent && (
                                                <h3 className="text-[13px] sm:text-sm font-black tracking-tight text-foreground truncate min-w-0 mr-2">
                                                    {item.title || item.file_name || t('financeBills')}
                                                </h3>
                                            )}
                                            <span className={cn(
                                                "text-[10px] sm:text-xs px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full uppercase font-black tracking-widest border shrink-0 text-center leading-none",
                                                item.displayType === 'bill' ? 'bg-primary/10 text-primary border-primary/20' :
                                                    isPaid ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                                        item.status === 'overdue' ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' :
                                                            'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                            )}>
                                                {item.displayType === 'bill' ? t('bills') :
                                                    isPaid ? t('financeActual') : t('financeExpected')}
                                            </span>
                                        </div>
                                        {!isRent && (
                                            <div className="h-6 flex items-end justify-center min-w-0">
                                                <p className="flex items-center gap-1.5 text-xs sm:text-sm font-bold text-muted-foreground opacity-90 truncate justify-center">
                                                    <FileTextIcon className="w-3 h-3 shrink-0" />
                                                    <span className="truncate">{lang === 'he' ? 'חשבונות ותחזוקה' : 'Bills & Maintenance'}</span>
                                                </p>
                                            </div>
                                        )}
                                    </div>

                                    {/* Amount & Street Column (Left - RTL last) */}
                                    <div className="flex flex-col items-end text-left shrink-0 w-[7rem] sm:w-[9rem]">
                                        <div className="h-10 md:h-12 flex items-center justify-end w-full truncate">
                                            <div className="flex items-center justify-end w-full truncate">
                                                <span className="text-lg sm:text-xl md:text-2xl font-black tracking-tight text-foreground truncate leading-none">
                                                    {item.amount?.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-6 flex items-end justify-end w-full">
                                            <p className="text-xs sm:text-sm font-bold text-muted-foreground/80 tracking-wide truncate w-full text-left">
                                                {property.address || property.city || t('unnamed')}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
            {/* Payment Details Modal */}
            {selectedPayment && (
                <PaymentDetailsModal
                    isOpen={isDetailsModalOpen}
                    onClose={() => {
                        setIsDetailsModalOpen(false);
                        setTimeout(() => setSelectedPayment(null), 300);
                    }}
                    payment={selectedPayment}
                    onSuccess={fetchData}
                    initialEditMode={detailsModalProps.editMode}
                    initialStatus={detailsModalProps.status}
                />
            )}
        </div>
    );
}
