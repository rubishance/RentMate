import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    CircleStackIcon,
    ServerIcon,
    UsersIcon,
    ExclamationTriangleIcon,
    MagnifyingGlassIcon,
    ArrowPathIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { formatBytes } from '../../lib/utils';

interface UserStorageSummary {
    user_id: string;
    email: string;
    plan_name: string;
    total_bytes: number;
    file_count: number;
    max_storage_mb: number;
    usage_percent: number;
    breakdown: {
        media: number;
        utilities: number;
        maintenance: number;
        documents: number;
    };
}

interface RawStorageUsage {
    user_id: string;
    total_bytes: number;
    file_count: number;
    media_bytes: number;
    utilities_bytes: number;
    maintenance_bytes: number;
    documents_bytes: number;
    user_profiles: {
        email: string | null;
        subscription_plans: {
            name: string;
            max_storage_mb: number;
        };
    }[];
}

export function StorageManagement() {
    const [stats, setStats] = useState<UserStorageSummary[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [filter, setFilter] = useState<'all' | 'high_usage'>('all');
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        fetchStorageStats();
    }, []);

    async function fetchStorageStats() {
        setLoading(true);
        setError(null);
        try {
            const { data, error: fetchError } = await supabase
                .from('user_storage_usage')
                .select(`
                    user_id,
                    total_bytes,
                    file_count,
                    media_bytes,
                    utilities_bytes,
                    maintenance_bytes,
                    documents_bytes,
                    user_profiles!inner(
                        email,
                        subscription_plans!inner(
                            name,
                            max_storage_mb
                        )
                    )
                `);

            if (fetchError) throw fetchError;

            const formattedData: UserStorageSummary[] = ((data as unknown as RawStorageUsage[]) || []).map((item) => {
                const plan = item.user_profiles[0]?.subscription_plans || { name: 'unknown', max_storage_mb: 0 };
                const maxBytes = plan.max_storage_mb === -1
                    ? Infinity
                    : plan.max_storage_mb * 1024 * 1024;

                return {
                    user_id: item.user_id,
                    email: item.user_profiles[0]?.email || 'No email',
                    plan_name: plan.name,
                    total_bytes: item.total_bytes,
                    file_count: item.file_count,
                    max_storage_mb: plan.max_storage_mb,
                    usage_percent: maxBytes === Infinity ? 0 : (item.total_bytes / maxBytes) * 100,
                    breakdown: {
                        media: item.media_bytes,
                        utilities: item.utilities_bytes,
                        maintenance: item.maintenance_bytes,
                        documents: item.documents_bytes
                    }
                };
            });

            setStats(formattedData);
        } catch (err: unknown) {
            console.error('Error fetching storage stats:', err);
            setError(err instanceof Error ? err.message : 'Failed to load storage statistics');
        } finally {
            setLoading(false);
        }
    }

    const filteredStats = stats.filter(s => {
        const matchesSearch = s.email.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesFilter = filter === 'all' || s.usage_percent > 80;
        return matchesSearch && matchesFilter;
    });

    const totalStorageManaged = stats.reduce((sum, s) => sum + s.total_bytes, 0);
    const highUsageUsers = stats.filter(s => s.usage_percent > 80).length;

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
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
                        <ServerIcon className="w-8 h-8 text-brand-600" />
                        Storage Management
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Monitor user storage consumption and quota adherence across the platform.
                    </p>
                </div>
                <button
                    onClick={fetchStorageStats}
                    className="p-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    title="Refresh Stats"
                >
                    <ArrowPathIcon className="w-6 h-6" />
                </button>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 font-bold text-sm">
                    <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
                    {error}
                </div>
            )}

            {/* Overview Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-brand-50 dark:bg-brand-900/20 rounded-xl border border-brand-100 dark:border-brand-800">
                            <CircleStackIcon className="w-6 h-6 text-brand-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Total Managed</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{formatBytes(totalStorageManaged)}</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-orange-50 dark:bg-orange-900/20 rounded-xl border border-orange-100 dark:border-orange-800">
                            <ExclamationTriangleIcon className="w-6 h-6 text-orange-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Over 80% Quota</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{highUsageUsers} Users</p>
                        </div>
                    </div>
                </div>
                <div className="bg-white dark:bg-gray-800 p-6 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm">
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-emerald-50 dark:bg-emerald-900/20 rounded-xl border border-emerald-100 dark:border-emerald-800">
                            <UsersIcon className="w-6 h-6 text-emerald-600" />
                        </div>
                        <div>
                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Active Accounts</p>
                            <p className="text-2xl font-black text-gray-900 dark:text-white">{stats.length}</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Table Section */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="p-5 border-b border-gray-100 dark:border-gray-700 flex flex-col sm:flex-row gap-4 justify-between items-center bg-gray-50/50 dark:bg-gray-800/50">
                    <div className="relative w-full sm:w-80">
                        <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Filter by email or ID..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-500/20 focus:border-brand-500"
                        />
                    </div>
                    <div className="flex gap-1 p-1 bg-gray-100 dark:bg-gray-900 rounded-xl">
                        <button
                            onClick={() => setFilter('all')}
                            className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'all'
                                ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            All
                        </button>
                        <button
                            onClick={() => setFilter('high_usage')}
                            className={`px-4 py-1.5 text-xs font-black uppercase tracking-widest rounded-lg transition-all ${filter === 'high_usage'
                                ? 'bg-orange-600 text-white shadow-md'
                                : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                                }`}
                        >
                            Alerts
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-right" dir="rtl">
                        <thead>
                            <tr className="bg-gray-50 dark:bg-gray-900/50">
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">User / ID</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Plan</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Storage Usage</th>
                                <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Allocation</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredStats.map((item) => (
                                <tr key={item.user_id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                    <td className="px-6 py-5">
                                        <div className="font-bold text-gray-900 dark:text-white text-sm">{item.email}</div>
                                        <div className="text-[10px] text-gray-400 font-mono tracking-tighter mt-0.5">{item.user_id}</div>
                                    </td>
                                    <td className="px-6 py-5">
                                        <span className={`px-2.5 py-1 text-[10px] font-black uppercase tracking-widest rounded-lg border ${item.plan_name === 'pro' ? 'bg-blue-50 text-blue-700 border-blue-100 dark:bg-blue-900/20 dark:border-blue-800' :
                                            item.plan_name === 'enterprise' ? 'bg-purple-50 text-purple-700 border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' :
                                                'bg-gray-50 text-gray-600 border-gray-200 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-400'
                                            }`}>
                                            {item.plan_name}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="font-black text-gray-900 dark:text-white text-sm">{formatBytes(item.total_bytes)}</div>
                                        <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                                            {item.file_count} Files
                                        </div>
                                    </td>
                                    <td className="px-6 py-5 w-64">
                                        <div className="space-y-2">
                                            <div className="flex items-center justify-between gap-4">
                                                <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-900 rounded-full overflow-hidden border border-gray-200 dark:border-gray-700">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-500 ${item.usage_percent > 90 ? 'bg-red-600 shadow-[0_0_8px_rgba(220,38,38,0.5)]' :
                                                            item.usage_percent > 75 ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' :
                                                                'bg-brand-600 shadow-[0_0_8px_rgba(37,99,235,0.5)]'
                                                            }`}
                                                        style={{ width: `${Math.min(item.usage_percent, 100)}%` }}
                                                    />
                                                </div>
                                                <span className="text-xs font-black text-gray-900 dark:text-white w-12 text-left">
                                                    {item.usage_percent.toFixed(0)}%
                                                </span>
                                            </div>
                                            <div className="flex justify-between text-[9px] font-bold text-gray-400 uppercase tracking-tighter">
                                                <span>Limit: {item.max_storage_mb === -1 ? '∞' : `${item.max_storage_mb}MB`}</span>
                                            </div>
                                        </div>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                {filteredStats.length === 0 && (
                    <div className="py-20 text-center flex flex-col items-center justify-center">
                        <CircleStackIcon className="w-12 h-12 text-gray-200 mb-4" />
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">No storage records found</p>
                    </div>
                )}
            </div>
        </div>
    );
}

export default StorageManagement;
