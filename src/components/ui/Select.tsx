import React from 'react';
import { cn } from '../../lib/utils';
import { ChevronDown } from 'lucide-react';
import { FormLabel } from './FormLabel';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
    label?: string;
    error?: string;
    required?: boolean;
    leftIcon?: React.ReactNode;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(({
    className,
    children,
    label,
    error,
    required,
    leftIcon,
    ...props
}, ref) => {
    return (
        <div className="space-y-2 w-full">
            {label && (
                <FormLabel label={label} required={required} />
            )}
            <div className="relative group">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none group-focus-within:text-primary transition-colors">
                        {leftIcon}
                    </div>
                )}
                <select
                    className={cn(
                        "w-full h-10 px-3 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg text-sm transition-all appearance-none focus:outline-none focus:ring-1 focus:ring-primary focus:border-primary",
                        leftIcon && "pl-10",
                        error && "border-destructive focus:ring-destructive",
                        className
                    )}
                    ref={ref}
                    {...props}
                >
                    {children}
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <ChevronDown className="w-4 h-4" />
                </div>
            </div>
            {error && (
                <p className="text-[0.8rem] font-medium text-destructive mt-1.5">
                    {error}
                </p>
            )}
        </div>
    );
});

Select.displayName = 'Select';
