import { useState, useEffect } from 'react';
import { X, Loader2, DollarSign, FileText } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { DatePicker } from '../ui/DatePicker';
import { format, parseISO } from 'date-fns';
// import type { Contract } from '../../types/database';

interface AddPaymentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddPaymentModal({ isOpen, onClose, onSuccess }: AddPaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [contracts, setContracts] = useState<any[]>([]);
    const [fetchingContracts, setFetchingContracts] = useState(true);

    const [formData, setFormData] = useState({
        contract_id: '',
        amount: '',
        due_date: new Date().toISOString().split('T')[0],
        status: 'pending' as 'pending' | 'paid' | 'overdue',
        payment_method: 'bank_transfer',
        cancel_date: '', // For paid date if status is paid
    });

    useEffect(() => {
        if (isOpen) {
            fetchContracts();
        }
    }, [isOpen]);

    async function fetchContracts() {
        try {
            const { data, error } = await supabase
                .from('contracts')
                .select(`
                    id, 
                    properties (address), 
                    tenants (name)
                `)
                .eq('status', 'active');

            if (error) throw error;
            setContracts(data || []);
            // If only one contract, auto-select
            if (data && data.length === 1) {
                setFormData(prev => ({ ...prev, contract_id: data[0].id }));
            }
        } catch (error) {
            console.error('Error fetching contracts:', error);
        } finally {
            setFetchingContracts(false);
        }
    }

    const [sessionStats, setSessionStats] = useState({ count: 0, total: 0 });

    useEffect(() => {
        if (!isOpen) {
            if (sessionStats.count > 0) {
                alert(`Batch Complete: Added ${sessionStats.count} payments totaling ₪${sessionStats.total.toLocaleString()}`);
            }
            setSessionStats({ count: 0, total: 0 });
        }
    }, [isOpen]);

    async function handleSave(shouldClose: boolean) {
        if (!formData.contract_id || !formData.amount || !formData.due_date) return;

        setLoading(true);

        try {
            const { error } = await supabase
                .from('payments')
                .insert({
                    contract_id: formData.contract_id,
                    amount: parseFloat(formData.amount),
                    currency: 'ILS', // Default for now
                    due_date: formData.due_date,
                    status: formData.status,
                    payment_method: formData.payment_method,
                    paid_date: formData.status === 'paid' ? (formData.cancel_date || new Date().toISOString()) : null,
                });

            if (error) throw error;

            onSuccess();

            // Update stats
            setSessionStats(prev => ({
                count: prev.count + 1,
                total: prev.total + parseFloat(formData.amount)
            }));

            if (shouldClose) {
                onClose();
                // Reset form completely
                setFormData({
                    contract_id: '',
                    amount: '',
                    due_date: new Date().toISOString().split('T')[0],
                    status: 'pending',
                    payment_method: 'bank_transfer',
                    cancel_date: ''
                });
            } else {
                // Prepare for next payment
                const nextDate = new Date(formData.due_date);
                nextDate.setMonth(nextDate.getMonth() + 1);

                setFormData(prev => ({
                    ...prev,
                    due_date: nextDate.toISOString().split('T')[0]
                    // Keep contract, amount, status same
                }));
                // Optional: Show a small toast or visual feedback here?
            }

        } catch (error) {
            console.error('Error creating payment:', error);
            alert('Failed to create payment');
        } finally {
            setLoading(false);
        }
    }

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        handleSave(true);
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/20 backdrop-blur-sm z-[60]"
                    />

                    {/* Modal */}
                    <div className="fixed inset-0 flex items-center justify-center z-[60] p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-white rounded-2xl shadow-xl w-full max-w-md pointer-events-auto overflow-hidden flex flex-col max-h-[90vh]"
                        >
                            {/* Header */}
                            <div className="flex items-center justify-between p-4 border-b border-gray-100">
                                <h2 className="text-lg font-bold text-gray-900">Add Payment</h2>
                                <button
                                    onClick={onClose}
                                    className="p-2 hover:bg-gray-100 rounded-full transition-colors text-gray-500"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            {/* Content */}
                            <form onSubmit={handleSubmit} className="p-4 space-y-4 overflow-y-auto">

                                {/* Contract Selection */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Contract</label>
                                    {fetchingContracts ? (
                                        <div className="h-10 bg-gray-100 rounded-xl animate-pulse" />
                                    ) : (
                                        <div className="relative">
                                            <FileText className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                            <select
                                                required
                                                value={formData.contract_id}
                                                onChange={(e) => setFormData(prev => ({ ...prev, contract_id: e.target.value }))}
                                                className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none appearance-none"
                                            >
                                                <option value="">Select a contract...</option>
                                                {contracts.map(c => (
                                                    <option key={c.id} value={c.id}>
                                                        {c.properties?.address} - {c.tenants?.name}
                                                    </option>
                                                ))}
                                            </select>
                                        </div>
                                    )}
                                </div>

                                {/* Amount */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Amount</label>
                                    <div className="relative">
                                        <DollarSign className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                        <input
                                            type="number"
                                            required
                                            placeholder="0.00"
                                            value={formData.amount}
                                            onChange={(e) => setFormData(prev => ({ ...prev, amount: e.target.value }))}
                                            className="w-full pl-9 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none"
                                        />
                                    </div>
                                </div>

                                {/* Date */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Due Date</label>
                                    <div className="relative">
                                        <DatePicker
                                            value={formData.due_date ? parseISO(formData.due_date) : undefined}
                                            onChange={(date) => setFormData(prev => ({ ...prev, due_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                            className="w-full"
                                        />
                                    </div>
                                </div>

                                {/* Payment Method */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Payment Method</label>
                                    <div className="grid grid-cols-4 gap-2">
                                        {[
                                            { label: 'Transfer', value: 'bank_transfer' },
                                            { label: 'Bit', value: 'bit' },
                                            { label: 'Paybox', value: 'paybox' },
                                            { label: 'Check', value: 'check' },
                                            { label: 'Cash', value: 'cash' },
                                            { label: 'Credit Card', value: 'credit_card' },
                                            { label: 'Other', value: 'other' }
                                        ].map(method => (
                                            <button
                                                key={method.value}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, payment_method: method.value }))}
                                                className={`py-2 px-1 rounded-xl text-xs font-medium capitalize transition-all border ${formData.payment_method === method.value
                                                    ? 'bg-primary/10 border-primary text-primary'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {method.label}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Status */}
                                <div className="space-y-1.5">
                                    <label className="text-sm font-semibold text-gray-700 ml-1">Status</label>
                                    <div className="grid grid-cols-3 gap-2">
                                        {(['pending', 'paid', 'overdue'] as const).map(status => (
                                            <button
                                                key={status}
                                                type="button"
                                                onClick={() => setFormData(prev => ({ ...prev, status }))}
                                                className={`py-2 px-3 rounded-xl text-sm font-medium capitalize transition-all border ${formData.status === status
                                                    ? status === 'paid'
                                                        ? 'bg-green-100 border-green-200 text-green-700'
                                                        : status === 'overdue'
                                                            ? 'bg-red-100 border-red-200 text-red-700'
                                                            : 'bg-blue-100 border-blue-200 text-blue-700'
                                                    : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                                                    }`}
                                            >
                                                {status}
                                            </button>
                                        ))}
                                    </div>
                                </div>

                            </form>

                            {/* Footer */}
                            <div className="p-4 border-t border-gray-100 bg-gray-50/50 flex">
                                <button
                                    type="button"
                                    onClick={() => handleSave(false)}
                                    disabled={loading}
                                    className="flex-1 py-3.5 px-4 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold rounded-xl transform transition-all active:scale-[0.98] disabled:opacity-70 mr-3"
                                >
                                    Save & Add Another
                                </button>
                                <button
                                    type="button" // Changed to button to avoid double submit if form submits? No, form `onSubmit` calls `handleSave(true)`. 
                                    // Actually better to keep form submit for Enter key. 
                                    // But I have two buttons.
                                    // Let's make this one submit the form.
                                    onClick={() => handleSave(true)}
                                    disabled={loading}
                                    className="flex-1 flex items-center justify-center py-3.5 px-4 bg-gray-900 hover:bg-gray-800 text-white font-bold rounded-xl shadow-lg shadow-gray-900/10 transform transition-all active:scale-[0.98] disabled:opacity-70"
                                >
                                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Create & Close'}
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
