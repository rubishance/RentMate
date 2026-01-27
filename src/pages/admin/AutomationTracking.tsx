import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Sparkles,
    Search,
    RefreshCw,
    Activity,
    CheckCircle2,
    XCircle,
    User,
    Calendar,
    ArrowLeft
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';

interface AutomationLog {
    id: string;
    user_id: string;
    entity_id: string;
    action_taken: string;
    status: 'success' | 'failed' | 'pending';
    details: Record<string, unknown>;
    created_at: string;
    user_profiles?: {
        full_name: string;
        email: string;
    }
}

export default function AutomationTracking() {
    const navigate = useNavigate();
    const [logs, setLogs] = useState<AutomationLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filter, setFilter] = useState<'all' | 'success' | 'failed'>('all');

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('automation_logs')
                .select('*, user_profiles(full_name, email)')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) throw error;
            setLogs(data as AutomationLog[]);
        } catch (err: unknown) {
            console.error('Error fetching logs:', err);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log => {
        const matchesSearch =
            log.action_taken.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
            log.user_profiles?.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesFilter = filter === 'all' || log.status === filter;

        return matchesSearch && matchesFilter;
    });

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex items-center gap-4">
                    <button
                        onClick={() => navigate('/admin')}
                        className="p-2 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors"
                    >
                        <ArrowLeft className="w-6 h-6 text-gray-500" />
                    </button>
                    <div>
                        <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                            <Sparkles className="w-8 h-8 text-brand-600" />
                            Automation Tracking
                        </h1>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                            Review every decision made by the RentMate Autopilot engine.
                        </p>
                    </div>
                </div>
                <button
                    onClick={fetchLogs}
                    className="flex items-center gap-2 px-4 py-2 bg-white dark:bg-gray-800 border border-slate-200 dark:border-slate-700 rounded-xl text-xs font-black uppercase tracking-widest text-gray-600 dark:text-gray-300 hover:bg-slate-50 transition-all shadow-sm"
                >
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                    Refresh
                </button>
            </div>

            {/* Filter Ribbons */}
            <div className="flex flex-wrap gap-3">
                {(['all', 'success', 'failed'] as const).map((f) => (
                    <button
                        key={f}
                        onClick={() => setFilter(f)}
                        className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all ${filter === f
                            ? 'bg-brand-600 text-white border-brand-600 shadow-md shadow-brand-500/20'
                            : 'bg-white dark:bg-gray-800 text-gray-400 border-slate-200 dark:border-slate-700 hover:border-brand-500'
                            }`}
                    >
                        {f}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search by action, user name or email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 bg-white dark:bg-gray-900 border border-slate-200 dark:border-slate-700 rounded-2xl text-sm font-medium focus:ring-4 focus:ring-brand-500/10 focus:border-brand-500 outline-none transition-all shadow-sm text-gray-900 dark:text-white"
                />
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 border border-slate-100 dark:border-slate-800 rounded-2xl shadow-minimal overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50/50 dark:bg-slate-900/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-slate-100 dark:border-slate-800">
                            <tr>
                                <th className="px-6 py-4">Autopilot Action</th>
                                <th className="px-6 py-4">Target User</th>
                                <th className="px-6 py-4">Status</th>
                                <th className="px-6 py-4 text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 dark:divide-slate-800">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center">
                                        <Activity className="w-12 h-12 text-slate-100 dark:text-slate-800 mx-auto mb-4" />
                                        <p className="font-black text-slate-300 dark:text-slate-700 uppercase tracking-widest text-xs">
                                            {loading ? 'Hacking the matrix...' : 'No automation records found'}
                                        </p>
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/40 transition-colors group">
                                        <td className="px-6 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="font-bold text-gray-900 dark:text-white text-sm">
                                                    {log.action_taken}
                                                </span>
                                                <span className="text-[10px] text-gray-400 font-medium uppercase tracking-tight">
                                                    Entity: {log.entity_id?.split('-')[0]}...
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center">
                                                    <User className="w-4 h-4 text-slate-400" />
                                                </div>
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200">
                                                        {log.user_profiles?.full_name || 'System / Guest'}
                                                    </span>
                                                    <span className="text-[10px] text-gray-400 font-medium lowercase">
                                                        {log.user_profiles?.email || 'noreply@rentmate.co.il'}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${log.status === 'success'
                                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800'
                                                : log.status === 'failed'
                                                    ? 'bg-rose-50 text-rose-600 border border-rose-100 dark:bg-rose-900/20 dark:border-rose-800'
                                                    : 'bg-amber-50 text-amber-600 border border-amber-100 dark:bg-amber-900/20 dark:border-amber-800'
                                                }`}>
                                                {log.status === 'success' ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
                                                {log.status}
                                            </div>
                                        </td>
                                        <td className="px-6 py-5 text-right">
                                            <div className="flex flex-col items-end gap-1">
                                                <div className="flex items-center gap-1.5 text-xs font-bold text-gray-500 dark:text-gray-400">
                                                    <Calendar className="w-3 h-3" />
                                                    {new Date(log.created_at).toLocaleDateString()}
                                                </div>
                                                <span className="text-[10px] font-medium text-gray-400 uppercase">
                                                    {new Date(log.created_at).toLocaleTimeString()}
                                                </span>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Detailed View Modal Placeholder Logic could go here */}
        </div>
    );
}
