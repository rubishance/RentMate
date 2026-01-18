import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import {
    Bell,
    Settings,
    Save,
    Loader2,
    CheckCircle2,
    AlertTriangle,
    ToggleLeft,
    ToggleRight
} from 'lucide-react';

interface NotificationRule {
    id: string;
    name: string;
    description: string;
    is_enabled: boolean;
    days_offset: number;
    channels: string[];
    target_audience: string;
    message_template: string;
}

interface SystemSetting {
    key: string;
    value: any;
    description: string;
}

export default function SystemSettings() {
    const [activeTab, setActiveTab] = useState<'notifications' | 'general'>('notifications');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [rules, setRules] = useState<NotificationRule[]>([]);
    const [settings, setSettings] = useState<SystemSetting[]>([]);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Rules
            const { data: rulesData, error: rulesError } = await supabase
                .from('notification_rules')
                .select('*')
                .order('name');

            if (rulesError) throw rulesError;
            setRules(rulesData || []);

            // Fetch Settings
            const { data: settingsData, error: settingsError } = await supabase
                .from('system_settings')
                .select('*')
                .order('key');

            if (settingsError) throw settingsError;
            setSettings(settingsData || []);

        } catch (error: any) {
            console.error('Error fetching settings:', error);
            setMessage({ type: 'error', text: 'Failed to load settings.' });
        } finally {
            setLoading(false);
        }
    };

    const handleRuleChange = (id: string, field: keyof NotificationRule, value: any) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleSettingChange = (key: string, value: any) => {
        setSettings(prev => prev.map(s => s.key === key ? { ...s, value } : s));
    };

    const saveChanges = async () => {
        setSaving(true);
        setMessage(null);
        try {
            // Save Rules
            for (const rule of rules) {
                const { error } = await supabase
                    .from('notification_rules')
                    .update({
                        is_enabled: rule.is_enabled,
                        days_offset: rule.days_offset,
                        message_template: rule.message_template
                    })
                    .eq('id', rule.id);
                if (error) throw error;
            }

            // Save Settings
            for (const setting of settings) {
                const { error } = await supabase
                    .from('system_settings')
                    .update({ value: setting.value })
                    .eq('key', setting.key);
                if (error) throw error;
            }

            setMessage({ type: 'success', text: 'Settings saved successfully.' });
        } catch (error: any) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Failed to save changes: ' + error.message });
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex h-96 items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
                    <p className="text-gray-500">Manage notification rules and global configurations</p>
                </div>
                <button
                    onClick={saveChanges}
                    disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50 transition-colors shadow-sm"
                >
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Save Changes
                </button>
            </div>

            {message && (
                <div className={`p-4 rounded-lg flex items-center gap-3 ${message.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    {message.text}
                </div>
            )}

            {/* Tabs */}
            <div className="border-b border-gray-200">
                <nav className="-mb-px flex gap-6">
                    <button
                        onClick={() => setActiveTab('notifications')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'notifications'
                                ? 'border-brand-600 text-brand-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Bell className="w-4 h-4" />
                        Notification Rules
                    </button>
                    <button
                        onClick={() => setActiveTab('general')}
                        className={`py-4 px-1 border-b-2 font-medium text-sm flex items-center gap-2 ${activeTab === 'general'
                                ? 'border-brand-600 text-brand-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                            }`}
                    >
                        <Settings className="w-4 h-4" />
                        General Configuration
                    </button>
                </nav>
            </div>

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Rule Name</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Days Offset</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider flex-1">Message Template</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {rules.map((rule) => (
                                <tr key={rule.id} className="hover:bg-gray-50">
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <button
                                            onClick={() => handleRuleChange(rule.id, 'is_enabled', !rule.is_enabled)}
                                            className={`text-2xl transition-colors ${rule.is_enabled ? 'text-brand-600' : 'text-gray-300'}`}
                                        >
                                            {rule.is_enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                        </button>
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="text-sm font-medium text-gray-900">{rule.name}</div>
                                        <div className="text-sm text-gray-500">{rule.description}</div>
                                    </td>
                                    <td className="px-6 py-4 whitespace-nowrap">
                                        <input
                                            type="number"
                                            value={rule.days_offset}
                                            onChange={(e) => handleRuleChange(rule.id, 'days_offset', parseInt(e.target.value))}
                                            className="w-20 px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500"
                                        />
                                    </td>
                                    <td className="px-6 py-4">
                                        <input
                                            type="text"
                                            value={rule.message_template}
                                            onChange={(e) => handleRuleChange(rule.id, 'message_template', e.target.value)}
                                            className="w-full px-3 py-1 text-sm border border-gray-300 rounded-md focus:ring-brand-500 focus:border-brand-500 font-mono bg-gray-50"
                                        />
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}

            {/* General Settings Tab */}
            {activeTab === 'general' && (
                <div className="grid gap-6 md:grid-cols-2">
                    {settings.map((setting) => (
                        <div key={setting.key} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                            <h3 className="text-lg font-medium text-gray-900 mb-2">{setting.key.replace(/_/g, ' ').toUpperCase()}</h3>
                            <p className="text-sm text-gray-500 mb-4 h-10">{setting.description}</p>

                            {/* Boolean Toggles */}
                            {(setting.value === true || setting.value === false || setting.value === 'true' || setting.value === 'false') && (
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => handleSettingChange(setting.key, !setting.value)}
                                        className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition-colors ${setting.value
                                                ? 'bg-brand-50 border-brand-200 text-brand-700'
                                                : 'bg-gray-50 border-gray-200 text-gray-600'
                                            }`}
                                    >
                                        {setting.value ? <ToggleRight className="w-5 h-5" /> : <ToggleLeft className="w-5 h-5" />}
                                        {setting.value ? 'Enabled' : 'Disabled'}
                                    </button>
                                </div>
                            )}

                            {/* Numbers */}
                            {typeof setting.value === 'number' && (
                                <input
                                    type="number"
                                    value={setting.value}
                                    onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value))}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                                />
                            )}

                            {/* Strings/JSON Fallback */}
                            {typeof setting.value !== 'boolean' && typeof setting.value !== 'number' && (
                                <input
                                    type="text"
                                    value={JSON.stringify(setting.value).replace(/^"|"$/g, '')} // Strip quotes for visual cleanliness if just a string
                                    onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-brand-500 focus:border-brand-500"
                                />
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
