import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Invoice } from '../../types/database';
import {
    FileText,
    Download,
    CheckCircle,
    Clock,
    AlertCircle,
    Loader2
} from 'lucide-react';
import {
    ArrowPathIcon,
    PlusIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';

export default function AdminInvoices() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'void'>('all');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchInvoices();
    }, []);

    async function fetchInvoices() {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('invoices')
                .select('*')
                .order('created_at', { ascending: false });

            if (fetchError) throw fetchError;
            setInvoices(data as Invoice[] || []);
        } catch (err: unknown) {
            console.error('Error fetching invoices:', err);
            setError(err instanceof Error ? err.message : 'Failed to load system invoices.');
        } finally {
            setLoading(false);
        }
    }

    const filteredInvoices = filterStatus === 'all'
        ? invoices
        : invoices.filter(inv => inv.status === filterStatus);

    const handleDownload = (invoiceId: string) => {
        alert(`Requesting PDF for INV-${invoiceId.substring(0, 8)}...`);
    };

    const handleMarkPaid = async (invoiceId: string) => {
        if (!confirm('Mark this invoice as PAID? This will update the user record and linked subscription.')) return;

        try {
            const { error: updateError } = await supabase
                .from('invoices')
                .update({ status: 'paid', updated_at: new Date().toISOString() })
                .eq('id', invoiceId);

            if (updateError) throw updateError;
            alert('Invoice marked as paid successfully.');
            fetchInvoices();
        } catch (err: unknown) {
            alert('Error updating invoice: ' + (err instanceof Error ? err.message : 'Unknown error'));
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground dark:text-white tracking-tight flex items-center gap-2">
                        <FileText className="w-8 h-8 text-primary-600" />
                        Billing & Invoices
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mt-1">
                        Monitor revenue, view system-generated invoices, and manage payment statuses.
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <button
                        onClick={fetchInvoices}
                        className="p-2.5 text-muted-foreground hover:text-foreground dark:text-muted-foreground dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-border dark:border-gray-700 shadow-sm"
                    >
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-primary-600/20 hover:bg-primary-700 transition-all"
                        onClick={() => alert('Manual invoice creation is currently locked for API only.')}
                    >
                        <PlusIcon className="w-5 h-5" />
                        Create Invoice
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-2 sm:gap-4 text-red-700 dark:text-red-400 font-bold text-sm">
                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-1 p-1 bg-muted dark:bg-foreground rounded-2xl w-fit border border-border dark:border-gray-700">
                {(['all', 'paid', 'pending', 'void'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-4 sm:px-6 py-2 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${filterStatus === status
                            ? 'bg-white dark:bg-gray-800 text-primary-600 shadow-sm border border-border dark:border-gray-700'
                            : 'text-muted-foreground hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Invoices List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-4 sm:p-6 border-b border-border dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-base font-black text-foreground dark:text-white uppercase tracking-tight">Financial Records</h2>
                    <div className="flex items-center gap-2 text-xs font-black text-muted-foreground uppercase tracking-widest">
                        <FunnelIcon className="w-4 h-4" />
                        Showing {filteredInvoices.length} entries
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir="rtl">
                        <thead>
                            <tr className="bg-blue-50 dark:bg-foreground/30">
                                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-right">Invoice Number</th>
                                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-center">Amount</th>
                                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest text-left">Issue Date</th>
                                <th className="px-6 py-4 text-xs font-black text-muted-foreground uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center font-bold text-muted-foreground uppercase tracking-widest">
                                        No financial records matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-blue-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-4 sm:py-6">
                                            <div className="flex items-center gap-2 sm:gap-4">
                                                <div className={`p-2 rounded-xl border ${invoice.status === 'paid' ? 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800' :
                                                    'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'
                                                    }`}>
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground dark:text-white text-sm">INV-{invoice.id.substring(0, 8).toUpperCase()}</div>
                                                    <div className="text-xs text-muted-foreground font-mono tracking-tighter">REF: {invoice.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 sm:py-6 text-center">
                                            <div className="font-black text-foreground dark:text-white text-sm">
                                                {invoice.currency === 'ILS' ? '₪' : invoice.currency} {invoice.amount.toLocaleString()}
                                            </div>
                                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Sub-Total</div>
                                        </td>
                                        <td className="px-6 py-4 sm:py-6 text-center">
                                            <span className={`px-2.5 py-1 text-xs font-black uppercase tracking-widest rounded-xl border ${invoice.status === 'paid' ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800' :
                                                invoice.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' :
                                                    'bg-blue-50 text-muted-foreground border-border dark:bg-foreground dark:border-gray-700'
                                                }`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 sm:py-6 text-left">
                                            <div className="flex items-center justify-end gap-2 font-bold text-muted-foreground dark:text-muted-foreground text-xs">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(invoice.issue_date).toLocaleDateString('he-IL')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 sm:py-6">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleDownload(invoice.id)}
                                                    className="p-2 text-muted-foreground hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all"
                                                    title="View PDF"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                                {invoice.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleMarkPaid(invoice.id)}
                                                        className="p-2 text-muted-foreground hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-xl transition-all"
                                                        title="Mark as Paid"
                                                    >
                                                        <CheckCircle className="w-5 h-5" />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
