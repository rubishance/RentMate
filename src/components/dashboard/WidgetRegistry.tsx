import { ReactNode } from 'react';
import { SmartActionsWidget } from './SmartActionsWidget';
import { UsageOverviewWidget } from './UsageOverviewWidget';
import { IndexPulseWidget } from './IndexPulseWidget';
import { FinancialHealthWidget } from './FinancialHealthWidget';
import { StorageUsageWidget } from '../properties/StorageUsageWidget';

export type WidgetId =
    | 'financial_health'
    | 'usage_overview'
    | 'index_pulse'
    | 'smart_actions'
    | 'storage_usage';

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
    'usage_overview': () => <UsageOverviewWidget />,
    'index_pulse': (_, config, onUpdate) => <IndexPulseWidget settings={config?.settings} onUpdateSettings={(s) => onUpdate({ settings: s })} />,
    'smart_actions': (data) => <SmartActionsWidget stats={{
        pendingMoney: data?.stats?.pending || 0,
        openMaintenance: data?.storageCounts?.maintenance || 0
    }} />,
    'financial_health': (data) => <FinancialHealthWidget stats={{
        monthlyIncome: data?.stats?.monthlyIncome || 0,
        collected: data?.stats?.collected || 0,
        pending: data?.stats?.pending || 0
    }} />,
    'storage_usage': () => <StorageUsageWidget />,
};

export const DEFAULT_WIDGET_LAYOUT: WidgetConfig[] = [
    { id: '1', widgetId: 'financial_health', size: 'large', visible: true, order: 0 },
    { id: '7', widgetId: 'smart_actions', size: 'medium', visible: true, order: 1 },
    { id: '6', widgetId: 'index_pulse', size: 'medium', visible: true, order: 2 },
    { id: '5', widgetId: 'usage_overview', size: 'small', visible: true, order: 3 },
    { id: '8', widgetId: 'storage_usage', size: 'medium', visible: true, order: 4 },
];
