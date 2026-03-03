import React from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link' | 'jewel' | 'aurora';
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
        primary: 'group relative overflow-hidden bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-[0_0_35px_-10px_hsl(var(--primary))] hover:brightness-110 border border-primary/20',
        secondary: 'group relative overflow-hidden bg-secondary text-secondary-foreground shadow-md shadow-secondary/20 hover:shadow-[0_0_35px_-10px_hsl(var(--secondary))] hover:brightness-110 border border-secondary/20',
        outline: 'border-2 border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'group relative overflow-hidden bg-destructive text-destructive-foreground shadow-md shadow-destructive/20 hover:shadow-[0_0_35px_-10px_hsl(var(--destructive))] hover:brightness-110 border border-destructive/20',
        link: 'text-primary underline-offset-4 hover:underline',
        jewel: 'button-jewel text-white',
        aurora: 'group relative overflow-hidden bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-[0_0_35px_-10px_hsl(var(--primary))] hover:brightness-110 border border-primary/20',
    };

    const sizes = {
        sm: 'h-9 px-3 text-xs rounded-md',
        default: 'h-10 px-4 py-2',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10'
    };

    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] active:scale-[0.98] disabled:hover:scale-100 disabled:active:scale-100';

    // Motion wrapper only if not disabled to prevent hydration mismatches with simple buttons
    if (props.onClick || props.type === 'submit') {
        return (
            <motion.button
                ref={ref as any}
                disabled={isLoading || disabled}
                className={cn(baseStyles, variants[variant], sizes[size], className)}
                whileHover={{ scale: disabled ? 1 : 1.02 }}
                whileTap={{ scale: disabled ? 1 : 0.98 }}
                {...(props as any)}
            >
                {['primary', 'secondary', 'destructive', 'aurora'].includes(variant) && (
                    <div className="absolute inset-0 overflow-hidden rounded-[inherit] z-0 pointer-events-none">
                        <div className={cn(
                            "absolute -inset-[100%] opacity-40 group-hover:opacity-100 transition-opacity duration-500 blur-xl animate-[spin_20s_linear_infinite]",
                            variant === 'secondary' ? "bg-[conic-gradient(from_90deg_at_50%_50%,hsl(var(--secondary))_0%,hsl(var(--primary))_50%,hsl(var(--secondary))_100%)]" :
                                variant === 'destructive' ? "bg-[conic-gradient(from_90deg_at_50%_50%,hsl(var(--destructive))_0%,#f87171_50%,hsl(var(--destructive))_100%)]" :
                                    "bg-[conic-gradient(from_90deg_at_50%_50%,hsl(var(--primary))_0%,hsl(var(--secondary))_50%,hsl(var(--primary))_100%)]"
                        )} />
                        <div className={cn(
                            "absolute inset-[1px] rounded-[inherit] z-10 backdrop-blur-3xl transition-colors duration-500",
                            variant === 'secondary' ? "bg-secondary/95 group-hover:bg-secondary/50" :
                                variant === 'destructive' ? "bg-destructive/95 group-hover:bg-destructive/50" :
                                    "bg-primary/95 group-hover:bg-primary/50"
                        )} />
                    </div>
                )}
                <span className="relative z-10 flex items-center justify-center w-full">
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                    {children}
                    {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
                </span>
            </motion.button>
        );
    }

    // Standard button fallback for simple use cases
    return (
        <button
            ref={ref}
            disabled={isLoading || disabled}
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            {...props}
        >
            {['primary', 'secondary', 'destructive', 'aurora'].includes(variant) && (
                <div className="absolute inset-0 overflow-hidden rounded-[inherit] z-0 pointer-events-none">
                    <div className={cn(
                        "absolute -inset-[100%] opacity-40 group-hover:opacity-100 transition-opacity duration-500 blur-xl animate-[spin_20s_linear_infinite]",
                        variant === 'secondary' ? "bg-[conic-gradient(from_90deg_at_50%_50%,hsl(var(--secondary))_0%,hsl(var(--primary))_50%,hsl(var(--secondary))_100%)]" :
                            variant === 'destructive' ? "bg-[conic-gradient(from_90deg_at_50%_50%,hsl(var(--destructive))_0%,#f87171_50%,hsl(var(--destructive))_100%)]" :
                                "bg-[conic-gradient(from_90deg_at_50%_50%,hsl(var(--primary))_0%,hsl(var(--secondary))_50%,hsl(var(--primary))_100%)]"
                    )} />
                    <div className={cn(
                        "absolute inset-[1px] rounded-[inherit] z-10 backdrop-blur-3xl transition-colors duration-500",
                        variant === 'secondary' ? "bg-secondary/95 group-hover:bg-secondary/50" :
                            variant === 'destructive' ? "bg-destructive/95 group-hover:bg-destructive/50" :
                                "bg-primary/95 group-hover:bg-primary/50"
                    )} />
                </div>
            )}
            <span className="relative z-10 flex items-center justify-center w-full">
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
                {children}
                {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
            </span>
        </button>
    );
});

Button.displayName = 'Button';
