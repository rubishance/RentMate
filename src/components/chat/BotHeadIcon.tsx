import { motion } from 'framer-motion';

export function BotHeadIcon({ className = "w-20 h-20" }: { className?: string }) {
    return (
        <motion.div
            className={`relative ${className} flex items-center justify-center`}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            <img
                src="/assets/images/renty-head-clean.png"
                alt="Renty Head"
                className="w-full h-full object-contain pointer-events-none"
            />
        </motion.div>
    );
}
