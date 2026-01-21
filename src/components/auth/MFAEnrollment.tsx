import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import QRCode from 'qrcode';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, Loader2, Copy } from 'lucide-react';

export default function MFAEnrollment() {
    const navigate = useNavigate();
    const [factorId, setFactorId] = useState<string>('');
    const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
    const [secret, setSecret] = useState<string>('');
    const [verifyCode, setVerifyCode] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [verifying, setVerifying] = useState(false);

    useEffect(() => {
        enrollMFA();
    }, []);

    const enrollMFA = async () => {
        try {
            const { data, error } = await supabase.auth.mfa.enroll({
                factorType: 'totp',
            });

            if (error) throw error;

            setFactorId(data.id);
            setSecret(data.totp.secret);

            // Generate QR Code
            const url = await QRCode.toDataURL(data.totp.uri);
            setQrCodeUrl(url);
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
            const { data, error } = await supabase.auth.mfa.challenge({
                factorId
            });

            if (error) throw error;

            const { error: verifyError } = await supabase.auth.mfa.verify({
                factorId,
                challengeId: data.id,
                code: verifyCode
            });

            if (verifyError) throw verifyError;

            // Success!
            navigate('/admin');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setVerifying(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen flex items-center justify-center bg-secondary">
            <Loader2 className="w-8 h-8 animate-spin text-brand-600" />
        </div>
    );

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-md w-full space-y-8 bg-white p-8 rounded-xl shadow-lg border border-border">
                <div className="text-center">
                    <ShieldCheck className="mx-auto h-12 w-12 text-brand-600" />
                    <h2 className="mt-6 text-3xl font-extrabold text-foreground">
                        Secure Your Account
                    </h2>
                    <p className="mt-2 text-sm text-muted-foreground">
                        To access the admin panel, you must enable Two-Factor Authentication (2FA).
                    </p>
                </div>

                <div className="space-y-6">
                    {/* QR Code Section */}
                    <div className="flex flex-col items-center justify-center p-4 bg-secondary rounded-lg border border-border">
                        {qrCodeUrl && (
                            <img src={qrCodeUrl} alt="MFA QR Code" className="w-48 h-48 mb-4" />
                        )}
                        <p className="text-xs text-muted-foreground text-center mb-2">
                            Scan this with Google Authenticator or Authy
                        </p>
                        <div className="flex items-center gap-2 text-sm text-gray-700 font-mono bg-white px-3 py-1 rounded border">
                            {secret}
                            <button
                                onClick={() => navigator.clipboard.writeText(secret)}
                                className="text-brand-600 hover:text-brand-700"
                            >
                                <Copy className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    {/* Verification Form */}
                    <form onSubmit={handleVerify} className="mt-8 space-y-6">
                        <div className="rounded-md shadow-sm -space-y-px">
                            <div>
                                <label htmlFor="code" className="sr-only">Verification Code</label>
                                <input
                                    id="code"
                                    name="code"
                                    type="text"
                                    required
                                    className="appearance-none rounded-md relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-foreground focus:outline-none focus:ring-brand-500 focus:border-brand-500 focus:z-10 sm:text-sm text-center tracking-widest text-2xl font-mono"
                                    placeholder="000 000"
                                    value={verifyCode}
                                    onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                                    disabled={verifying}
                                />
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
                                disabled={verifying || verifyCode.length !== 6}
                                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-brand-600 hover:bg-brand-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500 disabled:opacity-50"
                            >
                                {verifying ? (
                                    <Loader2 className="w-5 h-5 animate-spin" />
                                ) : (
                                    "Verify & Enable"
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
