import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import type { AuditLog } from '../../types/database';
import { ShieldCheck, Search, Loader2, Calendar, User, Activity } from 'lucide-react';

export default function AuditLogs() {
    const [logs, setLogs] = useState<AuditLog[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchLogs();
    }, []);

    async function fetchLogs() {
        try {
            const { data, error } = await supabase
                .from('audit_logs')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(100);

            if (error) {
                console.error('Error fetching logs:', error);
            } else if (data) {
                setLogs(data as AuditLog[]);
            }
        } catch (error) {
            console.error('Error fetching logs:', error);
        } finally {
            setLoading(false);
        }
    }

    const filteredLogs = logs.filter(log =>
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.user_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && JSON.stringify(log.details).toLowerCase().includes(searchTerm.toLowerCase()))
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-[50vh]">
                <Loader2 className="w-8 h-8 animate-spin text-primary" />
            </div>
        );
    }

    return (
        <div className="space-y-6 pb-20">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
                        <ShieldCheck className="w-6 h-6 text-primary" />
                        Audit Logs
                    </h1>
                    <p className="text-sm text-muted-foreground mt-1">
                        Track system activity and security events
                    </p>
                </div>
                <div className="bg-secondary/30 px-4 py-2 rounded-lg text-xs font-mono text-muted-foreground">
                    Last 100 Events
                </div>
            </div>

            {/* Search */}
            <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                    type="text"
                    placeholder="Search logs by action, user ID or details..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 bg-card border border-border rounded-xl focus:ring-2 focus:ring-primary focus:border-transparent outline-none transition-all"
                />
            </div>

            {/* Logs Table */}
            <div className="bg-card border border-border rounded-xl shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-secondary/50 text-muted-foreground font-medium border-b border-border">
                            <tr>
                                <th className="px-4 py-3">Action</th>
                                <th className="px-4 py-3">User</th>
                                <th className="px-4 py-3">Details</th>
                                <th className="px-4 py-3 text-right">Date</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-border">
                            {filteredLogs.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-4 py-8 text-center text-muted-foreground">
                                        No logs found matching your search.
                                    </td>
                                </tr>
                            ) : (
                                filteredLogs.map((log) => (
                                    <tr key={log.id} className="hover:bg-secondary/20 transition-colors">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <Activity className="w-4 h-4 text-blue-500" />
                                                <span className="font-medium text-foreground">{log.action}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground font-mono text-xs">
                                            <div className="flex items-center gap-1.5">
                                                <User className="w-3 h-3" />
                                                {log.user_id.split('-')[0]}...
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 max-w-md truncate text-muted-foreground">
                                            {JSON.stringify(log.details)}
                                        </td>
                                        <td className="px-4 py-3 text-right text-muted-foreground whitespace-nowrap">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <Calendar className="w-3 h-3" />
                                                {new Date(log.created_at).toLocaleString()}
                                            </div>
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
