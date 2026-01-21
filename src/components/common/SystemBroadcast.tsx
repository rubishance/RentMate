import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { motion, AnimatePresence } from 'framer-motion';
import {
    InformationCircleIcon,
    ExclamationTriangleIcon,
    XMarkIcon,
    CheckCircleIcon,
    ExclamationCircleIcon,
    ArrowRightIcon
} from '@heroicons/react/24/outline';
import { cn } from '../../lib/utils';
import { useNavigate } from 'react-router-dom';

export function SystemBroadcast() {
    const [broadcasts, setBroadcasts] = useState<any[]>([]);
    const [visible, setVisible] = useState(true);
    const navigate = useNavigate();

    useEffect(() => {
        fetchBroadcasts();

        // Subscribe to changes
        const channel = supabase
            .channel('system_broadcasts_realtime')
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'system_broadcasts'
            }, () => {
                fetchBroadcasts();
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchBroadcasts = async () => {
        const { data, error } = await supabase
            .from('system_broadcasts')
            .select('*')
            .eq('is_active', true)
            .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
            .order('created_at', { ascending: false });

        if (!error && data) {
            setBroadcasts(data);
        }
    };

    if (broadcasts.length === 0 || !visible) return null;

    const current = broadcasts[0]; // Display the latest one

    const icons = {
        info: <InformationCircleIcon className="w-5 h-5 text-blue-500" />,
        warning: <ExclamationTriangleIcon className="w-5 h-5 text-amber-500" />,
        error: <ExclamationCircleIcon className="w-5 h-5 text-red-500" />,
        success: <CheckCircleIcon className="w-5 h-5 text-emerald-500" />
    };

    const colors = {
        info: "bg-blue-50/90 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-900 dark:text-blue-100",
        warning: "bg-amber-50/90 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800 text-amber-900 dark:text-amber-100",
        error: "bg-red-50/90 dark:bg-red-900/20 border-red-100 dark:border-red-800 text-red-900 dark:text-red-100",
        success: "bg-emerald-50/90 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-900 dark:text-emerald-100"
    };

    return (
        <AnimatePresence>
            <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className={cn(
                    "relative w-full border-b backdrop-blur-md z-[60] overflow-hidden",
                    colors[current.type as keyof typeof colors]
                )}
            >
                <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        {icons[current.type as keyof typeof icons]}
                        <p className="text-sm font-bold tracking-tight">
                            {current.message}
                        </p>
                    </div>

                    <div className="flex items-center gap-3">
                        {current.target_link && (
                            <button
                                onClick={() => navigate(current.target_link)}
                                className="flex items-center gap-1.5 text-xs font-black uppercase tracking-widest hover:underline"
                            >
                                Learn More
                                <ArrowRightIcon className="w-3.5 h-3.5" />
                            </button>
                        )}
                        <button
                            onClick={() => setVisible(false)}
                            className="p-1 hover:bg-black/5 dark:hover:bg-white/5 rounded-lg transition-colors"
                        >
                            <XMarkIcon className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
}
