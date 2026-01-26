import { motion, useMotionValue, useSpring, useTransform, AnimatePresence } from 'framer-motion';
import { useRef, useState, useEffect } from 'react';

/**
 * RentyLively Component (v1.0 - "The Soul in the Shell")
 * 
 * Features:
 * - Single-Asset Integrity: Uses the high-fidelity v2 full body image (no slicing).
 * - 3D Parallax Tilt: Responds to mouse position with premium depth.
 * - Reactive Face Engine: SVG eyes that follow the cursor and blink periodically.
 * - Natural Breathing: Gentle sine-wave floating and dynamic shadowing.
 * - Haptic Interaction: Satisfying bounce and "greeting" state when clicked.
 */

interface RentyLivelyProps {
    className?: string;
    showGreeting?: boolean;
}

export function RentyLively({ className = "w-full h-auto max-w-[450px]" }: RentyLivelyProps) {
    const containerRef = useRef<HTMLDivElement>(null);
    const [isBlinking, setIsBlinking] = useState(false);
    const [isHovered, setIsHovered] = useState(false);

    // 1. Mouse Tracking for Parallax & Eyes
    const mouseX = useMotionValue(0.5);
    const mouseY = useMotionValue(0.5);

    // Smooth Spring Transforms
    const rotateX = useSpring(useTransform(mouseY, [0, 1], [10, -10]), { stiffness: 100, damping: 30 });
    const rotateY = useSpring(useTransform(mouseX, [0, 1], [-10, 10]), { stiffness: 100, damping: 30 });

    // Pupil Tracking (Refined for the head position in v2)
    const pupilX = useTransform(mouseX, [0, 1], [-4, 4]);
    const pupilY = useTransform(mouseY, [0, 1], [-3, 3]);

    // Floating Animation
    const floatY = useSpring(0);

    useEffect(() => {
        // Random Blinking Logic
        const blinkInterval = setInterval(() => {
            if (Math.random() > 0.7) {
                setIsBlinking(true);
                setTimeout(() => setIsBlinking(false), 150);
            }
        }, 3000);

        return () => clearInterval(blinkInterval);
    }, []);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!containerRef.current) return;
        const rect = containerRef.current.getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width;
        const y = (e.clientY - rect.top) / rect.height;
        mouseX.set(x);
        mouseY.set(y);
    };

    return (
        <div
            ref={containerRef}
            onMouseMove={handleMouseMove}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                mouseX.set(0.5);
                mouseY.set(0.5);
            }}
            className={`relative flex items-center justify-center cursor-pointer select-none perspective-1000 ${className}`}
        >
            {/* 1. DYNAMIC SHADOW */}
            <motion.div
                animate={{
                    scale: [0.8, 1, 0.8],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                className="absolute bottom-[-10%] left-1/2 -translate-x-1/2 w-[60%] h-[10%] bg-black blur-[40px] rounded-full pointer-events-none"
            />

            {/* Background Removal Filter */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <filter id="remove-white-lively" colorInterpolationFilters="sRGB">
                    <feColorMatrix type="matrix" values="
                        1 0 0 0 0
                        0 1 0 0 0
                        0 0 1 0 0
                        -2 -2 -2 1 5
                    " />
                </filter>
            </svg>

            {/* 2. THE ROBOT BODY (Tilt & Float) */}
            <motion.div
                style={{
                    rotateX,
                    rotateY,
                    transformStyle: "preserve-3d"
                }}
                animate={{
                    y: [0, -15, 0],
                }}
                transition={{
                    duration: 5,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
                whileTap={{ scale: 0.95 }}
                className="relative w-full h-full"
            >
                {/* Main High-Fi Image */}
                <img
                    src="/assets/images/renty-full-body-white.png"
                    className="w-full h-auto drop-shadow-[0_20px_50px_rgba(197,160,89,0.15)] pointer-events-none"
                    alt="Renty"
                    style={{
                        filter: 'url(#remove-white-lively)',
                        clipPath: 'inset(0 0 2% 0)'
                    }}
                />

                {/* 3. THE SOUL (SVG Face Layer) 
                    Precisely positioned over the head section of the asset
                */}
                <div className="absolute top-[3%] left-[28%] w-[44%] h-[18%] pointer-events-none flex items-center justify-center">
                    <svg viewBox="0 0 100 100" className="w-full h-full overflow-visible">
                        {/* Eyes Container */}
                        <g transform="translate(0, 0)">
                            {/* Left Pupil */}
                            <g transform="translate(34, 48)">
                                <motion.circle
                                    cx={pupilX}
                                    cy={pupilY}
                                    r="5"
                                    fill="black"
                                    animate={{ scaleY: isBlinking ? 0 : 1 }}
                                    transition={{ duration: 0.1 }}
                                />
                                <motion.circle
                                    cx={pupilX}
                                    cy={pupilY}
                                    r="1.5"
                                    fill="white"
                                    opacity="0.4"
                                    animate={{ scaleY: isBlinking ? 0 : 1 }}
                                />
                            </g>

                            {/* Right Pupil */}
                            <g transform="translate(66, 48)">
                                <motion.circle
                                    cx={pupilX}
                                    cy={pupilY}
                                    r="5"
                                    fill="black"
                                    animate={{ scaleY: isBlinking ? 0 : 1 }}
                                    transition={{ duration: 0.1 }}
                                />
                                <motion.circle
                                    cx={pupilX}
                                    cy={pupilY}
                                    r="1.5"
                                    fill="white"
                                    opacity="0.4"
                                    animate={{ scaleY: isBlinking ? 0 : 1 }}
                                />
                            </g>

                            {/* Blink Overlay (Eyelids) */}
                            <AnimatePresence>
                                {isBlinking && (
                                    <motion.g
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        exit={{ opacity: 0 }}
                                    >
                                        <circle cx="34" cy="48" r="6" fill="#2d2d2d" />
                                        <circle cx="66" cy="48" r="6" fill="#2d2d2d" />
                                    </motion.g>
                                )}
                            </AnimatePresence>
                        </g>
                    </svg>
                </div>

                {/* Glow Essence */}
                <div className="absolute top-[28%] left-[45%] w-[10%] h-[10%] bg-gold/10 blur-2xl rounded-full animate-pulse"></div>
            </motion.div>

            {/* Interaction Indicator (Visible on hover) */}
            <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: isHovered ? 1 : 0, y: isHovered ? 0 : 10 }}
                className="absolute top-10 left-1/2 -translate-x-1/2 bg-white dark:bg-neutral-800 px-4 py-2 rounded-2xl shadow-xl border border-gold/20 text-[10px] font-black uppercase tracking-widest text-gold whitespace-nowrap pointer-events-none"
            >
                Direct AI-Link Active
            </motion.div>
        </div>
    );
}
