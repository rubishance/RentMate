import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2 } from 'lucide-react';

export function ResetPassword() {
    const navigate = useNavigate();
    const [newPassword, setNewPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState(false);

    useEffect(() => {
        // Ensure user is authenticated (via the email link magic)
        supabase.auth.getSession().then(({ data: { session } }) => {
            if (!session) {
                setError("Invalid or expired reset link. Please try again.");
            }
        });
    }, []);

    const handleUpdatePassword = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);

        try {
            const { error } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (error) throw error;
            setSuccess(true);
            setTimeout(() => navigate('/login'), 3000);
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/20 rounded-full blur-[100px] animate-[pulse_15s_ease-in-out_infinite]" />
            </div>

            <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-md p-8 relative z-10"
            >
                <div className="relative bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8">
                    <h2 className="text-2xl font-bold text-center text-slate-900 mb-6">Set New Password</h2>

                    {error && (
                        <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 text-center border border-red-100">
                            {error}
                        </div>
                    )}

                    {success ? (
                        <div className="text-center py-4">
                            <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
                                ✓
                            </div>
                            <h3 className="text-lg font-semibold text-slate-900">Password Updated!</h3>
                            <p className="text-slate-500 mt-2">Redirecting to login...</p>
                        </div>
                    ) : (
                        <form onSubmit={handleUpdatePassword} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">New Password</label>
                                <input
                                    type="password"
                                    required
                                    minLength={6}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none backdrop-blur-sm"
                                    placeholder="••••••••"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={loading || !!error} // Disable if invalid session
                                className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transform transition-all hover:scale-[1.02] disabled:opacity-70 disabled:cursor-not-allowed"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Update Password'}
                            </button>
                        </form>
                    )}
                </div>
            </motion.div>
        </div>
    );
}
