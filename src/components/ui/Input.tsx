import React from 'react';
import { cn } from '../../lib/utils';
import { FormLabel } from './FormLabel';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    required?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(({
    className,
    type,
    label,
    error,
    required,
    leftIcon,
    rightIcon,
    ...props
}, ref) => {
    return (
        <div className="space-y-2 w-full">
            {label && (
                <FormLabel label={label} required={required} />
            )}
            <div className="relative group">
                {leftIcon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                        {leftIcon}
                    </div>
                )}
                <input
                    type={type}
                    className={cn(
                        "flex h-12 w-full rounded-[1.25rem] border-2 border-black/5 dark:border-white/5 bg-gray-50 dark:bg-neutral-900 px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-black dark:focus-visible:ring-white disabled:cursor-not-allowed disabled:opacity-50 transition-all",
                        leftIcon && "pl-10",
                        rightIcon && "pr-10",
                        error && "border-red-500 focus-visible:ring-red-500",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {rightIcon && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                        {rightIcon}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-xs font-medium text-red-500 mt-1">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
