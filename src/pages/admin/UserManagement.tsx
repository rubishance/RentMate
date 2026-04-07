import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../../lib/supabase';
import { AddUserModal } from '../../components/modals/AddUserModal';
import { useScrollLock } from '../../hooks/useScrollLock';
import {
    FunnelIcon,
    PencilSquareIcon,
    XMarkIcon,
    KeyIcon,
    ArrowPathIcon,
    UserIcon,
    UserCircleIcon,
    ExclamationTriangleIcon,
    ShieldCheckIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Button } from '../../components/ui/Button';
import { motion, AnimatePresence } from 'framer-motion';

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
    security_status: 'active' | 'flagged' | 'suspended' | 'banned';
    flagged_at: string | null;
    last_security_check: string | null;
}

interface SecurityLog {
    id: string;
    event_type: string;
    event_code: string;
    severity: string;
    created_at: string;
    ip_address: string;
    details?: Record<string, unknown>;
}

const UserManagement = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    
    const [users, setUsers] = useState<UserWithStats[]>([]);
    const [plans, setPlans] = useState<SubscriptionPlan[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [columnFilters, setColumnFilters] = useState({
        name: '',
        role: 'all',
        plan: searchParams.get('plan') || 'all',
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
    const [editSecurityStatus, setEditSecurityStatus] = useState<string>('active');
    const [editPlan, setEditPlan] = useState<string>('free');

    // Security Logs State
    const [isSecurityLogsOpen, setIsSecurityLogsOpen] = useState(false);
    const [securityLogs, setSecurityLogs] = useState<SecurityLog[]>([]);
    const [logsLoading, setLogsLoading] = useState(false);

    // Bulk Actions State
    const [selectedUserIds, setSelectedUserIds] = useState<string[]>([]);
    const [isBulkStatusModalOpen, setIsBulkStatusModalOpen] = useState(false);
    const [isBulkPlanModalOpen, setIsBulkPlanModalOpen] = useState(false);
    const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
    const [isBulkBroadcastModalOpen, setIsBulkBroadcastModalOpen] = useState(false);
    const [bulkBroadcastMessage, setBulkBroadcastMessage] = useState('');

    useScrollLock(isEditModalOpen);
    useScrollLock(isSecurityLogsOpen);

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

    // Bulk Selection Logic
    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedUserIds(filteredUsers.map(u => u.id));
        } else {
            setSelectedUserIds([]);
        }
    };

    const handleSelectUser = (id: string) => {
        setSelectedUserIds(prev =>
            prev.includes(id) ? prev.filter(userId => userId !== id) : [...prev, id]
        );
    };

    const isAllSelected = filteredUsers.length > 0 && selectedUserIds.length === filteredUsers.length;
    const isSomeSelected = selectedUserIds.length > 0 && selectedUserIds.length < filteredUsers.length;

    // --- Action Handlers ---

    const openEditModal = (user: UserWithStats) => {
        setSelectedUser(user);
        setEditRole(user.role);
        setEditStatus(user.subscription_status || 'active');
        setEditSecurityStatus(user.security_status || 'active');
        setEditPlan(user.plan_id || 'free');
        setModalMessage(null);
        setIsEditModalOpen(true);
    };

    const handleSaveChanges = async () => {
        if (!selectedUser) return;
        setActionLoading(true);
        setModalMessage(null);

        try {


            const { error } = await supabase
                .from('user_profiles')
                .update({
                    role: editRole,
                    subscription_status: editStatus,
                    security_status: editSecurityStatus,
                    plan_id: editPlan
                })
                .eq('id', selectedUser.id);

            if (error) throw error;

            setModalMessage({ type: 'success', text: 'User updated successfully!' });
            fetchData();
            setTimeout(() => setIsEditModalOpen(false), 1500);
        } catch (err: unknown) {
            const error = err as { message?: string, error_description?: string };
            setModalMessage({
                type: 'error',
                text: error.message || error.error_description || (typeof err === 'string' ? err : 'An unknown error occurred')
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
        } catch (err: unknown) {
            const error = err as { message?: string, error_description?: string };
            setModalMessage({
                type: 'error',
                text: error.message || error.error_description || (typeof err === 'string' ? err : 'An unknown error occurred')
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
        } catch (err: unknown) {
            console.error('Delete error:', err);
            const error = err as { message?: string, error_description?: string };
            setModalMessage({
                type: 'error',
                text: 'Error deleting user: ' + (error.message || error.error_description || (typeof err === 'string' ? err : 'Unknown error'))
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

    const openSecurityLogs = async (user: UserWithStats) => {
        setSelectedUser(user);
        setIsSecurityLogsOpen(true);
        setLogsLoading(true);
        try {
            const { data, error } = await supabase
                .from('security_logs')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;
            setSecurityLogs(data || []);
        } catch (err) {
            console.error('Error fetching logs:', err);
        } finally {
            setLogsLoading(false);
        }
    };

    const getPlanName = (user: UserWithStats) => {
        const plan = plans.find(p => p.id === user.plan_id);
        if (plan) return plan.name;
        return (user.plan_id === 'free' ? 'Free Forever' : user.plan_id);
    };

    // Bulk Action API Handlers
    const handleBulkStatusChange = async (newStatus: 'active' | 'suspended') => {
        if (!selectedUserIds.length) return;
        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ subscription_status: newStatus })
                .in('id', selectedUserIds);

            if (error) throw error;
            fetchData();
            setIsBulkStatusModalOpen(false);
            setSelectedUserIds([]);
        } catch (err) {
            console.error('Bulk status err:', err);
            alert('Failed to update status');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkPlanChange = async () => {
        if (!selectedUserIds.length || !editPlan) return;
        setActionLoading(true);
        try {
            const { error } = await supabase
                .from('user_profiles')
                .update({ plan_id: editPlan })
                .in('id', selectedUserIds);

            if (error) throw error;
            fetchData();
            setIsBulkPlanModalOpen(false);
            setSelectedUserIds([]);
        } catch (err) {
            console.error('Bulk plan err:', err);
            alert('Failed to update plans');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkDelete = async (isHard: boolean) => {
        if (!selectedUserIds.length) return;
        setActionLoading(true);
        try {
            if (isHard) {
                // Hard delete requires running RPC for each
                const deletePromises = selectedUserIds.map(id =>
                    supabase.rpc('delete_user_account', { target_user_id: id })
                );
                await Promise.all(deletePromises);
            } else {
                // Soft delete = suspend & flag
                const { error } = await supabase
                    .from('user_profiles')
                    .update({
                        subscription_status: 'suspended',
                        security_status: 'banned',
                        flagged_at: new Date().toISOString()
                    })
                    .in('id', selectedUserIds);
                if (error) throw error;
            }

            fetchData();
            setIsBulkDeleteModalOpen(false);
            setSelectedUserIds([]);
        } catch (err) {
            console.error('Bulk delete err:', err);
            alert('Failed to execute bulk delete');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkPasswordReset = async () => {
        if (!selectedUserIds.length) return;
        if (!confirm(`Send password reset email to ${selectedUserIds.length} users?`)) return;

        setActionLoading(true);
        try {
            const usersToReset = users.filter(u => selectedUserIds.includes(u.id) && u.email);
            const resetPromises = usersToReset.map(u =>
                supabase.auth.resetPasswordForEmail(u.email, {
                    redirectTo: `${window.location.origin}/reset-password`,
                })
            );
            await Promise.all(resetPromises);
            alert(`Sent ${usersToReset.length} reset emails.`);
            setSelectedUserIds([]);
        } catch (err) {
            console.error('Bulk reset err:', err);
            alert('Failed to send all reset emails');
        } finally {
            setActionLoading(false);
        }
    };

    const handleBulkBroadcast = async () => {
        if (!selectedUserIds.length || !bulkBroadcastMessage.trim()) return;
        setActionLoading(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) throw new Error("No authed user");

            const insertPromises = selectedUserIds.map(userId =>
                supabase.from('crm_interactions').insert({
                    user_id: userId,
                    type: 'email',
                    content: bulkBroadcastMessage,
                    created_by: user.id
                })
            );
            await Promise.all(insertPromises);
            alert(`CRM interaction logged for ${selectedUserIds.length} users.`);
            setIsBulkBroadcastModalOpen(false);
            setBulkBroadcastMessage('');
            setSelectedUserIds([]);
        } catch (err) {
            console.error('Bulk broadcast err:', err);
            alert('Failed to send broadcast');
        } finally {
            setActionLoading(false);
        }
    };

    if (loading) return (
        <div className="flex h-96 items-center justify-center">
            <Loader2 className="w-10 h-10 animate-spin text-primary-600" />
        </div>
    );

    return (
        <div className="space-y-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-foreground dark:text-white tracking-tight flex items-center gap-2">
                        <UserIcon className="w-8 h-8 text-primary-600" />
                        User Management
                    </h1>
                    <p className="text-sm font-medium text-muted-foreground dark:text-muted-foreground mt-1">
                        View and manage system users, their subscription plans, and resource limits.
                    </p>
                </div>
                <div className="flex items-center gap-2 sm:gap-4">
                    <Button
                        variant="outline"
                        onClick={fetchData}
                        className="p-2.5 bg-white dark:bg-gray-800 rounded-xl border-border dark:border-gray-700 shadow-sm hover:bg-blue-50 dark:hover:bg-gray-700 h-auto"
                        title="Refresh List"
                    >
                        <ArrowPathIcon className="w-6 h-6 text-muted-foreground dark:text-muted-foreground" />
                    </Button>
                </div>
            </div>

            {error && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 p-4 rounded-2xl flex items-center gap-2 sm:gap-4 text-red-700 dark:text-red-400 font-bold text-sm">
                    <ExclamationTriangleIcon className="w-6 h-6 flex-shrink-0" />
                    <div>
                        <p>Database Connectivity Issue</p>
                        <p className="font-medium opacity-80 mt-1">{error}</p>
                    </div>
                </div>
            )}

            {/* Filters Header Summary (Optional, but we'll focus on the column filters) */}
            <div className="flex items-center justify-between gap-4 bg-white dark:bg-gray-800 p-4 rounded-2xl shadow-sm border border-border dark:border-gray-700">
                <div className="flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-primary-600" />
                    <span className="text-sm font-black text-foreground dark:text-white uppercase tracking-widest">Active Filters:</span>
                    <div className="flex gap-2">
                        {Object.entries(columnFilters).map(([key, value]) => {
                            if (value === 'all' || value === '') return null;
                            return (
                                <span key={key} className="px-2 py-1 bg-primary-50 text-primary-700 rounded-xl text-xs font-black uppercase border border-primary-100 flex items-center gap-1">
                                    {key}: {value}
                                    <button onClick={() => setColumnFilters({ ...columnFilters, [key]: key === 'name' ? '' : 'all' })}><XMarkIcon className="w-3 h-3" /></button>
                                </span>
                            );
                        })}
                        {Object.values(columnFilters).every(v => v === 'all' || v === '') && <span className="text-xs text-muted-foreground font-medium italic">None</span>}
                    </div>
                </div>
                <Button
                    variant="link"
                    size="sm"
                    onClick={() => setColumnFilters({ name: '', role: 'all', plan: 'all', status: 'all' })}
                    className="text-xs font-black text-primary-600 uppercase tracking-widest hover:underline h-auto p-0"
                >
                    Clear All
                </Button>
            </div>

            {/* Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-border dark:border-gray-700 shadow-sm overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-right" dir="rtl">
                        <thead className="bg-blue-50 dark:bg-foreground/50">
                            <tr>
                                <th scope="col" className="py-4 pl-3 pr-4 sm:pr-6 whitespace-nowrap w-4">
                                    <div className="flex items-center">
                                        <input
                                            type="checkbox"
                                            className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600 dark:border-gray-600 dark:bg-gray-800"
                                            checked={isAllSelected}
                                            ref={(input) => {
                                                if (input) {
                                                    input.indeterminate = isSomeSelected;
                                                }
                                            }}
                                            onChange={handleSelectAll}
                                        />
                                    </div>
                                </th>
                                <th scope="col" className="py-4 pl-4 pr-3 text-right text-xs font-black text-muted-foreground uppercase tracking-widest">Name / Contact</th>
                                <th scope="col" className="px-2 sm:px-4 py-4 text-right text-xs font-black text-muted-foreground uppercase tracking-widest">Role / Plan</th>
                                <th scope="col" className="px-2 sm:px-4 py-4 text-right text-xs font-black text-muted-foreground uppercase tracking-widest">Assets Stats</th>
                                <th scope="col" className="px-2 sm:px-4 py-4 text-right text-xs font-black text-muted-foreground uppercase tracking-widest">Platform Usage</th>
                                <th scope="col" className="px-2 sm:px-4 py-4 text-right text-xs font-black text-muted-foreground uppercase tracking-widest">Last Activity</th>
                                <th scope="col" className="px-2 sm:px-4 py-4 text-right text-xs font-black text-muted-foreground uppercase tracking-widest">Status</th>
                                <th scope="col" className="relative py-4 pr-3 pl-6"><span className="sr-only">Actions</span></th>
                            </tr>
                            <tr className="bg-white dark:bg-gray-800 border-t border-border dark:border-gray-700">
                                <th className="py-2 px-2 sm:px-4"></th>
                                <th className="py-2 pr-4 pl-3">
                                    <Input
                                        placeholder="Filter Name..."
                                        className="w-full text-xs h-8"
                                        value={columnFilters.name}
                                        onChange={(e) => setColumnFilters({ ...columnFilters, name: e.target.value })}
                                    />
                                </th>
                                <th className="px-2 sm:px-4 py-2">
                                    <div className="flex items-center gap-2">
                                        <Select
                                            className="h-7 text-xs min-w-[100px]"
                                            value={columnFilters.role}
                                            onChange={(val) => setColumnFilters({ ...columnFilters, role: val })}
                                            options={[
                                                { value: 'all', label: 'Role: All' },
                                                { value: 'user', label: 'User' },
                                                { value: 'admin', label: 'Admin' },
                                                { value: 'manager', label: 'Manager' }
                                            ]}
                                        />
                                        <Select
                                            className="h-7 text-xs min-w-[100px]"
                                            value={columnFilters.plan}
                                            onChange={(val) => setColumnFilters({ ...columnFilters, plan: val })}
                                            options={[
                                                { value: 'all', label: 'Plan: All' },
                                                ...plans.map(p => ({ value: p.id, label: p.name }))
                                            ]}
                                        />
                                    </div>
                                </th>
                                <th className="px-2 sm:px-4 py-2 opacity-30 select-none">
                                    {/* Stats filters usually need ranges or > X, keeping simple for now */}
                                </th>
                                <th className="px-2 sm:px-4 py-2 opacity-30 select-none"></th>
                                <th className="px-2 sm:px-4 py-2 opacity-30 select-none"></th>
                                <th className="px-2 sm:px-4 py-2">
                                    <Select
                                        className="h-8 text-xs"
                                        value={columnFilters.status}
                                        onChange={(val) => setColumnFilters({ ...columnFilters, status: val })}
                                        options={[
                                            { value: 'all', label: 'Stat: All' },
                                            { value: 'active', label: 'Active' },
                                            { value: 'suspended', label: 'Suspended' }
                                        ]}
                                    />
                                </th>
                                <th className="px-2 sm:px-4 py-2"></th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={7} className="py-20 text-center text-sm font-bold text-muted-foreground uppercase tracking-widest">No users found.</td>
                                </tr>
                            ) : (
                                filteredUsers.map((user) => (
                                    <tr key={user.id} className={`transition-colors ${selectedUserIds.includes(user.id) ? 'bg-primary-50/50 dark:bg-primary-900/10' : 'hover:bg-blue-50 dark:hover:bg-gray-700/50'}`}>
                                        <td className="whitespace-nowrap py-4 sm:py-6 pl-3 pr-4 sm:pr-6">
                                            <div className="flex items-center">
                                                <input
                                                    type="checkbox"
                                                    className="h-4 w-4 rounded border-gray-300 text-primary-600 focus:ring-primary-600 dark:border-gray-600 dark:bg-gray-800"
                                                    checked={selectedUserIds.includes(user.id)}
                                                    onChange={() => handleSelectUser(user.id)}
                                                />
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap py-4 sm:py-6 pr-3 pl-3 text-sm">
                                            <div className="flex items-center gap-4">
                                                <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-primary-50 dark:bg-primary-900/20 border border-primary-100 dark:border-primary-800 flex items-center justify-center text-primary-600 dark:text-primary-400 font-black relative">
                                                    {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                                                    {user.open_tickets_count > 0 && (
                                                        <span className="absolute -top-1 -right-1 h-4 w-4 bg-rose-500 text-white text-xs font-black flex items-center justify-center rounded-full border-2 border-white dark:border-gray-800">
                                                            {user.open_tickets_count}
                                                        </span>
                                                    )}
                                                </div>
                                                <div>
                                                    <div className="font-bold text-foreground dark:text-white flex items-center gap-2">
                                                        {user.full_name || 'No Name'}
                                                        {user.is_super_admin && <span className="text-xs bg-amber-100 text-amber-700 px-1 rounded font-black uppercase">SA</span>}
                                                    </div>
                                                    <div className="text-xs font-medium text-muted-foreground tracking-tight">{user.email}</div>
                                                    {user.phone && <div className="text-xs font-bold text-primary-600 tracking-tight mt-0.5">{user.phone}</div>}
                                                </div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-2 sm:px-4 py-4 sm:py-6">
                                            <div className="flex flex-col gap-1">
                                                <span className={`inline-flex w-fit rounded-xl px-2 py-0.5 text-xs font-black uppercase tracking-widest ${user.role === 'admin' ? 'bg-primary-50 text-primary-700 border border-primary-100 dark:bg-primary-900/20 dark:border-primary-800' : 'bg-muted text-gray-700 dark:bg-gray-700 dark:text-gray-300'}`}>
                                                    {user.role}
                                                </span>
                                                <span className="text-xs font-bold text-primary uppercase tracking-widest">
                                                    {getPlanName(user)}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-2 sm:px-4 py-4 sm:py-6 text-right">
                                            <div className="flex flex-col gap-1 text-xs font-black uppercase">
                                                <div className="text-muted-foreground flex justify-between gap-4">ASSETS: <span className="text-foreground dark:text-white">{user.properties_count}</span></div>
                                                <div className="text-muted-foreground flex justify-between gap-4">LEASES: <span className="text-foreground dark:text-white">{user.contracts_count}</span></div>
                                                <div className="text-muted-foreground flex justify-between gap-4">TENANTS: <span className="text-foreground dark:text-white">{user.tenants_count}</span></div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-2 sm:px-4 py-4 sm:py-6 text-right">
                                            <div className="flex flex-col gap-1 text-xs font-black uppercase">
                                                <div className="text-muted-foreground flex justify-between gap-4">STORAGE: <span className="text-blue-600">{user.storage_usage_mb || 0} MB</span></div>
                                                <div className="text-muted-foreground flex justify-between gap-4">AI SESS: <span className="text-primary">{user.ai_sessions_count || 0}</span></div>
                                            </div>
                                        </td>
                                        <td className="whitespace-nowrap px-2 sm:px-4 py-4 sm:py-6">
                                            <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest">
                                                {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                                            </div>
                                            {user.last_login && (
                                                <div className="text-xs text-muted-foreground font-medium">
                                                    {new Date(user.last_login).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap px-2 sm:px-4 py-4 sm:py-6">
                                            {user.subscription_status === 'active' ? (
                                                <span className="inline-flex rounded-xl bg-blue-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-widest text-blue-700 border border-blue-100 dark:bg-blue-900/20 dark:border-blue-800">Active</span>
                                            ) : (
                                                <span className="inline-flex rounded-xl bg-red-50 px-2.5 py-0.5 text-xs font-black uppercase tracking-widest text-red-700 border border-red-100 dark:bg-red-900/20 dark:border-red-800">{user.subscription_status || 'Suspended'}</span>
                                            )}
                                        </td>
                                        <td className="whitespace-nowrap py-4 sm:py-6 pl-6 pr-3 text-left">
                                            <div className="flex items-center justify-end gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => navigate(`/admin/client/${user.id}`)}
                                                    className="p-2 text-muted-foreground hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all h-auto"
                                                    title="Client Hub (CRM & Messaging)"
                                                >
                                                    <UserCircleIcon className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openEditModal(user)}
                                                    className="p-2 text-muted-foreground hover:text-primary-600 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-xl transition-all h-auto"
                                                    title="Edit Account Settings"
                                                >
                                                    <PencilSquareIcon className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => openSecurityLogs(user)}
                                                    className="p-2 text-muted-foreground hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl transition-all h-auto"
                                                    title="Security Logs & Abuse History"
                                                >
                                                    <ShieldCheckIcon className="w-5 h-5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleImpersonate(user)}
                                                    className="p-2 text-muted-foreground hover:text-amber-600 hover:bg-amber-50 dark:hover:bg-amber-900/20 rounded-xl transition-all h-auto"
                                                    title="Impersonate (Login as User)"
                                                >
                                                    <KeyIcon className="w-5 h-5" />
                                                </Button>
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
                    <div className="fixed inset-0 bg-foreground/80 backdrop-blur-sm transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>

                    <div className="relative w-full max-w-lg transform overflow-hidden rounded-2xl bg-window p-8 shadow-2xl transition-all border border-border dark:border-gray-700" dir="ltr">
                        <Button variant="ghost" size="sm" onClick={() => setIsEditModalOpen(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors h-auto p-1">
                            <XMarkIcon className="h-6 w-6" />
                        </Button>

                        <div className="mb-8">
                            <h3 className="text-2xl font-black text-foreground dark:text-white tracking-tight">
                                Edit Account
                            </h3>
                            <p className="text-sm font-medium text-muted-foreground mt-1">{selectedUser.email}</p>
                        </div>

                        {modalMessage && (
                            <div className={`mb-6 p-4 rounded-2xl text-sm font-bold ${modalMessage.type === 'success' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
                                {modalMessage.text}
                            </div>
                        )}

                        <div className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <Select
                                        label={<span className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Account Role</span>}
                                        value={editRole}
                                        onChange={(val) => setEditRole(val)}
                                        options={[
                                            { value: 'user', label: 'Standard User' },
                                            { value: 'manager', label: 'Manager' },
                                            { value: 'admin', label: 'Administrator' }
                                        ]}
                                        className="w-full"
                                    />
                                </div>
                                <div>
                                    <Select
                                        label={<span className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Account Status</span>}
                                        value={editStatus}
                                        onChange={(val) => setEditStatus(val)}
                                        options={[
                                            { value: 'active', label: 'Active' },
                                            { value: 'suspended', label: 'Suspended / Banned' }
                                        ]}
                                        className="w-full"
                                    />
                                </div>
                            </div>

                            <div>
                                <Select
                                    label={<span className="text-xs font-black text-muted-foreground uppercase tracking-widest ml-1">Subscription Plan</span>}
                                    value={editPlan}
                                    onChange={(val) => setEditPlan(val)}
                                    options={plans.map(p => ({
                                        value: p.id,
                                        label: `${p.name} (${p.max_properties === -1 ? 'Unlimited' : p.max_properties} Assets)`
                                    }))}
                                    className="w-full"
                                />
                            </div>

                            <div className="bg-primary-50/30 dark:bg-primary-900/10 rounded-2xl p-6 border border-primary-100 dark:border-primary-800">
                                <h4 className="text-xs font-black text-primary-600 dark:text-primary-400 uppercase tracking-widest mb-4">System Analytics</h4>
                                <div className="grid grid-cols-2 gap-y-4 gap-x-8">
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-muted-foreground uppercase tracking-tighter">Total Assets</span>
                                        <span className="font-black text-foreground dark:text-white">{selectedUser.properties_count}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-muted-foreground uppercase tracking-tighter">AI Sessions</span>
                                        <span className="font-black text-primary">{selectedUser.ai_sessions_count || 0}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-muted-foreground uppercase tracking-tighter">Active Tenants</span>
                                        <span className="font-black text-foreground dark:text-white">{selectedUser.tenants_count}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-xs">
                                        <span className="font-bold text-muted-foreground uppercase tracking-tighter">Cloud Usage</span>
                                        <span className="font-black text-blue-600">{selectedUser.storage_usage_mb || 0} MB</span>
                                    </div>
                                    <div className="col-span-2 pt-2 border-t border-primary-100 dark:border-primary-800 flex justify-between items-center text-xs">
                                        <span className="font-bold text-muted-foreground uppercase tracking-tighter">Joined Date</span>
                                        <span className="font-black text-foreground dark:text-white">{new Date(selectedUser.created_at).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="bg-blue-50 dark:bg-foreground rounded-2xl p-6 border border-border dark:border-gray-700">
                                <h4 className="text-xs font-black text-muted-foreground uppercase tracking-widest mb-4">Danger Zone</h4>
                                <div className="space-y-3">
                                    <Button
                                        variant="outline"
                                        onClick={handleResetPassword}
                                        disabled={actionLoading}
                                        className="w-full justify-center rounded-xl border-border dark:border-gray-700 px-4 py-2.5 text-xs font-bold text-gray-700 dark:text-gray-300 hover:bg-blue-50 h-auto"
                                    >
                                        Send Password Reset Email
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        onClick={handleDeleteUser}
                                        disabled={actionLoading || selectedUser?.id === currentUser?.id}
                                        className="w-full justify-center rounded-xl bg-destructive/10 text-destructive border border-red-100 px-4 py-2.5 text-xs font-bold hover:bg-red-100 hover:text-red-700 h-auto"
                                        title={selectedUser?.id === currentUser?.id ? "You cannot delete your own account" : ""}
                                    >
                                        {actionLoading ? 'Deleting...' : 'Delete User & All Linked Data'}
                                    </Button>
                                </div>
                            </div>

                            <div className="flex gap-2 sm:gap-4 mt-8">
                                <Button
                                    onClick={handleSaveChanges}
                                    disabled={actionLoading}
                                    className="flex-1 justify-center rounded-2xl bg-primary-600 px-6 py-4 text-sm font-black text-white shadow-xl shadow-primary-600/20 hover:bg-primary-700 uppercase tracking-widest h-auto"
                                >
                                    {actionLoading ? 'Saving...' : 'Save Changes'}
                                </Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* SECURITY LOGS MODAL */}
            {isSecurityLogsOpen && selectedUser && (
                <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6 text-left" dir="ltr">
                    <div className="fixed inset-0 bg-foreground/80 backdrop-blur-sm transition-opacity" onClick={() => setIsSecurityLogsOpen(false)}></div>

                    <div className="relative w-full max-w-2xl transform overflow-hidden rounded-2xl bg-window p-8 shadow-2xl transition-all border border-border dark:border-gray-700" dir="ltr">
                        <Button variant="ghost" size="sm" onClick={() => setIsSecurityLogsOpen(false)} className="absolute top-6 right-6 text-muted-foreground hover:text-foreground dark:hover:text-white transition-colors h-auto p-1">
                            <XMarkIcon className="h-6 w-6" />
                        </Button>

                        <div className="mb-6">
                            <h3 className="text-2xl font-black text-foreground dark:text-white tracking-tight flex items-center gap-2 sm:gap-4">
                                <ShieldCheckIcon className="w-8 h-8 text-rose-600" />
                                Security Audit Logs
                            </h3>
                            <p className="text-sm font-medium text-muted-foreground mt-1">Activity history for {selectedUser.email}</p>
                        </div>

                        <div className="max-h-[50vh] overflow-y-auto space-y-3 pr-2 custom-scrollbar">
                            {logsLoading ? (
                                <div className="py-20 flex justify-center"><Loader2 className="animate-spin text-primary-600" /></div>
                            ) : securityLogs.length === 0 ? (
                                <div className="py-20 text-center text-sm font-bold text-muted-foreground uppercase tracking-widest bg-blue-50 dark:bg-foreground/50 rounded-2xl">No security events found.</div>
                            ) : (
                                securityLogs.map((log) => (
                                    <div key={log.id} className="p-4 rounded-2xl bg-blue-50 dark:bg-foreground border border-border dark:border-gray-700 flex flex-col gap-2">
                                        <div className="flex items-center justify-between">
                                            <span className={`px-2 py-0.5 rounded-xl text-xs font-black uppercase tracking-widest ${log.severity === 'critical' ? 'bg-red-100 text-red-700' :
                                                log.severity === 'high' ? 'bg-orange-100 text-orange-700' :
                                                    'bg-primary/10 text-blue-700'
                                                }`}>
                                                {log.event_code}
                                            </span>
                                            <span className="text-xs font-bold text-muted-foreground">{new Date(log.created_at).toLocaleString()}</span>
                                        </div>
                                        <div className="text-xs text-muted-foreground dark:text-muted-foreground font-medium whitespace-pre-wrap break-all">
                                            {JSON.stringify(log.details, null, 2)}
                                        </div>
                                        <div className="flex items-center gap-4 mt-1 opacity-80 text-xs font-bold uppercase tracking-tighter">
                                            <span>IP: {log.ip_address || 'Unknown'}</span>
                                            <span>Severity: {log.severity}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>

                        <div className="mt-8">
                            <Button
                                variant="secondary"
                                onClick={() => setIsSecurityLogsOpen(false)}
                                className="w-full py-4 rounded-2xl bg-muted dark:bg-foreground text-sm font-black text-foreground dark:text-white uppercase tracking-widest hover:bg-gray-200 border-border dark:border-gray-700 h-auto"
                            >
                                Close
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <AddUserModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={fetchData}
                plans={plans}
            />

            {/* FLOATING ACTION BAR FOR BULK ACTIONS */}
            <AnimatePresence>
                {selectedUserIds.length > 0 && (
                    <motion.div
                        initial={{ y: 100, opacity: 0 }}
                        animate={{ y: 0, opacity: 1 }}
                        exit={{ y: 100, opacity: 0 }}
                        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 px-6 py-4 bg-foreground dark:bg-gray-800 shadow-2xl rounded-2xl flex items-center gap-6 border border-gray-800 dark:border-gray-700"
                        dir="ltr"
                    >
                        <div className="flex items-center gap-2 sm:gap-4 pr-6 border-r border-gray-700">
                            <span className="flex items-center justify-center w-8 h-8 rounded-full bg-primary-600 text-white font-black text-sm">
                                {selectedUserIds.length}
                            </span>
                            <span className="text-sm font-bold text-gray-300">Selected</span>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                            <Button
                                variant="secondary"
                                size="sm"
                                className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700"
                                onClick={() => setIsBulkStatusModalOpen(true)}
                            >
                                Status
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700"
                                onClick={() => setIsBulkPlanModalOpen(true)}
                            >
                                Plan
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700"
                                onClick={() => setIsBulkBroadcastModalOpen(true)}
                            >
                                Message
                            </Button>
                            <Button
                                variant="secondary"
                                size="sm"
                                className="bg-gray-800 text-gray-300 hover:bg-gray-700 border-gray-700"
                                onClick={handleBulkPasswordReset}
                                disabled={actionLoading}
                            >
                                Reset Pass
                            </Button>
                            <Button
                                variant="ghost"
                                size="sm"
                                className="text-red-400 hover:text-red-300 hover:bg-red-900/30"
                                onClick={() => setIsBulkDeleteModalOpen(true)}
                            >
                                Delete
                            </Button>
                        </div>

                        <Button
                            variant="ghost"
                            size="sm"
                            className="absolute -top-3 -right-3 rounded-full bg-gray-800 text-muted-foreground hover:text-white p-1 border border-gray-700 shadow-md h-8 w-8"
                            onClick={() => setSelectedUserIds([])}
                        >
                            <XMarkIcon className="w-4 h-4" />
                        </Button>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* BULK STATUS MODAL */}
            {isBulkStatusModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 text-left" dir="ltr">
                    <div className="fixed inset-0 bg-foreground/80 backdrop-blur-sm transition-opacity" onClick={() => setIsBulkStatusModalOpen(false)}></div>
                    <div className="relative w-full max-w-sm rounded-2xl bg-window p-8 shadow-2xl border border-border dark:border-gray-700">
                        <Button variant="ghost" size="sm" onClick={() => setIsBulkStatusModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground dark:hover:text-white p-1 h-auto"><XMarkIcon className="h-5 w-5" /></Button>
                        <h3 className="text-xl font-black mb-4">Update Status ({selectedUserIds.length})</h3>
                        <div className="space-y-3">
                            <Button onClick={() => handleBulkStatusChange('active')} disabled={actionLoading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold h-12 rounded-xl">Set Active</Button>
                            <Button onClick={() => handleBulkStatusChange('suspended')} disabled={actionLoading} className="w-full bg-orange-600 hover:bg-orange-700 text-white font-bold h-12 rounded-xl">Set Suspended</Button>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK PLAN MODAL */}
            {isBulkPlanModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 text-left" dir="ltr">
                    <div className="fixed inset-0 bg-foreground/80 backdrop-blur-sm transition-opacity" onClick={() => setIsBulkPlanModalOpen(false)}></div>
                    <div className="relative w-full max-w-sm rounded-2xl bg-window p-8 shadow-2xl border border-border dark:border-gray-700">
                        <Button variant="ghost" size="sm" onClick={() => setIsBulkPlanModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 h-auto"><XMarkIcon className="h-5 w-5" /></Button>
                        <h3 className="text-xl font-black mb-4">Assign Plan ({selectedUserIds.length})</h3>
                        <Select
                            value={editPlan}
                            onChange={setEditPlan}
                            options={plans.map(p => ({ value: p.id, label: p.name }))}
                            className="w-full mb-6"
                        />
                        <Button onClick={handleBulkPlanChange} disabled={actionLoading} className="w-full h-12 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold">Apply Plan</Button>
                    </div>
                </div>
            )}

            {/* BULK DELETE MODAL */}
            {isBulkDeleteModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 text-left" dir="ltr">
                    <div className="fixed inset-0 bg-foreground/80 backdrop-blur-sm transition-opacity" onClick={() => setIsBulkDeleteModalOpen(false)}></div>
                    <div className="relative w-full max-w-md rounded-2xl bg-window p-8 shadow-2xl border border-border dark:border-gray-700">
                        <Button variant="ghost" size="sm" onClick={() => setIsBulkDeleteModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 h-auto"><XMarkIcon className="h-5 w-5" /></Button>
                        <h3 className="text-xl font-black text-rose-600 mb-2 flex items-center gap-2"><ExclamationTriangleIcon className="w-6 h-6" /> Danger Zone</h3>
                        <p className="text-sm text-muted-foreground font-medium mb-6">You are modifying {selectedUserIds.length} users. Please choose how to proceed.</p>
                        <div className="space-y-4">
                            <div className="p-4 border border-orange-200 bg-orange-50 rounded-2xl dark:bg-orange-900/10 dark:border-orange-800">
                                <h4 className="text-sm font-bold text-orange-800 dark:text-orange-400 mb-1">Soft Delete</h4>
                                <p className="text-xs text-orange-700 dark:text-orange-500 mb-2 sm:mb-4 opacity-90">Suspends accounts and flags them. Data remains intact.</p>
                                <Button onClick={() => handleBulkDelete(false)} disabled={actionLoading} className="w-full bg-orange-600 hover:bg-orange-700 text-white rounded-xl text-sm font-bold">Suspend All</Button>
                            </div>
                            <div className="p-4 border border-red-200 bg-red-50 rounded-2xl dark:bg-red-900/10 dark:border-red-800">
                                <h4 className="text-sm font-bold text-red-800 dark:text-red-400 mb-1">Hard Delete</h4>
                                <p className="text-xs text-red-700 dark:text-red-500 mb-2 sm:mb-4 opacity-90">Permanently wipes accounts and all associated data. CANNOT BE UNDONE.</p>
                                <Button onClick={() => handleBulkDelete(true)} disabled={actionLoading} className="w-full bg-red-600 hover:bg-red-700 text-white rounded-xl text-sm font-bold">Wipe Data Completely</Button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* BULK BROADCAST MODAL */}
            {isBulkBroadcastModalOpen && (
                <div className="fixed inset-0 z-[120] flex items-center justify-center p-4 text-left" dir="ltr">
                    <div className="fixed inset-0 bg-foreground/80 backdrop-blur-sm transition-opacity" onClick={() => setIsBulkBroadcastModalOpen(false)}></div>
                    <div className="relative w-full max-w-md rounded-2xl bg-window p-8 shadow-2xl border border-border dark:border-gray-700">
                        <Button variant="ghost" size="sm" onClick={() => setIsBulkBroadcastModalOpen(false)} className="absolute top-4 right-4 text-muted-foreground hover:text-foreground p-1 h-auto"><XMarkIcon className="h-5 w-5" /></Button>
                        <h3 className="text-xl font-black mb-4 flex items-center gap-2">Targeted CRM Message</h3>
                        <p className="text-sm text-muted-foreground font-medium mb-4">Send an internal CRM note or email broadcast trigger to {selectedUserIds.length} users.</p>
                        <textarea
                            value={bulkBroadcastMessage}
                            onChange={(e) => setBulkBroadcastMessage(e.target.value)}
                            className="w-full h-32 rounded-xl border border-border dark:border-gray-700 bg-white dark:bg-gray-800 p-2 sm:p-4 text-sm focus:ring-2 focus:ring-primary-600 mb-4 outline-none resize-none font-medium"
                            placeholder="Enter your message..."
                            dir="auto"
                        />
                        <Button onClick={handleBulkBroadcast} disabled={actionLoading || !bulkBroadcastMessage.trim()} className="w-full h-12 rounded-xl bg-primary-600 hover:bg-primary-700 text-white font-bold">Send / Log Interaction</Button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default UserManagement;
