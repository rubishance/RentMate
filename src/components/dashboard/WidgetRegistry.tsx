import { ReactNode } from 'react';
import { TimelineWidget } from './TimelineWidget';
import { StorageStatsWidget } from './StorageStatsWidget';
import { KnowledgeBaseWidget } from './KnowledgeBaseWidget';
import { SmartActionsWidget } from './SmartActionsWidget'; // Assuming this exists based on list_dir
import { UsageOverviewWidget } from './UsageOverviewWidget'; // Assuming this exists
import { IndexWatcherWidget } from './IndexWatcherWidget';
import { PortfolioReadinessWidget } from './PortfolioReadinessWidget';
// Importing DashboardHero to usage if needed, or keeping it separate as a "Header"
// Importing DashboardHero to usage if needed, or keeping it separate as a "Header"

export type WidgetId =
    | 'storage_stats'
    | 'usage_overview'
    | 'usage_overview'
    | 'index_watcher'
    | 'portfolio_readiness';

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

export const WIDGET_REGISTRY: Record<WidgetId, (data: DashboardData, config?: WidgetConfig) => ReactNode> = {
    'storage_stats': (data) => <StorageStatsWidget counts={data?.storageCounts || {}} />,
    'usage_overview': (data) => <UsageOverviewWidget />,
    'index_watcher': (data, config) => <IndexWatcherWidget contracts={data?.activeContracts || []} settings={config?.settings} />,
    'portfolio_readiness': (data) => <PortfolioReadinessWidget profile={data?.profile} stats={data?.stats} />,
};

export const DEFAULT_WIDGET_LAYOUT: WidgetConfig[] = [
    { id: '1', widgetId: 'portfolio_readiness', size: 'medium', visible: true, order: 0 },
    { id: '2', widgetId: 'storage_stats', size: 'large', visible: true, order: 1 },
    { id: '5', widgetId: 'usage_overview', size: 'small', visible: true, order: 2 },
    { id: '6', widgetId: 'index_watcher', size: 'medium', visible: true, order: 3 },
];
