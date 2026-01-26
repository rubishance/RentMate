import { motion } from 'framer-motion';

export function BotIcon({ size = 40, className = "" }: { size?: number, className?: string }) {
    return (
        <motion.div
            className={`relative ${className} flex items-center justify-center overflow-hidden`}
            style={{ width: size, height: size }}
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
        >
            <motion.img
                src="/assets/images/renty-head-clean.png"
                alt="Renty Official Icon"
                className="w-[100%] h-[100%] object-contain pointer-events-none"
                style={{
                    objectPosition: 'center',
                    transform: 'translateZ(20px)'
                }}
                animate={{
                    scale: [1, 1.05, 1],
                    y: [0, -2, 0]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />
        </motion.div>
    );
}
