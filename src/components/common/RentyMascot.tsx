import { motion } from 'framer-motion';

interface RentyMascotProps {
    className?: string;
    size?: number;
    showBackground?: boolean;
}

/**
 * RentyMascot: Heritage Blueprint (Candidate B - Faceless Antenna)
 * A mathematically precise SVG implementation of the Renty mascot.
 */
export function RentyMascot({ className = "", size = 240, showBackground = true }: RentyMascotProps) {
    return (
        <motion.div
            className={`relative flex items-center justify-center ${className}`}
            style={{ width: size, height: size }}
        >
            <svg
                width="100%"
                height="100%"
                viewBox="0 0 240 240"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                className="drop-shadow-[0_0_8px_rgba(255,255,255,0.2)]"
            >
                {/* Optional Background Context */}
                {showBackground && (
                    <rect width="240" height="240" rx="40" fill="#0F172A" />
                )}

                {/* Outer Glow Filter */}
                <defs>
                    <filter id="mascot-glow" x="-20%" y="-20%" width="140%" height="140%">
                        <feGaussianBlur stdDeviation="2" result="blur" />
                        <feComposite in="SourceGraphic" in2="blur" operator="over" />
                    </filter>
                </defs>

                {/* Dual Antenna Stalks & Mini-Heads */}
                <line x1="95" y1="65" x2="85" y2="45" stroke="white" stroke-width="2" />
                <circle cx="85" cy="38" r="8" stroke="white" stroke-width="2" filter="url(#mascot-glow)" />

                <line x1="145" y1="65" x2="155" y2="45" stroke="white" stroke-width="2" />
                <circle cx="155" cy="38" r="8" stroke="white" stroke-width="2" filter="url(#mascot-glow)" />

                {/* Capsule Head Shell */}
                <rect x="50" y="65" width="140" height="110" rx="35" stroke="white" stroke-width="2.5" filter="url(#mascot-glow)" />

                {/* Internal Grid Lines (Blueprint Style) */}
                <g stroke="white" strokeWidth="1" opacity="0.2">
                    <line x1="50" y1="102" x2="190" y2="102" />
                    <line x1="50" y1="138" x2="190" y2="138" />
                    <line x1="95" y1="65" x2="95" y2="175" />
                    <line x1="145" y1="65" x2="145" y2="175" />
                </g>

                {/* Side Hardware Pods */}
                <rect x="35" y="100" width="15" height="40" rx="6" stroke="white" stroke-width="2.5" filter="url(#mascot-glow)" />
                <rect x="190" y="100" width="15" height="40" rx="6" stroke="white" stroke-width="2.5" filter="url(#mascot-glow)" />

                {/* Crosshair Ocular Modules */}
                {/* Left Eye */}
                <g filter="url(#mascot-glow)">
                    <circle cx="85" cy="120" r="18" stroke="white" stroke-width="2.5" />
                    <line x1="67" y1="120" x2="103" y2="120" stroke="white" stroke-width="1.5" />
                    <line x1="85" y1="102" x2="85" y2="138" stroke="white" stroke-width="1.5" />
                    <circle cx="85" cy="120" r="5" fill="white" />
                </g>

                {/* Right Eye */}
                <g filter="url(#mascot-glow)">
                    <circle cx="155" cy="120" r="18" stroke="white" stroke-width="2.5" />
                    <line x1="137" y1="120" x2="173" y2="120" stroke="white" stroke-width="1.5" />
                    <line x1="155" y1="102" x2="155" y2="138" stroke="white" stroke-width="1.5" />
                    <circle cx="155" cy="120" r="5" fill="white" />
                </g>

                {/* Foundation Base (Bottom) */}
                <path d="M100 175Q120 195 140 175" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none" filter="url(#mascot-glow)" />
            </svg>
        </motion.div>
    );
}
