import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    Squares2X2Icon,
    UsersIcon,
    DocumentTextIcon,
    ClipboardDocumentListIcon,
    Bars3Icon,
    XMarkIcon,
    BellIcon,
    TagIcon,
    Cog6ToothIcon,
    ChatBubbleLeftRightIcon,
    CircleStackIcon,
    ChatBubbleBottomCenterTextIcon,
    MegaphoneIcon
} from '@heroicons/react/24/outline';

import { supabase } from '../../lib/supabase';

// IMPORTANT: Requires AuthContext to expose user info
const AdminLayout = () => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data: { user: authUser } } = await supabase.auth.getUser();
            if (authUser) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('*')
                    .eq('id', authUser.id)
                    .single();
                setUser(profile || authUser);
            }
        };
        getUser();
    }, []);

    const navigation = [
        // Owner only
        ...(user?.is_super_admin ? [
            { name: 'Owner Control', href: '/admin/owner', icon: Squares2X2Icon },
            { name: 'Broadcasts', href: '/admin/broadcasts', icon: MegaphoneIcon }
        ] : []),

        { name: 'Dashboard', href: '/admin', icon: Squares2X2Icon },
        { name: 'Notifications', href: '/admin/notifications', icon: BellIcon },
        { name: 'Feedback', href: '/admin/feedback', icon: ChatBubbleLeftRightIcon },
        { name: 'Users & CRM', href: '/admin/users', icon: UsersIcon },
        { name: 'Storage', href: '/admin/storage', icon: CircleStackIcon },
        { name: 'Plans', href: '/admin/plans', icon: TagIcon },
        { name: 'Invoices', href: '/admin/invoices', icon: DocumentTextIcon },
        { name: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardDocumentListIcon },
        { name: 'AI Usage', href: '/admin/ai-usage', icon: ChatBubbleBottomCenterTextIcon },
        { name: 'System Settings', href: '/admin/settings', icon: Cog6ToothIcon },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 font-['Heebo']" dir="rtl">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-brand-navy dark:bg-brand-navy-dark transform transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} border-l border-white/10`}>
                <div className="flex h-16 items-center justify-between px-6 bg-brand-navy-dark border-b border-white/10">
                    <h1 className="text-xl font-bold text-white tracking-tight">RentMate Admin</h1>
                    <button
                        className="text-white md:hidden hover:bg-white/10 p-1 rounded-lg"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 border-b border-white/5">
                    <p className="text-[10px] uppercase tracking-wider font-bold text-gray-400">ADMINISTRATOR</p>
                    <p className="font-semibold text-white truncate mt-1">{user?.email}</p>
                </div>

                <nav className="flex-1 space-y-1 px-3 py-6 h-[calc(100vh-180px)] overflow-y-auto hide-scrollbar">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`${isActive
                                    ? 'bg-brand-500 text-white shadow-lg shadow-brand-500/20'
                                    : 'text-gray-300 hover:bg-white/5 hover:text-white'
                                    } group flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200`}
                            >
                                <item.icon
                                    className={`${isActive ? 'text-white' : 'text-gray-400 group-hover:text-blue-300'
                                        } ml-3 h-5 w-5 flex-shrink-0 transition-colors`}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
                <div className="absolute bottom-0 w-full p-4 border-t border-white/5 bg-brand-navy/50 backdrop-blur-xl">
                    <Link
                        to="/dashboard"
                        className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold text-gray-400 hover:text-white rounded-xl hover:bg-white/5 transition-all group"
                    >
                        <span className="ml-2 font-mono">←</span>
                        Back to App
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col md:pr-64 min-h-screen transition-all duration-300">
                <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white dark:bg-gray-800 shadow-sm border-b dark:border-gray-700 md:hidden">
                    <button
                        type="button"
                        className="px-4 text-gray-500 hover:text-brand-600 focus:outline-none md:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <div className="flex items-center justify-center flex-1">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">Admin Console</h1>
                    </div>
                </div>

                <main className="flex-1 p-6">
                    <Outlet />
                </main>
            </div>
        </div>
    );
};

export default AdminLayout;
