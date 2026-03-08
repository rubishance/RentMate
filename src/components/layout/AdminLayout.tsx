import { useState, useEffect } from 'react';
import { useScrollLock } from '../../hooks/useScrollLock';
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
    MegaphoneIcon,
    ChartBarIcon,
    CpuChipIcon,
    ExclamationTriangleIcon
} from '@heroicons/react/24/outline';

import { supabase } from '../../lib/supabase';

// IMPORTANT: Requires AuthContext to expose user info
const AdminLayout = () => {
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    useScrollLock(sidebarOpen);
    const [user, setUser] = useState<any>(null);
    const [notification, setNotification] = useState<{ userId: string; userName: string } | null>(null);

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

        const channel = supabase
            .channel('admin_global_notifications')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'human_conversations', filter: 'status=eq.active' },
                async (payload) => {
                    // Fetch user name
                    const { data: userData } = await supabase
                        .from('user_profiles')
                        .select('full_name, email')
                        .eq('id', payload.new.user_id)
                        .single();

                    const userName = userData?.full_name || userData?.email || 'Unknown User';

                    // Play sound (optional)
                    try {
                        const audio = new Audio('/notification.mp3'); // Ensure this file exists or fail silently
                        audio.play().catch(() => { });
                    } catch {
                        // Audio file might not exist, ignore error
                    }

                    setNotification({
                        userId: payload.new.user_id,
                        userName: userName
                    });

                    // Auto-dismiss after 10 seconds
                    setTimeout(() => {
                        setNotification(null);
                    }, 10000);
                }
            )
            .subscribe();

        // Hide UserWay accessibility widget in Admin Console
        const style = document.createElement('style');
        style.id = 'hide-userway-admin';
        style.innerHTML = `
            div[class*="userway"], 
            div[id*="userway"],
            div[class*="uwy"],
            div[id*="uwy"],
            iframe[title*="accessibility"] {
                display: none !important;
                visibility: hidden !important;
                opacity: 0 !important;
                pointer-events: none !important;
            }
        `;
        document.head.appendChild(style);

        return () => {
            supabase.removeChannel(channel);
            // Re-enable UserWay when leaving Admin Console
            const hideStyle = document.getElementById('hide-userway-admin');
            if (hideStyle) hideStyle.remove();
        };
    }, []);

    const navigation = [
        // Owner only
        ...(user?.is_super_admin ? [
            { name: 'Owner Control', href: '/admin/owner', icon: Squares2X2Icon },
            // { name: 'Broadcasts', href: '/admin/broadcasts', icon: MegaphoneIcon }
        ] : []),

        { name: 'Dashboard', href: '/admin', icon: Squares2X2Icon },
        { name: 'Waitlist', href: '/admin/waitlist', icon: UsersIcon },
        { name: 'WhatsApp Support', href: '/admin/chat', icon: ChatBubbleLeftRightIcon },
        { name: 'Notifications', href: '/admin/notifications', icon: BellIcon },
        { name: 'Feedback', href: '/admin/feedback', icon: ChatBubbleLeftRightIcon },
        { name: 'Users & CRM', href: '/admin/users', icon: UsersIcon },
        { name: 'Support Tickets', href: '/admin/tickets', icon: ClipboardDocumentListIcon },
        { name: 'Storage', href: '/admin/storage', icon: CircleStackIcon },
        { name: 'Plans', href: '/admin/plans', icon: TagIcon },
        { name: 'Invoices', href: '/admin/invoices', icon: DocumentTextIcon },
        { name: 'Audit Logs', href: '/admin/audit-logs', icon: ClipboardDocumentListIcon },
        { name: 'Error Logs', href: '/admin/errors', icon: ExclamationTriangleIcon },
        { name: 'Usage Analytics', href: '/admin/usage', icon: ChartBarIcon },
        { name: 'AI Usage', href: '/admin/ai-usage', icon: ChatBubbleBottomCenterTextIcon },
        { name: 'Automation Rules', href: '/admin/automation', icon: CpuChipIcon },
        { name: 'System Settings', href: '/admin/settings', icon: Cog6ToothIcon },
    ];

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 text-foreground font-['Heebo']" dir="rtl">
            {/* Mobile sidebar backdrop */}
            {sidebarOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden"
                    onClick={() => setSidebarOpen(false)}
                />
            )}

            {/* Sidebar */}
            <div className={`fixed inset-y-0 right-0 z-50 w-64 bg-white dark:bg-gray-900 transform transition-transform duration-300 ease-in-out md:translate-x-0 ${sidebarOpen ? 'translate-x-0' : 'translate-x-full md:translate-x-0'} border-l border-gray-200 dark:border-gray-800`}>
                <div className="flex h-16 items-center justify-between px-6 bg-gray-50 dark:bg-gray-950 border-b border-gray-200 dark:border-gray-800">
                    <h1 className="text-xl font-bold text-gray-900 dark:text-white tracking-tight">RentMate Admin</h1>
                    <button
                        className="text-gray-500 dark:text-gray-400 md:hidden hover:bg-gray-100 dark:hover:bg-gray-800 p-1 rounded-lg"
                        onClick={() => setSidebarOpen(false)}
                    >
                        <XMarkIcon className="h-6 w-6" />
                    </button>
                </div>

                <div className="p-6 border-b border-gray-100 dark:border-gray-800">
                    <p className="text-xs uppercase tracking-wider font-bold text-gray-500 dark:text-gray-400">ADMINISTRATOR</p>
                    <p className="font-semibold text-gray-900 dark:text-white truncate mt-1">{user?.email}</p>
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
                                    ? 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300'
                                    : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-900 dark:hover:text-white'
                                    } group flex items-center rounded-xl px-3 py-2.5 text-sm font-semibold transition-all duration-200`}
                            >
                                <item.icon
                                    className={`${isActive ? 'text-brand-600 dark:text-brand-400' : 'text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300'
                                        } ml-3 h-5 w-5 flex-shrink-0 transition-colors`}
                                    aria-hidden="true"
                                />
                                {item.name}
                            </Link>
                        );
                    })}
                </nav>
                <div className="absolute bottom-0 w-full p-4 border-t border-gray-100 dark:border-gray-800 bg-white/80 dark:bg-gray-900/80 backdrop-blur-xl">
                    <Link
                        to="/dashboard"
                        className="flex items-center justify-center w-full px-4 py-2.5 text-sm font-bold text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white rounded-xl hover:bg-gray-50 dark:hover:bg-gray-800 transition-all group"
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

            {/* Global Chat Notification Toast */}
            {notification && (
                <div className="fixed bottom-6 right-6 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
                    <div className="bg-white dark:bg-gray-800 border-l-4 border-brand-600 shadow-2xl rounded-r-xl p-4 max-w-sm flex items-start gap-4">
                        <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-full shrink-0">
                            <ChatBubbleLeftRightIcon className="w-6 h-6 text-brand-600" />
                        </div>
                        <div className="flex-1">
                            <h4 className="font-black text-gray-900 dark:text-white uppercase tracking-tight text-sm">New Live Chat Request</h4>
                            <p className="text-xs text-gray-500 mt-1 mb-2">
                                <strong>{notification.userName}</strong> wants to speak with a human.
                            </p>
                            <div className="flex gap-2">
                                <Link
                                    to={`/admin/client/${notification.userId}`}
                                    onClick={() => setNotification(null)}
                                    className="bg-brand-600 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-brand-700 transition-colors uppercase tracking-wider"
                                >
                                    Open Chat
                                </Link>
                                <button
                                    onClick={() => setNotification(null)}
                                    className="text-gray-400 hover:text-gray-600 text-xs font-bold px-3 py-1.5 uppercase tracking-wider"
                                >
                                    Dismiss
                                </button>
                            </div>
                        </div>
                        <button onClick={() => setNotification(null)} className="text-gray-400 hover:text-gray-600">
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AdminLayout;
