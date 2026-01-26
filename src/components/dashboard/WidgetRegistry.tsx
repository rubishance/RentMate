import { ReactNode } from 'react';
import { TimelineWidget } from './TimelineWidget';
import { StorageStatsWidget } from './StorageStatsWidget';
import { KnowledgeBaseWidget } from './KnowledgeBaseWidget';
import { SmartActionsWidget } from './SmartActionsWidget'; // Assuming this exists based on list_dir
import { UsageOverviewWidget } from './UsageOverviewWidget'; // Assuming this exists
// Importing DashboardHero to usage if needed, or keeping it separate as a "Header"

export type WidgetId =
    | 'timeline'
    | 'storage_stats'
    | 'knowledge_base'
    | 'smart_actions'
    | 'usage_overview';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetConfig {
    id: string; // Unique instance ID
    widgetId: WidgetId;
    size: WidgetSize;
    visible: boolean;
    order: number;
}

export interface DashboardData {
    profile: any;
    stats: any;
    storageCounts: any;
    activeContracts: any[];
    feedItems: any[];
}

export const WIDGET_REGISTRY: Record<WidgetId, (data: DashboardData) => ReactNode> = {
    'timeline': (data) => <TimelineWidget contracts={data.activeContracts} />,
    'storage_stats': (data) => <StorageStatsWidget counts={data.storageCounts} />,
    'knowledge_base': (data) => <KnowledgeBaseWidget />,
    'smart_actions': (data) => <SmartActionsWidget stats={{
        pendingMoney: data.stats.pending,
        openMaintenance: data.storageCounts.maintenance
    }} />,
    'usage_overview': (data) => <UsageOverviewWidget />,
};

export const DEFAULT_WIDGET_LAYOUT: WidgetConfig[] = [
    { id: '1', widgetId: 'timeline', size: 'large', visible: true, order: 0 },
    { id: '2', widgetId: 'storage_stats', size: 'medium', visible: true, order: 1 },
    { id: '3', widgetId: 'knowledge_base', size: 'medium', visible: true, order: 2 },
    { id: '4', widgetId: 'smart_actions', size: 'small', visible: true, order: 3 },
    { id: '5', widgetId: 'usage_overview', size: 'small', visible: true, order: 4 },
];
