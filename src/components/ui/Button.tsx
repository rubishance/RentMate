import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Loader2, Check } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'outline' | 'ghost' | 'destructive' | 'link' | 'jewel' | 'aurora';
    size?: 'sm' | 'default' | 'lg' | 'icon';
    isLoading?: boolean;
    isSuccess?: boolean;
    noEffects?: boolean;
    leftIcon?: React.ReactNode;
    rightIcon?: React.ReactNode;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(({
    className,
    variant = 'primary',
    size = 'default',
    isLoading = false,
    isSuccess = false,
    noEffects = false,
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
        primary: 'bg-primary text-primary-foreground shadow-sm hover:brightness-110',
        secondary: 'bg-secondary text-secondary-foreground shadow-sm hover:brightness-110',
        outline: 'border-2 border-input bg-background shadow-sm hover:bg-accent hover:text-accent-foreground',
        ghost: 'hover:bg-accent hover:text-accent-foreground',
        destructive: 'bg-destructive text-destructive-foreground shadow-sm hover:brightness-110',
        link: 'text-primary underline-offset-4 hover:underline',
        jewel: 'bg-primary text-primary-foreground shadow-sm hover:brightness-110',
        aurora: 'bg-primary text-primary-foreground shadow-sm hover:brightness-110',
    };

    const sizes = {
        sm: 'h-10 px-4 text-sm rounded-lg',
        default: 'h-12 px-6 text-base rounded-xl',
        lg: 'h-14 px-8 text-base rounded-xl',
        icon: 'h-12 w-12 rounded-xl'
    };

    const baseStyles = 'inline-flex flex-nowrap items-center justify-center whitespace-nowrap rounded-lg font-medium transition-all duration-300 ease-out focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50 hover:scale-[1.02] disabled:hover:scale-100 disabled:active:scale-100 w-full sm:w-auto';

    // Override variant if success
    const currentVariantClass = isSuccess 
        ? 'bg-success text-success-foreground shadow-sm hover:brightness-110' 
        : variants[variant];

    return (
        <motion.button
            ref={ref as any}
            disabled={isLoading || isSuccess || disabled}
            className={cn(baseStyles, currentVariantClass, sizes[size], className)}
            whileHover={{ scale: (disabled || isSuccess) ? 1 : 1.02 }}
            whileTap={{ scale: (disabled || isSuccess) ? 1 : 1, y: (disabled || isSuccess) ? 0 : 1 }}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerLeave}
            onKeyDown={handleKeyDown}
            onKeyUp={handleKeyUp}
            {...(props as any)}
        >
            <span
                className="flex items-center justify-center w-full max-w-full overflow-hidden truncate"
            >
                {isLoading && <Loader2 className="me-2 h-4 w-4 animate-spin shrink-0" />}
                {isSuccess && !isLoading && <Check className="me-2 h-4 w-4 shrink-0" />}
                {!isLoading && !isSuccess && leftIcon && <span className="me-2 shrink-0">{leftIcon}</span>}
                <span className="truncate">{children}</span>
                {!isLoading && !isSuccess && rightIcon && <span className="ms-2 shrink-0">{rightIcon}</span>}
            </span>
        </motion.button>
    );
});

Button.displayName = 'Button';
