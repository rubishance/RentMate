import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Loader2, Lock, ShieldCheck } from 'lucide-react';

export default function MFAChallenge() {
    const navigate = useNavigate();
    const [factors, setFactors] = useState<any[]>([]);
    const [selectedFactorId, setSelectedFactorId] = useState<string>('');
    const [code, setCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        loadFactors();
    }, []);

    const loadFactors = async () => {
        try {
            const { data, error } = await supabase.auth.mfa.listFactors();
            if (error) throw error;

            const totpFactors = data.totp.filter(f => f.status === 'verified');
            setFactors(totpFactors);
            if (totpFactors.length > 0) {
                setSelectedFactorId(totpFactors[0].id);
            } else {
                // No verified factors? Should generally redirect to enrollment, 
                // but let AdminGuard handle that.
                setError("No MFA factors found.");
            }
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const handleVerify = async (e: React.FormEvent) => {
        e.preventDefault();
        setVerifying(true);
        setError(null);

        try {
            const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({
                factorId: selectedFactorId
            });

            if (challengeError) throw challengeError;

            const { data, error: verifyError } = await supabase.auth.mfa.verify({
                factorId: selectedFactorId,
                challengeId: challengeData.id,
                code
            });

            if (verifyError) throw verifyError;

            // Success, redirect to Admin
            navigate('/admin');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-gray-100">
                <div className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-brand-600" />
                    <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
                        Admin Access
                    </h2>
                    <p className="mt-2 text-sm text-gray-600">
                        Enter your 2FA code to confirm your identity.
                    </p>
                </div>

                <form onSubmit={handleVerify} className="mt-8 space-y-6">
                    <div className="rounded-md shadow-sm -space-y-px">
                        <div>
                            <label htmlFor="code" className="sr-only">Authentication Code</label>
                            <div className="relative">
                                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                    <Lock className="h-5 w-5 text-gray-400" />
                                </div>
                                <input
                                    id="code"
                                    name="code"
                                    type="text"
                                    required
                                    className="appearance-none rounded-md relative block w-full pl-10 px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm text-center tracking-widest text-2xl font-mono"
                                    placeholder="000 000"
                                    value={code}
                                    onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    disabled={verifying}
                                />
                            </div>
                        </div>
                    </div>

                    {error && (
                        <div className="text-red-600 text-sm text-center bg-red-50 p-2 rounded">
                            {error}
                        </div>
                    )}

                    <div>
                        <button
                            type="submit"
                            disabled={verifying || code.length !== 6}
                            className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
                        >
                            {verifying ? (
                                <Loader2 className="w-5 h-5 animate-spin" />
                            ) : (
                                "Verify"
                            )}
                        </button>
                    </div>

                    <div className="text-center">
                        <button
                            type="button"
                            onClick={() => supabase.auth.signOut().then(() => navigate('/login'))}
                            className="text-sm text-gray-500 hover:text-gray-900"
                        >
                            Cancel and Logout
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
