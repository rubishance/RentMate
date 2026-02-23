import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from '../../hooks/useTranslation';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';
import { cn } from '../../lib/utils';
import { userPreferencesService } from '../../services/user-preferences.service';
import { RentyMascot } from '../common/RentyMascot';
import { useStack } from '../../contexts/StackContext';

interface BionicWelcomeOverlayProps {
    firstName: string;
}

export function BionicWelcomeOverlay({ firstName }: BionicWelcomeOverlayProps) {
    const { lang } = useTranslation();
    const { preferences, refreshPreferences } = useUserPreferences();
    const { push } = useStack();
    const navigate = useNavigate();

    // Initialize visible based on preference to avoid useEffect flicker
    // FORCE CHECK: Prioritize localStorage to prevent zombie overlay
    const [isVisible, setIsVisible] = useState(() => {
        try {
            const raw = localStorage.getItem('userPreferences');
            if (raw) {
                const parsed = JSON.parse(raw);
                if (parsed.has_seen_welcome_v1 === true) return false;
            }
        } catch (e) {
            // ignore
        }
        return preferences.has_seen_welcome_v1 !== true;
    });
    const isRtl = lang === 'he';



    const handleDismiss = async () => {
        setIsVisible(false);
        userPreferencesService.setHasSeenWelcome(true);
        await refreshPreferences();
    };

    const handleStart = async () => {
        setIsVisible(false);
        userPreferencesService.setHasSeenWelcome(true);
        await refreshPreferences();
        push('contract_wizard', {}, { isExpanded: true, title: lang === 'he' ? 'הוספת חוזה' : 'Add Contract' });
    };

    return (
        <AnimatePresence>
            {isVisible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
                >
                    {/* Backdrop */}
                    <div
                        className="absolute inset-0 bg-background/80 backdrop-blur-2xl transition-all duration-1000"
                        onClick={handleDismiss} // Click outside to dismiss? Maybe better to force interaction.
                    />

                    {/* Main Card */}
                    <motion.div
                        initial={{ scale: 0.9, y: 20, opacity: 0 }}
                        animate={{ scale: 1, y: 0, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        transition={{ type: "spring", duration: 0.4, bounce: 0.2 }}
                        className="relative w-full max-w-lg"
                    >
                        {/* Jewel Glow Effects */}
                        <div className="absolute -top-20 -left-20 w-64 h-64 bg-indigo-500/20 rounded-full blur-3xl animate-pulse" />
                        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-violet-500/20 rounded-full blur-3xl animate-pulse delay-700" />

                        <div className="relative overflow-hidden rounded-[2.5rem] bg-white/10 dark:bg-neutral-950/40 border border-white/20 shadow-2xl backdrop-blur-xl">
                            {/* Renty Visualization (Abstract/Icon driven) */}
                            <div className="flex flex-col items-center text-center p-8 sm:p-12 space-y-8">

                                {/* Floating Renty Avatar */}
                                <motion.div
                                    animate={{ y: [0, -10, 0] }}
                                    transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }}
                                    className="relative"
                                >
                                    <div className="w-32 h-32 rounded-[2.5rem] bg-gradient-to-br from-indigo-500/20 to-violet-600/20 backdrop-blur-md border border-white/10 flex items-center justify-center shadow-jewel rotate-3 relative overflow-hidden group">
                                        <div className="absolute inset-0 bg-indigo-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                                        <RentyMascot size={96} showBackground={false} className="relative z-10 drop-shadow-2xl" />
                                    </div>
                                    <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 px-3 py-1 bg-white dark:bg-neutral-900 rounded-full shadow-lg border border-indigo-100 dark:border-indigo-900/50 z-20">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400 whitespace-nowrap">
                                            Renty AI
                                        </span>
                                    </div>
                                </motion.div>

                                {/* Content */}
                                <div className="space-y-4 max-w-xs mx-auto">
                                    <h2 className="text-3xl font-black tracking-tighter text-foreground leading-tight">
                                        {lang === 'he' ? `היי ${firstName},` : `Hi ${firstName},`}
                                        <br />
                                        <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">
                                            {lang === 'he' ? 'בוא נתחיל!' : "Let's Get Started!"}
                                        </span>
                                    </h2>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {lang === 'he'
                                            ? 'אני רנטי, העוזר האישי שלך לניהול הנכסים. אני כאן כדי שהכל יעבוד חלק ואוטומטי.'
                                            : "I'm Renty, your portfolio companion. I'm here to make property management effortless and automatic."}
                                    </p>
                                </div>

                                {/* Actions */}
                                <div className="w-full space-y-3">
                                    <button
                                        onClick={handleStart}
                                        className="w-full group relative overflow-hidden rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-4 px-6 transition-all duration-300 shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 hover:-translate-y-1"
                                    >
                                        <div className="flex items-center justify-center gap-3">
                                            <span>{lang === 'he' ? 'הוסף את הנכס הראשון' : 'Add First Property'}</span>
                                            <ArrowRight className={cn("w-5 h-5 transition-transform group-hover:translate-x-1", isRtl && "rotate-180 group-hover:-translate-x-1")} />
                                        </div>
                                    </button>

                                    <button
                                        onClick={handleDismiss}
                                        className="text-xs font-bold text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest py-2"
                                    >
                                        {lang === 'he' ? 'רק להציץ בלוח הבקרה' : 'Just explore dashboard'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
