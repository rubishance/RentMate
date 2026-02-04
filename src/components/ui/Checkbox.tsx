import React from 'react';
import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface CheckboxProps {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: string;
    description?: string;
    icon?: React.ReactNode;
    className?: string;
}

export const Checkbox: React.FC<CheckboxProps> = ({
    checked,
    onChange,
    label,
    description,
    icon,
    className
}) => {
    const { preferences } = useUserPreferences();

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            onClick={() => onChange(!checked)}
            className={cn(
                "checkbox-button w-full text-start p-6 glass-premium dark:bg-neutral-900/40 rounded-3xl border-white/5 shadow-minimal hover:shadow-jewel transition-all duration-700 group",
                checked && "dark:bg-indigo-500/5 bg-indigo-50/20 border-indigo-500/20",
                className
            )}
        >
            <div className="flex items-center gap-4">
                {icon && (
                    <div className={cn(
                        "p-2 rounded-xl transition-colors",
                        checked ? "bg-white/20 text-white" : "bg-slate-100 dark:bg-neutral-800 text-muted-foreground"
                    )}>
                        {icon}
                    </div>
                )}
                <div className="flex flex-col">
                    {label && (
                        <span className={cn(
                            "font-bold text-sm leading-tight",
                            checked ? "text-white" : "text-foreground"
                        )}>
                            {label}
                        </span>
                    )}
                    {description && (
                        <span className={cn(
                            "text-[10px] uppercase font-bold tracking-widest",
                            checked ? "text-white/70" : "text-muted-foreground"
                        )}>
                            {description}
                        </span>
                    )}
                </div>
            </div>
            <div className={cn(
                "w-7 h-7 rounded-full border transition-all duration-700 shrink-0 flex items-center justify-center",
                checked
                    ? "button-jewel border-transparent scale-110 shadow-jewel"
                    : "border-white/10 bg-white/5 dark:bg-black/40"
            )}>
                {checked && <Check className="w-4 h-4 text-white" />}
            </div>
        </button>
    );
};
