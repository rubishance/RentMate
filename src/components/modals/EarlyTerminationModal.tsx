import React, { useState, useEffect } from 'react';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { DatePicker } from '../ui/DatePicker';
import { SegmentedControl } from '../ui/SegmentedControl';
import { AlertTriangle, Paintbrush, ShieldCheck, Calculator } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { Contract } from '../../types/database';
import { getDaysInMonth, getDate } from 'date-fns';

interface EarlyTerminationModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (terminationDate: string, finalPaymentAmount: number) => void;
    contract: Contract;
    isLoading?: boolean;
}

export const EarlyTerminationModal: React.FC<EarlyTerminationModalProps> = ({
    isOpen,
    onClose,
    onConfirm,
    contract,
    isLoading = false
}) => {
    const { t, lang } = useTranslation();
    const isHe = lang === 'he';

    const [terminationDate, setTerminationDate] = useState<string>(new Date().toISOString().split('T')[0]);
    const [calcMethod, setCalcMethod] = useState<'auto' | 'manual'>('auto');
    const [manualAmount, setManualAmount] = useState<number | ''>('');

    // Auto calculate final payment based on selected date
    const autoCalculatedAmount = React.useMemo(() => {
        if (!terminationDate) return 0;
        try {
            const dateObj = new Date(terminationDate);
            const daysInMonth = getDaysInMonth(dateObj);
            const currentDay = getDate(dateObj);
            const baseRent = contract.base_rent || 0;
            
            // Pro-rata Calculation: (Base Rent / Days in Month) * Active Days
            const partial = (baseRent / daysInMonth) * currentDay;
            return Math.round(partial);
        } catch (error) {
            return 0;
        }
    }, [terminationDate, contract.base_rent]);

    const finalAmount = calcMethod === 'auto' ? autoCalculatedAmount : (Number(manualAmount) || 0);

    const handleConfirm = () => {
        if (!terminationDate) {
            alert(isHe ? 'יש לבחור תאריך סיום' : 'Please select an end date');
            return;
        }
        onConfirm(terminationDate, finalAmount);
    };

    // Auto sync manual amount when switching
    useEffect(() => {
        if (calcMethod === 'manual' && manualAmount === '') {
            setManualAmount(autoCalculatedAmount);
        }
    }, [calcMethod, autoCalculatedAmount, manualAmount]);

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={isHe ? 'סיום חוזה מוקדם (ארכיון)' : 'Early Termination (Archive)'}
            size="md"
            footer={
                <div className="flex gap-3">
                    <Button
                        variant="ghost"
                        onClick={onClose}
                        className="flex-1 rounded-2xl"
                        disabled={isLoading}
                    >
                        {t('cancel')}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={handleConfirm}
                        className="flex-1 rounded-2xl"
                        isLoading={isLoading}
                    >
                        {isHe ? 'אשר סיום חוזה' : 'Confirm Termination'}
                    </Button>
                </div>
            }
        >
            <div className="space-y-6 py-4 px-1">
                
                {/* Warning header */}
                <div className="flex items-start gap-4 p-4 rounded-xl bg-amber-50 dark:bg-amber-500/10 border border-amber-200 dark:border-amber-500/20 text-start">
                    <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-500/20 flex items-center justify-center shrink-0">
                        <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-500" />
                    </div>
                    <div>
                        <h4 className="text-[15px] font-bold text-amber-900 dark:text-amber-500 mb-1">
                            {isHe ? 'שים לב: פעולה זו תעביר את החוזה לארכיון' : 'Warning: This will archive the contract'}
                        </h4>
                        <p className="text-[13.5px] text-amber-800 dark:text-amber-400/80 leading-relaxed">
                            {isHe 
                                ? 'תשלומים עתידיים יבוטלו או יימחקו. תשלומים שלא שולמו עד לתאריך הסיום יישארו במערכת להמשך טיפול.' 
                                : 'Future payments will be cancelled or deleted. Unpaid past payments will remain active in the system.'}
                        </p>
                    </div>
                </div>

                {/* Important Contract Info (Guarantees & Painting) */}
                <div className="space-y-3">
                    <h5 className="text-[14px] font-bold text-slate-800 dark:text-slate-200">
                        {isHe ? 'מידע חשוב מתוך החוזה' : 'Important Contract Info'}
                    </h5>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-[14px]">
                                <ShieldCheck className="w-4 h-4" />
                                {isHe ? 'ערבויות ובטחונות' : 'Guarantees'}
                            </div>
                            <p className="text-[13px] text-slate-600 dark:text-slate-400 whitespace-pre-wrap">
                                {contract.guarantees || (isHe ? 'לא הוזנו ערבויות' : 'No guarantees specified')}
                            </p>
                        </div>
                        
                        <div className="p-4 rounded-xl border border-slate-100 dark:border-neutral-800 bg-slate-50 dark:bg-neutral-800/50 flex flex-col gap-2">
                            <div className="flex items-center gap-2 text-teal-600 dark:text-teal-400 font-bold text-[14px]">
                                <Paintbrush className="w-4 h-4" />
                                {isHe ? 'החזרת הנכס (צביעה)' : 'Painting & Return'}
                            </div>
                            <p className="text-[13px] text-slate-600 dark:text-slate-400">
                                {contract.needs_painting 
                                    ? (isHe ? 'השוכר מחויב להחזיר את הנכס צבוע.' : 'Tenant is required to return property painted.') 
                                    : (isHe ? 'אין חובת צביעה או שלא צוין.' : 'No painting required or not specified.')}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Date Selection */}
                <div className="space-y-3 pt-2">
                    <h5 className="text-[14px] font-bold text-slate-800 dark:text-slate-200">
                        {isHe ? 'תאריך סיום בפועל' : 'Actual End Date'}
                    </h5>
                    <DatePicker
                        label={isHe ? 'תאריך סיום' : 'End Date'}
                        value={terminationDate ? new Date(terminationDate) : undefined}
                        onChange={(date) => {
                            if (date) {
                                setTerminationDate(date.toISOString().split('T')[0]);
                            }
                        }}
                        maxDate={new Date()}
                    />
                </div>

                {/* Final Payment Calculation */}
                <div className="space-y-4 pt-2 border-t border-slate-100 dark:border-neutral-800">
                    <div className="flex justify-between items-center">
                        <h5 className="text-[14px] font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2">
                            <Calculator className="w-4 h-4" />
                            {isHe ? 'תשלום יחסי לחודש האחרון' : 'Final Partial Payment'}
                        </h5>
                    </div>
                    
                    <SegmentedControl
                        options={[
                            { label: isHe ? 'חישוב אוטומטי' : 'Auto Calculate', value: 'auto' },
                            { label: isHe ? 'הזנה ידנית' : 'Manual Entry', value: 'manual' }
                        ]}
                        value={calcMethod}
                        onChange={(val: any) => setCalcMethod(val)}
                    />

                    {calcMethod === 'auto' ? (
                        <div className="p-4 bg-emerald-50 dark:bg-emerald-500/10 rounded-xl border border-emerald-100 dark:border-emerald-500/20 flex justify-between items-center">
                            <span className="text-[14px] font-medium text-emerald-800 dark:text-emerald-400">
                                {isHe ? 'חלק יחסי (לפי ימים):' : 'Calculated partial rent:'}
                            </span>
                            <span className="text-xl font-black text-emerald-700 dark:text-emerald-300">
                                ₪{autoCalculatedAmount.toLocaleString()}
                            </span>
                        </div>
                    ) : (
                        <Input
                            type="number"
                            label={isHe ? 'סכום תשלום אחרון (₪)' : 'Final Payment Amount (₪)'}
                            value={manualAmount}
                            onChange={(e) => setManualAmount(Number(e.target.value))}
                            placeholder={isHe ? 'הזן סכום' : 'Enter amount'}
                        />
                    )}
                </div>

            </div>
        </Modal>
    );
};
