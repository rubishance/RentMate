import { motion } from 'framer-motion';

interface MascotPopInProps {
    className?: string;
    position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
}

export function MascotPopIn({ className = "", position = 'bottom-right' }: MascotPopInProps) {
    const positionClasses = {
        'bottom-right': 'bottom-0 right-4',
        'bottom-left': 'bottom-0 left-4',
        'top-right': 'top-0 right-4',
        'top-left': 'top-0 left-4'
    };

    return (
        <motion.div
            className={`absolute z-50 pointer-events-none select-none ${positionClasses[position]} ${className}`}
            initial={{ y: 50, opacity: 0, scale: 0.8 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 50, opacity: 0, scale: 0.8 }}
            transition={{
                type: "spring",
                damping: 12,
                stiffness: 100,
                delay: 0.2
            }}
        >
            <div className="relative w-24 md:w-32 lg:w-40 h-auto">
                <motion.img
                    src="/assets/images/renty-droid-front.png"
                    className="w-full h-auto drop-shadow-2xl"
                    alt="Renty"
                    animate={{
                        y: [0, -2, 0],
                        rotate: [-0.5, 0.5, -0.5]
                    }}
                    transition={{
                        duration: 4,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />
                {/* Ground Shadow - Anchors the droid */}
                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-[70%] h-1.5 bg-black/20 blur-md rounded-full" />
            </div>
        </motion.div>
    );
}
