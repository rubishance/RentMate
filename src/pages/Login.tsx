import React, { useState } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Loader2, ArrowRight, AlertTriangle } from 'lucide-react';
import logoFinalCleanV2 from '../assets/logo-final-clean-v2.png';

export function Login() {
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [message, setMessage] = useState<string | null>(null);
    const [mode, setMode] = useState<'signin' | 'signup' | 'forgot-password'>('signin');
    const [awaitingConfirmation, setAwaitingConfirmation] = useState(false);

    const handlePasswordReset = async (e: React.FormEvent) => {
        // ... (keep existing implementation, but check config)
        if (!isSupabaseConfigured) {
            setError('Cannot reset password without Supabase configuration.');
            return;
        }
        e.preventDefault();
        setLoading(true);
        setError(null);
        setMessage(null);

        try {
            const { error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: `${window.location.origin}/reset-password`,
            });
            if (error) throw error;
            setMessage('Check your email for the password reset link.');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleSocialLogin = async (provider: 'google' | 'apple' | 'facebook') => {
        if (!isSupabaseConfigured) {
            setError('Social login requires valid Supabase keys.');
            return;
        }
        setLoading(true);
        setError(null);
        try {
            const { error } = await supabase.auth.signInWithOAuth({
                provider,
                options: {
                    redirectTo: `${window.location.origin}/properties`,
                    queryParams: {
                        access_type: 'offline',
                        prompt: 'consent',
                    },
                },
            });
            if (error) throw error;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    };

    const handleAuth = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!isSupabaseConfigured) {
            // Mock success for dev
            navigate('/dashboard');
            return;
        }

        setLoading(true);
        setError(null);

        try {
            let authResult;
            if (mode === 'signup') {
                authResult = await supabase.auth.signUp({
                    email,
                    password,
                    options: {
                        data: {
                            full_name: email.split('@')[0],
                        }
                    }
                });

                if (authResult.data.user && !authResult.data.session) {
                    setAwaitingConfirmation(true);
                    setLoading(false);
                    return;
                }

            } else {
                authResult = await supabase.auth.signInWithPassword({
                    email,
                    password,
                });
            }

            if (authResult.error) throw authResult.error;

            const user = authResult.data.user;
            if (user) {
                const { data: profile } = await supabase
                    .from('user_profiles')
                    .select('role')
                    .eq('id', user.id)
                    .single();

                if (profile?.role === 'admin') {
                    navigate('/admin');
                    return;
                }
            }

            navigate('/dashboard');

        } catch (err: any) {
            console.error("Auth Error:", err);
            if (err.message === "Invalid login credentials") {
                setError("Invalid email or password.");
            } else if (err.message === "Email not confirmed") {
                setError("Please verify your email before logging in.");
            } else {
                setError(err.message);
            }
        } finally {
            setLoading(false);
        }
    };

    // ... (keep Confirmation and Forgot Password views)
    if (awaitingConfirmation) {
        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">
                {/* ... content ... */}
                <div className="w-full max-w-md p-8 relative z-10">
                    <div className="relative bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 text-center">
                        <div className="w-16 h-16 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                            <span className="text-3xl">📧</span>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 mb-2">Check your inbox</h2>
                        <p className="text-slate-600 mb-6">
                            We've sent a confirmation link to <strong>{email}</strong>.<br />
                            Please verify your email to unlock your account.
                        </p>
                        <button onClick={() => setAwaitingConfirmation(false)} className="text-blue-600 font-semibold hover:underline">Back to Sign In</button>
                    </div>
                </div>
            </div>
        )
    }

    if (mode === 'forgot-password') {
        // ... unchanged logic for forgot password view structure
        return (
            <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">
                {/* ... background ... */}
                <div className="absolute inset-0 z-0">
                    <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
                    <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/20 rounded-full blur-[100px] animate-[pulse_15s_ease-in-out_infinite]" />
                </div>
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md p-8 relative z-10">
                    <div className="relative bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8">
                        <div className="text-center mb-6">
                            <h2 className="text-2xl font-bold text-slate-900">Reset Password</h2>
                            <p className="text-slate-500 text-sm mt-2">Enter your email to receive a reset link</p>
                        </div>
                        {error && <div className="bg-red-50 text-red-600 p-3 rounded-xl text-sm mb-4 text-center border border-red-100">{error}</div>}
                        {message && <div className="bg-green-50 text-green-600 p-3 rounded-xl text-sm mb-4 text-center border border-green-100">{message}</div>}

                        <form onSubmit={handlePasswordReset} className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Email address</label>
                                <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="block w-full px-4 py-3 bg-white/50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none backdrop-blur-sm" placeholder="name@example.com" />
                            </div>
                            <button type="submit" disabled={loading} className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg transform transition-all hover:scale-[1.02] disabled:opacity-70">
                                {loading ? <Loader2 className="w-5 h-5 animate-spin mx-auto" /> : 'Send Reset Link'}
                            </button>
                        </form>
                        <button onClick={() => { setMode('signin'); setError(null); setMessage(null); }} className="w-full mt-4 text-sm text-slate-500 hover:text-slate-800 font-medium transition-colors">← Back to Sign In</button>
                    </div>
                </motion.div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-slate-50">
            {/* Dynamic Background */}
            <div className="absolute inset-0 z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] bg-blue-400/20 rounded-full blur-[100px] animate-[pulse_10s_ease-in-out_infinite]" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] bg-purple-400/20 rounded-full blur-[100px] animate-[pulse_15s_ease-in-out_infinite]" />
            </div>

            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5 }}
                className="w-full max-w-md p-8 relative z-10"
            >
                {/* Glass Card */}
                <div className="relative bg-white/70 backdrop-blur-xl border border-white/50 shadow-2xl rounded-2xl p-8 overflow-hidden">
                    {/* Decorative Top Gradient */}
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500" />
                    <div className="mb-8 text-center">
                        <img src={logoFinalCleanV2} alt="RentMate" className="h-24 w-auto mx-auto mb-4 object-contain" />
                        <motion.h2
                            key={mode}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-slate-900 to-slate-700"
                        >
                            {mode === 'signin' ? 'Welcome Back' : 'Join RentMate'}
                        </motion.h2>

                        {!isSupabaseConfigured && (
                            <div className="mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex items-start text-left">
                                <AlertTriangle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5 mr-2" />
                                <div>
                                    <h3 className="text-sm font-semibold text-amber-900">Demo Mode</h3>
                                    <p className="text-xs text-amber-700 mt-1">
                                        Supabase keys are missing. Authentication is simulated.
                                    </p>
                                </div>
                            </div>
                        )}
                        {!isSupabaseConfigured ? null : (
                            <p className="mt-2 text-slate-500 font-medium">Smart Property Management</p>
                        )}
                    </div>

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            className="bg-red-50/50 border border-red-100 text-red-600 p-4 rounded-xl text-sm mb-6 flex items-center justify-center backdrop-blur-sm"
                        >
                            {error}
                        </motion.div>
                    )}

                    <form className="space-y-6" onSubmit={handleAuth}>
                        <div className="space-y-4">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5 ml-1">Email address</label>
                                <input
                                    name="email"
                                    type="email"
                                    required={isSupabaseConfigured}
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="block w-full px-4 py-3 bg-white/50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="demo@rentmate.com"
                                />
                            </div>
                            <div>
                                <div className="flex justify-between items-center mb-1.5 ml-1">
                                    <label className="block text-sm font-semibold text-slate-700">Password</label>
                                    {mode === 'signin' && isSupabaseConfigured && (
                                        <button
                                            type="button"
                                            onClick={() => setMode('forgot-password')}
                                            className="text-xs font-medium text-blue-600 hover:text-blue-700"
                                        >
                                            Forgot Password?
                                        </button>
                                    )}
                                </div>
                                <input
                                    name="password"
                                    type="password"
                                    required={isSupabaseConfigured}
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    minLength={6}
                                    className="block w-full px-4 py-3 bg-white/50 border border-slate-200 text-slate-900 rounded-xl focus:ring-2 focus:ring-blue-500 outline-none transition-all placeholder:text-slate-400"
                                    placeholder="••••••••"
                                />
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full flex items-center justify-center py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-lg transform transition-all duration-200 hover:scale-[1.02] disabled:opacity-70"
                        >
                            {loading ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                <>
                                    <span>{!isSupabaseConfigured ? 'Enter Demo Mode' : (mode === 'signin' ? 'Sign In' : 'Create Account')}</span>
                                    <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    {isSupabaseConfigured && (
                        <>
                            <div className="relative my-6">
                                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-200" /></div>
                                <div className="relative flex justify-center text-xs uppercase"><span className="bg-white/50 px-2 text-slate-500 backdrop-blur-sm rounded-full">Or continue with</span></div>
                            </div>

                            <div className="grid grid-cols-1 gap-3">
                                <button
                                    type="button"
                                    onClick={() => handleSocialLogin('google')}
                                    disabled={loading}
                                    className="flex items-center justify-center gap-3 py-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm disabled:opacity-50"
                                >
                                    <img src="https://www.svgrepo.com/show/475656/google-color.svg" alt="Google" className="w-5 h-5" />
                                    <span className="text-sm font-medium text-slate-700">Sign in with Google</span>
                                </button>
                            </div>
                        </>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-100 text-center">
                        <button
                            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
                            className="text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                        >
                            {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}
