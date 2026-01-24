import React from 'react';
import { cn } from '../../lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
    hoverEffect?: boolean;
    glass?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(({
    className,
    hoverEffect = false,
    glass = false,
    children,
    ...props
}, ref) => {
    return (
        <div
            ref={ref}
            className={cn(
                "rounded-2xl border border-border bg-card text-card-foreground shadow-sm transition-all duration-300",
                hoverEffect && "hover:shadow-md hover:-translate-y-1 cursor-pointer",
                glass && "bg-white/60 dark:bg-black/60 backdrop-blur-md",
                className
            )}
            {...props}
        >
            {children}
        </div>
    );
});

Card.displayName = 'Card';

export const CardHeader = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex flex-col space-y-1.5 p-6", className)} {...props} />
);

export const CardTitle = ({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) => (
    <h3 className={cn("text-lg font-bold leading-none tracking-tight", className)} {...props} />
);

export const CardDescription = ({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) => (
    <p className={cn("text-sm text-muted-foreground", className)} {...props} />
);

export const CardContent = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("p-6 pt-0", className)} {...props} />
);

export const CardFooter = ({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
    <div className={cn("flex items-center p-6 pt-0", className)} {...props} />
);
