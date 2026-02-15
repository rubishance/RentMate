import { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { Loader2, CheckCircle, XCircle, Mail } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useTranslation } from '../hooks/useTranslation';

export const Unsubscribe = () => {
    const [searchParams] = useSearchParams();
    const token = searchParams.get('token');
    const type = searchParams.get('type');
    const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
    const [message, setMessage] = useState('');
    const { lang } = useTranslation();

    useEffect(() => {
        const handleUnsubscribe = async () => {
            if (!token) {
                setStatus('error');
                setMessage(lang === 'he' ? 'קישור לא תקין' : 'Invalid link');
                return;
            }

            try {
                const { error } = await supabase.functions.invoke('unsubscribe', {
                    body: { token, type }
                });

                if (error) throw error;

                setStatus('success');
            } catch (err: any) {
                console.error('Unsubscribe error:', err);
                setStatus('error');
                setMessage(err.message || (lang === 'he' ? 'שגיאה בביצוע הפעולה' : 'Action failed'));
            }
        };

        handleUnsubscribe();
    }, [token, type, lang]);

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 text-center space-y-6">
                <div className="flex justify-center">
                    <div className={`p-4 rounded-full ${status === 'loading' ? 'bg-blue-50 text-blue-500' :
                            status === 'success' ? 'bg-green-50 text-green-500' :
                                'bg-red-50 text-red-500'
                        }`}>
                        {status === 'loading' && <Loader2 className="w-8 h-8 animate-spin" />}
                        {status === 'success' && <CheckCircle className="w-8 h-8" />}
                        {status === 'error' && <XCircle className="w-8 h-8" />}
                    </div>
                </div>

                <div className="space-y-2">
                    <h1 className="text-2xl font-bold text-gray-900">
                        {status === 'loading' && (lang === 'he' ? 'מעבד בקשה...' : 'Processing...')}
                        {status === 'success' && (lang === 'he' ? 'הוסרת בהצלחה' : 'Unsubscribed Successfully')}
                        {status === 'error' && (lang === 'he' ? 'שגיאה' : 'Error')}
                    </h1>
                    <p className="text-gray-500">
                        {status === 'loading' && (lang === 'he' ? 'אנא המתן בזמן שאנו מעדכנים את ההעדפות שלך' : 'Please wait while we update your preferences')}
                        {status === 'success' && (lang === 'he' ? 'הוסרת מרשימת התפוצה. לא תקבל יותר הודעות מסוג זה.' : 'You have been removed from this mailing list.')}
                        {status === 'error' && message}
                    </p>
                </div>

                <div className="pt-4 border-t">
                    <Link to="/" className="inline-flex items-center justify-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                        <Mail className="w-4 h-4" />
                        {lang === 'he' ? 'חזרה לדף הבית' : 'Return to Home'}
                    </Link>
                </div>
            </div>
        </div>
    );
};

export default Unsubscribe;
