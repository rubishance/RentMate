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
                    "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-colors duration-300 shadow-inner border border-transparent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-secondary focus-visible:ring-offset-2 focus-visible:ring-offset-background",
                    checked ? "bg-secondary" : "bg-muted",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <motion.span
                    transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    animate={{
                        x: checked ? 28 : 4,
                        scale: checked ? 1.05 : 0.9,
                    }}
                    initial={false}
                    className="pointer-events-none block h-6 w-6 rounded-full bg-white ring-0"
                    style={{
                        boxShadow: checked ? '0 0 15px hsl(var(--secondary))' : '0 2px 4px rgba(0,0,0,0.1)'
                    }}
                />
            </button>
        </div>
    );
};
