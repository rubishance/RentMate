import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { googleDriveService } from '../../services/google-drive.service';
import { Loader2 } from 'lucide-react';

export default function GoogleDriveCallback() {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const handleCallback = async () => {
            const code = searchParams.get('code');
            const errorParam = searchParams.get('error');

            if (errorParam) {
                setError('Google Drive connection denied.');
                setTimeout(() => navigate('/settings'), 3000);
                return;
            }

            if (!code) {
                setError('No authorization code found.');
                setTimeout(() => navigate('/settings'), 3000);
                return;
            }

            try {
                await googleDriveService.handleCallback(code);
                // Success! Redirect back to settings
                navigate('/settings?drive_connected=true');
            } catch (err: any) {
                console.error('Failed to connect Google Drive:', err);
                setError(err.message || 'Failed to connect Google Drive');
                setTimeout(() => navigate('/settings'), 3000);
            }
        };

        handleCallback();
    }, [searchParams, navigate]);

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50">
            <div className="text-center">
                {error ? (
                    <div className="text-red-600 mb-4">
                        <p className="text-xl font-bold">Connection Failed</p>
                        <p>{error}</p>
                        <p className="text-sm text-gray-500 mt-2">Redirecting back to settings...</p>
                    </div>
                ) : (
                    <div className="flex flex-col items-center gap-4">
                        <Loader2 className="w-12 h-12 text-blue-600 animate-spin" />
                        <h2 className="text-xl font-semibold text-gray-900">Connecting to Google Drive...</h2>
                        <p className="text-gray-500">Please wait while we complete the setup.</p>
                    </div>
                )}
            </div>
        </div>
    );
}
