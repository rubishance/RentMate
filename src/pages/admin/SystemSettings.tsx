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
    ToggleRight,
    RefreshCw as ArrowPathIcon,
    Sparkles
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
    const [activeTab, setActiveTab] = useState<'notifications' | 'general' | 'autopilot'>('notifications');
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
            setMessage({ type: 'error', text: 'Failed to load system configurations.' });
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

            setMessage({ type: 'success', text: 'Settings updated successfully.' });
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
                <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
            </div>
        );
    }

    return (
        <div className="space-y-8 pb-20">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight flex items-center gap-2">
                        <Settings className="w-8 h-8 text-brand-600" />
                        System Settings
                    </h1>
                    <p className="mt-1 text-sm font-medium text-gray-500 dark:text-gray-400">
                        Configure global behaviors, notification triggers, and administrative rules.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={fetchData}
                        className="p-2.5 text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm"
                    >
                        <ArrowPathIcon className="w-6 h-6" />
                    </button>
                    <button
                        onClick={saveChanges}
                        disabled={saving}
                        className="flex items-center justify-center gap-2 px-8 py-2.5 bg-brand-600 text-white rounded-xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-600/20 disabled:opacity-50"
                    >
                        {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
                        Apply Changes
                    </button>
                </div>
            </div>

            {message && (
                <div className={`p-4 rounded-2xl flex items-center gap-3 border animate-in fade-in slide-in-from-top-2 ${message.type === 'success'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-100 dark:bg-emerald-900/20 dark:border-emerald-800'
                    : 'bg-red-50 text-red-700 border-red-100 dark:bg-red-900/20 dark:border-red-800'
                    }`}>
                    {message.type === 'success' ? <CheckCircle2 className="w-5 h-5" /> : <AlertTriangle className="w-5 h-5" />}
                    <span className="font-bold text-sm tracking-tight">{message.text}</span>
                </div>
            )}

            {/* Navigation Tabs */}
            <div className="bg-gray-100 dark:bg-gray-900 p-1 rounded-2xl inline-flex border border-gray-200 dark:border-gray-800 shadow-inner">
                <button
                    onClick={() => setActiveTab('notifications')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'notifications'
                        ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm border border-gray-100 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Notification Rules
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('general')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'general'
                        ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm border border-gray-100 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Settings className="w-4 h-4" />
                        Global Variables
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('autopilot')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'autopilot'
                        ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm border border-gray-100 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <ToggleRight className="w-4 h-4" />
                        Autopilot Logic
                    </div>
                </button>
            </div>

            {/* Notifications Tab */}
            {activeTab === 'notifications' && (
                <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-5 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                        <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Automation Engine</h2>
                        <p className="text-xs font-medium text-gray-500 mt-1">Configure when and how users receive automated system notifications.</p>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-right" dir="rtl">
                            <thead>
                                <tr className="bg-gray-50 dark:bg-gray-900/30">
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Enabled</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-right">Trigger Rule</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest text-center">Days Offset</th>
                                    <th className="px-6 py-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">Message Template</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100 dark:divide-gray-700 text-right">
                                {rules.map((rule) => (
                                    <tr key={rule.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/30 transition-colors">
                                        <td className="px-6 py-5">
                                            <button
                                                onClick={() => handleRuleChange(rule.id, 'is_enabled', !rule.is_enabled)}
                                                className={`transition-all ${rule.is_enabled ? 'text-brand-600' : 'text-gray-300'}`}
                                            >
                                                {rule.is_enabled ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                                            </button>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{rule.name}</div>
                                            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mt-0.5">{rule.description}</div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <input
                                                type="number"
                                                value={rule.days_offset}
                                                onChange={(e) => handleRuleChange(rule.id, 'days_offset', parseInt(e.target.value))}
                                                className="w-20 px-3 py-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl text-center font-black text-sm text-gray-900 dark:text-white focus:ring-2 focus:ring-brand-500/20 outline-none"
                                            />
                                        </td>
                                        <td className="px-6 py-5">
                                            <input
                                                type="text"
                                                value={rule.message_template}
                                                onChange={(e) => handleRuleChange(rule.id, 'message_template', e.target.value)}
                                                className="w-full px-4 py-2.5 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl font-mono text-xs text-brand-600 dark:text-brand-400 focus:ring-2 focus:ring-brand-500/20 outline-none"
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* General Settings Tab */}
            {activeTab === 'general' && (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {settings.filter(s => !s.key.startsWith('auto_') && !s.key.startsWith('voice_')).map((setting) => (
                        <div key={setting.key} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md transition-shadow">
                            <div className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">Technical Key: {setting.key}</div>
                            <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight mb-2">{setting.key.replace(/_/g, ' ')}</h3>
                            <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-6 leading-relaxed flex-1">{setting.description}</p>

                            <div className="mt-auto">
                                {/* Boolean Toggles */}
                                {(setting.value === true || setting.value === false || setting.value === 'true' || setting.value === 'false') ? (
                                    <button
                                        onClick={() => handleSettingChange(setting.key, !setting.value)}
                                        className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${setting.value
                                            ? 'bg-brand-50 dark:bg-brand-900/10 border-brand-200 dark:border-brand-800 text-brand-700 dark:text-brand-400'
                                            : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700 text-gray-400'
                                            }`}
                                    >
                                        <span className="text-[10px] font-black uppercase tracking-widest">{setting.value ? 'Active' : 'Disabled'}</span>
                                        {setting.value ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                    </button>
                                ) : typeof setting.value === 'number' ? (
                                    <div className="relative">
                                        <input
                                            type="number"
                                            value={setting.value}
                                            onChange={(e) => handleSettingChange(setting.key, parseFloat(e.target.value))}
                                            className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-black text-lg focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                        />
                                    </div>
                                ) : (
                                    <input
                                        type="text"
                                        value={typeof setting.value === 'object' ? JSON.stringify(setting.value) : setting.value}
                                        onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                                        className="w-full px-5 py-3 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold text-sm focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10 outline-none transition-all"
                                    />
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Autopilot Logic Tab */}
            {activeTab === 'autopilot' && (
                <div className="space-y-10">
                    {/* Master Switch Section */}
                    {settings.find(s => s.key === 'auto_autopilot_master_enabled') && (
                        <div className="bg-brand-600 p-8 rounded-[2.5rem] shadow-xl shadow-brand-600/20 text-white flex flex-col md:flex-row items-center justify-between gap-6 transition-all">
                            <div className="flex-1 space-y-2">
                                <h2 className="text-2xl font-black uppercase tracking-tight">Backend Automation Engine</h2>
                                <p className="text-sm font-bold opacity-80 max-w-xl">
                                    When enabled, RentMate will automatically scan contracts for linkage, monitor rent overrides, and generate user notifications.
                                </p>
                            </div>
                            <button
                                onClick={() => handleSettingChange('auto_autopilot_master_enabled', !settings.find(s => s.key === 'auto_autopilot_master_enabled')?.value)}
                                className={`flex items-center gap-4 px-8 py-4 rounded-2xl border-2 transition-all ${settings.find(s => s.key === 'auto_autopilot_master_enabled')?.value
                                    ? 'bg-white text-brand-600 border-white'
                                    : 'bg-transparent border-white/30 text-white'
                                    }`}
                            >
                                <span className="font-black uppercase tracking-widest text-xs">
                                    {settings.find(s => s.key === 'auto_autopilot_master_enabled')?.value ? 'System Active' : 'System Disabled'}
                                </span>
                                {settings.find(s => s.key === 'auto_autopilot_master_enabled')?.value ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                            </button>
                        </div>
                    )}

                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {settings.filter(s => s.key.startsWith('auto_') && s.key !== 'auto_autopilot_master_enabled').map((setting) => (
                            <div key={setting.key} className="bg-white dark:bg-gray-800 p-6 rounded-3xl border-2 border-dashed border-gray-100 dark:border-gray-700 shadow-sm transition-all hover:border-brand-200 dark:hover:border-brand-800">
                                <div className="flex items-center gap-2 mb-4">
                                    <div className={`p-2 rounded-xl ${setting.value ? 'bg-brand-50 text-brand-600' : 'bg-gray-50 text-gray-400'}`}>
                                        <Sparkles className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-tight">{setting.key.replace(/^auto_/, '').replace(/_/g, ' ')}</h3>
                                </div>
                                <p className="text-[11px] font-bold text-gray-500 dark:text-gray-400 mb-6 leading-relaxed">{setting.description}</p>

                                <button
                                    onClick={() => handleSettingChange(setting.key, !setting.value)}
                                    className={`w-full flex items-center justify-between px-4 py-3 rounded-2xl border-2 transition-all ${setting.value
                                        ? 'bg-brand-600 border-brand-600 text-white shadow-lg shadow-brand-600/20'
                                        : 'bg-gray-50 dark:bg-gray-900/50 border-gray-100 dark:border-gray-700 text-gray-400'
                                        }`}
                                >
                                    <span className="text-[10px] font-black uppercase tracking-widest">{setting.value ? 'Active' : 'Disabled'}</span>
                                    {setting.value ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                </button>
                            </div>
                        ))}
                    </div>

                    <div className="p-8 bg-gray-50 dark:bg-gray-900/50 rounded-[2.5rem] border border-gray-200 dark:border-gray-800">
                        <div className="flex items-center gap-3 mb-6">
                            <ToggleLeft className="w-6 h-6 text-gray-400" />
                            <h2 className="text-base font-black text-gray-900 dark:text-white uppercase tracking-tight">Voice & Phone Integration (RESTRICTED)</h2>
                        </div>
                        <div className="grid gap-6 md:grid-cols-2">
                            {settings.filter(s => s.key.startsWith('voice_')).map((setting) => (
                                <div key={setting.key} className="space-y-3">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-gray-400 px-1">{setting.key.replace(/_/g, ' ')}</label>
                                    {typeof setting.value === 'boolean' ? (
                                        <button
                                            onClick={() => handleSettingChange(setting.key, !setting.value)}
                                            className={`w-full flex items-center justify-between px-5 py-4 rounded-2xl border-2 transition-all ${setting.value
                                                ? 'bg-amber-50 border-amber-200 text-amber-700'
                                                : 'bg-white dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-300'
                                                }`}
                                        >
                                            <span className="text-xs font-black uppercase tracking-widest">{setting.value ? 'Channel Enabled' : 'Disabled (Pending Number)'}</span>
                                            {setting.value ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                        </button>
                                    ) : (
                                        <input
                                            type="password"
                                            value={setting.value}
                                            placeholder="Enter API Key..."
                                            onChange={(e) => handleSettingChange(setting.key, e.target.value)}
                                            className="w-full px-5 py-4 bg-white dark:bg-gray-800 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold text-sm focus:border-brand-500 outline-none transition-all"
                                        />
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
