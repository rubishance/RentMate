import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';

interface SwitchProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    disabled?: boolean;
    className?: string;
}

export const Switch: React.FC<SwitchProps> = ({
    checked,
    onChange,
    label,
    disabled = false,
    className,
}) => {
    return (
        <div className={cn("flex items-center gap-3", className)}>
            {label && <span className="text-sm font-medium text-foreground">{label}</span>}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={cn(
                    "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
                    checked ? "bg-black dark:bg-white" : "bg-gray-200 dark:bg-neutral-800"
                )}
            >
                <motion.span
                    animate={{ x: checked ? 20 : 2 }}
                    initial={false}
                    className={cn(
                        "pointer-events-none block h-5 w-5 rounded-full shadow-lg ring-0 transition-transform",
                        checked
                            ? "bg-white dark:bg-black"
                            : "bg-white dark:bg-neutral-400"
                    )}
                />
            </button>
        </div>
    );
};
