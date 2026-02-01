import * as React from 'react';
import { DayPicker } from 'react-day-picker';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, X } from 'lucide-react';
import { cn } from '../../lib/utils';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';

// Import react-day-picker styles if not using custom classNames exclusively?
// Actually, we'll use custom classNames to fit the Glass Bionic theme perfectly.
import 'react-day-picker/dist/style.css';

export interface DatePickerProps {
    value?: Date;
    onChange?: (date: Date | undefined) => void;
    disabledDays?: (Date | { from: Date; to: Date })[];
    minDate?: Date;
    maxDate?: Date;
    placeholder?: string;
    label?: React.ReactNode;
    className?: string;
    error?: boolean;
    readonly?: boolean;
    variant?: 'default' | 'inline' | 'compact';
}

export function DatePicker({
    value,
    onChange,
    disabledDays = [],
    minDate,
    maxDate,
    placeholder = "Pick a date",
    label,
    className,
    error,
    readonly,
    variant = 'default'
}: DatePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);
    const [month, setMonth] = React.useState<Date | undefined>(value || new Date());

    // Update month when opening
    React.useEffect(() => {
        if (isOpen && value) {
            setMonth(value);
        }
    }, [isOpen, value]);

    // Close on selection if single mode (default)
    const handleSelect = (date: Date | undefined) => {
        onChange?.(date);
        setIsOpen(false);
    };

    return (
        <div className={cn("space-y-2", className)}>
            {label && <label className="text-sm font-medium flex items-center gap-2 text-foreground">{label}</label>}

            <div className="relative">
                <button
                    type="button"
                    onClick={() => !readonly && setIsOpen(true)}
                    className={cn(
                        "w-full flex items-center justify-between bg-background/50 backdrop-blur-sm border rounded-xl transition-all duration-300 group",
                        variant === 'default' ? "p-3" : (variant === 'compact' ? "p-2" : "p-1"),
                        error ? "border-red-500 ring-1 ring-red-500" : "border-border hover:border-primary/50 hover:bg-secondary/30",
                        isOpen && "ring-2 ring-primary/20 border-primary",
                        readonly && "cursor-default opacity-60 bg-secondary/20 hover:border-border hover:bg-secondary/20"
                    )}
                >
                    <div className={cn("flex items-center", variant === 'default' ? "gap-3" : "gap-2")}>
                        <div className={cn(
                            "rounded-lg transition-colors",
                            variant === 'default' ? "p-2" : "p-1.5",
                            value ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground group-hover:bg-white"
                        )}>
                            <CalendarIcon className={variant === 'default' ? "w-5 h-5" : "w-4 h-4"} />
                        </div>
                        <span className={cn(
                            variant === 'default' ? "text-sm font-medium" : (variant === 'compact' ? "text-xs font-semibold" : "text-[11px] font-bold"),
                            value ? "text-foreground" : "text-muted-foreground"
                        )}>
                            {value ? format(value, 'dd/MM/yyyy') : placeholder}
                        </span>
                    </div>
                </button>

                {/* Portal the modal to body/root to avoid z-index/transform issues */}
                {typeof document !== 'undefined' && createPortal(
                    <AnimatePresence>
                        {isOpen && (
                            <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                                {/* Backdrop */}
                                <motion.div
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    exit={{ opacity: 0 }}
                                    onClick={() => setIsOpen(false)}
                                    className="absolute inset-0 bg-black/20 backdrop-blur-[2px]"
                                />

                                {/* Calendar Popover - Centered Modal */}
                                <motion.div
                                    initial={{ opacity: 0, scale: 0.9, y: 0 }}
                                    animate={{ opacity: 1, scale: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9, y: 0 }}
                                    className="relative bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-white/20 shadow-2xl rounded-2xl w-auto max-w-[90vw] overflow-hidden"
                                >
                                    <div className="flex justify-between items-center mb-4 px-4 pt-4">
                                        <h2 className="font-bold text-lg text-foreground">Select Date</h2>
                                        <button
                                            onClick={() => setIsOpen(false)}
                                            className="p-1 hover:bg-secondary rounded-full transition-colors"
                                        >
                                            <X className="w-5 h-5 text-muted-foreground" />
                                        </button>
                                    </div>

                                    <div className="p-4 pt-0">
                                        <style>{`
                                        .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #000; --rdp-background-color: #f3f4f6; margin: 0; width: 100%; }
                                        .dark .rdp { --rdp-accent-color: #fff; --rdp-background-color: #262626; }
                                        .rdp-month { width: 100%; }
                                        .rdp-table { width: 100%; max-width: none; display: table; border-collapse: collapse; }
                                        .rdp-tbody { display: table-row-group; }
                                        .rdp-row { display: table-row; }
                                        .rdp-cell { display: table-cell; text-align: center; vertical-align: middle; padding: 2px; }
                                        .rdp-day_selected:not([disabled]) { font-weight: 900; color: var(--rdp-background-color); background: var(--rdp-accent-color); border-radius: 12px; }
                                        .rdp-day_selected:hover:not([disabled]) { opacity: 0.9; }
                                        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(0,0,0,0.05); }
                                        .dark .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(255,255,255,0.05); }
                                        .rdp-day_today:not(.rdp-day_selected) { border: 2px solid var(--rdp-accent-color); color: var(--rdp-accent-color); font-weight: 900; }
                                        .rdp-nav_button { width: 32px; height: 32px; border-radius: 10px; background: rgba(0,0,0,0.03); }
                                        .dark .rdp-nav_button { background: rgba(255,255,255,0.03); }
                                        .rdp-nav_button:hover { background-color: rgba(0,0,0,0.1); }
                                        .rdp-head_cell { color: #94a3b8; font-weight: 900; font-size: 10px; text-transform: uppercase; letter-spacing: 0.1em; }
                                        .rdp-day { border-radius: 12px; font-size: 13px; font-weight: 600; transition: all 0.2s; }
                                        .rdp-day_disabled { opacity: 0.15; cursor: not-allowed; }
                                        .rdp-caption_dropdowns { display: flex; gap: 0.5rem; flex-grow: 1; justify-content: center; }
                                        .rdp-dropdown { background: transparent; border: 1px solid transparent; font-weight: 900; font-size: 14px; text-transform: uppercase; color: var(--rdp-accent-color); padding: 4px 8px; border-radius: 8px; cursor: pointer; }
                                        .rdp-dropdown:hover { background-color: rgba(0,0,0,0.05); }
                                    `}</style>

                                        <DayPicker
                                            mode="single"
                                            selected={value}
                                            onSelect={handleSelect}
                                            disabled={disabledDays}
                                            month={month}
                                            onMonthChange={setMonth}
                                            startMonth={minDate || new Date(new Date().getFullYear() - 10, 0)}
                                            endMonth={maxDate || new Date(new Date().getFullYear() + 40, 11)}
                                            captionLayout="dropdown"
                                            showOutsideDays
                                            className="p-0"
                                        />
                                    </div>
                                </motion.div>
                            </div>
                        )}
                    </AnimatePresence>,
                    document.body
                )}
            </div>
        </div>
    );
}
