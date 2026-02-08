import React from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Home, RefreshCw, MoveLeft } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';

interface ErrorDisplayProps {
    title?: string;
    description?: string;
    onRetry?: () => void;
    showHomeButton?: boolean;
    is404?: boolean;
}

export const ErrorDisplay: React.FC<ErrorDisplayProps> = ({
    title,
    description,
    onRetry,
    showHomeButton = true,
    is404 = false,
}) => {
    const navigate = useNavigate();
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';

    // Default values based on type
    const displayTitle = title || (is404 ? t('errorTitle404') : t('errorTitle500'));
    const displayDesc = description || (is404 ? t('errorDesc404') : t('errorDesc500'));

    const [isReporting, setIsReporting] = React.useState(false);
    const [reportSent, setReportSent] = React.useState(false);

    const handleReport = async () => {
        setIsReporting(true);
        try {
            // We use the ErrorLogService to send the report
            const { errorLogService } = await import('../../services/error-log.service');
            const result = await errorLogService.logError(new Error(description || title || 'User Reported Error'), {
                metadata: { manual_report: true }
            });

            if (result.success) {
                setReportSent(true);
                // Simple Alert for now, but in a real app we'd use a toast library
                alert(t('reportSuccess'));
            } else {
                alert(t('reportError'));
            }
        } catch (err) {
            console.error('Report failed:', err);
            alert(t('reportError'));
        } finally {
            setIsReporting(false);
        }
    };

    return (
        <div className="flex min-h-[80vh] w-full flex-col items-center justify-center p-4 text-center animate-in fade-in duration-500">
            <div className="relative mb-8">
                {/* Ambient Glow */}
                <div className="absolute inset-0 blur-3xl opacity-20 bg-brand-500 rounded-full scale-150" />

                {/* Icon Container */}
                <div className="relative glass-premium rounded-3xl p-6 shadow-premium hover:scale-105 transition-transform duration-300 border border-white/20 dark:border-white/10">
                    <AlertTriangle className={`h-16 w-16 ${is404 ? 'text-amber-500' : 'text-red-500'}`} />
                </div>
            </div>

            <h1 className="h1-bionic mb-4 max-w-2xl bg-gradient-to-br from-gray-900 to-gray-600 bg-clip-text text-transparent dark:from-white dark:to-gray-400">
                {displayTitle}
            </h1>

            <p className="mb-10 max-w-lg text-lg text-muted-foreground leading-relaxed">
                {displayDesc}
            </p>

            <div className="flex flex-wrap gap-4 justify-center items-center">
                {onRetry && (
                    <button
                        onClick={onRetry}
                        className="button-jewel flex items-center gap-2 rounded-xl px-6 py-3 font-bold text-white shadow-lg shadow-brand-500/25 transition-all hover:-translate-y-0.5 hover:shadow-xl hover:shadow-brand-500/40 active:translate-y-0 active:scale-95 text-sm"
                    >
                        <RefreshCw className="h-5 w-5" />
                        <span>{t('reset')}</span>
                    </button>
                )}

                {!is404 && !reportSent && (
                    <button
                        onClick={handleReport}
                        disabled={isReporting}
                        className="group flex items-center gap-2 rounded-xl border-2 border-red-100 bg-red-50/50 px-6 py-3 font-bold text-red-600 backdrop-blur-sm transition-all hover:bg-red-50 hover:border-red-200 disabled:opacity-50 dark:border-red-900/30 dark:bg-red-900/10 dark:text-red-400 dark:hover:bg-red-900/20 text-sm"
                    >
                        {isReporting ? (
                            <RefreshCw className="h-5 w-5 animate-spin" />
                        ) : (
                            <AlertTriangle className="h-5 w-5" />
                        )}
                        <span>{isReporting ? t('reporting') : t('reportToAdmin')}</span>
                    </button>
                )}

                {reportSent && (
                    <div className="flex items-center gap-2 px-6 py-3 bg-green-50 text-green-600 rounded-xl font-bold border border-green-100 animate-in zoom-in duration-300 text-sm">
                        <RefreshCw className="h-5 w-5" />
                        <span>{t('reportSuccess')}</span>
                    </div>
                )}

                {showHomeButton && (
                    <button
                        onClick={() => navigate('/')}
                        className="group flex items-center gap-2 rounded-xl border-2 border-slate-200 bg-white/50 px-6 py-3 font-bold text-slate-700 backdrop-blur-sm transition-all hover:bg-white hover:border-brand-200 hover:text-brand-600 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-brand-700 text-sm"
                    >
                        {isRtl ? <MoveLeft className="h-5 w-5 transition-transform group-hover:-translate-x-1" /> : <Home className="h-5 w-5" />}
                        <span>{t('backToHome')}</span>
                    </button>
                )}
            </div>
        </div>
    );
};
