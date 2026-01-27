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
                <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <FileText className="w-8 h-8 text-brand-600" />
                        Billing & Invoices
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Monitor revenue, view system-generated invoices, and manage payment statuses.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchInvoices}
                        className="p-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>
                    <button
                        className="inline-flex items-center justify-center gap-2 rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all"
                        onClick={() => alert('Manual invoice creation is currently locked for API only.')}
                    >
                        <PlusIcon className="w-5 h-5" />
                        Create Invoice
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 font-bold text-sm">
                    <AlertCircle className="w-6 h-6 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Filters */}
            <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-2xl w-fit border border-gray-200 dark:border-gray-700">
                {(['all', 'paid', 'pending', 'void'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-5 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${filterStatus === status
                            ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm border border-gray-100 dark:border-gray-700'
                            : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Invoices List */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Financial Records</h2>
                    <div className="flex items-center gap-2 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                        <FunnelIcon className="w-4 h-4" />
                        Showing {filteredInvoices.length} entries
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir="rtl">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/30">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Invoice Number</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Amount</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Status</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-left">Issue Date</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredInvoices.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="py-20 text-center font-bold text-gray-400 uppercase tracking-widest">
                                        No financial records matching your criteria.
                                    </td>
                                </tr>
                            ) : (
                                filteredInvoices.map((invoice) => (
                                    <tr key={invoice.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl border ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                                    'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'
                                                    }`}>
                                                    <FileText className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white text-sm">INV-{invoice.id.substring(0, 8).toUpperCase()}</div>
                                                    <div className="text-[10px] text-gray-400 font-mono tracking-tighter">REF: {invoice.id}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <div className="font-black text-gray-900 dark:text-white text-sm">
                                                {invoice.currency === 'ILS' ? '₪' : invoice.currency} {invoice.amount.toLocaleString()}
                                            </div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Sub-Total</div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${invoice.status === 'paid' ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800' :
                                                invoice.status === 'pending' ? 'bg-amber-50 text-amber-700 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' :
                                                    'bg-gray-50 text-gray-400 border-gray-200 dark:bg-gray-900 dark:border-gray-700'
                                                }`}>
                                                {invoice.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5 text-left">
                                            <div className="flex items-center justify-end gap-1.5 font-bold text-gray-500 dark:text-gray-400 text-xs">
                                                <Clock className="w-3.5 h-3.5" />
                                                {new Date(invoice.issue_date).toLocaleDateString('he-IL')}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => handleDownload(invoice.id)}
                                                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-all"
                                                    title="View PDF"
                                                >
                                                    <Download className="w-5 h-5" />
                                                </button>
                                                {invoice.status === 'pending' && (
                                                    <button
                                                        onClick={() => handleMarkPaid(invoice.id)}
                                                        className="p-2 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-xl transition-all"
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
