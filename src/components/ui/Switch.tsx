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
        <div className={cn("flex items-center gap-2 sm:gap-4", className)}>
            {label && <span className="text-sm font-medium text-foreground">{label}</span>}
            <button
                type="button"
                role="switch"
                aria-checked={checked}
                disabled={disabled}
                onClick={() => !disabled && onChange(!checked)}
                className={cn(
                    "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center p-1 rounded-full transition-colors duration-300 shadow-inner border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    checked ? "bg-primary justify-end" : "bg-muted justify-start",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <motion.span
                    layout
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    animate={{
                        scale: checked ? 1.05 : 0.9,
                    }}
                    initial={false}
                    className="pointer-events-none block h-6 w-6 rounded-full bg-white ring-0 shadow-sm"
                    style={{
                        boxShadow: checked ? '0 0 15px hsl(var(--primary))' : '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                />
            </button>
        </div>
    );
};
