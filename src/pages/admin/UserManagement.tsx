import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AddUserModal } from '../../components/modals/AddUserModal';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    PencilSquareIcon,
    XMarkIcon,
    KeyIcon,
    ArrowPathIcon,
    UserIcon,
    UserCircleIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

interface SubscriptionPlan {
    id: string;
    name: string;
    price_monthly: number;
    max_properties: number;
    max_tenants: number;
    max_contracts: number;
    max_sessions: number;
    features: Record<string, unknown>;
    created_at: string;
    updated_at: string;
}

interface UserWithStats {
    id: string;
    email: string;
    full_name: string;
    phone?: string;
    role: 'user' | 'admin' | 'manager';
    subscription_status: 'active' | 'suspended';
    plan_id: string;
    created_at: string;
    last_login: string | null;
    properties_count: number;
    tenants_count: number;
    contracts_count: number;
    ai_sessions_count: number;
    open_tickets_count: number;
    storage_usage_mb: number;
    is_super_admin?: boolean;
}

const UserManagement = () => {
    const navigate = useNavigate();
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [columnFilters, setColumnFilters] = useState({
        name: '',
        role: 'all',
        plan: 'all',
        status: 'all',
    });

    // Edit Modal State
    const [selectedUser, setSelectedUser] = useState<UserWithStats | null>(null);
    const [currentUser, setCurrentUser] = useState<{ id: string } | null>(null);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [actionLoading, setActionLoading] = useState(false);
    const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    // Form State
    const [editRole, setEditRole] = useState<string>('user');
    const [editStatus, setEditStatus] = useState<string>('active');
    const [editPlan, setEditPlan] = useState<string>('free');

    const fetchData = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch Current User
            const { data: { user: authedUser } } = await supabase.auth.getUser();
            setCurrentUser(authedUser);

            // Fetch Plans
            const { data: plansData } = await supabase.from('subscription_plans').select('*');
            setPlans(plansData || []);

            // Fetch Users with Stats via RPC
            const { data, error: rpcError } = await supabase.rpc('get_users_with_stats');

            if (rpcError) throw rpcError;

            const fetchedUsers = (data as UserWithStats[]) || [];
            setUsers(fetchedUsers);
        } catch (err: unknown) {
            console.error('Error fetching users:', err);
            setError((err as Error).message || 'Failed to connect to user database. Check permissions.');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const filteredUsers = users.filter(user => {
        const matchesName = !columnFilters.name ||
            user.full_name?.toLowerCase().includes(columnFilters.name.toLowerCase()) ||
            user.email?.toLowerCase().includes(columnFilters.name.toLowerCase()) ||
            user.phone?.includes(columnFilters.name);

        const matchesRole = columnFilters.role === 'all' || user.role === columnFilters.role;
        const matchesPlan = columnFilters.plan === 'all' || user.plan_id === columnFilters.plan;
        const matchesStatus = columnFilters.status === 'all' || user.subscription_status === columnFilters.status;

        return matchesName && matchesRole && matchesPlan && matchesStatus;
    });

    const openEditModal = (user: UserWithStats) => {
        setSelectedUser(user);
        setEditRole(user.role);
        setEditStatus(user.subscription_status || 'active');
        setEditPlan(user.plan_id || 'free');
        setModalMessage(null);
        setIsEditModalOpen(true);
    };

    const handleSaveChanges = async () => {
        if (!selectedUser) return;
        setActionLoading(true);
        setModalMessage(null);

        try {
            const planName = plans.find(p => p.id === editPlan)?.name || '';

            const { error } = await supabase
                .from('user_profiles')
                .update({
                    role: editRole,
                    subscription_status: editStatus,
                    plan_id: editPlan
                })
                .eq('id', selectedUser.id);

            if (error) throw error;

            setModalMessage({ type: 'success', text: 'User updated successfully!' });
            fetchData();
            setTimeout(() => setIsEditModalOpen(false), 1500);
        } catch (err: any) {
            setModalMessage({
                type: 'error',
                text: err.message || err.error_description || (typeof err === 'string' ? err : 'An unknown error occurred')
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleResetPassword = async () => {
        if (!selectedUser?.email) return;
        if (!confirm(`Send password reset email to ${selectedUser.email}?`)) return;

        setActionLoading(true);
        try {
            const { error } = await supabase.auth.resetPasswordForEmail(selectedUser.email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setModalMessage({ type: 'success', text: 'Reset email sent!' });
        } catch (err: any) {
            setModalMessage({
                type: 'error',
                text: err.message || err.error_description || (typeof err === 'string' ? err : 'An unknown error occurred')
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleDeleteUser = async () => {
        if (!selectedUser) return;
        if (!confirm(`ARE YOU SURE? This will PERMANENTLY DELETE user ${selectedUser.email} and ALL their properties, tenants, and contracts. This cannot be undone.`)) return;

        setActionLoading(true);
        try {
            const { error } = await supabase.rpc('delete_user_account', { target_user_id: selectedUser.id });
            if (error) throw error;

            setModalMessage({ type: 'success', text: 'User deleted successfully.' });
            setIsEditModalOpen(false);
            fetchData();
        } catch (err: any) {
            console.error('Delete error:', err);
            setModalMessage({
                type: 'error',
                text: 'Error deleting user: ' + (err.message || err.error_description || (typeof err === 'string' ? err : 'Unknown error'))
            });
        } finally {
            setActionLoading(false);
        }
    };

    const handleImpersonate = async (user: UserWithStats) => {
        if (!confirm(`Generate a secure login link for ${user.email}? You can use this to access their account.`)) return;

        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No session');

            // Admin generate link edge function
            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-generate-link`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({ targetUserId: user.id })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to generate link');

            await navigator.clipboard.writeText(data.url);
            alert(`Login Link generated and copied to clipboard!\n\nUser: ${data.email}\n\nPaste this in an Incognito/Private window to access their account.`);
        } catch (error: unknown) {
            console.error('Impersonation error:', error);
            alert(`Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    };

    const getPlanName = (user: UserWithStats) => {
        const plan = plans.find(p => p.id === user.plan_id);
        if (plan) return plan.name;
        return (user.plan_id === 'free' ? 'Free Forever' : user.plan_id);
    };

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-brand-600" />
        </div>
    );

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <UserIcon className="w-8 h-8 text-brand-600" />
                        User Management
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        View and manage system users, their subscription plans, and resource limits.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                        title="Refresh List"
                    >
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-xl bg-brand-600 px-6 py-2.5 text-sm font-bold text-white shadow-lg shadow-brand-600/20 hover:bg-brand-700 transition-all font-bold"
                    >
                        Add New User
                    </button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-3 text-red-700 dark:text-red-400 font-bold text-sm">
                    <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <p>Database Connectivity Issue</p>
                        <p className="font-medium opacity-80 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Filters Header Summary (Optional, but we'll focus on the column filters) */}
            <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-brand-600" />
                    <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest">Active Filters:</span>
                    <div className="flex gap-2">
                        {Object.entries(columnFilters).map(([key, value]) => {
                            if (value === 'all' || value === '') return null;
                            return (
                                <span key={key} className="px-2 py-1 bg-brand-50 text-brand-700 rounded-lg text-[10px] font-black uppercase border border-brand-100 flex items-center gap-1">
                                    {key}: {value}
                                    <button onClick={() => setColumnFilters({ ...columnFilters, [key]: key === 'name' ? '' : 'all' })}><XMarkIcon className="w-3 h-3" /></button>
                                </span>
                            );
                        })}
                        {Object.values(columnFilters).every(v => v === 'all' || v === '') && <span className="text-xs text-gray-400 font-medium italic">None</span>}
                    </div>
                </div>
                <button
                    onClick={() => setColumnFilters({ name: '', role: 'all', plan: 'all', status: 'all' })}
                    className="text-[10px] font-black text-brand-600 uppercase tracking-widest hover:underline"
                >
                    Clear All
                </button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right" dir="rtl">
                        <thead className="bg-gray-50 dark:bg-gray-900/50">
                            <tr>
                                <th scope="col" className="py-4 pl-4 pr-6 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Name / Contact</th>
                                <th scope="col" className="px-3 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Role / Plan</th>
                                <th scope="col" className="px-3 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Assets Stats</th>
                                <th scope="col" className="px-3 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Platform Usage</th>
                                <th scope="col" className="px-3 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Last Activity</th>
                                <th scope="col" className="px-3 py-4 text-right text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                                <th scope="col" className="relative py-4 pr-3 pl-6"><span className="sr-only">Actions</span></th>
                            </tr>
                            <tr className="bg-white dark:bg-gray-800 border-t border-gray-100 dark:border-gray-700">
                                <th className="py-2 pr-6 pl-3">
                                    <input
                                        type="text"
                                        placeholder="Filter Name..."
                                        className="w-full text-[10px] p-1.5 rounded-lg border border-gray-100 dark:border-gray-700 dark:bg-gray-900 focus:ring-brand-500"
                                        value={columnFilters.name}
                                        onChange={(e) => setColumnFilters({ ...columnFilters, name: e.target.value })}
                                    />
                                </th>
                                <th className="px-3 py-2">
                                    <div className="flex flex-col gap-1">
                                        <select
                                            className="w-full text-[10px] p-1 rounded-lg border border-gray-100 dark:border-gray-700 dark:bg-gray-900"
                                            value={columnFilters.role}
                                            onChange={(e) => setColumnFilters({ ...columnFilters, role: e.target.value })}
                                        >
                                            <option value="all">Role: All</option>
                                            <option value="user">User</option>
                                            <option value="admin">Admin</option>
                                            <option value="manager">Manager</option>
                                        </select>
                                        <select
                                            className="w-full text-[10px] p-1 rounded-lg border border-gray-100 dark:border-gray-700 dark:bg-gray-900"
                                            value={columnFilters.plan}
                                            onChange={(e) => setColumnFilters({ ...columnFilters, plan: e.target.value })}
                                        >
                                            <option value="all">Plan: All</option>
                                            {plans.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                                        </select>
                                    </div>
                                </th>
                                <th className="px-3 py-2 opacity-30 select-none">
                                    {/* Stats filters usually need ranges or > X, keeping simple for now */}
                                </th>
                                <th className="px-3 py-2 opacity-30 select-none"></th>
                                <th className="px-3 py-2 opacity-30 select-none"></th>
                                <th className="px-3 py-2">
                                    <select
                                        className="w-full text-[10px] p-1.5 rounded-lg border border-gray-100 dark:border-gray-700 dark:bg-gray-900"
                                        value={columnFilters.status}
                                        onChange={(e) => setColumnFilters({ ...columnFilters, status: e.target.value })}
                                    >
                                        <option value="all">Stat: All</option>
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended</option>
                                    </select>
                                </th>
                                <th className="px-3 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-sm font-bold text-gray-400 uppercase tracking-widest">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                                        <td className="whitespace-nowrap py-5 pr-6 pl-3 text-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-brand-50 dark:bg-brand-900/20 border border-brand-100 dark:border-brand-800 flex items-center justify-center text-brand-600 dark:text-brand-400 font-black relative">
                                                    {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                                                    {user.open_tickets_count > 0 && (
                                                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-[8px] font-black flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800">
                                                            {user.open_tickets_count}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-gray-900 dark:text-white flex items-center gap-2">
                                                        {user.full_name || 'No Name'}
                                                        {user.is_super_admin && <span className="text-[8px] bg-amber-100 text-amber-700 px-1 rounded font-black uppercase">SA</span>}
                                                    </div>
                                                    <div className="text-[10px] font-medium text-gray-400 tracking-tight">{user.email}</div>
                                                    {user.phone && <div className="text-[10px] font-bold text-brand-600 tracking-tight mt-0.5">{user.phone}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex w-fit rounded-lg px-2 py-0.5 text-[9px] font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-purple-50 text-purple-700 border border-purple-100 dark:bg-purple-900/20 dark:border-purple-800' : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                    {user.role}
                                                </span>
                                                <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 uppercase tracking-widest">
                                                    {getPlanName(user)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-5 text-right">
                                            <div className="flex flex-col gap-1 text-[10px] font-black uppercase">
                                                <div className="text-gray-500 flex justify-between gap-4">ASSETS: <span className="text-gray-900 dark:text-white">{user.properties_count}</span></div>
                                                <div className="text-gray-500 flex justify-between gap-4">LEASES: <span className="text-gray-900 dark:text-white">{user.contracts_count}</span></div>
                                                <div className="text-gray-500 flex justify-between gap-4">TENANTS: <span className="text-gray-900 dark:text-white">{user.tenants_count}</span></div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-5 text-right">
                                            <div className="flex flex-col gap-1 text-[10px] font-black uppercase">
                                                <div className="text-gray-500 flex justify-between gap-4">STORAGE: <span className="text-emerald-600">{user.storage_usage_mb || 0} MB</span></div>
                                                <div className="text-gray-500 flex justify-between gap-4">AI SESS: <span className="text-purple-600">{user.ai_sessions_count || 0}</span></div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-5">
                                            <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest">
                                                {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                            </div>
                                            {user.last_login && (
                                                <div className="text-[9px] text-gray-400 font-medium">
                                                    {new Date(user.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-3 py-5">
                                            {user.subscription_status === 'active' ? (
                                                <span className="inline-flex rounded-lg bg-emerald-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-emerald-700 border border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800">Active</span>
                                            ) : (
                                                <span className="inline-flex rounded-lg bg-red-50 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-widest text-red-700 border border-red-100 dark:bg-red-900/20 dark:border-red-800">{user.subscription_status || 'Suspended'}</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap py-5 pl-6 pr-3 text-left">
                                            <div className="flex items-center justify-end gap-1">
                                                <button
                                                    onClick={() => navigate(`/admin/client/${user.id}`)}
                                                    className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-all"
                                                    title="Client Hub (CRM & Messaging)"
                                                >
                                                    <UserCircleIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => openEditModal(user)} className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-xl transition-all" title="Edit Account Settings">
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </button>
                                                <button onClick={() => handleImpersonate(user)} className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all" title="Impersonate (Login as User)">
                                                    <KeyIcon className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* EDIT MODAL */}
            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
                    <div className="fixed inset-0 bg-gray-900/80 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>

                    <div className="relative w-full max-w-lg transform overflow-hidden rounded-3xl bg-white dark:bg-gray-800 p-8 shadow-2xl transition-all border border-gray-100 dark:border-gray-700" dir="ltr">
                        <button onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors">
                            <XMarkIcon className="h-6 w-6" />
                        </button>

                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                                Edit Account
                            </h3>
                            <p className="text-sm font-medium text-gray-500 mt-1">{selectedUser.email}</p>
                        </div>

                        {modalMessage && (
                            <div className={`mb-6 p-4 rounded-2xl text-sm font-bold ${modalMessage.type === 'success' ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {modalMessage.text}
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account Role</label>
                                    <select
                                        value={editRole}
                                        onChange={(e) => setEditRole(e.target.value)}
                                        className="block w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
                                    >
                                        <option value="user">Standard User</option>
                                        <option value="manager">Manager</option>
                                        <option value="admin">Administrator</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Account Status</label>
                                    <select
                                        value={editStatus}
                                        onChange={(e) => setEditStatus(e.target.value)}
                                        className="block w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
                                    >
                                        <option value="active">Active</option>
                                        <option value="suspended">Suspended / Banned</option>
                                    </select>
                                </div>
                            </div>

                            <div>
                                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5 ml-1">Subscription Plan</label>
                                <select
                                    value={editPlan}
                                    onChange={(e) => setEditPlan(e.target.value)}
                                    className="block w-full rounded-2xl border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 p-3 text-sm font-bold text-gray-900 dark:text-white focus:border-brand-500 focus:ring-brand-500"
                                >
                                    {plans.map(p => (
                                        <option key={p.id} value={p.id}>{p.name} ({p.max_properties === -1 ? 'Unlimited' : p.max_properties} Assets)</option>
                                    ))}
                                </select>
                            </div>

                            <div className="bg-brand-50/30 dark:bg-brand-900/10 rounded-2xl p-6 border border-brand-100 dark:border-brand-800">
                                <h4 className="text-[10px] font-black text-brand-600 dark:text-brand-400 uppercase tracking-widest mb-4">System Analytics</h4>
                                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-500 uppercase tracking-tighter">Total Assets</span>
                                        <span className="font-black text-gray-900 dark:text-white">{selectedUser.properties_count}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-500 uppercase tracking-tighter">AI Sessions</span>
                                        <span className="font-black text-purple-600">{selectedUser.ai_sessions_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-500 uppercase tracking-tighter">Active Tenants</span>
                                        <span className="font-black text-gray-900 dark:text-white">{selectedUser.tenants_count}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-500 uppercase tracking-tighter">Cloud Usage</span>
                                        <span className="font-black text-emerald-600">{selectedUser.storage_usage_mb || 0} MB</span>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-brand-100 dark:border-brand-800 flex justify-between items-center text-xs">
                                        <span className="font-bold text-gray-500 uppercase tracking-tighter">Joined Date</span>
                                        <span className="font-black text-gray-900 dark:text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-6 border border-gray-100 dark:border-gray-700">
                                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-4">Danger Zone</h4>
                                <div className="space-y-3">
                                    <button
                                        onClick={handleResetPassword}
                                        disabled={actionLoading}
                                        className="w-full flex items-center justify-center rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-gray-50 transition-all disabled:opacity-50 shadow-sm"
                                    >
                                        Send Password Reset Email
                                    </button>
                                    <button
                                        onClick={handleDeleteUser}
                                        disabled={actionLoading || selectedUser?.id === currentUser?.id}
                                        className="w-full flex items-center justify-center rounded-xl bg-red-50 text-red-600 border border-red-100 px-4 py-2.5 text-xs font-bold hover:bg-red-100 transition-all disabled:opacity-50"
                                        title={selectedUser?.id === currentUser?.id ? "You cannot delete your own account" : ""}
                                    >
                                        {actionLoading ? 'Deleting...' : 'Delete User & All Linked Data'}
                                    </button>
                                </div>
                            </div>

                            <div className="flex gap-3 mt-8">
                                <button
                                    onClick={handleSaveChanges}
                                    disabled={actionLoading}
                                    className="flex-1 flex items-center justify-center rounded-2xl bg-brand-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-brand-600/20 hover:bg-brand-700 transition-all disabled:opacity-50 uppercase tracking-widest"
                                >
                                    {actionLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <AddUserModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchData}
            />
        </div>
    );
};

export default UserManagement;
