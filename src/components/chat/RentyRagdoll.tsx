import { motion } from 'framer-motion';

/**
 * RentyRagdoll Component (v3.0 - "The Droid")
 * 
 * Features:
 * - Astromech Silhouette: Professional, non-humanoid droid.
 * - Grounded Idle: Micro-vibrations and subtle swaying instead of floating.
 * - Tech Visuals: High-fidelity render with red pixel screen and blue scanner.
 */

export function RentyRagdoll() {
    return (
        <div
            className="relative w-full h-[600px] bg-neutral-900/10 rounded-[3rem] border border-white/5 overflow-hidden flex items-center justify-center p-12 isolate"
        >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>

            {/* Droid Model */}
            <motion.div
                className="relative w-full max-w-[420px] h-full flex items-end justify-center cursor-pointer"
                initial={{ y: 40, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 1, ease: "easeOut" }}
            >
                <div className="relative w-full h-[85%] flex items-center justify-center mb-8">
                    {/* Character Asset */}
                    <motion.img
                        src="/assets/images/renty-droid-front.png"
                        className="relative w-full h-full object-contain z-10"
                        alt="Renty Droid"
                        animate={{
                            y: [0, -2, 0], // Subtle micro-vertical jitter
                            rotate: [-0.5, 0.5, -0.5] // Minimal tilt
                        }}
                        transition={{
                            duration: 4,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        whileHover={{ scale: 1.01, transition: { duration: 0.3 } }}
                    />

                    {/* Ground Shadow - Grounded Droids need shadows */}
                    <div className="absolute bottom-[2%] left-[50%] -translate-x-1/2 w-[70%] h-[10%] bg-black/30 blur-2xl rounded-full" />
                </div>
            </motion.div>

            {/* Tech Decoration */}
            <div className="absolute top-8 left-8 text-[10px] font-mono text-blue-500/20 uppercase tracking-[0.3em]">
                Droid Core // R-Series
            </div>
            <div className="absolute bottom-8 right-8 text-[10px] font-mono text-red-500/20 uppercase tracking-[0.2em]">
                Status: Operational
            </div>
        </div>
    );
}
