
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { crmService } from '../../services/crm.service';
import { supabase } from '../../lib/supabase';
import { MessageCircle, Clock, User, ArrowRight } from 'lucide-react';

export function ActiveChatsWidget() {
    const navigate = useNavigate();
    const [chats, setChats] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchChats();

        // Real-time subscription for NEW conversations or STATUS changes
        const channel = supabase
            .channel('dashboard_chats')
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'human_conversations' },
                () => {
                    fetchChats();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    const fetchChats = async () => {
        try {
            const data = await crmService.getAllActiveHumanChats();
            setChats(data || []);
        } catch (err) {
            console.error('Failed to load active chats', err);
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="animate-pulse h-48 bg-gray-100 rounded-2xl"></div>;

    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 border border-gray-100 dark:border-gray-700 shadow-sm h-full flex flex-col">
            <div className="flex justify-between items-center mb-4">
                <div className="flex items-center gap-2">
                    <div className="p-2 bg-brand-100 dark:bg-brand-900/30 rounded-lg">
                        <MessageCircle className="w-5 h-5 text-brand-600 dark:text-brand-400" />
                    </div>
                    <h3 className="font-black text-gray-900 dark:text-white uppercase tracking-tight">Active Support Chats</h3>
                </div>
                <span className="bg-brand-600 text-white text-xs font-bold px-2 py-1 rounded-md">
                    {chats.length}
                </span>
            </div>

            <div className="flex-1 overflow-y-auto space-y-3 pr-2 scrollbar-thin">
                {chats.length === 0 ? (
                    <div className="text-center py-10 text-gray-400">
                        <p className="text-sm font-medium">No active chats right now.</p>
                        <p className="text-xs">Great job cleaning the queue! 🎉</p>
                    </div>
                ) : (
                    chats.map(chat => (
                        <div key={chat.id} className="group p-3 bg-gray-50 dark:bg-gray-900/50 rounded-xl border border-gray-100 dark:border-gray-800 hover:border-brand-300 transition-all">
                            <div className="flex justify-between items-start mb-2">
                                <div className="flex items-center gap-2">
                                    <User className="w-3 h-3 text-gray-400" />
                                    <span className="text-sm font-bold text-gray-900 dark:text-white">
                                        {chat.user?.full_name || 'Anonymous User'}
                                    </span>
                                </div>
                                <span className="text-[10px] bg-white dark:bg-gray-800 px-2 py-0.5 rounded border border-gray-200 dark:border-gray-700 text-gray-500 flex items-center gap-1">
                                    <Clock className="w-3 h-3" />
                                    {new Date(chat.last_message_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                            </div>
                            <button
                                onClick={() => navigate(`/admin/client/${chat.user_id}`)}
                                className="w-full mt-2 flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-brand-600 hover:text-brand-700 bg-white dark:bg-gray-800 py-2 rounded-lg border border-transparent hover:border-brand-200 transition-all"
                            >
                                Open Chat <ArrowRight className="w-3 h-3" />
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}
