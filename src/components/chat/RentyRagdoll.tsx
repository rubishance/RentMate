import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import { useRef, useEffect } from 'react';

/**
 * RentyRagdoll Component (v1.0 - "The Living Puppet")
 * 
 * Features:
 * - Fully Disassembled Assembly: Shoulders, elbows, palms, and torso are separate.
 * - Physics-Lite: Uses framer-motion springs and drag for a 'ragdoll' feel.
 * - Industrial Precision: Uses the v3 high-fidelity separated parts.
 */

interface RagdollPartProps {
    src: string;
    className?: string;
    style?: any;
    drag?: boolean | "x" | "y";
    dragConstraints?: any;
}

function RagdollPart({ src, className, style, drag = true, dragConstraints }: RagdollPartProps) {
    return (
        <motion.div
            drag={drag}
            dragConstraints={dragConstraints}
            dragElastic={0.1}
            dragTransition={{ bounceStiffness: 600, bounceDamping: 20 }}
            className={`absolute pointer-events-auto ${className}`}
            style={style}
        >
            <img src={src} className="w-full h-full object-contain select-none" alt="" />
        </motion.div>
    );
}

export function RentyRagdoll() {
    const constraintsRef = useRef(null);

    // Mouse Tracking for Eyes (Head remains reactive)
    const mouseX = useMotionValue(0);
    const mouseY = useMotionValue(0);

    const handleMouseMove = (e: React.MouseEvent) => {
        if (!constraintsRef.current) return;
        const rect = (constraintsRef.current as HTMLDivElement).getBoundingClientRect();
        const x = (e.clientX - rect.left) / rect.width - 0.5;
        const y = (e.clientY - rect.top) / rect.height - 0.5;
        mouseX.set(x);
        mouseY.set(y);
    };

    return (
        <div
            ref={constraintsRef}
            onMouseMove={handleMouseMove}
            className="relative w-full h-[600px] bg-neutral-900/10 rounded-[3rem] border border-white/5 overflow-hidden cursor-crosshair flex items-center justify-center p-12 isolate"
        >
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808008_1px,transparent_1px),linear-gradient(to_bottom,#80808008_1px,transparent_1px)] bg-[size:32px_32px]"></div>

            <div className="relative w-full max-w-[400px] h-full flex items-center justify-center pointer-events-none">

                {/* 1. LAYER: LEGS */}
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/full_legs_v2.png"
                    className="w-[48%] h-[44%] bottom-[5%] left-[26%] z-0"
                    dragConstraints={constraintsRef}
                />

                {/* 2. LAYER: TORSO (The Anchor) */}
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/torso.png"
                    className="w-[58%] h-[52%] top-[22%] left-[21%] z-20"
                    dragConstraints={constraintsRef}
                />

                {/* 3. LAYER: SHOULDER JOINTS */}
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/shoulder.png"
                    className="w-[16%] h-[16%] top-[28%] left-[15%] z-10"
                    dragConstraints={constraintsRef}
                />
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/shoulder.png"
                    className="w-[16%] h-[16%] top-[28%] right-[15%] z-10 scale-x-[-1]"
                    dragConstraints={constraintsRef}
                />

                {/* 4. LAYER: UPPER ARMS */}
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/upper_arm.png"
                    className="w-[22%] h-[24%] top-[38%] left-[10%] z-5 rotate-[-10deg]"
                    dragConstraints={constraintsRef}
                />
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/upper_arm.png"
                    className="w-[22%] h-[24%] top-[38%] right-[10%] z-5 rotate-[10deg] scale-x-[-1]"
                    dragConstraints={constraintsRef}
                />

                {/* 5. LAYER: ELBOWS */}
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/elbow.png"
                    className="w-[11%] h-[11%] top-[56%] left-[8%] z-10"
                    dragConstraints={constraintsRef}
                />
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/elbow.png"
                    className="w-[11%] h-[11%] top-[56%] right-[8%] z-10 scale-x-[-1]"
                    dragConstraints={constraintsRef}
                />

                {/* 6. LAYER: LOWER ARMS */}
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/lower_arm.png"
                    className="w-[24%] h-[26%] top-[64%] left-[4%] z-5 rotate-[-5deg]"
                    dragConstraints={constraintsRef}
                />
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/lower_arm.png"
                    className="w-[24%] h-[26%] top-[64%] right-[4%] z-5 rotate-[5deg] scale-x-[-1]"
                    dragConstraints={constraintsRef}
                />

                {/* 7. LAYER: PALMS */}
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/palm.png"
                    className="w-[20%] h-[20%] top-[82%] left-[0%] z-30"
                    dragConstraints={constraintsRef}
                />
                <RagdollPart
                    src="/assets/images/matey-layers/ragdoll/palm.png"
                    className="w-[20%] h-[20%] top-[82%] right-[0%] z-30 scale-x-[-1]"
                    dragConstraints={constraintsRef}
                />

                {/* 8. LAYER: HEAD (Topmost & Reactive) */}
                <motion.div
                    drag
                    dragConstraints={constraintsRef}
                    className="absolute top-[14%] left-[30%] w-[40%] h-[32%] z-40 pointer-events-auto"
                >
                    <img
                        src="/assets/images/renty-head-clean.png"
                        className="w-full h-full object-contain select-none"
                        alt="Renty Head"
                    />

                    {/* Face Overlay - Adjusted for Head Alignment */}
                    <div className="absolute inset-0 flex items-center justify-center">
                        <svg viewBox="0 0 100 100" className="w-full h-full opacity-0"> {/* Hide internal SVG eyes if using the official textured eyes */}
                            <g transform="translate(30, 48)">
                                <motion.g style={{ x: useTransform(mouseX, [-0.5, 0.5], [-4, 4]), y: useTransform(mouseY, [-0.5, 0.5], [-3, 3]) }}>
                                    <circle cx="0" cy="0" r="5" fill="black" />
                                    <circle cx="-1.5" cy="-1.5" r="1.5" fill="white" opacity="0.4" />
                                </motion.g>
                            </g>
                            <g transform="translate(70, 48)">
                                <motion.g style={{ x: useTransform(mouseX, [-0.5, 0.5], [-4, 4]), y: useTransform(mouseY, [-0.5, 0.5], [-3, 3]) }}>
                                    <circle cx="0" cy="0" r="5" fill="black" />
                                    <circle cx="-1.5" cy="-1.5" r="1.5" fill="white" opacity="0.4" />
                                </motion.g>
                            </g>
                        </svg>
                    </div>
                </motion.div>

            </div>

            {/* Tech Decoration */}
            <div className="absolute top-8 left-8 text-[10px] font-mono text-gold/20 uppercase tracking-[0.3em]">
                Renty Interactive System // Mode 1.0
            </div>
            <div className="absolute bottom-8 right-8 text-[10px] font-mono text-gold/20 uppercase tracking-[0.2em]">
                Drag parts to test articulation
            </div>
        </div>
    );
}
