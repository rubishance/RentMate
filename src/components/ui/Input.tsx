import React from 'react';
import { cn } from '../../lib/utils';
import { FormLabel } from './FormLabel';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: React.ReactNode;
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
                        "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 transition-colors shadow-sm",
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
                <p className="text-[0.8rem] font-medium text-destructive mt-1.5">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';
