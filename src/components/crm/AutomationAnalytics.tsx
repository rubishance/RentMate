import {
    Cpu,
    Sparkles,
    TrendingUp,
    AlertCircle,
    Clock,
    CheckCircle2
} from 'lucide-react';

interface AutomationStats {
    totalAutomatedActions: number;
    stagnantTickets: number;
    avgSentiment: number;
    totalAiCost: number;
    lastAutomationRun: string | null;
}

import { useNavigate } from 'react-router-dom';

export function AutomationAnalytics({ stats }: { stats: AutomationStats }) {
    const navigate = useNavigate();
    const sentimentColor = stats.avgSentiment > 0.3 ? 'text-emerald-500' : stats.avgSentiment < -0.3 ? 'text-rose-500' : 'text-amber-500';

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl border border-slate-100 dark:border-slate-800 shadow-minimal overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-50 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-brand-600" />
                    <h3 className="text-sm font-black uppercase tracking-widest text-gray-900 dark:text-white">Autopilot Intelligence</h3>
                </div>
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin/automation')}
                        className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline"
                    >
                        View Deep Logs
                    </button>
                    <div className="flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest">Live Engine</span>
                    </div>
                </div>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {/* Automated Decisions */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Sparkles className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Total Decisions</span>
                        </div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">
                            {stats.totalAutomatedActions.toLocaleString()}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Zero-Touch actions taken</p>
                    </div>

                    {/* AI Sentiment */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Cpu className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">User Sentiment</span>
                        </div>
                        <div className={`text-2xl font-black ${sentimentColor}`}>
                            {(stats.avgSentiment * 100).toFixed(1)}%
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Avg. Inbound Mood Score</p>
                    </div>

                    {/* Stagnant Tickets */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-400">
                            <AlertCircle className="w-4 h-4 text-amber-500" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Stagnant Flow</span>
                        </div>
                        <div className="text-2xl font-black text-gray-900 dark:text-white">
                            {stats.stagnantTickets}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Tickets {'>'} 24h old</p>
                    </div>

                    {/* Last Run */}
                    <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-400">
                            <Clock className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest">Heartbeat</span>
                        </div>
                        <div className="text-sm font-black text-gray-900 dark:text-white mt-2">
                            {stats.lastAutomationRun ? new Date(stats.lastAutomationRun).toLocaleTimeString() : 'Never'}
                        </div>
                        <p className="text-[10px] text-gray-400 font-bold uppercase">Last Engine Sweep</p>
                    </div>
                </div>

                {/* Progress Bar / Visualization Placeholder */}
                <div className="mt-8 pt-6 border-t border-slate-50 dark:border-slate-800">
                    <div className="flex justify-between items-end mb-2">
                        <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Automation Efficiency</span>
                        <span className="text-xs font-black text-brand-600">84%</span>
                    </div>
                    <div className="h-1.5 w-full bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                        <div className="h-full bg-brand-600 rounded-full w-[84%] shadow-[0_0_10px_rgba(var(--brand-primary),0.5)]"></div>
                    </div>
                    <div className="mt-4 flex gap-4">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-brand-600"></div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Auto-Resolved</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-slate-300 dark:bg-slate-600"></div>
                            <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest">Manual Triage</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
