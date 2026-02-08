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
    RefreshCw,
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
    value: string | number | boolean | Record<string, unknown>;
    description: string;
}

export default function SystemSettings() {
    const [activeTab, setActiveTab] = useState<'notifications' | 'general' | 'autopilot' | 'integrations' | 'email_reports'>('notifications');
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

        } catch (error: unknown) {
            console.error('Error fetching settings:', error);
            setMessage({ type: 'error', text: 'Failed to load system configurations.' });
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('google_code');
        if (code && activeTab === 'integrations') {
            handleGoogleCallback(code);
        }
    }, [activeTab]);

    const handleGoogleCallback = async (code: string) => {
        setSaving(true);
        setMessage(null);
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('Not authenticated');

            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/google-drive-proxy`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify({
                    action: 'exchange_code',
                    code
                })
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to exchange code');

            setMessage({ type: 'success', text: 'Google Drive connected successfully!' });
            // Clean up URL
            window.history.replaceState({}, document.title, window.location.pathname);
            fetchData();
        } catch (err: unknown) {
            console.error(err);
            setMessage({ type: 'error', text: 'Google Connection Failed: ' + (err instanceof Error ? err.message : 'Unknown error') });
        } finally {
            setSaving(false);
        }
    };

    const connectGoogle = () => {
        const clientId = '386252373495-mtsignnt2es3d4t2cgrtnoq4q66or288'; // From your branding doc
        const redirectUri = `${window.location.origin}/admin/settings?google_code=1`; // Internal flag or we can use the code directly

        // Actually, the redirect URI in the edge function is fixed to:
        // `${Deno.env.get('APP_URL')!}/auth/google/callback`
        // We should probably follow that or update the edge function.

        // Wait, the edge function says:
        // redirect_uri: `${Deno.env.get('APP_URL')!.replace(/\/$/, '')}/auth/google/callback`

        // So I should use that redirect URI.
        const scopes = [
            'https://www.googleapis.com/auth/drive.file',
            'https://www.googleapis.com/auth/userinfo.email',
            'https://www.googleapis.com/auth/userinfo.profile'
        ].join(' ');

        const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
            `client_id=${clientId}&` +
            `redirect_uri=${encodeURIComponent(window.location.origin + '/admin/settings')}&` +
            `response_type=code&` +
            `scope=${encodeURIComponent(scopes)}&` +
            `access_type=offline&` +
            `prompt=consent`;

        window.location.href = authUrl;
    };

    const disconnectGoogle = async () => {
        setSaving(true);
        try {
            const { data: { user } } = await supabase.auth.getUser();
            const { error } = await supabase
                .from('user_profiles')
                .update({
                    google_refresh_token: null,
                    google_drive_folder_id: null,
                    google_drive_enabled: false
                })
                .eq('id', user?.id);

            if (error) throw error;
            setMessage({ type: 'success', text: 'Google Drive disconnected.' });
            fetchData();
        } catch (err: any) {
            setMessage({ type: 'error', text: err.message });
        } finally {
            setSaving(false);
        }
    };

    const handleRuleChange = (id: string, field: keyof NotificationRule, value: string | number | boolean | string[]) => {
        setRules(prev => prev.map(r => r.id === id ? { ...r, [field]: value } : r));
    };

    const handleSettingChange = (key: string, value: string | number | boolean | Record<string, unknown>) => {
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
        } catch (error: unknown) {
            console.error('Error saving settings:', error);
            setMessage({ type: 'error', text: 'Failed to save changes: ' + (error instanceof Error ? error.message : 'Unknown error') });
        } finally {
            setSaving(false);
        }
    };

    const initializeEmailReports = async () => {
        setSaving(true);
        setMessage(null);
        try {
            const defaultSettings = [
                {
                    key: 'admin_email_daily_summary_enabled',
                    value: true,
                    description: 'Master toggle for daily admin summary email'
                },
                {
                    key: 'admin_email_content_preferences',
                    value: {
                        new_users: true,
                        revenue: true,
                        support_tickets: true,
                        upgrades: true,
                        active_properties: true
                    },
                    description: 'JSON object defining which sections to include in the daily summary'
                },
                {
                    key: 'admin_notification_email',
                    value: 'rubi@rentmate.co.il',
                    description: 'Email address where the daily admin summary and alerts are sent'
                }
            ];

            const { error } = await supabase
                .from('system_settings')
                .insert(defaultSettings);

            if (error) throw error;

            setMessage({ type: 'success', text: 'Email report settings initialized!' });
            fetchData();
        } catch (error: any) {
            console.error('Error initializing email settings:', error);
            setMessage({ type: 'error', text: 'Failed to initialize: ' + error.message });
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
                        <RefreshCw className="w-6 h-6" />
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
                <button
                    onClick={() => setActiveTab('integrations')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'integrations'
                        ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm border border-gray-100 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <RefreshCw className="w-4 h-4" />
                        Integrations
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('email_reports')}
                    className={`px-6 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'email_reports'
                        ? 'bg-white dark:bg-gray-800 text-brand-600 shadow-sm border border-gray-100 dark:border-gray-700'
                        : 'text-gray-500 hover:text-gray-700 dark:hover:text-gray-300'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Bell className="w-4 h-4" />
                        Email Reports
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
                                            value={typeof setting.value === 'string' ? setting.value : ''}
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
            {activeTab === 'integrations' && (
                <div className="bg-white dark:bg-gray-800 rounded-3xl border border-gray-100 dark:border-gray-700 shadow-sm overflow-hidden p-8">
                    <div className="flex flex-col md:flex-row items-start justify-between gap-8">
                        <div className="max-w-xl space-y-4">
                            <div className="flex items-center gap-3">
                                <div className="p-3 bg-brand-50 rounded-2xl">
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-8 h-8" />
                                </div>
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Google Drive Integration</h3>
                            </div>
                            <p className="text-sm font-bold text-gray-500 leading-relaxed">
                                Connect your Google account to enable **Automated CRM Exports**.
                                This allows the system to generate and upload detailed interaction reports,
                                invoices, and user statistics directly to a dedicated "RentMate" folder in your Google Drive.
                            </p>
                            <ul className="space-y-2">
                                <li className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Automatic Daily Backups
                                </li>
                                <li className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    One-Click CRM Exports (Google Sheets)
                                </li>
                                <li className="flex items-center gap-2 text-xs font-bold text-emerald-600">
                                    <CheckCircle2 className="w-4 h-4" />
                                    Secure Data Syncing
                                </li>
                            </ul>
                        </div>

                        <div className="w-full md:w-auto">
                            <button
                                onClick={connectGoogle}
                                className="w-full md:w-[280px] flex items-center justify-center gap-3 px-8 py-5 bg-white dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-2xl hover:border-brand-500 transition-all group shadow-sm"
                            >
                                <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-6 h-6" />
                                <span className="text-sm font-black text-gray-900 dark:text-white uppercase tracking-widest group-hover:text-brand-600">Connect account</span>
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {activeTab === 'email_reports' && (
                <div className="space-y-10">
                    {!settings.find(s => s.key === 'admin_email_daily_summary_enabled') ? (
                        <div className="bg-white dark:bg-gray-800 p-12 rounded-[2.5rem] border-2 border-dashed border-gray-100 dark:border-gray-700 text-center space-y-6">
                            <div className="w-20 h-20 bg-brand-50 rounded-full flex items-center justify-center mx-auto">
                                <Bell className="w-10 h-10 text-brand-600" />
                            </div>
                            <div className="max-w-md mx-auto space-y-2">
                                <h3 className="text-xl font-black text-gray-900 dark:text-white uppercase tracking-tight">Email Reports Not Configured</h3>
                                <p className="text-sm font-bold text-gray-500 dark:text-gray-400">
                                    The periodic report system needs to be initialized. This will create the necessary configuration keys in the database.
                                </p>
                            </div>
                            <button
                                onClick={initializeEmailReports}
                                disabled={saving}
                                className="inline-flex items-center gap-2 px-8 py-4 bg-brand-600 text-white rounded-2xl hover:bg-brand-700 transition-all font-bold shadow-lg shadow-brand-600/20 disabled:opacity-50"
                            >
                                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <RefreshCw className="w-5 h-5" />}
                                Setup Email Reports System
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Master Switch Section */}
                            {settings.find(s => s.key === 'admin_email_daily_summary_enabled') && (
                                <div className="bg-brand-600 p-8 rounded-[2.5rem] shadow-xl shadow-brand-600/20 text-white flex flex-col md:flex-row items-center justify-between gap-6 transition-all">
                                    <div className="flex-1 space-y-2">
                                        <h2 className="text-2xl font-black uppercase tracking-tight">Daily Summary Email</h2>
                                        <p className="text-sm font-bold opacity-80 max-w-xl">
                                            {settings.find(s => s.key === 'admin_email_daily_summary_enabled')?.description || 'Toggle the daily activity summary email sent to admins.'}
                                        </p>
                                    </div>
                                    <button
                                        onClick={() => handleSettingChange('admin_email_daily_summary_enabled', !settings.find(s => s.key === 'admin_email_daily_summary_enabled')?.value)}
                                        className={`flex items-center gap-4 px-8 py-4 rounded-2xl border-2 transition-all ${settings.find(s => s.key === 'admin_email_daily_summary_enabled')?.value
                                            ? 'bg-white text-brand-600 border-white'
                                            : 'bg-transparent border-white/30 text-white'
                                            }`}
                                    >
                                        <span className="font-black uppercase tracking-widest text-xs">
                                            {settings.find(s => s.key === 'admin_email_daily_summary_enabled')?.value ? 'Emails Active' : 'Emails Disabled'}
                                        </span>
                                        {settings.find(s => s.key === 'admin_email_daily_summary_enabled')?.value ? <ToggleRight className="w-10 h-10" /> : <ToggleLeft className="w-10 h-10" />}
                                    </button>
                                </div>
                            )}

                            {/* Content Preferences */}
                            {settings.find(s => s.key === 'admin_email_content_preferences') && (
                                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-3 bg-brand-50 rounded-2xl">
                                            <Sparkles className="w-6 h-6 text-brand-600" />
                                        </div>
                                        <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Report Content Configuration</h2>
                                    </div>

                                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                        {Object.entries(settings.find(s => s.key === 'admin_email_content_preferences')?.value as Record<string, boolean> || {}).map(([key, enabled]) => (
                                            <div key={key} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900/50 rounded-2xl border border-gray-100 dark:border-gray-700">
                                                <label className="text-sm font-bold text-gray-700 dark:text-gray-300 uppercase tracking-wide">
                                                    {key.replace(/_/g, ' ')}
                                                </label>
                                                <button
                                                    onClick={() => {
                                                        const currentPrefs = settings.find(s => s.key === 'admin_email_content_preferences')?.value as Record<string, boolean> || {};
                                                        handleSettingChange('admin_email_content_preferences', { ...currentPrefs, [key]: !enabled });
                                                    }}
                                                    className={`transition-all ${enabled ? 'text-brand-600' : 'text-gray-300'}`}
                                                >
                                                    {enabled ? <ToggleRight className="w-8 h-8" /> : <ToggleLeft className="w-8 h-8" />}
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}

                            {/* Recipient Configuration */}
                            {settings.find(s => s.key === 'admin_notification_email') && (
                                <div className="bg-white dark:bg-gray-800 p-8 rounded-[2.5rem] border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <div className="flex items-center gap-3 mb-6">
                                        <div className="p-3 bg-brand-50 rounded-2xl">
                                            <Bell className="w-6 h-6 text-brand-600" />
                                        </div>
                                        <h2 className="text-lg font-black text-gray-900 dark:text-white uppercase tracking-tight">Recipient Configuration</h2>
                                    </div>
                                    <div className="space-y-4">
                                        <div className="flex flex-col gap-2">
                                            <label className="text-xs font-black uppercase tracking-widest text-gray-400 px-1">Recipient Email Address</label>
                                            <input
                                                type="email"
                                                value={settings.find(s => s.key === 'admin_notification_email')?.value as string || ''}
                                                onChange={(e) => handleSettingChange('admin_notification_email', e.target.value)}
                                                placeholder="e.g. admin@rentmate.co.il"
                                                className="w-full px-5 py-4 bg-gray-50 dark:bg-gray-900 border-2 border-gray-100 dark:border-gray-700 rounded-2xl text-gray-900 dark:text-white font-bold text-sm focus:border-brand-500 outline-none transition-all"
                                            />
                                            <p className="text-[10px] font-bold text-gray-500 mt-1 uppercase tracking-tight">
                                                The daily report and system alerts will be sent to this address.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </div>
            )}
        </div>
    );
}
