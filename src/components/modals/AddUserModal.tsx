import { useState } from 'react';
import { X, User, Mail, Shield, Loader2, Send } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';

interface AddUserModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function AddUserModal({ isOpen, onClose, onSuccess }: AddUserModalProps) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        fullName: '',
        email: '',
        role: 'user'
    });

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        // Simulation of invite process
        try {
            await new Promise(resolve => setTimeout(resolve, 1500));
            // In a real app with Supabase, this would call a Supabase Edge Function:
            // await supabase.functions.invoke('invite-user', { body: formData });

            console.log('User Invited:', formData);
            alert(`Invitation sent to ${formData.email} (Simulation)\n\nNote: To actually create users without logging out, a backend Edge Function is required.`);

            onSuccess();
            onClose();
            setFormData({ fullName: '', email: '', role: 'user' });
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-md shadow-2xl scale-100 animate-in zoom-in-95 duration-200 overflow-hidden">
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

                    <div className="pt-4 flex gap-3">
                        <Button
                            type="button"
                            variant="ghost"
                            // variant="ghost" or "secondary" might be better if bg-muted isnt a variant
                            onClick={onClose}
                            className="flex-1 px-4 py-2 text-gray-700 bg-muted hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-xl font-medium transition-colors h-auto"
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            disabled={loading}
                            className="flex-1 px-4 py-2 bg-brand-600 text-white hover:bg-brand-700 rounded-xl font-medium transition-colors shadow-lg shadow-brand-500/30 flex items-center justify-center gap-2 h-auto"
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
