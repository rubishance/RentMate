import { useState, useRef, useEffect } from 'react';
import { MoreVerticalIcon as MoreVertical, EyeIcon as Eye, EditIcon as Edit, TrashIcon as Trash2, ToolsIcon as Calculator, BellIcon as Bell, ArrowRightIcon as ChevronRight } from '../icons/NavIcons';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';

interface ActionMenuProps {
    onView?: () => void;
    onEdit?: () => void;
    onDelete?: () => void;
    onCalculate?: () => void;
    onSnooze?: (days: number) => void;
    align?: 'left' | 'right';
}

export function ActionMenu({ onView, onEdit, onDelete, onCalculate, onSnooze, align = 'right' }: ActionMenuProps) {
    const [isOpen, setIsOpen] = useState(false);
    const [showSnoozeSubmenu, setShowSnoozeSubmenu] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const { t } = useTranslation();

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleAction = (action?: () => void, e?: React.MouseEvent) => {
        e?.stopPropagation(); // Prevent row click
        setIsOpen(false);
        setShowSnoozeSubmenu(false);
        if (action) action();
    };

    const handleSnooze = (days: number, e?: React.MouseEvent) => {
        e?.stopPropagation();
        setIsOpen(false);
        setShowSnoozeSubmenu(false);
        if (onSnooze) onSnooze(days);
    };

    const textAlign = align === 'left' ? 'text-left' : 'text-right';

    return (
        <div className="relative" ref={menuRef}>
            <button
                onClick={(e) => {
                    e.stopPropagation();
                    setIsOpen(!isOpen);
                }}
                className="p-2 rounded-full hover:bg-secondary/50 text-muted-foreground transition-colors"
                aria-label="Actions"
            >
                <MoreVertical className="w-5 h-5" />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 5 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 5 }}
                        transition={{ duration: 0.15 }}
                        className={`absolute top-full mt-1 w-48 bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-border z-50 overflow-hidden ${align === 'left' ? 'left-0' : 'right-0'}`}
                    >
                        <div className="p-1">
                            {onView && (
                                <button
                                    onClick={(e) => handleAction(onView, e)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors ${textAlign}`}
                                >
                                    <Eye className="w-4 h-4 text-primary" />
                                    {t('view')}
                                </button>
                            )}
                            {onEdit && (
                                <button
                                    onClick={(e) => handleAction(onEdit, e)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors ${textAlign}`}
                                >
                                    <Edit className="w-4 h-4 text-orange-500" />
                                    {t('edit')}
                                </button>
                            )}
                            {onCalculate && (
                                <button
                                    onClick={(e) => handleAction(onCalculate, e)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors ${textAlign}`}
                                >
                                    <Calculator className="w-4 h-4 text-green-500" />
                                    {t('calculate_payments') || 'Calculate Payments'}
                                </button>
                            )}
                            {onSnooze && (
                                <div className="relative">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setShowSnoozeSubmenu(!showSnoozeSubmenu);
                                        }}
                                        className={`w-full flex items-center justify-between gap-2 px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors ${textAlign}`}
                                    >
                                        <div className="flex items-center gap-2">
                                            <Bell className="w-4 h-4 text-primary" />
                                            {t('snooze') || 'Snooze'}
                                        </div>
                                        <ChevronRight className="w-4 h-4" />
                                    </button>
                                    {showSnoozeSubmenu && (
                                        <div className={`absolute ${align === 'left' ? 'left-full' : 'right-full'} top-0 ml-1 w-32 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-border z-50`}>
                                            <div className="p-1">
                                                <button
                                                    onClick={(e) => handleSnooze(1, e)}
                                                    className="w-full px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors text-left"
                                                >
                                                    1 {t('day') || 'day'}
                                                </button>
                                                <button
                                                    onClick={(e) => handleSnooze(3, e)}
                                                    className="w-full px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors text-left"
                                                >
                                                    3 {t('days') || 'days'}
                                                </button>
                                                <button
                                                    onClick={(e) => handleSnooze(7, e)}
                                                    className="w-full px-3 py-2 text-sm text-foreground hover:bg-secondary rounded-lg transition-colors text-left"
                                                >
                                                    1 {t('week') || 'week'}
                                                </button>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                            {onDelete && (
                                <button
                                    onClick={(e) => handleAction(onDelete, e)}
                                    className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors ${textAlign}`}
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {t('delete')}
                                </button>
                            )}
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
