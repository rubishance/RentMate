import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { WaitlistEntry } from '../../types/database';
import {
    Users,
    Download,
    Trash2,
    Loader2,
    Search,
    Mail,
    Phone,
    Clock
} from 'lucide-react';
import { Button } from '../../components/ui/Button';

export default function AdminWaitlist() {
    const [entries, setEntries] = useState<WaitlistEntry[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [isDeleting, setIsDeleting] = useState<string | null>(null);

    useEffect(() => {
        fetchWaitlist();
    }, []);

    const fetchWaitlist = async () => {
        try {
            setLoading(true);
            const { data, error } = await supabase
                .from('waitlist')
                .select('*')
                .order('created_at', { ascending: false });

            if (error) throw error;
            setEntries(data || []);
        } catch (error) {
            console.error('Error fetching waitlist:', error);
            alert('Failed to load waitlist data.');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (id: string, name: string) => {
        if (!window.confirm(`Are you sure you want to remove ${name} from the waitlist?`)) return;

        try {
            setIsDeleting(id);
            const { error } = await supabase
                .from('waitlist')
                .delete()
                .eq('id', id);

            if (error) throw error;
            setEntries(entries.filter(e => e.id !== id));
        } catch (error) {
            console.error('Error deleting entry:', error);
            alert('Failed to delete entry.');
        } finally {
            setIsDeleting(null);
        }
    };

    const exportToCSV = () => {
        if (entries.length === 0) return;

        const headers = ['Name', 'Email', 'Phone', 'Signup Date'];
        const csvContent = [
            headers.join(','),
            ...entries.map(e => [
                `"${e.full_name.replace(/"/g, '""')}"`,
                `"${e.email}"`,
                `"${e.phone || ''}"`,
                `"${new Date(e.created_at).toLocaleString()}"`
            ].join(','))
        ].join('\n');

        const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' }); // BOM for Excel Hebrew support
        const link = document.createElement('a');
        const url = URL.createObjectURL(blob);

        link.setAttribute('href', url);
        link.setAttribute('download', `rentmate-waitlist-${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const filteredEntries = entries.filter(entry =>
        entry.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (entry.phone || '').includes(searchQuery)
    );

    if (loading) {
        return (
            <div className="flex items-center justify-center h-96">
                <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6 max-w-7xl mx-auto" dir="ltr">
            {/* Header & Stats */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
                <div className="flex items-center gap-4">
                    <div className="bg-brand-100 dark:bg-brand-900/30 p-3 rounded-xl border border-brand-200 dark:border-brand-800/50">
                        <Users className="w-6 h-6 text-brand-600 dark:text-brand-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900 dark:text-white leading-tight">Waitlist Users</h1>
                        <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{entries.length} Total Signups</p>
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row w-full md:w-auto gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search names or emails..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full sm:w-64 pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-sm focus:ring-2 focus:ring-brand-500 transition-shadow"
                        />
                    </div>
                    <Button
                        onClick={exportToCSV}
                        variant="outline"
                        className="flex items-center gap-2 rounded-xl whitespace-nowrap"
                        disabled={entries.length === 0}
                    >
                        <Download className="w-4 h-4" /> Export CSV
                    </Button>
                </div>
            </div>

            {/* Data Table */}
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                        <thead>
                            <tr className="bg-gray-50/50 dark:bg-gray-900/50 border-b border-gray-100 dark:border-gray-700">
                                <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">User Name</th>
                                <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap">Contact Info</th>
                                <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap hidden md:table-cell">Signup Date</th>
                                <th className="py-4 px-6 text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-widest whitespace-nowrap text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                            {filteredEntries.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="py-12 text-center text-gray-500">
                                        {searchQuery ? 'No users match your search.' : 'The waitlist is currently empty.'}
                                    </td>
                                </tr>
                            ) : (
                                filteredEntries.map((entry) => (
                                    <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        {/* Name */}
                                        <td className="py-4 px-6 align-top">
                                            <div className="flex items-center gap-3">
                                                <div className="flex-shrink-0 w-10 h-10 rounded-full bg-brand-50 border border-brand-100 dark:bg-brand-900/30 dark:border-brand-800 flex items-center justify-center text-brand-600 font-bold uppercase">
                                                    {entry.full_name.charAt(0)}
                                                </div>
                                                <div className="font-semibold text-gray-900 dark:text-white capitalize truncate max-w-[150px] md:max-w-xs">
                                                    {entry.full_name}
                                                </div>
                                            </div>
                                        </td>

                                        {/* Contact */}
                                        <td className="py-4 px-6 align-top">
                                            <div className="space-y-1.5 flex flex-col justify-center h-10">
                                                <div className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
                                                    <Mail className="w-3.5 h-3.5 opacity-70" />
                                                    <a href={`mailto:${entry.email}`} className="hover:text-brand-600 hover:underline truncate max-w-[150px] md:max-w-xs">{entry.email}</a>
                                                </div>
                                                {entry.phone && (
                                                    <div className="flex items-center gap-2 text-sm text-gray-500">
                                                        <Phone className="w-3.5 h-3.5 opacity-70" />
                                                        <a href={`tel:${entry.phone}`} className="hover:text-brand-600 truncate">{entry.phone}</a>
                                                    </div>
                                                )}
                                            </div>
                                        </td>

                                        {/* Date */}
                                        <td className="py-4 px-6 align-top hidden md:table-cell">
                                            <div className="flex items-center gap-2 text-sm text-gray-500 h-10">
                                                <Clock className="w-3.5 h-3.5 opacity-70" />
                                                <span>{new Date(entry.created_at).toLocaleString()}</span>
                                            </div>
                                        </td>

                                        {/* Actions */}
                                        <td className="py-4 px-6 align-top text-right">
                                            <div className="flex justify-end items-center h-10">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    onClick={() => handleDelete(entry.id, entry.full_name)}
                                                    disabled={isDeleting === entry.id}
                                                    className="text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 px-2 py-1.5 h-auto rounded-lg"
                                                    title="Remove from waitlist"
                                                >
                                                    {isDeleting === entry.id ? (
                                                        <Loader2 className="w-4 h-4 animate-spin" />
                                                    ) : (
                                                        <Trash2 className="w-4 h-4" />
                                                    )}
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
