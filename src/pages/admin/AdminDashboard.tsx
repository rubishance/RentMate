import { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import {
    UsersIcon,
    CurrencyDollarIcon,
    ChatBubbleBottomCenterTextIcon,
    ArrowTrendingUpIcon
} from '@heroicons/react/24/outline';

const AdminDashboard = () => {
    const [stats, setStats] = useState({
        totalUsers: 0,
        activeUsers: 0,
        totalContracts: 0,
        totalRevenue: 0
    });

    useEffect(() => {
        const fetchStats = async () => {
            try {
                // 1. Total Users
                const { count: userCount } = await supabase
                    .from('user_profiles')
                    .select('*', { count: 'exact', head: true });

                // 2. Total Contracts (Replacing CRM Interactions)
                const { count: contractCount } = await supabase
                    .from('contracts')
                    .select('*', { count: 'exact', head: true });

                // 3. Revenue (Sum of paid payments)
                const { data: payments } = await supabase
                    .from('payments')
                    .select('amount, paid_amount') // Fallback to amount if paid_amount is null
                    .eq('status', 'paid');

                const revenue = payments?.reduce((sum, p) => sum + (p.paid_amount || p.amount || 0), 0) || 0;

                setStats({
                    totalUsers: userCount || 0,
                    activeUsers: userCount || 0, // Placeholder logic
                    totalContracts: contractCount || 0,
                    totalRevenue: revenue
                });
            } catch (error) {
                console.error('Error fetching admin stats:', error);
            }
        };

        fetchStats();
    }, []);

    const cards = [
        { name: 'Total Users', value: stats.totalUsers, icon: UsersIcon, change: '+12%', changeType: 'increase' },
        { name: 'Total Contracts', value: stats.totalContracts, icon: ChatBubbleBottomCenterTextIcon, change: '+5%', changeType: 'increase' }, // Icon kept or changed
        { name: 'Revenue', value: `₪${stats.totalRevenue.toLocaleString()}`, icon: CurrencyDollarIcon, change: '+8%', changeType: 'increase' },
        { name: 'Active Users', value: stats.activeUsers, icon: ArrowTrendingUpIcon, change: '+12%', changeType: 'increase' },
    ];

    const [seeding, setSeeding] = useState(false);

    const handleSeedData = async () => {
        if (!confirm('This will populate missing index data from 1999 to 2026. Continue?')) return;
        setSeeding(true);
        try {
            const { seedIndexData } = await import('../../services/index-data.service');
            await seedIndexData();
            alert('Index data populated successfully!');
        } catch (error) {
            console.error(error);
            const msg = error instanceof Error ? error.message : JSON.stringify(error);
            alert('Failed to populate data: ' + msg);
        } finally {
            setSeeding(false);
        }
    };

    return (
        <div className="px-4 pt-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">לוח בקרה ראשי</h1>
                <button
                    onClick={handleSeedData}
                    disabled={seeding}
                    className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium disabled:opacity-50"
                >
                    {seeding ? 'Updating...' : 'Refresh Index Data'}
                </button>
            </div>

            <dl className="mt-5 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
                {cards.map((item) => (
                    <div
                        key={item.name}
                        className="relative overflow-hidden rounded-lg bg-white dark:bg-gray-800 px-4 pt-5 pb-12 shadow sm:px-6 sm:pt-6"
                    >
                        <dt>
                            <div className="absolute rounded-md bg-primary p-3">
                                <item.icon className="h-6 w-6 text-primary-foreground" aria-hidden="true" />
                            </div>
                            <p className="ml-16 truncate text-sm font-medium text-gray-500 dark:text-gray-400">{item.name}</p>
                        </dt>
                        <dd className="ml-16 flex items-baseline pb-1 sm:pb-2">
                            <p className="text-2xl font-semibold text-gray-900 dark:text-white">{item.value}</p>
                            <p className={`ml-2 flex items-baseline text-sm font-semibold ${item.changeType === 'increase' ? 'text-green-600' : 'text-gray-500'
                                }`}>
                                {item.change}
                            </p>
                        </dd>
                    </div>
                ))}
            </dl>

            <div className="mt-8 bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">פעילות אחרונה במערכת</h2>
                <div className="text-gray-500 text-sm">
                    יעודכן בקרוב עם נתונים בזמן אמת...
                </div>
            </div>
        </div>
    );
};

export default AdminDashboard;
