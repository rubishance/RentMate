import { useEffect, useState } from 'react';
import logoFinalCleanV2 from '../assets/logo-final-clean-v2.png';
import { CalendarCheck, Clock, AlertCircle, SlidersHorizontal, ArrowRight, Plus } from 'lucide-react';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';
import { formatDate } from '../lib/utils';
import type { Payment } from '../types/database';
import { AddPaymentModal } from '../components/modals/AddPaymentModal';
import { DatePicker } from '../components/ui/DatePicker';
import { useTranslation } from '../hooks/useTranslation';


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
            <div className="flex items-center justify-center h-[50vh]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-28 px-4 pt-6">
            {/* Header */}
            <div className="flex items-center justify-between relative min-h-[4rem]">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">{t('paymentsTitle')}</h1>
                    <p className="text-sm text-muted-foreground">{t('trackFuturePayments')}</p>
                </div>

                <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 pointer-events-none">
                    <img src={logoFinalCleanV2} alt="RentMate" className="h-16 w-auto object-contain drop-shadow-sm" />
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="bg-primary text-primary-foreground p-2.5 rounded-xl hover:bg-primary/90 transition-colors shadow-lg shadow-primary/25"
                        aria-label={t('addPayment')}
                    >
                        <Plus className="w-5 h-5" />
                    </button>
                </div>
            </div>

            {/* Filters Row */}
            <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-hide">
                {(['3m', '6m', '1y', 'all'] as const).map((p) => (
                    <button
                        key={p}
                        onClick={() => setPeriodFilter(p)}
                        className={`px-4 py-1.5 rounded-full text-sm font-medium border transition-colors whitespace-nowrap ${periodFilter === p
                            ? 'bg-primary text-primary-foreground border-primary'
                            : 'bg-card text-muted-foreground border-input hover:bg-secondary/50'
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
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-blue-100 text-blue-600 rounded-lg dark:bg-blue-900/20">
                        <CalendarCheck className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">{t('monthlyExpected')}</p>
                        <p className="text-2xl font-bold text-foreground">₪{stats.monthlyExpected.toLocaleString()}</p>
                    </div>
                </div>

                <div className="bg-card border border-border rounded-xl p-4 flex items-center gap-4 shadow-sm">
                    <div className="p-3 bg-green-100 text-green-600 rounded-lg dark:bg-green-900/20">
                        <Clock className="w-6 h-6" />
                    </div>
                    <div>
                        <p className="text-sm text-muted-foreground font-medium">{t('pendingCollection')}</p>
                        <p className="text-2xl font-bold text-foreground">₪{stats.pending.toLocaleString()}</p>
                    </div>
                </div>
            </div>



            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="p-4 border-b border-border flex items-center justify-between">
                    <h3 className="font-semibold">{t('upcomingPayments')}</h3>
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`p-2 rounded-lg transition-colors ${showFilters ? 'bg-secondary text-foreground' : 'hover:bg-secondary/50 text-muted-foreground'}`}
                    >
                        <SlidersHorizontal className="w-5 h-5" />
                    </button>
                </div>

                {/* Filters Panel - Embedded */}
                {showFilters && (
                    <div className="p-4 border-b border-border bg-secondary/10 space-y-4 animate-in slide-in-from-top-2 fade-in duration-200">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                            {/* Tenant */}
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">{t('tenant')}</label>
                                <select
                                    className="w-full p-2 rounded-lg border border-input bg-background text-sm"
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
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">{t('asset')}</label>
                                <select
                                    className="w-full p-2 rounded-lg border border-input bg-background text-sm"
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
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">{t('method')}</label>
                                <select
                                    className="w-full p-2 rounded-lg border border-input bg-background text-sm"
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
                            <div className="space-y-1">
                                <label className="text-xs font-medium text-muted-foreground">{t('period')}</label>
                                <div className="flex gap-2">
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
                        </div>

                        {/* Filter Stats Summary */}
                        <div className="flex gap-4 p-4 bg-background/50 rounded-xl border border-border/50">
                            <div className="flex-1">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('totalExpected')}</span>
                                <div className="text-lg font-bold">₪{totalExpected.toLocaleString()}</div>
                            </div>
                            <div className="flex-1">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('totalActual')}</span>
                                <div className={`text-lg font-bold ${totalActual < totalExpected ? 'text-orange-600' : 'text-green-600'}`}>
                                    ₪{totalActual.toLocaleString()}
                                </div>
                            </div>
                            <div className="flex-1 text-right">
                                <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">{t('collectionRate')}</span>
                                <div className="text-lg font-bold">
                                    {totalExpected > 0 ? Math.round((totalActual / totalExpected) * 100) : 0}%
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {filteredPayments.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        {t('noPaymentsFound')}
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filteredPayments.map(payment => (
                            <div key={payment.id} className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors">
                                <div>
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className="font-medium text-foreground">
                                            {formatDate(payment.due_date)}
                                        </span>
                                        <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${payment.status === 'paid' ? 'bg-green-100 text-green-700' :
                                            payment.status === 'overdue' ? 'bg-red-100 text-red-700' :
                                                'bg-yellow-100 text-yellow-700'
                                            }`}>
                                            {payment.status}
                                        </span>
                                    </div>
                                    <p className="text-sm font-medium text-foreground">
                                        {(payment as any).contracts?.properties?.city}, {(payment as any).contracts?.properties?.address}
                                    </p>
                                    <p className="text-xs text-muted-foreground">
                                        {(payment as any).contracts?.tenants?.name}
                                    </p>
                                </div>
                                <div className="flex items-center gap-4">
                                    <div className="text-right">
                                        {payment.status === 'paid' && payment.paid_amount ? (
                                            <>
                                                <div className="font-mono font-bold text-lg text-green-600">
                                                    ₪{payment.paid_amount.toLocaleString()}
                                                </div>
                                                {Math.abs(payment.paid_amount - payment.amount) > 0.01 && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {t('exp')}: ₪{payment.amount.toLocaleString()}
                                                        <span className={payment.paid_amount < payment.amount ? "text-red-500 ml-1" : "text-green-500 ml-1"}>
                                                            ({(payment.paid_amount - payment.amount).toFixed(2)})
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        ) : (
                                            <>
                                                <div className="font-mono font-bold text-lg">
                                                    ₪{payment.amount.toLocaleString()}
                                                </div>
                                                {payment.original_amount && payment.amount !== payment.original_amount && (
                                                    <div className="text-xs text-muted-foreground">
                                                        {t('base')}: ₪{payment.original_amount.toLocaleString()}
                                                        <span className="text-blue-500 ml-1">
                                                            ({payment.index_linkage_rate?.toFixed(2)}%)
                                                        </span>
                                                    </div>
                                                )}
                                            </>
                                        )}
                                    </div>
                                    <button className="p-1.5 hover:bg-secondary rounded-full text-muted-foreground">
                                        <ArrowRight className="w-4 h-4" />
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
        </div>
    );
}
