import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';

interface Option {
    value: string;
    label: string;
    icon?: React.ReactNode;
}

interface SegmentedControlProps {
    options: Option[];
    value: string;
    onChange: (value: string) => void;
    className?: string;
    size?: 'sm' | 'md';
}

export const SegmentedControl: React.FC<SegmentedControlProps> = ({
    options,
    value,
    onChange,
    className,
    size = 'md',
}) => {
    return (
        <div className={cn(
            "relative flex p-1 bg-muted/50 rounded-xl overflow-hidden border border-border/50",
            className
        )}>
            {options.map((option) => {
                const isActive = value === option.value;
                return (
                    <button
                        key={option.value}
                        onClick={() => onChange(option.value)}
                        className={cn(
                            "relative flex-1 flex items-center justify-center gap-2 z-10 transition-colors duration-200",
                            size === 'sm' ? "px-3 py-1.5 text-[10px]" : "px-4 py-2.5 text-xs",
                            "font-bold uppercase tracking-wide whitespace-nowrap",
                            isActive ? "text-white" : "text-muted-foreground hover:text-foreground/80"
                        )}
                    >
                        {option.icon && <span className="shrink-0">{option.icon}</span>}
                        <span>{option.label}</span>

                        {isActive && (
                            <motion.div
                                layoutId="segmented-control-active"
                                className="absolute inset-0 bg-indigo-600 dark:bg-indigo-500 rounded-lg shadow-minimal -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
