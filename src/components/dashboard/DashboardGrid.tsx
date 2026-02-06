import { WidgetConfig, DashboardData, WIDGET_REGISTRY } from './WidgetRegistry';
import { motion, AnimatePresence, Reorder, useDragControls } from 'framer-motion';
import { cn } from '../../lib/utils';
import { GripVertical } from 'lucide-react';

interface DashboardGridProps {
    layout: WidgetConfig[];
    data: DashboardData;
    isEditing?: boolean;
    onLayoutChange?: (newLayout: WidgetConfig[]) => void;
    onUpdateWidgetSettings?: (widgetId: string, settings: any) => void;
}

export function DashboardGrid({ layout, data, isEditing = false, onLayoutChange, onUpdateWidgetSettings }: DashboardGridProps) {
    const sortedLayout = [...layout].sort((a, b) => a.order - b.order);

    const handleReorder = (newOrder: WidgetConfig[]) => {
        if (!onLayoutChange) return;
        // Update the 'order' property for each widget based on its new index
        const updatedLayout = newOrder.map((config, index) => ({
            ...config,
            order: index
        }));
        // Merge back with any widgets that weren't in the reorderable list (e.g. hidden ones)
        const invisibleWidgets = layout.filter(w => !w.visible);
        onLayoutChange([...updatedLayout, ...invisibleWidgets]);
    };

    const getSizeClass = (size: string) => {
        if (isEditing) return 'col-span-1'; // Force single column in edit mode for reliable reordering
        switch (size) {
            case 'large': return 'col-span-1 lg:col-span-2';
            case 'medium': return 'col-span-1';
            case 'small': return 'col-span-1';
            default: return 'col-span-1';
        }
    };

    return (
        <Reorder.Group
            axis="y"
            values={sortedLayout.filter(w => w.visible)}
            onReorder={handleReorder}
            className={cn(
                "grid gap-6 pb-20",
                isEditing ? "grid-cols-1 max-w-2xl mx-auto" : "grid-cols-1 lg:grid-cols-2"
            )}
        >
            <AnimatePresence mode="popLayout">
                {sortedLayout.filter(w => w.visible).length > 0 ? (
                    sortedLayout.filter(w => w.visible).map((widget) => {
                        const WidgetComponent = WIDGET_REGISTRY[widget.widgetId];
                        if (!WidgetComponent) return null;

                        return (
                            <WidgetRow
                                key={widget.id}
                                widget={widget}
                                data={data}
                                isEditing={isEditing}
                                sizeClass={getSizeClass(widget.size)}
                                onRender={() => WidgetComponent(data, widget, (updates) => {
                                    if (updates.settings) {
                                        onUpdateWidgetSettings?.(widget.id, updates.settings);
                                    }
                                })}
                            />
                        );
                    })
                ) : (
                    <div className="lg:col-span-2 py-20 text-center space-y-4">
                        <p className="text-muted-foreground font-medium">המבט המהיר שלך ריק. התאם אישית כדי להוסיף ווידג'טים.</p>
                        <button
                            onClick={() => window.location.reload()}
                            className="text-primary font-bold hover:underline"
                        >
                            שחזר הגדרות ברירת מחדל
                        </button>
                    </div>
                )}
            </AnimatePresence>
        </Reorder.Group>
    );
}

function WidgetRow({ widget, data, isEditing, sizeClass, onRender }: any) {
    const controls = useDragControls();

    return (
        <Reorder.Item
            value={widget}
            dragListener={false}
            dragControls={controls}
            className={cn(
                "relative list-none",
                sizeClass
            )}
        >
            {isEditing && (
                <div
                    onPointerDown={(e) => controls.start(e)}
                    className="absolute top-4 right-4 z-50 p-2 bg-white/95 dark:bg-black/95 backdrop-blur rounded-full cursor-grab active:cursor-grabbing shadow-xl border border-primary/20 dark:border-primary/20 touch-none hover:scale-110 transition-transform"
                >
                    <GripVertical className="w-5 h-5 text-primary" />
                </div>
            )}

            <div className={cn(
                "h-full transition-all duration-300",
                isEditing && "ring-2 ring-primary ring-offset-8 dark:ring-offset-black rounded-[2.5rem] opacity-95 scale-[0.98] pointer-events-none select-none shadow-2xl bg-white dark:bg-neutral-900"
            )}>
                {onRender()}
            </div>
        </Reorder.Item>
    );
}
