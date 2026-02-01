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
            "relative flex p-1 bg-gray-100 dark:bg-neutral-900 rounded-xl overflow-hidden",
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
                            "font-black uppercase tracking-widest",
                            isActive ? "text-black dark:text-white" : "text-gray-400 dark:text-gray-500 hover:text-black dark:hover:text-white"
                        )}
                    >
                        {option.icon && <span className="shrink-0">{option.icon}</span>}
                        <span className="truncate">{option.label}</span>

                        {isActive && (
                            <motion.div
                                layoutId="segmented-control-active"
                                className="absolute inset-0 bg-white dark:bg-neutral-800 rounded-lg shadow-sm -z-10"
                                transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                            />
                        )}
                    </button>
                );
            })}
        </div>
    );
};
