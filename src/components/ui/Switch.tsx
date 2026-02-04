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
                    "relative inline-flex h-8 w-14 shrink-0 cursor-pointer items-center rounded-full transition-all duration-700 glass-premium border-white/5 shadow-minimal",
                    checked ? "dark:bg-indigo-500/20 bg-indigo-50/50" : "bg-white/5 dark:bg-black/40",
                    disabled && "opacity-50 cursor-not-allowed"
                )}
            >
                <motion.span
                    animate={{
                        x: checked ? 28 : 4,
                        scale: checked ? 1 : 0.9,
                        backgroundColor: checked ? "#ffffff" : "rgba(255,255,255,0.2)"
                    }}
                    initial={false}
                    className={cn(
                        "pointer-events-none block h-6 w-6 rounded-full transition-all duration-700",
                        checked
                            ? "shadow-jewel bg-white"
                            : "bg-white/20"
                    )}
                    style={{
                        boxShadow: checked ? '0 0 15px rgba(99, 102, 241, 0.5)' : 'none'
                    }}
                />
            </button>
        </div>
    );
};
