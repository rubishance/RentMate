import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { Invoice } from '../../types/database';
import { FileText, Download, CheckCircle, Clock, XCircle, Loader2, ArrowRight } from 'lucide-react';

export default function AdminInvoices() {
    const [invoices, setInvoices] = useState<Invoice[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterStatus, setFilterStatus] = useState<'all' | 'paid' | 'pending' | 'void'>('all');

    useEffect(() => {
        fetchInvoices();
    }, []);

    async function fetchInvoices() {
        try {
            const { data, error } = await supabase
                .from('invoices')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) {
                console.error('Error fetching invoices:', error);
            } else if (data) {
                setInvoices(data as Invoice[]);
            }
        } catch (error) {
            console.error('Error fetching invoices:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredInvoices = filterStatus === 'all'
        ? invoices
        : invoices.filter(inv => inv.status === filterStatus);

    const handleDownload = (invoiceId: string) => {
        // Mock download logic
        alert(`Downloading invoice ${invoiceId.substring(0, 8)}... (Mock)`);
    };

    const handleMarkPaid = async (invoiceId: string) => {
        // Mock logic - in real app would update DB
        const confirmed = confirm('Mark this invoice as PAID?');
        if (confirmed) {
            alert('Invoice marked as paid (Simulated)');
            // Refetch or update state locally
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <FileText className="w-6 h-6 text-primary" />
                        Invoices
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Manage system billing and invoices
                    </p>
                </div>
                <button
                    className="bg-primary text-primary-foreground px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
                    onClick={() => alert('New Invoice creation is not yet implemented.')}
                >
                    + New Invoice
                </button>
            </div>

            {/* Filters */}
            <div className="flex gap-2 border-b border-border pb-2">
                {(['all', 'paid', 'pending', 'void'] as const).map((status) => (
                    <button
                        key={status}
                        onClick={() => setFilterStatus(status)}
                        className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${filterStatus === status
                                ? 'bg-secondary text-foreground'
                                : 'text-muted-foreground hover:bg-secondary/50'
                            }`}
                    >
                        {status}
                    </button>
                ))}
            </div>

            {/* Invoices List */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                {filteredInvoices.length === 0 ? (
                    <div className="p-8 text-center text-muted-foreground">
                        <FileText className="w-8 h-8 mx-auto mb-2 opacity-20" />
                        No {filterStatus !== 'all' ? filterStatus : ''} invoices found.
                    </div>
                ) : (
                    <div className="divide-y divide-border">
                        {filteredInvoices.map((invoice) => (
                            <div key={invoice.id} className="p-4 flex items-center justify-between hover:bg-secondary/10 transition-colors group">
                                <div className="flex items-center gap-4">
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${invoice.status === 'paid' ? 'bg-green-100 text-green-600' :
                                            invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-600' :
                                                'bg-gray-100 text-gray-500'
                                        }`}>
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    <div>
                                        <div className="flex items-center gap-2">
                                            <span className="font-mono font-bold">INV-{invoice.id.substring(0, 8)}</span>
                                            <span className={`text-[10px] px-2 py-0.5 rounded-full uppercase font-bold tracking-wide ${invoice.status === 'paid' ? 'bg-green-100 text-green-700' :
                                                    invoice.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                                                        'bg-gray-100 text-gray-700'
                                                }`}>
                                                {invoice.status}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2 text-sm text-muted-foreground mt-0.5">
                                            <Clock className="w-3 h-3" />
                                            {new Date(invoice.issue_date).toLocaleDateString()}
                                            <span>•</span>
                                            <span>{invoice.currency} {invoice.amount.toLocaleString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleDownload(invoice.id)}
                                        className="p-2 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-colors"
                                        title="Download PDF"
                                    >
                                        <Download className="w-4 h-4" />
                                    </button>
                                    {invoice.status === 'pending' && (
                                        <button
                                            onClick={() => handleMarkPaid(invoice.id)}
                                            className="p-2 text-muted-foreground hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                                            title="Mark as Paid"
                                        >
                                            <CheckCircle className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
