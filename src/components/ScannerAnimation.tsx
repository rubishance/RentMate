import { motion } from 'framer-motion';

export const ScannerAnimation = () => {
    return (
        <div className="relative w-32 h-40 mx-auto mb-8 perspective-1000">
            {/* Background Glow */}
            <motion.div
                className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full"
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.6, 0.3]
                }}
                transition={{
                    duration: 3,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            />

            {/* Document Container */}
            <motion.div
                className="relative h-full bg-white rounded-xl shadow-xl overflow-hidden border border-slate-100 p-4 flex flex-col gap-3"
                initial={{ rotateX: 20, y: 0 }}
                animate={{
                    y: [0, -5, 0],
                    rotateX: [20, 15, 20]
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                {/* Header Mock */}
                <div className="flex gap-2 mb-2">
                    <div className="w-8 h-8 rounded-full bg-slate-100 shrink-0" />
                    <div className="flex flex-col gap-1 w-full justify-center">
                        <div className="w-16 h-2 bg-slate-200 rounded-full" />
                        <div className="w-10 h-1.5 bg-slate-100 rounded-full" />
                    </div>
                </div>

                {/* Content Lines Mock */}
                <div className="space-y-2">
                    <div className="w-full h-2 bg-slate-100 rounded-full" />
                    <div className="w-5/6 h-2 bg-slate-100 rounded-full" />
                    <div className="w-full h-2 bg-slate-100 rounded-full" />
                    <div className="w-4/5 h-2 bg-slate-100 rounded-full" />
                    <div className="w-full h-2 bg-slate-100 rounded-full" />
                    <div className="w-3/4 h-2 bg-slate-100 rounded-full" />
                </div>

                {/* Scanning Beam */}
                <motion.div
                    className="absolute left-0 right-0 h-16 bg-gradient-to-b from-blue-500/0 via-blue-500/20 to-blue-500/0 z-10"
                    style={{ top: '-20%' }}
                    animate={{
                        top: ['-20%', '120%'],
                    }}
                    transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                        repeatDelay: 0.5
                    }}
                >
                    <div className="absolute top-1/2 left-0 right-0 h-[2px] bg-blue-400 shadow-[0_0_20px_rgba(96,165,250,0.8)]" />
                </motion.div>

                {/* Particles/Data Extraction Effect - floating up from scan line */}
                <motion.div
                    className="absolute inset-0 pointer-events-none"
                >
                    {[...Array(6)].map((_, i) => (
                        <motion.div
                            key={i}
                            className="absolute w-1 h-1 bg-blue-500 rounded-full"
                            initial={{ opacity: 0, y: "100%", x: Math.random() * 100 }}
                            animate={{
                                opacity: [0, 1, 0],
                                y: ["100%", "0%"],
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                delay: i * 0.4,
                                ease: "easeOut"
                            }}
                            style={{ left: `${20 + i * 12}%` }}
                        />
                    ))}
                </motion.div>
            </motion.div>
        </div>
    );
};
