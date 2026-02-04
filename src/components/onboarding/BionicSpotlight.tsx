import { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';
import { useTranslation } from '../../hooks/useTranslation';
import { X, Check } from 'lucide-react';
import { userPreferencesService } from '../../services/user-preferences.service';

interface BionicSpotlightProps {
    targetId: string;
    featureId: string;
    title: string;
    description: string;
    position?: 'top' | 'bottom' | 'left' | 'right';
    onDismiss?: () => void;
}

export function BionicSpotlight({
    targetId,
    featureId,
    title,
    description,
    position = 'bottom',
    onDismiss
}: BionicSpotlightProps) {
    const { preferences, refreshPreferences } = useUserPreferences();
    const { lang } = useTranslation();
    const [rect, setRect] = useState<DOMRect | null>(null);
    const [isVisible, setIsVisible] = useState(false);
    const retryCount = useRef(0);

    // Check visibility logic
    useEffect(() => {
        // If already seen, don't show
        if (preferences.seen_features?.includes(featureId)) {
            return;
        }

        // Try to find element (it might load async)
        const checkElement = () => {
            const el = document.getElementById(targetId);
            if (el) {
                const r = el.getBoundingClientRect();
                // Ensure it's actually visible/sized
                if (r.width > 0 && r.height > 0) {
                    setRect(r);
                    setIsVisible(true);
                }
            } else if (retryCount.current < 10) {
                retryCount.current++;
                setTimeout(checkElement, 500);
            }
        };

        // Initial delay to allow layout to settle
        const timeout = setTimeout(checkElement, 1000);

        // Resize observer to update rect
        const handleResize = () => checkElement();
        window.addEventListener('resize', handleResize);
        window.addEventListener('scroll', handleResize, true);

        return () => {
            clearTimeout(timeout);
            window.removeEventListener('resize', handleResize);
            window.removeEventListener('scroll', handleResize, true);
        };
    }, [targetId, featureId, preferences.seen_features]);

    const handleComplete = async () => {
        setIsVisible(false);
        userPreferencesService.markFeatureSeen(featureId);
        await refreshPreferences();
        if (onDismiss) onDismiss();
    };

    if (!isVisible || !rect) return null;

    // Calculate tooltip position
    const tooltipStyle: React.CSSProperties = {};
    const gap = 16;

    switch (position) {
        case 'bottom':
            tooltipStyle.top = rect.bottom + gap;
            tooltipStyle.left = rect.left + (rect.width / 2) - 150; // Center 300px width
            break;
        case 'top':
            tooltipStyle.bottom = window.innerHeight - rect.top + gap;
            tooltipStyle.left = rect.left + (rect.width / 2) - 150;
            break;
        case 'left': // RTL: Actually implies "Start"
            tooltipStyle.top = rect.top;
            tooltipStyle.right = window.innerWidth - rect.left + gap;
            break;
        case 'right':
            tooltipStyle.top = rect.top;
            tooltipStyle.left = rect.right + gap;
            break;
    }

    // Portal to body to ensure z-index dominance
    return createPortal(
        <AnimatePresence>
            {isVisible && (
                <div className="fixed inset-0 z-[9999] pointer-events-none">
                    {/* Darken Background (Optional - mild focus) */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-neutral-950/20 backdrop-blur-[1px] pointer-events-auto"
                        onClick={handleComplete} // Click anywhere to dismiss
                    />

                    {/* Spotlight Glow on Target */}
                    <div
                        className="absolute transition-all duration-300 pointer-events-none"
                        style={{
                            top: rect.top - 8,
                            left: rect.left - 8,
                            width: rect.width + 16,
                            height: rect.height + 16,
                        }}
                    >
                        {/* Animated pulsing ring */}
                        <div className="absolute inset-0 rounded-2xl border-2 border-indigo-500 shadow-[0_0_30px_rgba(99,102,241,0.5)] animate-pulse bg-indigo-500/10" />

                        {/* Connecting line to tooltip - Simplified visual anchor */}
                    </div>

                    {/* Tooltip Card */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.9, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="absolute pointer-events-auto"
                        style={tooltipStyle}
                    >
                        <div className="w-[300px] glass-premium rounded-2xl shadow-jewel border border-white/20 overflow-hidden relative">
                            {/* Decorative gradient */}
                            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500 to-violet-500" />

                            <div className="p-4">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-sm text-foreground">{title}</h4>
                                    <button
                                        onClick={handleComplete}
                                        className="text-muted-foreground hover:text-foreground transition-colors p-1"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                                    {description}
                                </p>
                                <button
                                    onClick={handleComplete}
                                    className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg shadow-indigo-500/20 flex items-center justify-center gap-2"
                                >
                                    <span>{lang === 'he' ? 'הבנתי, תודה' : 'Got it, thanks'}</span>
                                    <Check className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>,
        document.body
    );
}
