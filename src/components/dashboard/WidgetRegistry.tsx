import { ReactNode } from 'react';
import { SmartActionsWidget } from './SmartActionsWidget';
import { IndexPulseWidget } from './IndexPulseWidget';
import { FinancialHealthWidget } from './FinancialHealthWidget';
import { ProspectiveTenantsWidget } from './widgets/ProspectiveTenantsWidget';
import { DigitalProtocolOfferWidget } from './widgets/DigitalProtocolOfferWidget';
import { RentalTrendWidget } from '../analytics/RentalTrendWidget';
import { RevenueTrendWidget } from './RevenueTrendWidget';
import { QuickActionsWidget } from './QuickActionsWidget';

export type WidgetId =
    | 'financial_health'
    | 'index_pulse'
    | 'smart_actions'
    | 'quick_actions'
    | 'digital_protocol'
    | 'prospective_tenants'
    | 'market_intelligence'
    | 'revenue_trend';

export type WidgetSize = 'small' | 'medium' | 'large';

export interface WidgetConfig {
    id: string; // Unique instance ID
    widgetId: WidgetId;
    size: WidgetSize;
    visible: boolean;
    order: number;
    isExpanded?: boolean;
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
    'index_pulse': (_, config, onUpdate) => <IndexPulseWidget settings={config?.settings} onUpdateSettings={(s) => onUpdate({ settings: s })} isExpanded={config.isExpanded !== false} onToggleExpand={() => onUpdate({ isExpanded: config.isExpanded === false ? true : false })} />,
    'quick_actions': (_, config, onUpdate) => <QuickActionsWidget isExpanded={config.isExpanded !== false} onToggleExpand={() => onUpdate({ isExpanded: config.isExpanded === false ? true : false })} />,
    'smart_actions': (data, config, onUpdate) => <SmartActionsWidget stats={{
        pendingMoney: data?.stats?.pending || 0,
        openMaintenance: data?.storageCounts?.maintenance || 0
    }} isExpanded={config.isExpanded !== false} onToggleExpand={() => onUpdate({ isExpanded: config.isExpanded === false ? true : false })} />,
    'financial_health': (data, config, onUpdate) => <FinancialHealthWidget stats={{
        monthlyIncome: data?.stats?.monthlyIncome || 0,
        collected: data?.stats?.collected || 0,
        pending: data?.stats?.pending || 0
    }} isExpanded={config.isExpanded !== false} onToggleExpand={() => onUpdate({ isExpanded: config.isExpanded === false ? true : false })} />,
    'digital_protocol': (_, config, onUpdate) => <DigitalProtocolOfferWidget isExpanded={config.isExpanded !== false} onToggleExpand={() => onUpdate({ isExpanded: config.isExpanded === false ? true : false })} />,
    'prospective_tenants': (_, config, onUpdate) => <ProspectiveTenantsWidget isExpanded={config.isExpanded !== false} onToggleExpand={() => onUpdate({ isExpanded: config.isExpanded === false ? true : false })} />,
    'market_intelligence': (_, config, onUpdate) => <RentalTrendWidget isExpanded={config.isExpanded !== false} onToggleExpand={() => onUpdate({ isExpanded: config.isExpanded === false ? true : false })} />,
    'revenue_trend': (_, config, onUpdate) => <RevenueTrendWidget isExpanded={config.isExpanded !== false} onToggleExpand={() => onUpdate({ isExpanded: config.isExpanded === false ? true : false })} />,
};

export const DEFAULT_WIDGET_LAYOUT: WidgetConfig[] = [
    { id: '13', widgetId: 'quick_actions', size: 'small', visible: true, order: 0, isExpanded: true },
    { id: '9', widgetId: 'digital_protocol', size: 'small', visible: true, order: 1, isExpanded: true },
    { id: '10', widgetId: 'prospective_tenants', size: 'small', visible: true, order: 2, isExpanded: true },
    { id: '1', widgetId: 'financial_health', size: 'medium', visible: true, order: 2, isExpanded: true },
    { id: '7', widgetId: 'smart_actions', size: 'medium', visible: true, order: 3, isExpanded: true },
    { id: '6', widgetId: 'index_pulse', size: 'medium', visible: true, order: 4, isExpanded: true },
    { id: '12', widgetId: 'revenue_trend', size: 'large', visible: true, order: 6, isExpanded: true },
    { id: '11', widgetId: 'market_intelligence', size: 'large', visible: true, order: 7, isExpanded: true },
];
