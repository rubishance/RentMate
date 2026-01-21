import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AuditLog } from '../../types/database';
import {
    ShieldCheckIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon,
    ExclamationTriangleIcon,
    Bars3CenterLeftIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(200);

            if (fetchError) throw fetchError;
            setLogs(data as AuditLog[]);
        } catch (err: any) {
            console.error('Error fetching logs:', err);
            setError(err.message || 'Failed to access system logs. You may need higher privileges.');
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <ShieldCheckIcon className="w-8 h-8 text-brand-600" />
                        Audit Logs
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Track system-wide security events, authentication attempts, and administrative actions.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="hidden sm:block px-4 py-2 bg-gray-100 dark:bg-gray-900 rounded-xl text-[10px] font-black text-gray-400 uppercase tracking-widest border border-gray-200 dark:border-gray-700">
                        Top 200 Events
                    </div>
                    <button
                        onClick={fetchLogs}
                        className="p-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                        title="Refresh Logs"
                    >
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 font-bold text-sm">
                    <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <p>Access Denied or Connection Failed</p>
                        <p className="font-medium opacity-80 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Search */}
            <div className="relative">
                <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
                <input
                    type="text"
                    placeholder="Search logs by action, user ID or specific details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-11 pr-4 py-3.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-2xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500 outline-none transition-all shadow-sm text-gray-900 dark:text-white"
                />
            </div>

            {/* Logs Table */}
            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-gray-50 dark:bg-gray-900/50 text-[10px] font-black text-gray-400 uppercase tracking-widest border-b border-gray-100 dark:border-gray-700">
                            <tr>
                                <th className="px-6 py-4">Security Action</th>
                                <th className="px-6 py-4 text-center">User Context</th>
                                <th className="px-6 py-4">Technical Details</th>
                                <th className="px-6 py-4 text-right">Timestamp</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-20 text-center font-bold text-gray-400 uppercase tracking-widest">
                                        No matching security logs found.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="px-6 py-4">
                                            <div className="flex items-center gap-3">
                                                <div className={`p-1.5 rounded-lg border ${log.action.includes('DELETE') ? 'bg-red-50 text-red-600 border-red-100 dark:bg-red-900/20 dark:border-red-800' :
                                                        log.action.includes('UPDATE') ? 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/20 dark:border-amber-800' :
                                                            'bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-900/20 dark:border-brand-800'
                                                    }`}>
                                                    <Bars3CenterLeftIcon className="w-4 h-4" />
                                                </div>
                                                <span className="font-black text-gray-900 dark:text-white uppercase tracking-tight">{log.action}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <div className="inline-flex items-center px-2 py-1 bg-gray-100 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-[10px] font-mono text-gray-500 dark:text-gray-400">
                                                {log.user_id ? log.user_id.split('-')[0] + '...' : 'SYSTEM'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <div className="max-w-md truncate text-xs font-medium text-gray-500 dark:text-gray-400 group relative">
                                                {JSON.stringify(log.details)}
                                                <div className="hidden group-hover:block absolute z-10 bottom-full left-0 bg-gray-900 text-white p-2 rounded text-[10px] font-mono whitespace-normal max-w-lg break-all shadow-xl">
                                                    {JSON.stringify(log.details, null, 2)}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-right text-xs font-bold text-gray-400 whitespace-nowrap">
                                            {new Date(log.created_at).toLocaleString('he-IL', {
                                                year: 'numeric',
                                                month: '2-digit',
                                                day: '2-digit',
                                                hour: '2-digit',
                                                minute: '2-digit'
                                            })}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
