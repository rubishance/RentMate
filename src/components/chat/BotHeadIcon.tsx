import { motion } from 'framer-motion';

export function BotHeadIcon({ className = "w-20 h-20" }: { className?: string }) {
    return (
        <motion.div
            className={`relative ${className} flex items-center justify-center`}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            {/* Background Removal Filter for the new white-bg asset */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id="remove-white-head" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values="
                        1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        -2 -2 -2 1 5
                    " />
                </filter>
            </svg>

            {/* The exact head render with transparency */}
            <img
                src="/assets/images/renty-head-white.png"
                alt="Renty Head"
                className="w-full h-full object-contain pointer-events-none"
                style={{
                    filter: 'url(#remove-white-head)',
                    clipPath: 'inset(0 0 10% 0)'
                }}
            />
        </motion.div>
    );
}
