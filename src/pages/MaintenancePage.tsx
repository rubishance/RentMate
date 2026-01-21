import { motion } from 'framer-motion';
import { WrenchScrewdriverIcon, ShieldCheckIcon } from '@heroicons/react/24/outline';
import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';

export default function MaintenancePage() {
    const [message, setMessage] = useState('RentMate is currently undergoing scheduled maintenance. We will be back shortly.');

    useEffect(() => {
        const fetchMessage = async () => {
            const { data } = await supabase
                .from('system_settings')
                .select('value')
                .eq('key', 'maintenance_message')
                .single();
            if (data?.value) setMessage(data.value);
        };
        fetchMessage();
    }, []);

    return (
        <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center p-6 text-center">
            <div className="max-w-md w-full space-y-8">
                <motion.div
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="flex justify-center"
                >
                    <div className="relative">
                        <WrenchScrewdriverIcon className="w-24 h-24 text-brand-600 animate-pulse" />
                        <div className="absolute -top-2 -right-2 bg-emerald-500 rounded-full p-1.5 border-4 border-white dark:border-[#0a0a0a]">
                            <ShieldCheckIcon className="w-6 h-6 text-white" />
                        </div>
                    </div>
                </motion.div>

                <div className="space-y-4">
                    <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tighter uppercase">
                        Scheduled <span className="text-brand-600">Maintenance</span>
                    </h1>
                    <p className="text-gray-500 dark:text-gray-400 font-medium leading-relaxed">
                        {message}
                    </p>
                </div>

                <div className="pt-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-neutral-800 rounded-full">
                        <div className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></div>
                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-500">
                            Our team is working on it
                        </span>
                    </div>
                </div>

                <div className="mt-12 text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                    &copy; {new Date().getFullYear()} RentMate Infrastructure
                </div>
            </div>
        </div>
    );
}
