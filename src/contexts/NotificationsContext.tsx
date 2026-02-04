import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';


export interface Notification {
    id: string;
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
    read_at: string | null;
    created_at: string;
    action_url?: string; // Optional link
}

interface NotificationsContextType {
    notifications: Notification[];
    unreadCount: number;
    loading: boolean;
    markAsRead: (id: string) => Promise<void>;
    markAllAsRead: () => Promise<void>;
    requestPermission: () => Promise<void>;
    permission: NotificationPermission;
}

const NotificationsContext = createContext<NotificationsContextType | undefined>(undefined);

export function NotificationsProvider({ children }: { children: React.ReactNode }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [permission, setPermission] = useState<NotificationPermission>('default');

    useEffect(() => {
        // Check current permission status
        if ('Notification' in window) {
            setPermission(Notification.permission);
        }
    }, []);

    useEffect(() => {
        fetchNotifications();

        // Realtime Subscription
        const channel = supabase
            .channel('public:notifications')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'notifications'
                },
                () => {
                    // Refetch notifications on insert - RLS will handle the user scoping
                    fetchNotifications();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchNotifications = async () => {
        try {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const { data, error } = await supabase
                .from('notifications')
                .select('*')
                .order('created_at', { ascending: false })
                .limit(50);

            if (!error && data) {
                // Filter out automated notifications as requested (reminders and receipts)
                const filtered = data.filter((n: any) => {
                    const event = n.metadata?.event;
                    return (
                        event !== 'payment_warning' &&
                        event !== 'payment_due' &&
                        event !== 'payment_receipt' &&
                        event !== 'rent_reminder'
                    );
                });
                setNotifications(filtered);
            }
        } catch (err) {
            console.error('Error fetching notifications:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleNewNotification = async (newNote: Notification) => {
        const { data: { user } } = await supabase.auth.getUser();
        // Since the filter in channel subscription might be tricky with async user ID, verify here
        // Or if using RLS properly, we might receive changes. 
        // Best approach: Just modify local state if it matches user (though we might not know user_id in payload if RLS hides it)
        // Simplest: Refetch list.
        await fetchNotifications();

        // Browser Notification
        if (Notification.permission === 'granted') {
            new window.Notification(newNote.title, {
                body: newNote.message,
                icon: '/pwa-192x192.png' // Ensure this path exists or use logo
            });
        }
    };

    const markAsRead = async (id: string) => {
        // Optimistic update
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, read_at: new Date().toISOString() } : n));

        await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .eq('id', id);
    };

    const markAllAsRead = async () => {
        const unreadIds = notifications.filter(n => !n.read_at).map(n => n.id);
        if (unreadIds.length === 0) return;

        // Optimistic
        setNotifications(prev => prev.map(n => ({ ...n, read_at: new Date().toISOString() })));

        await supabase
            .from('notifications')
            .update({ read_at: new Date().toISOString() })
            .in('id', unreadIds);
    };

    const requestPermission = async () => {
        if (!('Notification' in window)) {
            alert("This browser does not support desktop notifications");
            return;
        }
        const result = await Notification.requestPermission();
        setPermission(result);
    };

    const unreadCount = notifications.filter(n => !n.read_at).length;

    return (
        <NotificationsContext.Provider value={{
            notifications,
            unreadCount,
            loading,
            markAsRead,
            markAllAsRead,
            requestPermission,
            permission
        }}>
            {children}
        </NotificationsContext.Provider>
    );
}

export function useNotifications() {
    const context = useContext(NotificationsContext);
    if (context === undefined) {
        throw new Error('useNotifications must be used within a NotificationsProvider');
    }
    return context;
}
