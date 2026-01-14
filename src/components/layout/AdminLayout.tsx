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
    TagIcon
} from '@heroicons/react/24/outline';
import { supabase } from '../../lib/supabase';

// IMPORTANT: Requires AuthContext to expose user info
const AdminLayout = () => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [user, setUser] = useState<any>(null);

    useEffect(() => {
        const getUser = async () => {
            const { data } = await supabase.auth.getUser();
            setUser(data.user);
        };
        getUser();
    }, []);

    const navigation = [
        { name: 'Dashboard', href: '/admin', icon: Squares2X2Icon },
        { name: 'Notifications', href: '/admin/notifications', icon: BellIcon },
        { name: 'Users & CRM', href: '/admin/users', icon: UsersIcon },
        { name: 'Plans', href: '/admin/plans', icon: TagIcon },
        { name: 'Invoices', href: '/admin/invoices', icon: DocumentTextIcon },
        { name: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardDocumentListIcon },
    ];

    return (
        <div className="min-h-screen bg-gray-100 dark:bg-gray-900 font-['Heebo']" dir="rtl">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-white dark:bg-gray-800 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} border-l border-gray-200 dark:border-gray-700`}>
                <div className="flex h-16 items-center justify-between px-4 bg-brand-600">
                    <h1 className="text-xl font-bold text-white">RentMate Admin</h1>
                    <button
                        className="text-white md:hidden"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <p className="text-sm text-gray-500 dark:text-gray-400">ברוך הבא,</p>
                    <p className="font-medium text-gray-900 dark:text-white truncate">{user?.email}</p>
                </div>

                <nav className="flex-1 space-y-1 px-2 py-4">
                    {navigation.map((item) => {
                        const isActive = location.pathname === item.href;
                        return (
                            <Link
                                key={item.name}
                                to={item.href}
                                onClick={() => setSidebarOpen(false)}
                                className={`${isActive
                                    ? 'bg-brand-50 dark:bg-brand-900/20 text-brand-600 dark:text-brand-400'
                                    : 'text-gray-600 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                                    } group flex items-center rounded-md px-2 py-2 text-base font-medium transition-colors`}
                            >
                                <item.icon
                                    className={`${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 group-hover:text-gray-500'
                                        } ml-3 h-5 w-5 flex-shrink-0`}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <Link
                        to="/properties"
                        className="flex items-center w-full px-2 py-2 text-sm font-medium text-gray-600 dark:text-gray-300 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors group"
                    >
                        <span className="mr-3">←</span>
                        Back to App
                    </Link>
                </div>
            </div>

            {/* Main Content */}
            <div className="flex flex-col md:pr-64 min-h-screen transition-all duration-300">
                <div className="sticky top-0 z-10 flex h-16 flex-shrink-0 bg-white dark:bg-gray-800 shadow md:hidden">
                    <button
                        type="button"
                        className="px-4 text-gray-500 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-brand-500 md:hidden"
                        onClick={() => setSidebarOpen(true)}
                    >
                        <span className="sr-only">Open sidebar</span>
                        <Bars3Icon className="h-6 w-6" aria-hidden="true" />
                    </button>
                    <div className="flex items-center justify-center flex-1">
                        <h1 className="text-lg font-bold text-gray-900 dark:text-white">לוח בקרה</h1>
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
