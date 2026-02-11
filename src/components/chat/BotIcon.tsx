import { motion } from 'framer-motion';
import { RentyMascot } from '../common/RentyMascot';

export function BotIcon({ size = 40, className = "" }: { size?: number, className?: string }) {
    return (
        <motion.div
            className={`relative ${className} flex items-center justify-center rounded-2xl bg-transparent border border-white/10 shadow-sm overflow-hidden`}
            style={{ width: size, height: size }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <motion.div
                animate={{
                    rotate: [0, 2, 0, -2, 0]
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <RentyMascot
                    size={size * 0.8}
                    showBackground={false}
                    className="drop-shadow-md"
                />
            </motion.div>

            {/* Inner Sheen */}
            <div className="absolute inset-x-0 top-0 h-1/2 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />

            {/* Soft Glow */}
            <div className="absolute inset-0 bg-brand-500/10 blur-xl -z-10 group-hover:bg-brand-500/20 transition-colors" />
        </motion.div>
    );
}
