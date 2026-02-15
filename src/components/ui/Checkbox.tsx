import React from 'react';
import { Check } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

interface CheckboxProps extends Omit<React.ButtonHTMLAttributes<HTMLButtonElement>, 'onChange'> {
    checked: boolean;
    onChange: (checked: boolean) => void;
    label?: React.ReactNode;
    description?: string;
    icon?: React.ReactNode;
}

export const Checkbox = React.forwardRef<HTMLButtonElement, CheckboxProps>(({
    checked,
    onChange,
    label,
    description,
    icon,
    className,
    disabled,
    ...props
}, ref) => {
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _preferences = useUserPreferences(); // Keep if needed for future logic, otherwise remove. Code had it.

    return (
        <button
            type="button"
            role="checkbox"
            aria-checked={checked}
            disabled={disabled}
            onClick={() => !disabled && onChange(!checked)}
            ref={ref}
            className={cn(
                "checkbox-button w-full text-start p-4 glass-premium dark:bg-neutral-900/40 rounded-xl border border-white/5 shadow-sm hover:shadow-md transition-all duration-300 group relative",
                checked && "dark:bg-primary/10 bg-primary/5 border-primary/20",
                disabled && "opacity-50 cursor-not-allowed",
                className
            )}
            {...props}
        >
            <div className="flex items-center gap-4">
                {icon && (
                    <div className={cn(
                        "p-2 rounded-lg transition-colors",
                        checked ? "bg-primary text-white shadow-lg shadow-primary/20" : "bg-slate-100 dark:bg-neutral-800 text-muted-foreground"
                    )}>
                        {icon}
                    </div>
                )}
                <div className="flex flex-col flex-1">
                    {label && (
                        <span className={cn(
                            "font-medium text-sm leading-tight transition-colors",
                            checked ? "text-primary dark:text-primary-foreground" : "text-foreground"
                        )}>
                            {label}
                        </span>
                    )}
                    {description && (
                        <span className="text-xs text-muted-foreground mt-0.5">
                            {description}
                        </span>
                    )}
                </div>
                <div className={cn(
                    "w-6 h-6 rounded-full border transition-all duration-300 shrink-0 flex items-center justify-center ml-2",
                    checked
                        ? "bg-primary border-primary scale-110 shadow-lg shadow-primary/25"
                        : "border-slate-300 dark:border-neutral-600 bg-white/50 dark:bg-black/20 group-hover:border-primary/50"
                )}>
                    <Check className={cn(
                        "w-3.5 h-3.5 text-white transition-transform duration-300",
                        checked ? "scale-100" : "scale-0"
                    )} />
                </div>
            </div>
        </button>
    );
});

Checkbox.displayName = 'Checkbox';
