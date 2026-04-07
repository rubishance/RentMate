import React, { useState } from 'react';
import { cn } from '../../lib/utils';
import { FormLabel } from './FormLabel';
import { Eye, EyeOff } from 'lucide-react';

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
    const [showPassword, setShowPassword] = useState(false);
    const isPassword = type === 'password';
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type;

    return (
        <div className="space-y-2 w-full">
            {label && (
                <FormLabel label={label} required={required} />
            )}
            <div className="relative group flex w-full" dir={props.dir}>
                {leftIcon && (
                    <div className="absolute start-3 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors pointer-events-none z-10">
                        {leftIcon}
                    </div>
                )}
                <input
                    type={inputType}
                    className={cn(
                        "flex h-12 w-full rounded-xl border border-input bg-background px-4 py-2 text-base ring-offset-background file:border-0 file:bg-transparent file:text-base file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-80 transition-all shadow-sm",
                        leftIcon && "ps-11",
                        (rightIcon || isPassword) && "pe-11",
                        error && "border-destructive focus-visible:ring-destructive",
                        className
                    )}
                    ref={ref}
                    {...props}
                />
                {(rightIcon || isPassword) && (
                    <div className={cn(
                        "absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors z-10",
                         !isPassword && "pointer-events-none group-focus-within:text-primary"
                    )}>
                        {isPassword ? (
                            <button
                                type="button"
                                aria-label={showPassword ? "Hide password" : "Show password"}
                                onClick={() => setShowPassword(!showPassword)}
                                className="focus:outline-none hover:text-foreground text-muted-foreground/80 hover:bg-muted/50 p-1.5 rounded-md -me-1.5 transition-colors flex items-center justify-center h-full"
                            >
                                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                        ) : (
                            rightIcon
                        )}
                    </div>
                )}
            </div>
            {error && (
                <p className="text-[0.8rem] font-medium text-destructive mt-1.5 text-start w-full">{error}</p>
            )}
        </div>
    );
});

Input.displayName = 'Input';

