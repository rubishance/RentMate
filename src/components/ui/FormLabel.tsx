import React from 'react';
import { cn } from '../../lib/utils';

interface FormLabelProps {
    label: React.ReactNode;
    required?: boolean;
    readOnly?: boolean;
    className?: string;
    children?: React.ReactNode;
}

export function FormLabel({ label, required, readOnly, className, children }: FormLabelProps) {
    return (
        <label className={cn("text-base font-semibold text-foreground flex items-center gap-1", className)}>
            {label}
            {required && !readOnly && <span className="text-destructive">*</span>}
            {children}
        </label>
    );
}
