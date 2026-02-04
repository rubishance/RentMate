import { motion } from 'framer-motion';
import { User } from 'lucide-react';
import { useTranslation } from '../hooks/useTranslation';

export default function Tenants() {
    const { t, lang } = useTranslation();

    return (
        <div className="flex items-center justify-center min-h-[70vh] px-8 animate-in fade-in slide-in-from-bottom-10 duration-1000">
            <div className="glass-premium dark:bg-neutral-900/60 p-16 md:p-24 rounded-[4rem] border-white/10 shadow-jewel max-w-2xl w-full text-center space-y-12 relative overflow-hidden group">
                <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 blur-[100px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />

                <div className="w-32 h-32 bg-white/5 dark:bg-neutral-800/40 rounded-[3rem] flex items-center justify-center mx-auto shadow-minimal border border-white/5 group-hover:scale-110 group-hover:rotate-6 transition-all duration-700 relative z-10">
                    <User className="w-14 h-14 text-indigo-500 opacity-60" />
                </div>

                <div className="space-y-6 relative z-10">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/10 rounded-full border border-indigo-500/20 shadow-sm mb-2">
                        <span className="text-[9px] font-black uppercase tracking-[0.3em] text-indigo-500">
                            {lang === 'he' ? 'בקרוב בקרוב' : 'coming soon'}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-6xl font-black tracking-tighter text-foreground leading-tight lowercase">
                        {t('tenants')}
                    </h1>
                    <p className="text-muted-foreground text-lg font-medium leading-relaxed max-w-md mx-auto opacity-60">
                        {lang === 'he'
                            ? 'אנחנו בונים כלי לניהול דיירים חכם. בקרוב תוכלו לראות את כל הדיירים שלכם, לנהל תקשורת ולעקוב אחר שביעות רצון במקום אחד.'
                            : 'We are building a smart tenant management engine. Soon you will be able to manage communications, track documents, and monitor satisfaction in one place.'}
                    </p>
                </div>

                <div className="pt-8 relative z-10">
                    <div className="h-1.5 w-32 bg-white/10 dark:bg-neutral-800 rounded-full mx-auto relative overflow-hidden">
                        <motion.div
                            initial={{ x: '-100%' }}
                            animate={{ x: '100%' }}
                            transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                            className="absolute inset-0 bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.5)]"
                        />
                    </div>
                </div>
            </div>
        </div>
    );
}
