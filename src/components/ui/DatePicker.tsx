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
    label?: string;
    className?: string;
    error?: boolean;
    readonly?: boolean;
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
    readonly
}: DatePickerProps) {
    const [isOpen, setIsOpen] = React.useState(false);

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
                        "w-full p-3 flex items-center justify-between bg-background/50 backdrop-blur-sm border rounded-xl transition-all duration-300 group",
                        error ? "border-red-500 ring-1 ring-red-500" : "border-border hover:border-primary/50 hover:bg-secondary/30",
                        isOpen && "ring-2 ring-primary/20 border-primary",
                        readonly && "cursor-default opacity-60 bg-secondary/20 hover:border-border hover:bg-secondary/20"
                    )}
                >
                    <div className="flex items-center gap-3">
                        <div className={cn(
                            "p-2 rounded-lg transition-colors",
                            value ? "bg-primary/10 text-primary" : "bg-secondary text-muted-foreground group-hover:bg-white"
                        )}>
                            <CalendarIcon className="w-5 h-5" />
                        </div>
                        <span className={cn(
                            "text-sm font-medium",
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
                                        .rdp { --rdp-cell-size: 40px; --rdp-accent-color: #3b82f6; --rdp-background-color: #eff6ff; margin: 0; width: 100%; }
                                        .rdp-month { width: 100%; }
                                        .rdp-table { width: 100%; max-width: none; display: table; border-collapse: collapse; }
                                        .rdp-tbody { display: table-row-group; }
                                        .rdp-row { display: table-row; }
                                        .rdp-cell { display: table-cell; text-align: center; vertical-align: middle; padding: 0; }
                                        .rdp-day_selected:not([disabled]) { font-weight: bold; color: white; background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); box-shadow: 0 4px 6px -1px rgba(59, 130, 246, 0.4); }
                                        .rdp-day_selected:hover:not([disabled]) { background-color: #2563eb; }
                                        .rdp-button:hover:not([disabled]):not(.rdp-day_selected) { background-color: rgba(0,0,0,0.05); }
                                        .rdp-nav_button { width: 32px; height: 32px; border-radius: 8px; }
                                        .rdp-nav_button:hover { background-color: rgba(0,0,0,0.05); }
                                        .rdp-head_cell { color: #64748b; font-weight: 600; font-size: 0.875rem; }
                                        .rdp-day { border-radius: 12px; font-size: 0.9rem; transition: all 0.2s; }
                                        .rdp-day_disabled { opacity: 0.25; text-decoration: none; cursor: not-allowed; }
                                        .rdp-caption_dropdowns { display: flex; gap: 0.5rem; flex-grow: 1; justify-content: center; }
                                        .rdp-dropdown_year, .rdp-dropdown_month { position: relative; display: inline-flex; align-items: center; }
                                        .rdp-dropdown { background: transparent; border: 1px solid transparent; font-weight: 600; font-size: 1rem; color: #1e293b; padding: 0.25rem 0.5rem; border-radius: 6px; cursor: pointer; }
                                        .rdp-dropdown:hover { background-color: rgba(0,0,0,0.05); border-color: rgba(0,0,0,0.1); }
                                        /* Removed display:none from caption_label to ensure visibility if structure differs */
                                    `}</style>

                                        <DayPicker
                                            mode="single"
                                            selected={value}
                                            onSelect={handleSelect}
                                            disabled={disabledDays}
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
