import React from 'react';
import { cn } from '../../lib/utils';
import { FormLabel } from './FormLabel';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
    label?: string;
    error?: string;
    required?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(({
    className,
    label,
    error,
    required,
    ...props
}, ref) => {
    return (
        <div className="space-y-2 w-full">
            {label && (
                <FormLabel label={label} required={required} />
            )}
            <textarea
                className={cn(
                    "flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
                    error && "border-destructive focus-visible:ring-destructive",
                    className
                )}
                ref={ref}
                {...props}
            />
            {error && (
                <p className="text-[0.8rem] font-medium text-destructive mt-1.5">
                    {error}
                </p>
            )}
        </div>
    );
});

Textarea.displayName = 'Textarea';
