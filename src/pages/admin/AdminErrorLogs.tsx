import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    BugAntIcon,
    ArrowPathIcon,
    CheckCircleIcon,
    ExclamationTriangleIcon,
    UserIcon,
    GlobeAltIcon,
    ClockIcon,
    FunnelIcon
} from '@heroicons/react/24/outline';
import { format } from 'date-fns';

interface ErrorLog {
    id: string;
    created_at: string;
    user_id: string | null;
    message: string;
    stack: string;
    route: string;
    environment: string;
    is_resolved: boolean;
    user_profiles?: {
        full_name: string;
        email: string;
    } | null;
}

const AdminErrorLogs = () => {
    const [logs, setLogs] = useState<ErrorLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('open');

    useEffect(() => {
        fetchLogs();
    }, [filter]);

    const fetchLogs = async () => {
        setLoading(true);
        try {
            let query = supabase
                .from('error_logs')
                .select('*, user_profiles:user_id(full_name, email)')
                .order('created_at', { ascending: false });

            if (filter === 'open') {
                query = query.eq('is_resolved', false);
            } else if (filter === 'resolved') {
                query = query.eq('is_resolved', true);
            }

            const { data, error } = await query;
            if (error) throw error;
            setLogs(data || []);
        } catch (err) {
            console.error('Failed to fetch logs:', err);
        } finally {
            setLoading(false);
        }
    };

    const toggleResolve = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase
                .from('error_logs')
                .update({ is_resolved: !currentStatus })
                .eq('id', id);

            if (error) throw error;
            setLogs(logs.map(log => log.id === id ? { ...log, is_resolved: !currentStatus } : log));
        } catch (err) {
            console.error('Update failed:', err);
        }
    };

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-black text-gray-900 dark:text-white flex items-center gap-3">
                        <BugAntIcon className="w-8 h-8 text-red-500" />
                        System Error Logs
                    </h1>
                    <p className="text-gray-500 text-sm mt-1">Monitor and manage application-wide errors and user reports.</p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="flex bg-gray-100 dark:bg-gray-800 p-1 rounded-xl border border-gray-200 dark:border-gray-700">
                        {(['all', 'open', 'resolved'] as const).map((f) => (
                            <button
                                key={f}
                                onClick={() => setFilter(f)}
                                className={`px-4 py-2 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filter === f
                                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-minimal'
                                    : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                    }`}
                            >
                                {f}
                            </button>
                        ))}
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
                    >
                        <ArrowPathIcon className={`w-5 h-5 text-gray-500 ${loading ? 'animate-spin' : ''}`} />
                    </button>
                </div>
            </div>

            {loading && logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700">
                    <ArrowPathIcon className="w-10 h-10 text-brand-500 animate-spin mb-4" />
                    <p className="text-gray-500 font-bold uppercase tracking-widest text-xs">Loading Errors...</p>
                </div>
            ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white dark:bg-gray-800/50 rounded-2xl border border-dashed border-gray-200 dark:border-gray-700 text-center">
                    <CheckCircleIcon className="w-12 h-12 text-green-500 mb-4" />
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white">Clean Slate!</h3>
                    <p className="text-gray-500 text-sm max-w-xs mx-auto">No system errors found in this category. Your application is running smoothly.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    {logs.map((log) => (
                        <div
                            key={log.id}
                            className={`bg-white dark:bg-gray-800 rounded-2xl border transition-all hover:shadow-premium p-5 ${log.is_resolved
                                ? 'border-green-100 dark:border-green-900/20 opacity-75'
                                : 'border-red-100 dark:border-red-900/20'
                                }`}
                        >
                            <div className="flex justify-between items-start gap-4">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest border ${log.is_resolved
                                            ? 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/10 dark:text-green-400'
                                            : 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/10 dark:text-red-400'
                                            }`}>
                                            {log.is_resolved ? 'Resolved' : 'Open'}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs text-gray-400 font-medium">
                                            <ClockIcon className="w-4 h-4" />
                                            {format(new Date(log.created_at), 'dd/MM HH:mm:ss')}
                                        </span>
                                        <span className="flex items-center gap-1.5 text-xs text-brand-500 font-medium bg-brand-50 dark:bg-brand-900/10 px-2 py-0.5 rounded-lg border border-brand-100 dark:border-brand-900/20">
                                            <GlobeAltIcon className="w-4 h-4" />
                                            {log.environment}
                                        </span>
                                    </div>

                                    <h3 className="text-base font-black text-gray-900 dark:text-white mb-2 truncate group">
                                        <span className="text-red-500 mr-2 group-hover:animate-pulse">●</span>
                                        {log.message}
                                    </h3>

                                    <div className="flex items-center gap-4 text-xs text-gray-500 mb-4">
                                        <div className="flex items-center gap-1.5 bg-gray-50 dark:bg-gray-700/50 px-2 py-1 rounded-md">
                                            <FunnelIcon className="w-3.5 h-3.5" />
                                            <span className="font-mono">{log.route}</span>
                                        </div>
                                        {log.user_profiles ? (
                                            <div className="flex items-center gap-1.5 text-brand-600 dark:text-brand-400 font-bold">
                                                <UserIcon className="w-3.5 h-3.5" />
                                                {log.user_profiles.full_name || log.user_profiles.email}
                                            </div>
                                        ) : (
                                            <div className="flex items-center gap-1.5 italic opacity-60">
                                                <UserIcon className="w-3.5 h-3.5" />
                                                Anonymous
                                            </div>
                                        )}
                                    </div>

                                    <details className="group/details">
                                        <summary className="text-[10px] font-black uppercase tracking-widest text-gray-400 cursor-pointer hover:text-gray-600 transition-colors flex items-center gap-1 list-none">
                                            <span className="group-open/details:rotate-90 transition-transform">▸</span>
                                            View Stack Trace
                                        </summary>
                                        <div className="mt-3 p-4 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-700/50 overflow-x-auto">
                                            <pre className="text-[10px] text-gray-500 font-mono whitespace-pre-wrap leading-relaxed">
                                                {log.stack || 'No stack trace provided'}
                                            </pre>
                                        </div>
                                    </details>
                                </div>

                                <div className="flex flex-col gap-2">
                                    <button
                                        onClick={() => toggleResolve(log.id, log.is_resolved)}
                                        className={`p-2.5 rounded-xl border transition-all ${log.is_resolved
                                            ? 'bg-gray-50 text-gray-400 border-gray-100 hover:bg-red-50 hover:text-red-500 hover:border-red-100'
                                            : 'bg-green-50 text-green-600 border-green-100 hover:bg-green-100 hover:shadow-minimal'
                                            }`}
                                        title={log.is_resolved ? 'Reopen' : 'Resolve'}
                                    >
                                        {log.is_resolved ? (
                                            <ArrowPathIcon className="w-5 h-5" />
                                        ) : (
                                            <CheckCircleIcon className="w-5 h-5" />
                                        )}
                                    </button>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminErrorLogs;
