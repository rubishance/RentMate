import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Check, X, Edit3, ChevronRight, ChevronLeft } from 'lucide-react';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

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
    const { preferences } = useUserPreferences();
    const isRtl = preferences?.language === 'he';

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full my-1 flex flex-col gap-2"
        >
            <div className="mb-1">
                <h4 className="font-bold text-sm text-foreground">{title}</h4>
                {description && (
                    <p className="text-xs text-muted-foreground mt-1 leading-relaxed">
                        {description}
                    </p>
                )}
            </div>

            <div className="flex flex-col gap-2">
                {options.map((opt) => (
                    <button
                        key={opt.value}
                        onClick={() => onSelect(opt.value)}
                        className={cn(
                            "w-full flex items-center justify-between p-2 sm:p-4 bg-white/50 dark:bg-neutral-900/50 hover:bg-white dark:hover:bg-neutral-800 shadow-sm border border-border/50 dark:border-white/10 rounded-xl transition-all text-sm font-medium text-foreground",
                            opt.variant === 'destructive' && "text-rose-600 hover:text-rose-700 bg-rose-50/50 hover:bg-rose-50 border-rose-100"
                        )}
                    >
                        <div className="flex items-center gap-2 sm:gap-4">
                            {opt.value === 'approve' && <Check className="w-4 h-4 text-emerald-500" />}
                            {opt.value === 'reject' && <X className="w-4 h-4 text-rose-500" />}
                            {opt.value === 'edit' && <Edit3 className="w-4 h-4 text-blue-500" />}
                            <span>{opt.label}</span>
                        </div>
                        {isRtl ? <ChevronLeft className="w-4 h-4 opacity-40 shrink-0" /> : <ChevronRight className="w-4 h-4 opacity-40 shrink-0" />}
                    </button>
                ))}
            </div>
        </motion.div>
    );
}
