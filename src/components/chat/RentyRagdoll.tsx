import { motion } from 'framer-motion';

/**
 * RentyRagdoll Component (v2.0 - "The Executive")
 * 
 * Features:
 * - Single-Asset High-Fidelity Render: Uses the unified "Executive" model.
 * - Live Model Animation: Gentle breathing and floating motion instead of ragdoll physics.
 * - Professional Aesthetic: Aligns with the "Zen" design system.
 */

export function RentyRagdoll() {
    return (
        <div
            className="relative w-full h-[600px] bg-neutral-900/10 rounded-[3rem] border border-white/5 overflow-hidden flex items-center justify-center p-12 isolate"
        >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>

            {/* Main Executive Model */}
            <motion.div
                className="relative w-full max-w-[400px] h-full flex items-center justify-center cursor-pointer"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.8, ease: "easeOut" }}
            >
                <div className="relative w-full h-full flex items-center justify-center">
                    {/* Ambient Glow */}
                    <div className="absolute top-[20%] left-[50%] -translate-x-1/2 w-[300px] h-[400px] bg-blue-500/10 blur-[100px] rounded-full mix-blend-screen" />

                    {/* Character Asset */}
                    <motion.img
                        src="/assets/images/renty-full-body-executive.png"
                        className="relative w-full h-full object-contain drop-shadow-2xl z-10"
                        alt="Renty Executive"
                        animate={{
                            y: [-10, 10, -10],
                            rotate: [-1, 1, -1] // Very subtle sway
                        }}
                        transition={{
                            duration: 6,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        whileHover={{ scale: 1.02, transition: { duration: 0.3 } }}
                    />
                </div>
            </motion.div>

            {/* Tech Decoration */}
            <div className="absolute top-8 left-8 text-[10px] font-mono text-blue-500/20 uppercase tracking-[0.3em]">
                System Active // v2.0 Executive
            </div>
            <div className="absolute bottom-8 right-8 text-[10px] font-mono text-neutral-400/20 uppercase tracking-[0.2em]">
                RentMate AI Core
            </div>
        </div>
    );
}
