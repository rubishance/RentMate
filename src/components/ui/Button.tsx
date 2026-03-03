import React, { useState } from 'react';
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
    const [isPressed, setIsPressed] = useState(false);

    const handlePointerDown = (e: React.PointerEvent<HTMLButtonElement>) => {
        setIsPressed(true);
        props.onPointerDown?.(e);
    };
    const handlePointerUp = (e: React.PointerEvent<HTMLButtonElement>) => {
        setIsPressed(false);
        props.onPointerUp?.(e);
    };
    const handlePointerLeave = (e: React.PointerEvent<HTMLButtonElement>) => {
        setIsPressed(false);
        props.onPointerLeave?.(e);
    };
    const handleKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') setIsPressed(true);
        props.onKeyDown?.(e);
    };
    const handleKeyUp = (e: React.KeyboardEvent<HTMLButtonElement>) => {
        if (e.key === 'Enter' || e.key === ' ') setIsPressed(false);
        props.onKeyUp?.(e);
    };

    const variants = {
        primary: 'group relative overflow-hidden bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-[0_0_35px_-10px_hsl(var(--primary))] hover:brightness-110 border border-primary/20',
        secondary: 'group relative overflow-hidden bg-secondary text-secondary-foreground shadow-md shadow-secondary/20 hover:shadow-[0_0_35px_-10px_hsl(var(--secondary))] hover:brightness-110 border border-secondary/20',
        outline: 'border-2 border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'group relative overflow-hidden bg-destructive text-destructive-foreground shadow-md shadow-destructive/20 hover:shadow-[0_0_35px_-10px_hsl(var(--destructive))] hover:brightness-110 border border-destructive/20',
        link: 'text-primary underline-offset-4 hover:underline',
        jewel: 'button-jewel text-white relative overflow-hidden',
        aurora: 'group relative overflow-hidden bg-primary text-primary-foreground shadow-md shadow-primary/20 hover:shadow-[0_0_35px_-10px_hsl(var(--primary))] hover:brightness-110 border border-primary/20',
    };

    const sizes = {
        sm: 'h-9 px-3 text-xs rounded-md',
        default: 'h-10 px-4 py-2',
        lg: 'h-11 px-8 rounded-md',
        icon: 'h-10 w-10'
    };

    const baseStyles = 'inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] disabled:hover:scale-100 disabled:active:scale-100';

    const isSolid = ['primary', 'secondary', 'destructive', 'aurora', 'jewel'].includes(variant);

    const getSweepColor = () => {
        switch (variant) {
            case 'primary':
            case 'aurora':
                return 'bg-secondary';
            case 'secondary':
                return 'bg-primary';
            case 'destructive':
                return 'bg-red-900';
            case 'jewel':
                return 'bg-white/20';
            default:
                return 'bg-secondary';
        }
    };

    return (
        <motion.button
            ref={ref as any}
            disabled={isLoading || disabled}
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 1, y: disabled ? 0 : 1 }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            {...(props as any)}
        >
            {isSolid && (
                <>
                    {/* Aurora Background for Hover */}
                    <div className="absolute inset-0 overflow-hidden rounded-[inherit] z-0 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500">
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

                    {/* Sweep Gradient Displacement Layer */}
                    <motion.div
                        initial={false}
                        animate={{
                            clipPath: isPressed && !disabled ? "circle(150% at 0% 0%)" : "circle(0% at 0% 0%)"
                        }}
                        transition={{
                            duration: 0.3,
                            ease: [0.645, 0.045, 0.355, 1]
                        }}
                        className={cn("absolute inset-0 z-20 pointer-events-none", getSweepColor())}
                    />
                </>
            )}

            <motion.span
                animate={{
                    color: isSolid && isPressed && !disabled
                        ? (variant === 'primary' || variant === 'aurora'
                            ? 'hsl(var(--secondary-foreground))'
                            : variant === 'secondary'
                                ? 'hsl(var(--primary-foreground))'
                                : 'inherit')
                        : 'inherit'
                }}
                transition={{ duration: 0.3, ease: [0.645, 0.045, 0.355, 1] }}
                className={cn("relative z-30 flex items-center justify-center w-full max-w-full overflow-hidden truncate", isSolid ? "mix-blend-normal" : "")}
            >
                {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin shrink-0" />}
                {!isLoading && leftIcon && <span className="mr-2 shrink-0">{leftIcon}</span>}
                <span className="truncate">{children}</span>
                {!isLoading && rightIcon && <span className="ml-2 shrink-0">{rightIcon}</span>}
            </motion.span>
        </motion.button>
    );
});

Button.displayName = 'Button';
