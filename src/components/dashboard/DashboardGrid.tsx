import { WidgetConfig, DashboardData, WIDGET_REGISTRY } from './WidgetRegistry';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '../../lib/utils';
import { GripVertical } from 'lucide-react';

interface DashboardGridProps {
    layout: WidgetConfig[];
    data: DashboardData;
    isEditing?: boolean;
    onLayoutChange?: (newLayout: WidgetConfig[]) => void;
}

export function DashboardGrid({ layout, data, isEditing = false, onLayoutChange }: DashboardGridProps) {
    const sortedLayout = [...layout].sort((a, b) => a.order - b.order);

    const getSizeClass = (size: string) => {
        switch (size) {
            case 'large': return 'col-span-1 lg:col-span-2'; // Full width on large
            case 'medium': return 'col-span-1';
            case 'small': return 'col-span-1';
            default: return 'col-span-1';
        }
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 pb-20">
            <AnimatePresence>
                {sortedLayout.filter(w => w.visible).map((widget) => {
                    const WidgetComponent = WIDGET_REGISTRY[widget.widgetId];
                    if (!WidgetComponent) return null;

                    return (
                        <motion.div
                            key={widget.id}
                            layout
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ duration: 0.3 }}
                            className={cn(
                                "relative",
                                getSizeClass(widget.size)
                            )}
                        >
                            {isEditing && (
                                <div className="absolute top-4 right-4 z-10 p-2 bg-white/80 dark:bg-black/80 backdrop-blur rounded-full cursor-grab active:cursor-grabbing shadow-sm border border-slate-100 dark:border-neutral-800">
                                    <GripVertical className="w-4 h-4 text-muted-foreground" />
                                </div>
                            )}

                            {/* Widget Container - Can add common styles here if needed */}
                            <div className={cn(
                                "h-full",
                                isEditing && "ring-2 ring-primary ring-offset-2 rounded-[2rem]"
                            )}>
                                {WidgetComponent(data)}
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}
