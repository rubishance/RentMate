import { LucideIcon } from 'lucide-react';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';
import { motion } from 'framer-motion';

interface EmptyStateProps {
    icon: LucideIcon | React.ElementType;
    title: string;
    description: string;
    actionLabel: string;
    onAction: () => void;
    className?: string;
}

export function EmptyState({
    icon: Icon,
    title,
    description,
    actionLabel,
    onAction,
    className
}: EmptyStateProps) {
    return (
        <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className={cn(
                "flex flex-col items-center justify-center p-8 sm:p-14 text-center rounded-3xl border border-slate-100 dark:border-white/5 bg-slate-50/50 dark:bg-neutral-900/50",
                className
            )}
        >
            <div className="w-20 h-20 sm:w-24 sm:h-24 bg-primary/10 dark:bg-primary/5 rounded-3xl flex items-center justify-center shadow-sm mb-6 sm:mb-8">
                <Icon className="w-10 h-10 sm:w-12 sm:h-12 text-primary" strokeWidth={1.5} />
            </div>
            
            <div className="space-y-4 max-w-md mx-auto">
                <h3 className="text-2xl sm:text-3xl font-black tracking-tighter text-foreground">
                    {title}
                </h3>
                <p className="text-sm sm:text-base text-muted-foreground font-medium px-2 sm:px-6 leading-relaxed">
                    {description}
                </p>
            </div>
            
            <div className="mt-8 sm:mt-10 flex justify-center w-full">
                <Button
                    onClick={onAction}
                    className="h-12 px-8 py-2 rounded-xl font-bold uppercase tracking-widest text-xs shadow-md hover:shadow-lg hover:scale-105 active:scale-95 transition-all w-full sm:w-auto"
                >
                    {actionLabel}
                </Button>
            </div>
        </motion.div>
    );
}
