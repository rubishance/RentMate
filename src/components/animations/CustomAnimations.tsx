/**
 * Custom Animation Components Library
 * 
 * This file contains reusable animation components and utilities
 * for creating sophisticated animations across the RentMate site.
 * 
 * USAGE METHODS:
 * 
 * 1. CSS Keyframe Animations (Simple, performant)
 * 2. Framer Motion (React-based, powerful)
 * 3. SVG Animations (For illustrations)
 * 4. Scroll-triggered Animations (IntersectionObserver)
 */

import { motion, useScroll, useTransform, useSpring } from 'framer-motion';
import { useEffect, useRef, useState } from 'react';

// ============================================
// METHOD 1: CSS KEYFRAME ANIMATIONS
// ============================================
// Best for: Simple, repeating animations that don't need JS control
// Performance: Excellent (GPU-accelerated)

export const CSSAnimations = () => {
    return (
        <style>{`
            /* Fade in from bottom */
            @keyframes fadeInUp {
                from {
                    opacity: 0;
                    transform: translateY(30px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }

            /* Pulse effect */
            @keyframes pulse {
                0%, 100% {
                    opacity: 1;
                    transform: scale(1);
                }
                50% {
                    opacity: 0.8;
                    transform: scale(1.05);
                }
            }

            /* Shimmer loading effect */
            @keyframes shimmer {
                0% {
                    background-position: -1000px 0;
                }
                100% {
                    background-position: 1000px 0;
                }
            }

            /* Slide in from right */
            @keyframes slideInRight {
                from {
                    opacity: 0;
                    transform: translateX(50px);
                }
                to {
                    opacity: 1;
                    transform: translateX(0);
                }
            }

            /* Rotate and scale */
            @keyframes rotateScale {
                0% {
                    transform: rotate(0deg) scale(1);
                }
                50% {
                    transform: rotate(180deg) scale(1.2);
                }
                100% {
                    transform: rotate(360deg) scale(1);
                }
            }

            /* Bounce */
            @keyframes bounce {
                0%, 100% {
                    transform: translateY(0);
                }
                50% {
                    transform: translateY(-20px);
                }
            }

            /* Apply animations with classes */
            .animate-fade-in-up {
                animation: fadeInUp 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            }

            .animate-pulse {
                animation: pulse 2s ease-in-out infinite;
            }

            .animate-shimmer {
                background: linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%);
                background-size: 1000px 100%;
                animation: shimmer 2s infinite;
            }

            .animate-slide-in-right {
                animation: slideInRight 0.3s cubic-bezier(0.2, 0.8, 0.2, 1) forwards;
            }

            .animate-rotate-scale {
                animation: rotateScale 3s ease-in-out infinite;
            }

            .animate-bounce {
                animation: bounce 1s ease-in-out infinite;
            }

            /* Delay utilities */
            .delay-100 { animation-delay: 100ms; }
            .delay-200 { animation-delay: 200ms; }
            .delay-300 { animation-delay: 300ms; }
            .delay-500 { animation-delay: 500ms; }
        `}</style>
    );
};

// ============================================
// METHOD 2: FRAMER MOTION COMPONENTS
// ============================================
// Best for: Complex, interactive animations with React state
// Performance: Good (optimized for React)

// Fade in with custom variants
export const FadeIn = ({ children, delay = 0, direction = 'up' }: any) => {
    const directions = {
        up: { y: 30 },
        down: { y: -30 },
        left: { x: 30 },
        right: { x: -30 }
    };

    return (
        <motion.div
            initial={{ opacity: 0, ...directions[direction as keyof typeof directions] }}
            animate={{ opacity: 1, x: 0, y: 0 }}
            transition={{ duration: 0.3, delay, ease: [0.2, 0.8, 0.2, 1] }}
        >
            {children}
        </motion.div>
    );
};

// Stagger children animation
export const StaggerContainer = ({ children, staggerDelay = 0.05 }: any) => {
    return (
        <motion.div
            initial="hidden"
            animate="visible"
            variants={{
                visible: {
                    transition: {
                        staggerChildren: staggerDelay
                    }
                }
            }}
        >
            {children}
        </motion.div>
    );
};

export const StaggerItem = ({ children }: any) => {
    return (
        <motion.div
            variants={{
                hidden: { opacity: 0, y: 20 },
                visible: { opacity: 1, y: 0 }
            }}
        >
            {children}
        </motion.div>
    );
};

// Scale on hover
export const ScaleOnHover = ({ children, scale = 1.05 }: any) => {
    return (
        <motion.div
            whileHover={{ scale }}
            whileTap={{ scale: 0.95 }}
            transition={{ type: 'spring', stiffness: 400, damping: 17 }}
        >
            {children}
        </motion.div>
    );
};

// Parallax scroll effect
export const ParallaxScroll = ({ children, offset = 50 }: any) => {
    const { scrollY } = useScroll();
    const y = useTransform(scrollY, [0, 1000], [0, offset]);
    const smoothY = useSpring(y, { stiffness: 100, damping: 30 });

    return (
        <motion.div style={{ y: smoothY }}>
            {children}
        </motion.div>
    );
};

// ============================================
// METHOD 3: SVG ANIMATIONS
// ============================================
// Best for: Custom illustrations and icons
// Performance: Excellent (declarative)

export const AnimatedCheckmark = ({ size = 24, duration = 0.5 }: any) => {
    return (
        <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
            <motion.circle
                cx="12"
                cy="12"
                r="10"
                stroke="black"
                strokeWidth="2"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration, ease: 'easeInOut' }}
            />
            <motion.path
                d="M7 12l3 3 7-7"
                stroke="black"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration, delay: duration, ease: 'easeInOut' }}
            />
        </svg>
    );
};

export const AnimatedSpinner = ({ size = 24 }: any) => {
    return (
        <motion.svg
            width={size}
            height={size}
            viewBox="0 0 24 24"
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
        >
            <circle
                cx="12"
                cy="12"
                r="10"
                stroke="black"
                strokeWidth="2"
                fill="none"
                strokeDasharray="60"
                strokeDashoffset="15"
                strokeLinecap="round"
            />
        </motion.svg>
    );
};

// ============================================
// METHOD 4: SCROLL-TRIGGERED ANIMATIONS
// ============================================
// Best for: Animations that trigger when elements enter viewport
// Performance: Good (uses IntersectionObserver)

export const useScrollAnimation = () => {
    const [isVisible, setIsVisible] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsVisible(true);
                }
            },
            { threshold: 0.1 }
        );

        if (ref.current) {
            observer.observe(ref.current);
        }

        return () => {
            if (ref.current) {
                observer.unobserve(ref.current);
            }
        };
    }, []);

    return { ref, isVisible };
};

export const ScrollReveal = ({ children, className = '' }: any) => {
    const { ref, isVisible } = useScrollAnimation();

    return (
        <div ref={ref} className={className}>
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 30 }}
                transition={{ duration: 0.4, ease: [0.2, 0.8, 0.2, 1] }}
            >
                {children}
            </motion.div>
        </div>
    );
};

// ============================================
// ADVANCED: CUSTOM ANIMATION HOOKS
// ============================================

// Typewriter effect
export const useTypewriter = (text: string, speed = 50) => {
    const [displayText, setDisplayText] = useState('');

    useEffect(() => {
        let index = 0;
        const timer = setInterval(() => {
            if (index < text.length) {
                setDisplayText((prev) => prev + text.charAt(index));
                index++;
            } else {
                clearInterval(timer);
            }
        }, speed);

        return () => clearInterval(timer);
    }, [text, speed]);

    return displayText;
};

// Counter animation
export const useCountUp = (end: number, duration = 2000) => {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let startTime: number;
        let animationFrame: number;

        const animate = (currentTime: number) => {
            if (!startTime) startTime = currentTime;
            const progress = Math.min((currentTime - startTime) / duration, 1);

            setCount(Math.floor(progress * end));

            if (progress < 1) {
                animationFrame = requestAnimationFrame(animate);
            }
        };

        animationFrame = requestAnimationFrame(animate);

        return () => cancelAnimationFrame(animationFrame);
    }, [end, duration]);

    return count;
};

// ============================================
// EXAMPLE USAGE COMPONENTS
// ============================================

export const AnimationShowcase = () => {
    const count = useCountUp(100);
    const typedText = useTypewriter('Welcome to RentMate');

    return (
        <div className="space-y-8 p-8">
            {/* CSS Animation Example */}
            <div className="animate-fade-in-up">
                <h3 className="text-2xl font-bold">CSS Animation</h3>
                <p>This fades in from bottom using pure CSS</p>
            </div>

            {/* Framer Motion Example */}
            <FadeIn delay={0.2} direction="right">
                <h3 className="text-2xl font-bold">Framer Motion</h3>
                <p>This slides in from the right</p>
            </FadeIn>

            {/* Stagger Example */}
            <StaggerContainer>
                {[1, 2, 3].map((i) => (
                    <StaggerItem key={i}>
                        <div className="p-4 bg-gray-100 rounded mb-2">
                            Item {i}
                        </div>
                    </StaggerItem>
                ))}
            </StaggerContainer>

            {/* SVG Animation Example */}
            <div className="flex gap-4">
                <AnimatedCheckmark />
                <AnimatedSpinner />
            </div>

            {/* Scroll Reveal Example */}
            <ScrollReveal>
                <h3 className="text-2xl font-bold">Scroll Reveal</h3>
                <p>This appears when you scroll to it</p>
            </ScrollReveal>

            {/* Counter Example */}
            <div>
                <h3 className="text-2xl font-bold">Counter: {count}</h3>
            </div>

            {/* Typewriter Example */}
            <div>
                <h3 className="text-2xl font-bold">{typedText}</h3>
            </div>
        </div>
    );
};
