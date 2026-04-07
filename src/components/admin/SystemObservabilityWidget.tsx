import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '../../lib/supabase';
import { Activity, RefreshCw, AlertTriangle, ShieldAlert, Cpu, Network, CheckCircle2, Copy } from 'lucide-react';
import { Button } from '../ui/Button';

// -- Hooks & Types -- //

interface Incident {
    id: string;
    event_type: string;
    resource: string;
    created_at?: string;
    timestamp?: string;
    user_id: string;
    duration_ms: number;
    error: string;
    user_message: string;
}

interface EndpointStat {
    resource: string;
    count: number;
}

interface SystemStats {
    totalEvents24h: number;
    blocksByType: Record<string, number>;
    averageResponseTimeMs: number;
    topRequestedEndpoints: EndpointStat[];
    recentIncidents: Incident[];
}

function useSystemStats(pollingIntervalMs = 45000) {
    const [data, setData] = useState<SystemStats | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [prevResponseTime, setPrevResponseTime] = useState<number | null>(null);

    const fetchStats = useCallback(async (isManual = false) => {
        if (isManual) setIsRefreshing(true);
        try {
            const { data: resData, error: invokeError } = await supabase.functions.invoke('get-system-stats');
            if (invokeError) throw new Error(invokeError.message);
            if (!resData?.success) throw new Error('Failed to fetch stats');
            
            if (data?.averageResponseTimeMs) {
                setPrevResponseTime(data.averageResponseTimeMs);
            }
            
            setData(resData.data);
            setError(null);
        } catch (err: any) {
            console.error('Error fetching system stats:', err);
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
            if (isManual) setIsRefreshing(false);
        }
    }, [data?.averageResponseTimeMs]);

    useEffect(() => {
        fetchStats();
        const intervalId = setInterval(() => fetchStats(), pollingIntervalMs);
        return () => clearInterval(intervalId);
    }, [pollingIntervalMs]); // Excluding fetchStats from deps intentionally to avoid rapid resetting

    return { data, loading, error, isRefreshing, refetch: () => fetchStats(true), prevResponseTime };
}

// -- Components -- //

const PerformanceGauge = ({ avgResponseTime, prevResponseTime }: { avgResponseTime: number, prevResponseTime: number | null }) => {
    let colorClass = 'text-green-500';
    let glowClass = 'shadow-[0_0_15px_rgba(34,197,94,0.3)]';
    if (avgResponseTime >= 300 && avgResponseTime <= 600) {
        colorClass = 'text-yellow-500';
        glowClass = 'shadow-[0_0_15px_rgba(234,179,8,0.3)]';
    } else if (avgResponseTime > 600) {
        colorClass = 'text-red-500';
        glowClass = 'shadow-[0_0_15px_rgba(239,68,68,0.3)]';
    }

    const trend = prevResponseTime === null ? 0 : avgResponseTime - prevResponseTime;
    const TrendIcon = trend > 0 ? (
        <svg className="w-4 h-4 text-red-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" /></svg>
    ) : trend < 0 ? (
        <svg className="w-4 h-4 text-green-500 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" /></svg>
    ) : null;

    return (
        <div className={`p-6 rounded-2xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border border-gray-200 dark:border-gray-800 flex flex-col items-center justify-center`}>
            <div className="flex items-center space-x-2 text-muted-foreground mb-4">
                <Cpu className="w-5 h-5" />
                <span className="font-medium">Avg TTFB</span>
            </div>
            <div className={`flex items-center text-5xl font-black font-inter tracking-tighter ${colorClass} ${glowClass} rounded-full px-6 py-2 bg-white/50 dark:bg-black/20`}>
                {avgResponseTime} <span className="text-xl ml-1 font-normal opacity-70">ms</span>
                {TrendIcon}
            </div>
        </div>
    );
};

const TrafficHeatmap = ({ topEndpoints }: { topEndpoints: EndpointStat[] }) => {
    const maxCount = Math.max(...(topEndpoints.map(e => e.count)), 1);

    return (
        <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border border-gray-200 dark:border-gray-800 flex flex-col h-full">
            <div className="flex items-center space-x-2 text-muted-foreground mb-4">
                <Network className="w-5 h-5" />
                <span className="font-medium">Traffic Overview (24h)</span>
            </div>
            <div className="flex-1 space-y-3 overflow-y-auto pr-2 custom-scrollbar">
                {topEndpoints.length === 0 ? (
                   <div className="text-sm text-muted-foreground italic text-center py-4">No traffic recorded</div>
                ) : topEndpoints.map((endpoint, idx) => (
                    <div key={idx} className="flex flex-col space-y-1">
                        <div className="flex justify-between text-xs font-inter font-medium text-foreground dark:text-gray-200">
                            <span className="truncate pr-2">{endpoint.resource}</span>
                            <span className="text-muted-foreground">{endpoint.count}</span>
                        </div>
                        <div className="h-1.5 w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                            <div 
                                className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-out"
                                style={{ width: `${(endpoint.count / maxCount) * 100}%` }}
                            />
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

const IncidentFeed = ({ incidents }: { incidents: Incident[] }) => {
    const [copiedId, setCopiedId] = useState<string | null>(null);

    const handleCopy = (id: string, userId: string) => {
        navigator.clipboard.writeText(userId || 'Anonymous');
        setCopiedId(id);
        setTimeout(() => setCopiedId(null), 2000);
    };

    return (
        <div className="p-6 rounded-2xl bg-white/50 dark:bg-slate-900/40 backdrop-blur-md border border-gray-200 dark:border-gray-800 lg:col-span-2 flex flex-col h-full">
            <div className="flex items-center space-x-2 text-muted-foreground mb-4 border-b border-border dark:border-gray-800 pb-3">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                <span className="font-medium text-foreground dark:text-white">Security Incident Feed</span>
            </div>
            <div className="flex-1 overflow-y-auto space-y-3 pr-2 custom-scrollbar max-h-[300px]">
                {incidents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center py-10 opacity-50">
                        <CheckCircle2 className="w-10 h-10 text-green-500 mb-2" />
                        <span className="font-medium text-green-500">No recent incidents</span>
                    </div>
                ) : (
                    incidents.map((incident) => {
                        const is5xx = incident.event_type.startsWith('5');
                        const badgeColor = is5xx ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 border-red-200 dark:border-red-800/50' : 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400 border-orange-200 dark:border-orange-800/50';
                        const Icon = is5xx ? AlertTriangle : ShieldAlert;

                        return (
                            <div key={incident.id} className="group relative rounded-xl border border-gray-100 dark:border-gray-800/60 p-4 bg-white/40 dark:bg-black/20 hover:bg-white/80 dark:hover:bg-black/40 transition-colors flex flex-col sm:flex-row gap-4 items-start">
                                {/* Error Badge */}
                                <div className={`flex-shrink-0 flex items-center justify-center space-x-1.5 px-3 py-1 rounded-lg border ${badgeColor} font-black font-inter text-sm`}>
                                    <Icon className="w-3.5 h-3.5" />
                                    <span>{incident.event_type}</span>
                                </div>
                                
                                {/* Content */}
                                <div className="flex-1 min-w-0 flex flex-col">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <span className="text-sm font-semibold text-foreground dark:text-gray-100 truncate" dir="rtl">
                                            {incident.user_message}
                                        </span>
                                        <span className="text-[10px] text-muted-foreground whitespace-nowrap hidden sm:block font-mono">
                                            {new Date(incident.timestamp || incident.created_at || Date.now()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                                        </span>
                                    </div>
                                    <span className="text-xs font-mono text-muted-foreground truncate select-all" title={incident.error}>
                                        {incident.resource} • {incident.error}
                                    </span>
                                </div>

                                {/* Actions */}
                                <div className="flex-shrink-0 flex items-center self-end sm:self-center mt-2 sm:mt-0">
                                    <button 
                                        onClick={() => handleCopy(incident.id, incident.user_id)}
                                        className="p-1.5 text-muted-foreground hover:bg-gray-100 dark:hover:bg-gray-800 rounded-md transition-colors flex items-center justify-center group/tooltip"
                                        title={incident.user_id ? 'Copy User ID' : 'Anonymous Request'}
                                    >
                                        {copiedId === incident.id ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>
        </div>
    );
};

export const SystemObservabilityWidget = () => {
    const { data, loading, error, isRefreshing, refetch, prevResponseTime } = useSystemStats(45000);

    return (
        <section className="w-full mb-8 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Activity className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    <h2 className="text-xl font-bold text-foreground dark:text-white">Nerve Center</h2>
                </div>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={refetch} 
                    disabled={isRefreshing || loading}
                    className="text-muted-foreground hover:text-foreground relative overflow-hidden"
                >
                    <RefreshCw className={`w-4 h-4 mr-2 ${isRefreshing ? 'animate-spin text-primary-500' : ''}`} />
                    Refresh
                </Button>
            </div>

            {error ? (
                <div className="p-4 rounded-xl bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm flex items-center">
                    <AlertTriangle className="w-4 h-4 mr-2" />
                    Error loading observability stats: {error}
                </div>
            ) : loading ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 h-[350px]">
                    <div className="rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse"></div>
                    <div className="rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse"></div>
                    <div className="rounded-2xl bg-gray-100 dark:bg-gray-800/50 animate-pulse lg:col-span-2"></div>
                </div>
            ) : data ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                    <PerformanceGauge avgResponseTime={data.averageResponseTimeMs} prevResponseTime={prevResponseTime} />
                    <TrafficHeatmap topEndpoints={data.topRequestedEndpoints} />
                    <IncidentFeed incidents={data.recentIncidents} />
                </div>
            ) : null}
            
            <style dangerouslySetInnerHTML={{ __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 4px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: transparent;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(156, 163, 175, 0.3);
                    border-radius: 20px;
                }
                .dark .custom-scrollbar::-webkit-scrollbar-thumb {
                    background-color: rgba(75, 85, 99, 0.5);
                }
            `}} />
        </section>
    );
};
