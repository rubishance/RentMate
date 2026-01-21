import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, AlertCircle } from 'lucide-react';
import { ShortenerService } from '../services/shortener.service';
import { useTranslation } from '../hooks/useTranslation';

export function ShortLinkRedirect() {
    const { slug } = useParams<{ slug: string }>();
    const { t } = useTranslation();
    const navigate = useNavigate();
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const resolveLink = async () => {
            if (!slug) return;

            try {
                const originalUrl = await ShortenerService.getOriginalUrl(slug);

                if (originalUrl) {
                    // Redirect to the original URL (which is likely a calculator link)
                    window.location.href = originalUrl;
                } else {
                    setError('linkExpiredOrInvalid');
                }
            } catch (err) {
                console.error('Redirect error:', err);
                setError('linkError');
            }
        };

        resolveLink();
    }, [slug, navigate]);

    if (error) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-secondary dark:bg-foreground p-4">
                <div className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center space-y-4">
                    <div className="mx-auto w-12 h-12 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center">
                        <AlertCircle className="w-6 h-6 text-red-600 dark:text-red-400" />
                    </div>
                    <h2 className="text-xl font-bold text-foreground dark:text-white">
                        {error === 'linkExpiredOrInvalid' ? t('linkExpired') : t('errorOccurred')}
                    </h2>
                    <p className="text-muted-foreground dark:text-muted-foreground">
                        {t('linkExpiredHelper')}
                    </p>
                    <button
                        onClick={() => navigate('/')}
                        className="bg-primary text-white py-2 px-6 rounded-xl font-medium hover:bg-primary/90 transition-colors"
                    >
                        {t('backToHome')}
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-secondary dark:bg-foreground">
            <div className="text-center space-y-4">
                <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
                <p className="text-muted-foreground">{t('redirecting')}</p>
            </div>
        </div>
    );
}
