import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { useTranslation } from '../../hooks/useTranslation';
import {
    CalendarIcon as Calendar,
    DollarSignIcon as DollarSign,
    ClockIcon as Clock,
    TrashIcon as Trash,
    EditIcon as Edit,
    CheckCircle2,
    XCircle,
    Loader2,
    ReceiptIcon
} from 'lucide-react';
import { CloseIcon as X } from '../icons/MessageIcons';
import { formatDate } from '../../lib/utils';
import type { Payment } from '../../types/database';
import { DatePicker } from '../ui/DatePicker';
import { format, parseISO } from 'date-fns';

interface PaymentDetailsModalProps {
    isOpen: boolean;
    onClose: () => void;
    payment: Payment | null;
    onSuccess: () => void;
    initialEditMode?: boolean;
    initialStatus?: Payment['status'];
}

export function PaymentDetailsModal({ isOpen, onClose, payment, onSuccess, initialEditMode = false, initialStatus }: PaymentDetailsModalProps) {
    const { t } = useTranslation();
    const [loading, setLoading] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [editMode, setEditMode] = useState(false);

    const [formData, setFormData] = useState({
        status: 'pending' as Payment['status'],
        paid_amount: 0,
        payment_method: '',
        paid_date: '',
        reference: ''
    });

    useEffect(() => {
        if (payment) {
            setFormData({
                status: (initialStatus && isOpen) ? initialStatus : payment.status,
                paid_amount: payment.paid_amount || payment.amount,
                payment_method: payment.payment_method || 'bank_transfer',
                paid_date: payment.paid_date || new Date().toISOString().split('T')[0],
                reference: payment.reference || ''
            });
            setEditMode(initialEditMode && isOpen);
        }
    }, [payment, isOpen, initialEditMode, initialStatus]);

    const handleUpdate = async () => {
        if (!payment) return;
        setLoading(true);
        try {
            const { error } = await supabase
                .from('payments')
                .update({
                    status: formData.status,
                    paid_amount: formData.status === 'paid' ? formData.paid_amount : null,
                    payment_method: formData.payment_method,
                    paid_date: formData.status === 'paid' ? formData.paid_date : null,
                    reference: formData.reference
                })
                .eq('id', payment.id);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error updating payment:', error);
            alert(t('error'));
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async () => {
        if (!payment || !window.confirm(t('deletePaymentConfirmation'))) return;
        setIsDeleting(true);
        try {
            const { error } = await supabase
                .from('payments')
                .delete()
                .eq('id', payment.id);

            if (error) throw error;
            onSuccess();
            onClose();
        } catch (error) {
            console.error('Error deleting payment:', error);
            alert(t('error'));
        } finally {
            setIsDeleting(false);
        }
    };

    if (!payment) return null;

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[70]"
                    />
                    <div className="fixed inset-0 flex items-center justify-center z-[71] p-4 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-window rounded-[2.5rem] shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden flex flex-col max-h-[90vh] border border-gray-100 dark:border-neutral-800"
                        >
                            {/* Header */}
                            <div className="p-6 border-b border-gray-50 dark:border-neutral-800 flex items-center justify-between bg-gray-50/50 dark:bg-neutral-800/10">
                                <div>
                                    <h2 className="text-xl font-black text-black dark:text-white uppercase tracking-tight">{t('paymentDetails')}</h2>
                                </div>
                                <button
                                    onClick={onClose}
                                    className="p-3 hover:bg-white dark:hover:bg-neutral-800 rounded-2xl transition-all text-gray-400 hover:text-black dark:hover:text-white shadow-sm border border-transparent hover:border-gray-100 dark:hover:border-neutral-700"
                                >
                                    <X className="w-5 h-5" />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 space-y-8">
                                {/* Property and Tenant Info */}
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-800">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">{t('asset')}</span>
                                        <span className="text-sm font-bold text-black dark:text-white line-clamp-1">
                                            {(payment as any).contracts?.properties?.address || t('unknown')}
                                        </span>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-neutral-800 rounded-2xl border border-gray-100 dark:border-neutral-800">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">{t('tenant')}</span>
                                        <span className="text-sm font-bold text-black dark:text-white line-clamp-1">
                                            {(() => {
                                                const tenants = (payment as any).contracts?.tenants;
                                                if (Array.isArray(tenants)) {
                                                    return tenants.map((t: any) => t.name).filter(Boolean).join(', ');
                                                }
                                                return tenants?.name || t('unknown');
                                            })()}
                                        </span>
                                    </div>
                                </div>

                                {/* Status Badge and Simple Info */}
                                <div className="flex items-center justify-between">
                                    <div className="flex flex-col">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1">{t('status')}</span>
                                        {editMode ? (
                                            <div className="flex gap-2">
                                                {(['pending', 'paid', 'overdue'] as const).map(s => (
                                                    <button
                                                        key={s}
                                                        onClick={() => setFormData(f => ({ ...f, status: s }))}
                                                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${formData.status === s
                                                            ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white shadow-lg'
                                                            : 'bg-window text-gray-400 border-gray-100 dark:border-neutral-800'
                                                            }`}
                                                    >
                                                        {t(s)}
                                                    </button>
                                                ))}
                                            </div>
                                        ) : (
                                            <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full border ${payment.status === 'paid' ? 'bg-green-50 border-green-100 text-green-600' :
                                                payment.status === 'overdue' ? 'bg-red-50 border-red-100 text-red-600' :
                                                    'bg-orange-50 border-orange-100 text-orange-600'
                                                }`}>
                                                {t(payment.status)}
                                            </span>
                                        )}
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">{t('dueDate')}</span>
                                        <span className="font-bold text-black dark:text-white">{formatDate(payment.due_date)}</span>
                                    </div>
                                </div>

                                {/* Amount Section */}
                                <div className="p-6 bg-gray-50 dark:bg-neutral-800/50 rounded-[2rem] border border-gray-100 dark:border-neutral-800">
                                    <div className="flex items-center justify-between gap-4">
                                        <div className="flex-1">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">{t('amount')}</span>
                                            <div className="text-4xl font-black text-black dark:text-white tracking-tighter">
                                                ₪{payment.amount.toLocaleString()}
                                            </div>
                                        </div>
                                        {payment.status === 'paid' && !editMode && (
                                            <div className="text-right flex-1 border-l border-gray-200 dark:border-neutral-700 pl-6">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2 block">{t('paidAmount')}</span>
                                                <div className="text-4xl font-black text-green-500 tracking-tighter">
                                                    ₪{formData.paid_amount.toLocaleString()}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {editMode && (
                                    <div className="space-y-6 animate-in fade-in slide-in-from-top-2 duration-300">
                                        {formData.status === 'paid' && (
                                            <div className="space-y-4">
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('paidAmount')}</label>
                                                    <div className="relative">
                                                        <DollarSign className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                                                        <input
                                                            type="number"
                                                            value={formData.paid_amount}
                                                            onChange={e => setFormData(f => ({ ...f, paid_amount: Number(e.target.value) }))}
                                                            className="w-full pl-12 pr-4 py-4 bg-window border border-gray-100 dark:border-neutral-800 rounded-2xl text-sm font-bold focus:ring-2 focus:ring-black dark:focus:ring-white outline-none"
                                                        />
                                                    </div>
                                                </div>
                                                <div className="space-y-2">
                                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('paidDate')}</label>
                                                    <DatePicker
                                                        value={formData.paid_date ? parseISO(formData.paid_date) : undefined}
                                                        onChange={date => setFormData(f => ({ ...f, paid_date: date ? format(date, 'yyyy-MM-dd') : '' }))}
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>
                                        )}

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('method')}</label>
                                            <select
                                                value={formData.payment_method}
                                                onChange={e => setFormData(f => ({ ...f, payment_method: e.target.value }))}
                                                className="w-full p-4 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl text-sm font-bold outline-none"
                                            >
                                                <option value="bank_transfer">{t('bankTransfer')}</option>
                                                <option value="bit">{t('bit')}</option>
                                                <option value="paybox">{t('paybox')}</option>
                                                <option value="check">{t('check')}</option>
                                                <option value="cash">{t('cash')}</option>
                                                <option value="credit_card">{t('creditCard')}</option>
                                                <option value="other">{t('other')}</option>
                                            </select>
                                        </div>

                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 ml-1">{t('reference')}</label>
                                            <input
                                                type="text"
                                                placeholder={t('referencePlaceholder')}
                                                value={formData.reference}
                                                onChange={e => setFormData(f => ({ ...f, reference: e.target.value }))}
                                                className="w-full p-4 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl text-sm font-bold outline-none"
                                            />
                                        </div>
                                    </div>
                                )}

                                {!editMode && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl">
                                            <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">{t('method')}</span>
                                            <span className="text-sm font-bold text-black dark:text-white capitalize">{payment.payment_method?.replace('_', ' ') || t('unknown')}</span>
                                        </div>
                                        {payment.paid_date && (
                                            <div className="p-4 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">{t('paidDate')}</span>
                                                <span className="text-sm font-bold text-black dark:text-white">{formatDate(payment.paid_date)}</span>
                                            </div>
                                        )}
                                        {payment.reference && (
                                            <div className="p-4 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 rounded-2xl col-span-2">
                                                <span className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 block">{t('reference')}</span>
                                                <span className="text-sm font-bold text-black dark:text-white">{payment.reference}</span>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="p-8 border-t border-gray-50 dark:border-neutral-800 bg-gray-50/30 dark:bg-neutral-800/20 flex gap-4">
                                {editMode ? (
                                    <>
                                        <button
                                            onClick={() => setEditMode(false)}
                                            className="flex-1 py-4 px-6 bg-white dark:bg-neutral-900 border border-gray-100 dark:border-neutral-800 text-gray-500 font-black uppercase text-[10px] tracking-widest rounded-2xl hover:bg-gray-50 transition-all active:scale-95"
                                        >
                                            {t('cancel')}
                                        </button>
                                        <button
                                            onClick={handleUpdate}
                                            disabled={loading}
                                            className="flex-3 py-4 px-6 bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl hover:opacity-90 transition-all active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
                                        >
                                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                                            {t('saveChanges')}
                                        </button>
                                    </>
                                ) : (
                                    <>
                                        <button
                                            onClick={handleDelete}
                                            disabled={isDeleting}
                                            className="p-4 bg-red-50 dark:bg-red-900/20 text-red-600 rounded-2xl hover:bg-red-100 transition-all active:scale-95 border border-red-100 dark:border-red-900/50"
                                        >
                                            {isDeleting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Trash className="w-5 h-5" />}
                                        </button>
                                        <button
                                            onClick={() => setEditMode(true)}
                                            className="flex-1 py-4 px-6 bg-black dark:bg-white text-white dark:text-black font-black uppercase text-[10px] tracking-widest rounded-2xl shadow-xl hover:opacity-90 transition-all active:scale-95 flex items-center justify-center gap-2"
                                        >
                                            <Edit className="w-4 h-4" />
                                            {t('edit')}
                                        </button>
                                    </>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    );
}
