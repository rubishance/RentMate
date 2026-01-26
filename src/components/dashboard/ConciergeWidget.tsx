import { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, MessageCircle, FileSearch, ShieldCheck } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { useTranslation } from '../../hooks/useTranslation';
import { useStack } from '../../contexts/StackContext';
import { supabase } from '../../lib/supabase';

export function ConciergeWidget() {
    const { t, lang } = useTranslation();
    const { push } = useStack();
    const [isVisible, setIsVisible] = useState(false);
    const [stats, setStats] = useState({ properties: 0, contracts: 0 });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            const { data: { user } } = await supabase.auth.getUser();
            if (!user) return;

            const [props, contracts] = await Promise.all([
                supabase.from('properties').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
                supabase.from('contracts').select('id', { count: 'exact', head: true }).eq('user_id', user.id)
            ]);

            setStats({
                properties: props.count || 0,
                contracts: contracts.count || 0
            });

            // Logic: Show concierge if they have properties but no contracts (onboarding stalled)
            if ((props.count || 0) > 0 && (contracts.count || 0) === 0) {
                setIsVisible(true);
            }
            setLoading(false);
        };

        fetchData();
    }, []);

    if (!isVisible || loading) return null;

    return (
        <GlassCard className="relative overflow-hidden border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-500/10 animate-in fade-in slide-in-from-right-4 duration-500">
            {/* Background sparkle bits */}
            <div className="absolute top-0 right-0 p-8 opacity-10 pointer-events-none">
                <Sparkles className="w-24 h-24 text-indigo-500" />
            </div>

            <div className="flex gap-6 items-center">
                <div className="p-4 bg-indigo-500 text-white rounded-[1.5rem] shadow-lg shadow-indigo-500/20">
                    <MessageCircle className="w-6 h-6" />
                </div>

                <div className="flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">RentMate Concierge</span>
                        <div className="w-1 h-1 rounded-full bg-indigo-300" />
                        <span className="text-[10px] font-medium text-muted-foreground">AI Assistant</span>
                    </div>
                    <h3 className="text-xl font-black tracking-tighter text-foreground">
                        {lang === 'he' ? 'צריך עזרה עם חוזי השכירות?' : 'Need help with your contracts?'}
                    </h3>
                    <p className="text-sm text-muted-foreground font-medium max-w-md">
                        {lang === 'he'
                            ? `ראיתי שהוספת ${stats.properties} נכסים אבל עדיין לא העלית חוזים. רוצה שאנתח את החוזה בשבילך עכשיו?`
                            : `I noticed you've added ${stats.properties} properties but no contracts yet. Want me to extract the data for you?`}
                    </p>
                </div>

                <div className="flex flex-col gap-2">
                    <button
                        onClick={() => push('wizard', {}, { isExpanded: true })}
                        className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all flex items-center gap-2 group"
                    >
                        {lang === 'he' ? 'בוא נתחיל בסריקה' : "Let's Start Scanning"}
                        <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </button>
                    <button
                        onClick={() => setIsVisible(false)}
                        className="px-6 py-3 bg-white dark:bg-neutral-800 text-foreground border border-slate-200 dark:border-neutral-700 rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-50 transition-all"
                    >
                        {lang === 'he' ? 'אולי אח"כ' : 'Maybe Later'}
                    </button>
                </div>
            </div>

            {/* Hint icons at the bottom */}
            <div className="mt-6 pt-4 border-t border-indigo-500/10 flex gap-6">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500/60">
                    <FileSearch className="w-3 h-3" />
                    {lang === 'he' ? 'חילוץ נתונים אוטומטי' : 'AI Extraction'}
                </div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-indigo-500/60">
                    <ShieldCheck className="w-3 h-3" />
                    {lang === 'he' ? 'ניטור הצמדה למדד' : 'Linkage Monitoring'}
                </div>
            </div>
        </GlassCard>
    );
}
