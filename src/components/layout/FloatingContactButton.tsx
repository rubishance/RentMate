import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle } from 'lucide-react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';

export function FloatingContactButton() {
    const { lang } = useTranslation();
    const isRtl = lang === 'he';
    const location = useLocation();
    const navigate = useNavigate();

    // Hide FAB on the contact page itself or login/signup
    const hideOnPaths = ['/contact', '/login', '/signup', '/forgot-password', '/reset-password'];
    if (hideOnPaths.includes(location.pathname)) return null;

    return (
        <AnimatePresence>
            <motion.button
                initial={{ scale: 0, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0, opacity: 0, y: 20 }}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={() => navigate('/contact')}
                className={`fixed bottom-32 sm:bottom-24 ${isRtl ? 'left-8' : 'right-8'} z-[100] p-4 bg-green-500 hover:bg-green-600 text-white rounded-2xl shadow-2xl flex items-center gap-3 group overflow-hidden`}
            >
                <div className="absolute inset-0 bg-white/20 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />

                <MessageCircle className="w-6 h-6 relative z-10" />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-300 ease-in-out whitespace-nowrap opacity-0 group-hover:opacity-100 font-bold text-sm relative z-10">
                    {isRtl ? 'תמיכה ב-WhatsApp' : 'WhatsApp Support'}
                </span>

                {/* Pulsing indicator */}
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full animate-ping" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
            </motion.button>
        </AnimatePresence>
    );
}
