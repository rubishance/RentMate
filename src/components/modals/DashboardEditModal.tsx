import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { 
    X, ArrowUp, ArrowDown, 
    DollarSign, Activity, Zap, HardDrive, 
    FileText, Users, TrendingUp, Lightbulb, Box, Loader2
} from 'lucide-react';
import { useState, useEffect } from 'react';
import { WidgetConfig, WIDGET_REGISTRY } from '../dashboard/WidgetRegistry';
import { Switch } from '../ui/Switch';
import { Button } from '../ui/Button';
import { cn } from '../../lib/utils';

interface DashboardEditModalProps {
    isOpen: boolean;
    onClose: () => void;
    layout: WidgetConfig[];
    onSave: (newLayout: WidgetConfig[]) => void;
}

export function DashboardEditModal({ isOpen, onClose, layout, onSave }: DashboardEditModalProps) {
    const { t, lang } = useTranslation();
    const { user } = useAuth();
    const isRtl = lang === 'he';
    
    // We maintain a local copy of the layout while editing
    const [editedLayout, setEditedLayout] = useState<WidgetConfig[]>([]);
    
    // Track which dynamic widgets actually have data
    const [activeWidgetIds, setActiveWidgetIds] = useState<Set<string> | null>(null);

    useEffect(() => {
        if (isOpen) {
            // Sort by order when opening, but force priority widgets to the top
            const priorityWidgets = ['digital_protocol', 'prospective_tenants', 'smart_actions'];
            setEditedLayout([...layout].sort((a, b) => {
                const isAPriority = priorityWidgets.includes(a.widgetId);
                const isBPriority = priorityWidgets.includes(b.widgetId);
                
                if (isAPriority && !isBPriority) return -1;
                if (!isAPriority && isBPriority) return 1;
                if (isAPriority && isBPriority) {
                    return priorityWidgets.indexOf(a.widgetId) - priorityWidgets.indexOf(b.widgetId);
                }
                
                return a.order - b.order;
            }));
            
            // Check dynamic widgets status
            const checkWidgets = async () => {
                if (!user) return;
                
                const active = new Set([
                    'financial_health',
                    'index_pulse',
                    'quick_actions',
                    'market_intelligence',
                    'revenue_trend',
                    'rental_trends'
                ]);

                try {
                    // 1. Digital Protocol Check
                    const { data: contracts } = await supabase
                        .from('contracts')
                        .select('start_date, end_date')
                        .eq('user_id', user.id)
                        .eq('status', 'active');
                        
                    if (contracts) {
                        const today = new Date();
                        const next7Days = new Date(); next7Days.setDate(today.getDate() + 7);
                        const next30Days = new Date(); next30Days.setDate(today.getDate() + 30);
                        const past14Days = new Date(); past14Days.setDate(today.getDate() - 14);

                        const hasProtocol = contracts.some((c: any) => {
                            const endDate = new Date(c.end_date);
                            if (endDate > today && endDate <= next7Days) return true;
                            const startDate = new Date(c.start_date);
                            if (startDate >= past14Days && startDate <= next30Days) return true;
                            return false;
                        });
                        if (hasProtocol) active.add('digital_protocol');
                    }

                    // 2. Prospective Tenants Check
                    const { data: properties } = await supabase
                        .from('properties')
                        .select('id, contracts(status)')
                        .eq('user_id', user.id)
                        .is('archived_at', null);

                    if (properties) {
                        const hasProspective = properties.some(p => {
                            const activeContracts = p.contracts?.filter((c: any) => c.status === 'active') || [];
                            return activeContracts.length === 0;
                        });
                        if (hasProspective) active.add('prospective_tenants');
                    }

                    // 3. Smart Actions Check
                    const { count: maintenanceCount } = await supabase
                        .from('maintenance_tickets')
                        .select('*', { count: 'exact', head: true })
                        .eq('user_id', user.id)
                        .in('status', ['open', 'in_progress']);

                    if (maintenanceCount && maintenanceCount > 0) {
                        active.add('smart_actions');
                    }
                    
                } catch (err) {
                    console.error('Failed to resolve dynamic widgets', err);
                } finally {
                    setActiveWidgetIds(active);
                }
            };
            
            checkWidgets();
        } else {
            setActiveWidgetIds(null);
        }
    }, [isOpen, layout, user]);

    const handleSave = () => {
        // Ensure order is sequential and matches array index before saving
        const finalLayout = editedLayout.map((widget, index) => ({
            ...widget,
            order: index
        }));
        onSave(finalLayout);
        onClose();
    };

    const toggleVisibility = (id: string, currentVisibility: boolean) => {
        setEditedLayout(prev => prev.map(w => w.id === id ? { ...w, visible: !currentVisibility } : w));
    };

    const moveWidget = (index: number, direction: 'up' | 'down') => {
        if (
            (direction === 'up' && index === 0) || 
            (direction === 'down' && index === editedLayout.length - 1)
        ) return;

        const newLayout = [...editedLayout];
        const swapIndex = direction === 'up' ? index - 1 : index + 1;
        
        // Swap elements
        [newLayout[index], newLayout[swapIndex]] = [newLayout[swapIndex], newLayout[index]];
        
        setEditedLayout(newLayout);
    };

    const getWidgetName = (widgetId: string) => {
        switch (widgetId) {
            case 'financial_health': return isRtl ? 'מצב פיננסי' : 'Financial Health';
            case 'index_pulse': return t('indexWatcherTitle') || (isRtl ? 'מעקב מדדים' : 'Index Pulse');
            case 'smart_actions': return t('smart_actions_title');
            case 'digital_protocol': return t('digital_protocol_title');
            case 'prospective_tenants': return t('prospective_tenants_title');
            case 'rental_trends': return t('rental_trends_title');
            case 'market_intelligence': return t('rental_trends_title');
            case 'revenue_trend': return t('revenueTrend') || (isRtl ? 'מגמות הכנסה' : 'Revenue Trend');
            case 'quick_actions': return t('quick_actions_title');
            default: return widgetId.replace('_', ' ');
        }
    };

    const getWidgetIcon = (widgetId: string) => {
        switch (widgetId) {
            case 'financial_health': return <DollarSign className="w-5 h-5 text-emerald-500" />;
            case 'usage_overview': return <HardDrive className="w-5 h-5 text-blue-500" />;
            case 'index_pulse': return <Activity className="w-5 h-5 text-rose-500" />;
            case 'smart_actions': return <Zap className="w-5 h-5 text-amber-500" />;
            case 'digital_protocol': return <FileText className="w-5 h-5 text-purple-500" />;
            case 'prospective_tenants': return <Users className="w-5 h-5 text-cyan-500" />;
            case 'rental_trends': return <TrendingUp className="w-5 h-5 text-teal-500" />;
            case 'market_intelligence': return <Lightbulb className="w-5 h-5 text-yellow-500" />;
            case 'quick_actions': return <Zap className="w-5 h-5 text-amber-500" />;
            default: return <Box className="w-5 h-5 text-slate-500" />;
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 md:p-8"
                    onClick={(e) => e.target === e.currentTarget && onClose()}
                >
                    <motion.div
                        initial={{ scale: 0.95, opacity: 0, y: 20 }}
                        animate={{ scale: 1, opacity: 1, y: 0 }}
                        exit={{ scale: 0.95, opacity: 0, y: 20 }}
                        className="bg-white dark:bg-neutral-900 w-full max-w-xl rounded-[2.5rem] shadow-jewel overflow-hidden flex flex-col relative max-h-[90vh]"
                    >
                        <div className="absolute top-6 right-6 z-10">
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full bg-slate-100 dark:bg-neutral-800 text-slate-500 hover:text-foreground hover:bg-slate-200 dark:hover:bg-neutral-700 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="p-8 pb-6 border-b border-sidebar-border/50 shrink-0">
                            <h2 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground text-center">
                                {t('customizeDashboard')}
                            </h2>
                            <p className="text-center text-muted-foreground mt-2 text-sm font-medium">
                                {t('customizeDashboardDesc')}
                            </p>
                        </div>

                        <div className="p-6 md:p-8 overflow-y-auto space-y-3 bg-slate-50/50 dark:bg-black/10 flex-1">
                            {!activeWidgetIds ? (
                                <div className="flex flex-col items-center justify-center py-12 gap-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-primary/50" />
                                    <p className="text-sm font-medium text-muted-foreground">
                                        {isRtl ? 'טוען ווידג׳טים זמינים...' : 'Loading available widgets...'}
                                    </p>
                                </div>
                            ) : (
                                editedLayout.map((widget, index) => {
                                    // Don't show if it's not in the registry anymore
                                    if (!WIDGET_REGISTRY[widget.widgetId]) return null;
                                    // Hide empty/inactive dynamic widgets
                                    if (!activeWidgetIds.has(widget.widgetId)) return null;
                                    
                                    const isPriority = ['digital_protocol', 'prospective_tenants', 'smart_actions'].includes(widget.widgetId);
                                    
                                    return (
                                    <div 
                                        key={widget.id}
                                        className={cn(
                                            "flex items-center gap-4 p-4 rounded-2xl border transition-all duration-300 bg-white dark:bg-neutral-800/80 shadow-sm",
                                            !widget.visible && "opacity-60 grayscale-[0.5]"
                                        )}
                                    >
                                        <div className="flex flex-col gap-1 shrink-0">
                                            <button 
                                                onClick={() => moveWidget(index, 'up')}
                                                disabled={index === 0 || isPriority}
                                                className="p-1 rounded-md text-muted-foreground hover:bg-slate-100 dark:hover:bg-neutral-700 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                                            >
                                                <ArrowUp className="w-4 h-4" />
                                            </button>
                                            <button 
                                                onClick={() => moveWidget(index, 'down')}
                                                disabled={index === editedLayout.length - 1 || isPriority}
                                                className="p-1 rounded-md text-muted-foreground hover:bg-slate-100 dark:hover:bg-neutral-700 hover:text-foreground disabled:opacity-30 disabled:hover:bg-transparent"
                                            >
                                                <ArrowDown className="w-4 h-4" />
                                            </button>
                                        </div>
                                        
                                        <div className="flex-1 min-w-0 flex items-center gap-3">
                                            <div className="p-2 bg-slate-100 dark:bg-neutral-700/50 rounded-xl shrink-0">
                                                {getWidgetIcon(widget.widgetId)}
                                            </div>
                                            <div className="flex flex-col">
                                                <h3 className="font-bold text-foreground truncate text-sm md:text-base">
                                                    {getWidgetName(widget.widgetId)}
                                                </h3>
                                                <span className="text-xs text-muted-foreground/80 font-medium tracking-widest uppercase mt-0.5">
                                                    {widget.size === 'large' ? 'רחב' : 'רגיל'}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="shrink-0 flex items-center gap-3">
                                            <span className="text-xs font-bold text-muted-foreground whitespace-nowrap hidden sm:inline-block w-12 text-center">
                                                {widget.visible ? t('visible') : t('hidden')}
                                            </span>
                                            <Switch 
                                                checked={widget.visible}
                                                onChange={() => toggleVisibility(widget.id, widget.visible)}
                                            />
                                        </div>
                                    </div>
                                )
                            })
                        )}
                        </div>
                        
                        <div className="p-6 md:p-8 bg-white dark:bg-neutral-900 border-t border-sidebar-border/50 flex justify-end gap-3 shrink-0">
                             <Button variant="ghost" onClick={onClose} className="rounded-xl px-6">
                                {t('cancel')}
                             </Button>
                             <Button variant="primary" onClick={handleSave} className="rounded-xl px-8 shadow-md">
                                {t('saveChanges')}
                             </Button>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
