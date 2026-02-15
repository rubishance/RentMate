import { Menu, MenuButton, MenuItem, MenuItems, Transition, Portal } from '@headlessui/react';
import { MoreVerticalIcon as MoreVertical, EyeIcon as Eye, EditIcon as Edit, TrashIcon as Trash2, ToolsIcon as Calculator, BellIcon as Bell, ArrowRightIcon as ChevronRight } from '../icons/NavIcons';
import { useTranslation } from '../../hooks/useTranslation';
import { Fragment } from 'react';
import { cn } from '../../lib/utils';

interface ActionMenuProps {
    onView?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onCalculate?: () => void;
    onSnooze?: (days: number) => void;
    align?: 'left' | 'right';
}

export function ActionMenu({ onView, onEdit, onDelete, onCalculate, onSnooze, align = 'right' }: ActionMenuProps) {
    const { t } = useTranslation();

    const handleAction = (action?: () => void) => {
        if (action) action();
    };

    const handleSnooze = (days: number) => {
        if (onSnooze) onSnooze(days);
    };

    return (
        <Menu as="div" className="relative inline-block text-left">
            <div>
                <MenuButton
                    className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground transition-colors focus:outline-none"
                    onClick={(e) => e.stopPropagation()}
                >
                    <MoreVertical className="w-5 h-5" />
                </MenuButton>
            </div>

            <Portal>
                <Transition
                    as={Fragment}
                    enter="transition ease-out duration-100"
                    enterFrom="transform opacity-0 scale-95"
                    enterTo="transform opacity-100 scale-100"
                    leave="transition ease-in duration-75"
                    leaveFrom="transform opacity-100 scale-100"
                    leaveTo="transform opacity-0 scale-95"
                >
                    <MenuItems
                        anchor={{ to: align === 'right' ? 'bottom end' : 'bottom start', gap: 4 }}
                        className={cn(
                            "z-[100] min-w-[180px] bg-window rounded-2xl shadow-premium border border-border/40 p-2 focus:outline-none",
                            "animate-in fade-in zoom-in-95 duration-100"
                        )}>
                        <div className="py-1">
                            {onView && (
                                <MenuItem>
                                    {({ focus }) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAction(onView);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors",
                                                focus ? "bg-slate-50 dark:bg-neutral-800 text-foreground" : "text-muted-foreground"
                                            )}
                                        >
                                            <Eye className="w-4 h-4 text-primary" />
                                            {t('view')}
                                        </button>
                                    )}
                                </MenuItem>
                            )}
                            {onEdit && (
                                <MenuItem>
                                    {({ focus }) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAction(onEdit);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors",
                                                focus ? "bg-slate-50 dark:bg-neutral-800 text-foreground" : "text-muted-foreground"
                                            )}
                                        >
                                            <Edit className="w-4 h-4 text-orange-500" />
                                            {t('edit')}
                                        </button>
                                    )}
                                </MenuItem>
                            )}
                            {onCalculate && (
                                <MenuItem>
                                    {({ focus }) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAction(onCalculate);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors",
                                                focus ? "bg-slate-50 dark:bg-neutral-800 text-foreground" : "text-muted-foreground"
                                            )}
                                        >
                                            <Calculator className="w-4 h-4 text-green-500" />
                                            {t('calculate_payments') || 'Calculate Payments'}
                                        </button>
                                    )}
                                </MenuItem>
                            )}

                            {/* Simple Snooze Options (since complex nested menus are trickier in headless UI and might need more work) */}
                            {onSnooze && (
                                <div className="border-t border-slate-50 dark:border-neutral-800 my-1 pt-1">
                                    <div className="px-4 py-1.5 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
                                        {t('snooze') || 'Snooze'}
                                    </div>
                                    {[1, 3, 7].map(days => (
                                        <MenuItem key={days}>
                                            {({ focus }) => (
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        handleSnooze(days);
                                                    }}
                                                    className={cn(
                                                        "w-full flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors",
                                                        focus ? "bg-primary/5 text-foreground" : "text-muted-foreground"
                                                    )}
                                                >
                                                    <Bell className="w-4 h-4 text-blue-500" />
                                                    {days} {days === 1 ? t('day') : t('days')}
                                                </button>
                                            )}
                                        </MenuItem>
                                    ))}
                                </div>
                            )}

                            {onDelete && (
                                <MenuItem>
                                    {({ focus }) => (
                                        <button
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                handleAction(onDelete);
                                            }}
                                            className={cn(
                                                "w-full flex items-center gap-2 px-4 py-2 text-sm rounded-xl transition-colors",
                                                focus ? "bg-red-50 dark:bg-red-900/20 text-red-600" : "text-red-500"
                                            )}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            {t('delete')}
                                        </button>
                                    )}
                                </MenuItem>
                            )}
                        </div>
                    </MenuItems>
                </Transition>
            </Portal>
        </Menu>
    );
}
