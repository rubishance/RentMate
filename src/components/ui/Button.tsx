import React from 'react';
import { motion, HTMLMotionProps } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive';
    size?: 'sm' | 'default' | 'lg' | 'icon';
    isLoading?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
    className,
    variant = 'primary',
    size = 'default',
    isLoading = false,
    disabled,
    leftIcon,
    rightIcon,
    children,
    ...props
}, ref) => {
    const variants = {
        primary: 'bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm active:scale-[0.98]',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 active:scale-[0.98]',
        outline: 'border border-border bg-background hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        ghost: 'hover:bg-accent hover:text-accent-foreground active:scale-[0.98]',
        destructive: 'bg-red-600 text-white hover:bg-red-700 active:scale-[0.98]'
    };

    const sizes = {
        sm: 'h-8 px-3 text-xs',
        default: 'h-10 px-4 py-2',
        lg: 'h-12 px-8 text-lg',
        icon: 'h-10 w-10'
    };

    const baseStyles = 'inline-flex items-center justify-center rounded-xl font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

    return (
        <button
            ref={ref}
            disabled={isLoading || disabled}
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            {...(props as any)}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
        </button>
    );
});

Button.displayName = 'Button';
