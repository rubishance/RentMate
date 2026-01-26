import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef } from 'react';

export function BotFullBody({ size = 500, className = "" }: { size?: number, className?: string }) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Mouse Tracking for Perspective Tilt
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    const handleMouseLeave = () => {
        mouseX.set(0);
        mouseY.set(0);
    };

    // Smooth springs for the tilt effect
    const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { stiffness: 150, damping: 20 });
    const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { stiffness: 150, damping: 20 });

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
            className={`relative ${className} flex items-center justify-center`}
            style={{ perspective: 1000 }}
        >


            <motion.div
                className="relative flex items-center justify-center"
                style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 1 }}
            >
                {/* Main Back Glare - Enhanced for Bright Mode */}
                {/* We use a multi-layered glare with mixed blend modes to ensure visibility */}
                <motion.div
                    className="absolute w-[130%] h-[130%] bg-gold/20 dark:bg-gold/10 rounded-full blur-[100px] z-0 mix-blend-multiply dark:mix-blend-screen"
                    animate={{ opacity: [0.3, 0.5, 0.3] }}
                    transition={{ duration: 6, repeat: Infinity }}
                />
                <motion.div
                    className="absolute w-[100%] h-[100%] bg-amber-500/20 dark:bg-amber-500/10 rounded-full blur-[60px] z-0"
                    animate={{ scale: [1, 1.1, 1] }}
                    transition={{ duration: 4, repeat: Infinity }}
                />

                {/* Eye Glow Lights - Increased intensity for Bright Mode */}
                <motion.div
                    className="absolute top-[14%] left-1/2 -translate-x-1/2 w-[40%] h-[15%] flex justify-around pointer-events-none z-20"
                    animate={{ opacity: [0.6, 1, 0.6] }}
                    transition={{ duration: 3, repeat: Infinity }}
                    style={{ transform: "translateZ(50px)" }}
                >
                    <div className="w-[12px] h-[12px] bg-gold dark:bg-gold/60 blur-md rounded-full"></div>
                    <div className="w-[12px] h-[12px] bg-gold dark:bg-gold/60 blur-md rounded-full"></div>
                </motion.div>

                <motion.img
                    src="/assets/images/matey-full-body-v2.png"
                    alt="Renty Animated"
                    className="relative z-10 w-full h-auto object-contain pointer-events-none"
                    style={{
                        width: size,
                        transform: "translateZ(20px)",
                    }}
                    animate={{
                        y: [0, -15, 0],
                    }}
                    transition={{
                        duration: 5,
                        repeat: Infinity,
                        ease: "easeInOut"
                    }}
                />

                {/* Dynamic Shadow */}
                <motion.div
                    className="absolute -bottom-12 left-1/2 -translate-x-1/2 w-[60%] h-4 bg-black/20 dark:bg-black/10 blur-2xl rounded-full z-0"
                    style={{ transform: "translateZ(-20px)" }}
                />
            </motion.div>
        </div>
    );
}
