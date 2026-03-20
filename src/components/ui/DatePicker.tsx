import * as React from 'react';
import { format } from 'date-fns';
import { he } from 'date-fns/locale';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useScrollLock } from '../../hooks/useScrollLock';
import { useTranslation } from '../../hooks/useTranslation';
import { MobileDatePicker } from './MobileDatePicker';

export interface DatePickerProps {
    value?: Date;
    onChange?: (date: Date | undefined) => void;
    disabledDays?: (Date | { from: Date; to: Date })[];
    minDate?: Date;
    maxDate?: Date;
    placeholder?: string;
    label?: React.ReactNode;
    className?: string;
    error?: string | boolean;
    readonly?: boolean;
    variant?: 'default' | 'inline' | 'compact' | 'bento';
}

export function DatePicker({
    value,
    onChange,
    disabledDays = [],
    minDate,
    maxDate,
    placeholder = "pickDate",
    label,
    className,
    error,
    readonly,
    variant = 'default'
}: DatePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [month, setMonth] = React.useState<Date | undefined>(value || new Date());
    const inputRef = React.useRef<HTMLInputElement>(null);

    const { t } = useTranslation();

    useScrollLock(isOpen);

    // Update month when opening
    React.useEffect(() => {
        if (isOpen && value) {
            setMonth(value);
        }
    }, [isOpen, value]);

    // Close on selection if single mode (default)
    const handleSelect = (date: Date | undefined) => {
        onChange?.(date);
    };

    return (
        <div className={cn("space-y-2", className)}>
            {label && <label className="text-sm font-medium flex items-center gap-2 text-foreground">{label}</label>}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => {
                        if (!readonly) {
                            setIsOpen(true);
                        }
                    }}
                    className={cn(
                        "w-full flex items-center justify-between transition-all duration-300 group",
                        variant === 'bento' 
                            ? "h-20 rounded-[2rem] bg-slate-50 dark:bg-neutral-800/50 border-2 border-transparent px-6 font-black text-xl hover:border-primary/20"
                            : "bg-background/50 backdrop-blur-sm border rounded-xl",
                        variant === 'default' && "p-3",
                        variant === 'compact' && "p-2",
                        variant === 'inline' && "p-1",
                        error ? (variant === 'bento' ? "border-red-500 bg-red-50/50" : "border-red-500 ring-1 ring-red-500") : (!variant || variant !== 'bento') && "border-border hover:border-primary/50 hover:bg-muted/30",
                        isOpen && (variant === 'bento' ? "border-primary/30 shadow-sm" : "ring-2 ring-primary/20 border-primary"),
                        readonly && "cursor-default opacity-60 bg-muted/20 hover:border-border hover:bg-muted/20"
                    )}
                >
                    <div className={cn("flex items-center", variant === 'default' ? "gap-3" : "gap-2")}>
                        <div className={cn(
                            "transition-colors flex items-center justify-center shrink-0",
                            variant === 'bento' ? "w-12 h-12 rounded-2xl bg-primary/10 text-primary group-hover:bg-primary/20" :
                            (variant === 'default' ? "w-10 h-10 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20" : "w-8 h-8 rounded-xl bg-primary/10 text-primary group-hover:bg-primary/20")
                        )}>
                            <CalendarIcon className={variant === 'bento' ? "w-5 h-5 ml-0.5" : variant === 'default' ? "w-5 h-5" : "w-4 h-4"} />
                        </div>
                        <span className={cn(
                            variant === 'bento' ? "text-xl translate-y-[1px]" :
                            (variant === 'default' ? "text-sm font-medium" : (variant === 'compact' ? "text-xs font-semibold" : "text-xs font-bold")),
                            value ? "text-foreground" : "text-muted-foreground"
                        )}>
                            {value ? format(value, 'dd/MM/yyyy') : t(placeholder as any)}
                        </span>
                    </div>
                </button>

                {/* Mobile Native Date Picker Overlay Removed in favor of MobileDatePicker */}

                {/* Portal the modal to body/root to avoid z-index/transform issues */}
                {typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {isOpen && (
                            <div className="fixed inset-0 z-[9999] flex items-end md:items-center justify-center p-0 md:p-4">
                                {/* Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsOpen(false)}
                                    className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
                                />

                                {/* Scroll Wheel Bottom Sheet (Mobile) / Centered Modal (Desktop) */}
                                <motion.div
                                    initial={{ opacity: 0, y: "100%", scale: window.matchMedia('(min-width: 768px)').matches ? 0.9 : 1 }}
                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                    exit={{ opacity: 0, y: "100%", scale: window.matchMedia('(min-width: 768px)').matches ? 0.9 : 1 }}
                                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                                    className="relative w-full md:w-auto md:min-w-[400px] bg-white dark:bg-neutral-900 rounded-t-[2.5rem] md:rounded-[2.5rem] p-6 pb-12 md:pb-6 shadow-2xl"
                                >
                                    <div className="flex justify-between items-center mb-6 px-2 w-full">
                                        <h2 className="font-bold text-lg text-foreground">{t('selectDate')}</h2>
                                        <button 
                                            onClick={() => { setIsOpen(false); }} 
                                            className="bg-primary/10 text-primary px-6 py-2 rounded-full font-bold text-sm hover:bg-primary/20 transition-colors"
                                        >
                                            {t('save') || 'שמור'}
                                        </button>
                                    </div>
                                    <MobileDatePicker 
                                        value={value} 
                                        onChange={(d) => onChange?.(d)} 
                                        minDate={minDate} 
                                        maxDate={maxDate} 
                                    />
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>
            {typeof error === 'string' && error && (
                <p className="text-[0.8rem] font-medium text-destructive mt-1.5">{error}</p>
            )}
        </div>
    );
}
