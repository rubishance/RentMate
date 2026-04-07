import { useState } from 'react';
import { X, User, Mail, Shield, Loader2, Send } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { useScrollLock } from '../../hooks/useScrollLock';

interface SubscriptionPlan {
    id: string;
    name: string;
}

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    plans: SubscriptionPlan[];
}

export function AddUserModal({ isOpen, onClose, onSuccess, plans }: AddUserModalProps) {
    useScrollLock(isOpen);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        password: '',
        role: 'user',
        planId: 'free'
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Invoke Edge Function
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) throw new Error('No active session. Please log in again.');

            const res = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/admin-create-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${session.access_token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Failed to create user');

            alert(`User ${formData.email} has been created successfully!\n\nThey can now log in using the password you provided.`);

            onSuccess();
            onClose();
            setFormData({ fullName: '', email: '', password: '', role: 'user', planId: 'free' });
        } catch (error: any) {
            console.error('Create user error:', error);
            alert(`Error creating user: ${error.message || 'Unknown error'}`);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-6 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-window w-full shadow-2xl animate-in fade-in slide-in-from-bottom-10 sm:zoom-in-95 duration-200 overflow-hidden relative h-auto max-h-[90dvh] flex flex-col rounded-t-3xl border-0 mt-auto sm:max-h-[85vh] sm:rounded-2xl sm:border sm:border-border/50 sm:mt-0 max-w-md">
                {/* Header */}
                <div className="p-6 border-b border-border dark:border-gray-700 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-foreground dark:text-white flex items-center gap-2">
                            <User className="w-5 h-5 text-brand-600" />
                            Invite New User
                        </h2>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground mt-1">
                            Send an invitation email to a new team member
                        </p>
                    </div>
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={onClose}
                        className="p-2 text-muted-foreground hover:text-muted-foreground hover:bg-muted dark:hover:bg-gray-700 rounded-full transition-colors h-auto"
                    >
                        <X className="w-5 h-5" />
                    </Button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="space-y-4">
                        {/* Name */}
                        <Input
                            label="Full Name"
                            value={formData.fullName}
                            onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                            leftIcon={<User className="w-4 h-4 text-muted-foreground" />}
                            required
                            placeholder="John Doe"
                        />

                        {/* Email */}
                        <Input
                            label="Email Address"
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                            leftIcon={<Mail className="w-4 h-4 text-muted-foreground" />}
                            required
                            placeholder="john@example.com"
                        />

                        {/* Password */}
                        <Input
                            label="Initial Password"
                            type="text"
                            value={formData.password}
                            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                            leftIcon={<Shield className="w-4 h-4 text-muted-foreground" />}
                            required
                            placeholder="Secure password (e.g. Temp123!)"
                        />

                        {/* Plan */}
                        <Select
                            label="Subscription Plan"
                            value={formData.planId}
                            onChange={(val) => setFormData({ ...formData, planId: val })}
                            leftIcon={<Shield className="w-4 h-4 text-muted-foreground" />}
                            options={plans.map(p => ({ value: p.id, label: p.name }))}
                        />

                        {/* Role */}
                        <Select
                            label="Role"
                            value={formData.role}
                            onChange={(val) => setFormData({ ...formData, role: val })}
                            leftIcon={<Shield className="w-4 h-4 text-muted-foreground" />}
                            options={[
                                { value: 'user', label: 'User' },
                                { value: 'admin', label: 'Admin' },
                                { value: 'manager', label: 'Manager' }
                            ]}
                        />
                    </div>

                    <div className="pt-6 flex gap-2 sm:gap-4">
                        <Button
                            type="button"
                            variant="ghost"
                            // variant="ghost" or "secondary" might be better if bg-muted isnt a variant
                            onClick={onClose}
                            className="flex-1 px-6 py-2 text-gray-700 bg-muted hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors h-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-6 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-medium transition-colors shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 h-auto"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            {loading ? 'Sending...' : 'Send Invite'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
