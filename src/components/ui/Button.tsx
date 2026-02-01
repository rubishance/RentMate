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
        primary: 'bg-black dark:bg-white text-white dark:text-black font-black uppercase tracking-widest hover:bg-black/90 dark:hover:bg-white/90 shadow-lg',
        secondary: 'bg-gray-100 dark:bg-neutral-900 text-black dark:text-white font-black uppercase tracking-widest hover:bg-gray-200 dark:hover:bg-neutral-800',
        outline: 'border-2 border-black/10 dark:border-white/10 bg-transparent hover:border-black dark:hover:border-white font-black uppercase tracking-widest',
        ghost: 'hover:bg-gray-100 dark:hover:bg-neutral-900 font-bold',
        destructive: 'bg-red-600 text-white font-black uppercase tracking-widest hover:bg-red-700'
    };

    const sizes = {
        sm: 'h-10 px-4 text-[10px]',
        default: 'h-12 px-6 py-2 text-xs',
        lg: 'h-16 px-10 text-sm',
        icon: 'h-12 w-12'
    };

    const baseStyles = 'inline-flex items-center justify-center rounded-[1.25rem] transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:pointer-events-none disabled:opacity-50';

    return (
        <motion.button
            ref={ref as any}
            disabled={isLoading || disabled}
            className={cn(baseStyles, variants[variant], sizes[size], className)}
            whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
            whileTap={{ scale: 0.98 }}
            {...(props as any)}
        >
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {!isLoading && leftIcon && <span className="mr-2">{leftIcon}</span>}
            {children}
            {!isLoading && rightIcon && <span className="ml-2">{rightIcon}</span>}
        </motion.button>
    );
});

Button.displayName = 'Button';
