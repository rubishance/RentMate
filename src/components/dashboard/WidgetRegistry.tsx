import { ReactNode } from 'react';
import { StorageStatsWidget } from './StorageStatsWidget';
import { SmartActionsWidget } from './SmartActionsWidget';
import { UsageOverviewWidget } from './UsageOverviewWidget';
import { IndexPulseWidget } from './IndexPulseWidget';

export type WidgetId =
    | 'storage_stats'
    | 'usage_overview'
    | 'index_pulse'
    | 'smart_actions';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetConfig {
    id: string; // Unique instance ID
    widgetId: WidgetId;
    size: WidgetSize;
    visible: boolean;
    order: number;
    settings?: Record<string, any>;
}

export interface DashboardData {
    profile: any;
    stats: any;
    storageCounts: any;
    activeContracts: any[];
    feedItems: any[];
}

export type WidgetUpdateFn = (updates: Partial<WidgetConfig>) => void;

export const WIDGET_REGISTRY: Record<WidgetId, (data: DashboardData, config: WidgetConfig, onUpdate: WidgetUpdateFn) => ReactNode> = {
    'storage_stats': (data) => <StorageStatsWidget counts={data?.storageCounts || {}} />,
    'usage_overview': () => <UsageOverviewWidget />,
    'index_pulse': (_, config, onUpdate) => <IndexPulseWidget settings={config?.settings} onUpdateSettings={(s) => onUpdate({ settings: s })} />,
    'smart_actions': (data) => <SmartActionsWidget stats={{
        pendingMoney: data?.stats?.pending || 0,
        openMaintenance: data?.storageCounts?.maintenance || 0
    }} />,
};

export const DEFAULT_WIDGET_LAYOUT: WidgetConfig[] = [
    { id: '7', widgetId: 'smart_actions', size: 'medium', visible: true, order: 1 },
    { id: '2', widgetId: 'storage_stats', size: 'large', visible: true, order: 2 },
    { id: '6', widgetId: 'index_pulse', size: 'medium', visible: true, order: 3 },
    { id: '5', widgetId: 'usage_overview', size: 'small', visible: true, order: 4 },
];
