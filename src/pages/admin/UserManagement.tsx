import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
// import type { UserProfile } from '../../types/database'; // We use custom shape from RPC now
import { AddUserModal } from '../../components/modals/AddUserModal';
import {
    MagnifyingGlassIcon,
    FunnelIcon,
    PencilSquareIcon,
    XMarkIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';

const UserManagement = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [plans, setPlans] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<'all' | 'user' | 'admin'>('all');

    // Edit Modal State
    const [selectedUser, setSelectedUser] = useState<any | null>(null);
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
        try {
            // Fetch Plans
            const { data: plansData } = await supabase.from('subscription_plans').select('*');
            setPlans(plansData || []);

            // Fetch Users with Stats
            const { data, error } = await supabase.rpc('get_users_with_stats');

            if (error) throw error;

            let filteredData = (data as any[]) || [];

            // Apply Filters
            if (filterRole !== 'all') {
                filteredData = filteredData.filter(user => user.role === filterRole);
            }

            // Client-side search
            if (searchTerm) {
                const term = searchTerm.toLowerCase();
                filteredData = filteredData.filter(user =>
                    user.email?.toLowerCase().includes(term) ||
                    user.full_name?.toLowerCase().includes(term)
                );
            }

            setUsers(filteredData);
        } catch (error) {
            console.error('Error fetching users:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, [filterRole]);

    const handleSearch = (e: React.FormEvent) => {
        e.preventDefault();
        fetchData(); // In client-side filter simpler to just trigger re-render or useEffect, but here we reuse
    };

    const openEditModal = (user: any) => {
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
            fetchData(); // Refresh list
            setTimeout(() => setIsEditModalOpen(false), 1500);
        } catch (err: any) {
            setModalMessage({ type: 'error', text: err.message });
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
            setModalMessage({ type: 'error', text: err.message });
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
            console.error(err);
            setModalMessage({ type: 'error', text: 'Error deleting user: ' + err.message });
        } finally {
            setActionLoading(false);
        }
    };

    const getPlanName = (planId: string) => {
        return plans.find(p => p.id === planId)?.name || planId;
    };

    return (
        <div className="space-y-6 relative">
            {/* Header */}
            <div className="sm:flex sm:items-center sm:justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="mt-2 text-sm text-gray-700 dark:text-gray-400">
                        View and manage system users, plans, and resource limits.
                    </p>
                </div>
                <div className="mt-4 sm:mt-0 sm:mr-16 sm:flex-none">
                    <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center justify-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:w-auto"
                    >
                        Add User
                    </button>
                </div>
            </div>

            {/* Filters & Search */}
            <div className="flex flex-col sm:flex-row gap-4 bg-white dark:bg-gray-800 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
                <form onSubmit={handleSearch} className="flex-1 relative">
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                        <MagnifyingGlassIcon className="h-5 w-5 text-gray-400" aria-hidden="true" />
                    </div>
                    <input
                        type="text"
                        className="block w-full rounded-md border-gray-300 dark:border-gray-600 pr-10 focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-transparent dark:text-white"
                        placeholder="Search by email or name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </form>
                <div className="flex items-center gap-2">
                    <FunnelIcon className="h-5 w-5 text-gray-400" />
                    <select
                        value={filterRole}
                        onChange={(e) => setFilterRole(e.target.value as any)}
                        className="block rounded-md border-gray-300 dark:border-gray-600 focus:border-brand-500 focus:ring-brand-500 sm:text-sm bg-transparent dark:text-white"
                    >
                        <option value="all">All Roles</option>
                        <option value="user">User</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>

            {/* Table */}
            <div className="flex flex-col">
                <div className="-my-2 -mx-4 overflow-x-auto sm:-mx-6 lg:-mx-8">
                    <div className="inline-block min-w-full py-2 align-middle md:px-6 lg:px-8">
                        <div className="overflow-hidden shadow ring-1 ring-black ring-opacity-5 md:rounded-lg">
                            <table className="min-w-full divide-y divide-gray-300 dark:divide-gray-700">
                                <thead className="bg-gray-50 dark:bg-gray-800">
                                    <tr>
                                        <th scope="col" className="py-3.5 pl-4 pr-3 text-right text-sm font-semibold text-gray-900 dark:text-gray-200 sm:pl-6">Name / Email</th>
                                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Role</th>
                                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Plan</th>
                                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Stats (Prop/Ten/Con)</th>
                                        <th scope="col" className="px-3 py-3.5 text-right text-sm font-semibold text-gray-900 dark:text-gray-200">Status</th>
                                        <th scope="col" className="relative py-3.5 pl-3 pr-4 sm:pr-6"><span className="sr-only">Actions</span></th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-900">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={6} className="py-12 text-center text-sm text-gray-500">
                                                <div className="flex justify-center"><Loader2 className="animate-spin h-6 w-6" /></div>
                                            </td>
                                        </tr>
                                    ) : users.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} className="py-4 text-center text-sm text-gray-500">No users found.</td>
                                        </tr>
                                    ) : (
                                        users.map((user) => (
                                            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors">
                                                <td className="whitespace-nowrap py-4 pl-4 pr-3 text-sm sm:pl-6">
                                                    <div className="flex items-center">
                                                        <div className="h-10 w-10 flex-shrink-0 rounded-full bg-brand-100 flex items-center justify-center text-brand-600 font-bold select-none">
                                                            {user.full_name?.charAt(0) || user.email?.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div className="mr-4">
                                                            <div className="font-medium text-gray-900 dark:text-white">{user.full_name || 'No Name'}</div>
                                                            <div className="text-gray-500 dark:text-gray-400">{user.email}</div>
                                                        </div>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                    <span className={`inline-flex rounded-full px-2 text-xs font-semibold leading-5 ${user.role === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'}`}>
                                                        {user.role}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                    <span className="inline-flex rounded-full bg-blue-100 text-blue-800 px-2 text-xs font-semibold">
                                                        {getPlanName(user.plan_id)}
                                                    </span>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                    <div className="flex flex-col text-xs space-y-1">
                                                        <span className="flex justify-between w-24"><span>Properties:</span> <span className="font-bold">{user.properties_count}</span></span>
                                                        <span className="flex justify-between w-24"><span>Tenants:</span> <span className="font-bold">{user.tenants_count}</span></span>
                                                        <span className="flex justify-between w-24"><span>Contracts:</span> <span className="font-bold">{user.contracts_count}</span></span>
                                                    </div>
                                                </td>
                                                <td className="whitespace-nowrap px-3 py-4 text-sm text-gray-500 dark:text-gray-300">
                                                    {user.subscription_status === 'active' ? (
                                                        <span className="inline-flex rounded-full bg-green-100 px-2 text-xs font-semibold leading-5 text-green-800">Active</span>
                                                    ) : (
                                                        <span className="inline-flex rounded-full bg-red-100 px-2 text-xs font-semibold leading-5 text-red-800">{user.subscription_status || 'Suspended'}</span>
                                                    )}
                                                </td>
                                                <td className="relative whitespace-nowrap py-4 pl-3 pr-4 text-left text-sm font-medium sm:pr-6">
                                                    <button onClick={() => openEditModal(user)} className="text-brand-600 hover:text-brand-900 dark:hover:text-brand-400 ml-4 flex items-center gap-1">
                                                        <PencilSquareIcon className="w-4 h-4" /> Edit
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>

            {/* EDIT MODAL */}
            {isEditModalOpen && selectedUser && (
                <div className="fixed inset-0 z-[100] overflow-y-auto">
                    <div className="flex min-h-full items-center justify-center p-4 text-center sm:p-0">
                        {/* Backdrop */}
                        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setIsEditModalOpen(false)}></div>

                        {/* Modal Panel */}
                        <div className="relative transform overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-4 text-left shadow-xl transition-all sm:my-8 sm:w-full sm:max-w-lg sm:p-6" dir="ltr">
                            <div className="absolute top-0 right-0 hidden pt-4 pr-4 sm:block">
                                <button type="button" className="rounded-md bg-white dark:bg-gray-800 text-gray-400 hover:text-gray-500 focus:outline-none" onClick={() => setIsEditModalOpen(false)}>
                                    <XMarkIcon className="h-6 w-6" aria-hidden="true" />
                                </button>
                            </div>

                            <div className="sm:flex sm:items-start">
                                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left w-full">
                                    <h3 className="text-lg font-medium leading-6 text-gray-900 dark:text-white">
                                        Edit User: {selectedUser.email}
                                    </h3>

                                    {modalMessage && (
                                        <div className={`mt-2 p-2 rounded text-sm ${modalMessage.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                            {modalMessage.text}
                                        </div>
                                    )}

                                    <div className="mt-4 space-y-4">
                                        {/* Status */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Status</label>
                                            <select
                                                value={editStatus}
                                                onChange={(e) => setEditStatus(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="active">Active</option>
                                                <option value="suspended">Suspended</option>
                                            </select>
                                        </div>

                                        {/* Role */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                                            <select
                                                value={editRole}
                                                onChange={(e) => setEditRole(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                            >
                                                <option value="user">User</option>
                                                <option value="admin">Admin</option>
                                            </select>
                                        </div>

                                        {/* Plan */}
                                        <div>
                                            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Subscription Plan</label>
                                            <select
                                                value={editPlan}
                                                onChange={(e) => setEditPlan(e.target.value)}
                                                className="mt-1 block w-full rounded-md border-gray-300 dark:border-gray-600 shadow-sm focus:border-brand-500 focus:ring-brand-500 sm:text-sm dark:bg-gray-700 dark:text-white"
                                            >
                                                {plans.map(p => (
                                                    <option key={p.id} value={p.id}>{p.name} ({p.max_properties} Props, {p.max_tenants} Tenants)</option>
                                                ))}
                                            </select>
                                        </div>

                                        {/* Statistics Display */}
                                        <div className="bg-gray-50 dark:bg-gray-900/50 p-3 rounded-md text-sm border border-gray-200 dark:border-gray-700">
                                            <h4 className="font-semibold text-gray-700 dark:text-gray-300 mb-2">Current Usage</h4>
                                            <div className="grid grid-cols-2 gap-2 text-gray-600 dark:text-gray-400">
                                                <div>Properties: <span className="font-mono text-gray-900 dark:text-white">{selectedUser.properties_count}</span></div>
                                                <div>Tenants: <span className="font-mono text-gray-900 dark:text-white">{selectedUser.tenants_count}</span></div>
                                                <div>Contracts: <span className="font-mono text-gray-900 dark:text-white">{selectedUser.contracts_count}</span></div>
                                            </div>
                                        </div>

                                        {/* Actions */}
                                        <div className="pt-4 border-t border-gray-200 dark:border-gray-700 bg-red-50 dark:bg-red-900/10 p-4 rounded-md">
                                            <h4 className="text-sm font-medium text-red-900 dark:text-red-300 mb-2">Danger Zone</h4>
                                            <div className="space-y-2">
                                                <button
                                                    type="button"
                                                    onClick={handleResetPassword}
                                                    disabled={actionLoading}
                                                    className="inline-flex w-full justify-center rounded-md border border-gray-300 bg-white px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
                                                >
                                                    {actionLoading ? 'Processing...' : 'Send Password Reset Email'}
                                                </button>

                                                <button
                                                    type="button"
                                                    onClick={handleDeleteUser}
                                                    disabled={actionLoading}
                                                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-red-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2 sm:text-sm disabled:opacity-50"
                                                >
                                                    {actionLoading ? 'Deleting...' : 'Delete User & All Data'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                                <button
                                    type="button"
                                    onClick={handleSaveChanges}
                                    disabled={actionLoading}
                                    className="inline-flex w-full justify-center rounded-md border border-transparent bg-brand-600 px-4 py-2 text-base font-medium text-white shadow-sm hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                                >
                                    {actionLoading ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setIsEditModalOpen(false)}
                                    className="mt-3 inline-flex w-full justify-center rounded-md border border-gray-300 bg-white dark:bg-gray-700 dark:text-gray-200 px-4 py-2 text-base font-medium text-gray-700 shadow-sm hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 sm:mt-0 sm:w-auto sm:text-sm"
                                >
                                    Cancel
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
