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
                        "flex h-12 w-full rounded-[1.25rem] border border-input bg-background/50 px-4 py-3 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-all duration-300 shadow-sm hover:border-primary/50 hover:bg-background",
                        leftIcon && "pl-10",
                        rightIcon && "pr-10",
                        error && "border-destructive focus-visible:ring-destructive",
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
