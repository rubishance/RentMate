import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Check, X, Edit3 } from 'lucide-react';

interface ActionOption {
    label: string;
    value: string;
    variant?: 'default' | 'outline' | 'destructive';
}

interface ActionCardProps {
    title: string;
    description?: string;
    options: ActionOption[];
    onSelect: (value: string) => void;
}

export function ActionCard({ title, description, options, onSelect }: ActionCardProps) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-2xl p-4 shadow-sm my-2 max-w-[85%]"
        >
            <h4 className="font-bold text-sm text-foreground mb-1">{title}</h4>
            {description && (
                <p className="text-xs text-muted-foreground mb-4 leading-relaxed">
                    {description}
                </p>
            )}

            <div className="flex flex-wrap gap-2">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => onSelect(opt.value)}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
                            opt.variant === 'destructive'
                                ? "bg-rose-50 text-rose-600 hover:bg-rose-100 border border-rose-200"
                                : opt.variant === 'outline'
                                    ? "bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200"
                                    : "bg-indigo-600 text-white hover:bg-indigo-700 shadow-sm"
                        )}
                    >
                        {opt.value === 'approve' && <Check className="w-3 h-3" />}
                        {opt.value === 'reject' && <X className="w-3 h-3" />}
                        {opt.value === 'edit' && <Edit3 className="w-3 h-3" />}
                        {opt.label}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}
