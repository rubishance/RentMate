import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    MegaphoneIcon,
    PlusIcon,
    TrashIcon,
    CheckCircleIcon,
    PencilSquareIcon,
    LinkIcon
} from '@heroicons/react/24/outline';
import { Loader2 } from 'lucide-react';
import { cn } from '../../lib/utils';

interface Broadcast {
    id: string;
    message: string;
    type: 'info' | 'warning' | 'error' | 'success';
    is_active: boolean;
    expires_at: string | null;
    target_link: string | null;
    created_at: string;
}

export default function BroadcastManager() {
    const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [isEditing, setIsEditing] = useState(false);
    const [form, setForm] = useState<Partial<Broadcast>>({
        message: '',
        type: 'info',
        is_active: true,
        expires_at: '',
        target_link: ''
    });

    useEffect(() => {
        fetchBroadcasts();
    }, []);

    const fetchBroadcasts = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('system_broadcasts')
            .select('*')
            .order('created_at', { ascending: false });

        if (!error && data) setBroadcasts(data);
        setLoading(false);
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            const dataToSave = {
                ...form,
                expires_at: form.expires_at || null
            };

            if (form.id) {
                const { error } = await supabase
                    .from('system_broadcasts')
                    .update(dataToSave)
                    .eq('id', form.id);
                if (error) throw error;
            } else {
                const { error } = await supabase
                    .from('system_broadcasts')
                    .insert([dataToSave]);
                if (error) throw error;
            }

            setIsEditing(false);
            setForm({ message: '', type: 'info', is_active: true, expires_at: '', target_link: '' });
            fetchBroadcasts();
        } catch (err: unknown) {
            alert('Failed to save: ' + (err instanceof Error ? err.message : 'Unknown error'));
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm('Delete this broadcast?')) return;
        const { error } = await supabase.from('system_broadcasts').delete().eq('id', id);
        if (!error) fetchBroadcasts();
    };

    const handleEdit = (b: Broadcast) => {
        setForm({
            ...b,
            expires_at: b.expires_at ? new Date(b.expires_at).toISOString().slice(0, 16) : ''
        });
        setIsEditing(true);
    };

    if (loading) return <div className="flex h-96 items-center justify-center"><Loader2 className="w-10 h-10 animate-spin text-brand-600" /></div>;

    return (
        <div className="space-y-8 pb-20">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <MegaphoneIcon className="w-8 h-8 text-brand-600" />
                        Broadcast Manager
                    </h1>
                    <p className="text-sm font-medium text-gray-500 dark:text-gray-400 mt-1">
                        Compose and schedule system-wide announcements for all users.
                    </p>
                </div>
                <button
                    onClick={() => { setForm({ message: '', type: 'info', is_active: true, expires_at: '', target_link: '' }); setIsEditing(true); }}
                    className="flex items-center gap-2 px-6 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-600/20"
                >
                    <PlusIcon className="w-5 h-5" />
                    New Announcement
                </button>
            </div>

            {isEditing && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border-2 border-brand-500 p-8 shadow-2xl space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Message</label>
                            <textarea
                                value={form.message || ''}
                                onChange={e => setForm({ ...form, message: e.target.value })}
                                rows={2}
                                className="w-full p-4 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none focus:ring-2 focus:ring-brand-500/20"
                                placeholder="Enter announcement text..."
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Type</label>
                            <select
                                value={form.type}
                                onChange={e => setForm({ ...form, type: e.target.value as Broadcast['type'] })}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none"
                            >
                                <option value="info">Information (Blue)</option>
                                <option value="warning">Warning (Amber)</option>
                                <option value="error">Critical (Red)</option>
                                <option value="success">Success (Green)</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Expiry Date (Optional)</label>
                            <input
                                type="datetime-local"
                                value={form.expires_at || ''}
                                onChange={e => setForm({ ...form, expires_at: e.target.value })}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none"
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-xs font-black text-gray-400 uppercase tracking-widest mb-2">Target Link (Optional)</label>
                            <input
                                type="text"
                                value={form.target_link || ''}
                                onChange={e => setForm({ ...form, target_link: e.target.value })}
                                className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-700 rounded-xl font-bold text-gray-900 dark:text-white outline-none"
                                placeholder="/dashboard, /pricing, etc."
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button onClick={() => setIsEditing(false)} className="px-6 py-2.5 text-xs font-black uppercase text-gray-400 hover:text-gray-900 transition-all">Cancel</button>
                        <button
                            onClick={handleSave}
                            disabled={saving}
                            className="px-8 py-2.5 bg-emerald-600 text-white rounded-xl font-black uppercase tracking-widest hover:bg-emerald-700 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center gap-2"
                        >
                            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircleIcon className="w-4 h-4" />}
                            Publish Announcement
                        </button>
                    </div>
                </div>
            )}

            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                <table className="w-full text-left">
                    <thead>
                        <tr className="bg-gray-50 dark:bg-gray-900/30">
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Status</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Announcement</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Expiry</th>
                            <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                        {broadcasts.length === 0 ? (
                            <tr><td colSpan={4} className="px-6 py-20 text-center font-bold text-gray-400 uppercase tracking-widest">No announcements history</td></tr>
                        ) : (
                            broadcasts.map(b => (
                                <tr key={b.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                    <td className="px-6 py-5">
                                        <span className={cn(
                                            "px-2 py-0.5 rounded text-[9px] font-black uppercase tracking-widest",
                                            b.is_active ? "bg-emerald-100 text-emerald-700" : "bg-gray-100 text-gray-400"
                                        )}>
                                            {b.is_active ? 'Active' : 'Archived'}
                                        </span>
                                    </td>
                                    <td className="px-6 py-5">
                                        <div className="flex items-center gap-3">
                                            <div className={cn(
                                                "w-2 h-2 rounded-full",
                                                b.type === 'info' ? "bg-blue-500" :
                                                    b.type === 'warning' ? "bg-amber-500" :
                                                        b.type === 'error' ? "bg-red-500" : "bg-emerald-500"
                                            )}></div>
                                            <div className="text-sm font-bold text-gray-900 dark:text-white">{b.message}</div>
                                        </div>
                                        {b.target_link && (
                                            <div className="mt-1 flex items-center gap-1 text-[10px] font-bold text-brand-600 uppercase">
                                                <LinkIcon className="w-3 h-3" />
                                                {b.target_link}
                                            </div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-center">
                                        {b.expires_at ? (
                                            <div className="flex flex-col items-center">
                                                <div className="text-xs font-black text-gray-900 dark:text-white">
                                                    {new Date(b.expires_at).toLocaleDateString('he-IL')}
                                                </div>
                                                <div className="text-[10px] font-bold text-gray-400">
                                                    {new Date(b.expires_at).toLocaleTimeString('he-IL', { hour: '2-digit', minute: '2-digit' })}
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="text-[10px] font-black text-gray-300 uppercase">Perpetual</div>
                                        )}
                                    </td>
                                    <td className="px-6 py-5 text-right">
                                        <div className="flex justify-end gap-2">
                                            <button onClick={() => handleEdit(b)} className="p-2 text-gray-400 hover:text-brand-600 hover:bg-brand-50 dark:hover:bg-brand-900/20 rounded-lg transition-all"><PencilSquareIcon className="w-5 h-5" /></button>
                                            <button onClick={() => handleDelete(b.id)} className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-all"><TrashIcon className="w-5 h-5" /></button>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
