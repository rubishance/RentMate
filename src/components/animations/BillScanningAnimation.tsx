import { motion } from 'framer-motion';

/**
 * BillScanningAnimation Component
 * 
 * A minimal black and white SVG animation showing:
 * - A phone from the front
 * - A bill being scanned on the screen
 * - The bill automatically filing into the correct folder
 */

interface BillScanningAnimationProps {
    isRtl?: boolean;
}

export const BillScanningAnimation = ({ isRtl = false }: BillScanningAnimationProps) => {
    return (
        <svg viewBox="0 0 600 400" className="w-full h-auto">
            <defs>
                {/* Scanning line gradient */}
                <linearGradient id="scan-line" x1="0%" y1="0%" x2="0%" y2="100%">
                    <stop offset="0%" stopColor="black" stopOpacity="0" />
                    <stop offset="50%" stopColor="black" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="black" stopOpacity="0" />
                </linearGradient>

                {/* Screen glow */}
                <filter id="screen-glow">
                    <feGaussianBlur stdDeviation="3" result="coloredBlur" />
                    <feMerge>
                        <feMergeNode in="coloredBlur" />
                        <feMergeNode in="SourceGraphic" />
                    </feMerge>
                </filter>
            </defs>

            {/* Phone body - front view */}
            <g>
                {/* Phone frame */}
                <rect x="180" y="50" width="240" height="300" rx="24" fill="black" />

                {/* Screen */}
                <rect x="190" y="70" width="220" height="260" rx="16" fill="white" />

                {/* Camera notch */}
                <rect x="270" y="60" width="60" height="8" rx="4" fill="black" />
                <circle cx="285" cy="64" r="3" fill="#333" />

                {/* Home indicator */}
                <rect x="270" y="320" width="60" height="4" rx="2" fill="#e0e0e0" />
            </g>

            {/* Screen content */}
            <g clipPath="url(#screen-clip)">
                <defs>
                    <clipPath id="screen-clip">
                        <rect x="190" y="70" width="220" height="260" rx="16" />
                    </clipPath>
                </defs>

                {/* App header */}
                <rect x="190" y="70" width="220" height="50" fill="#fafafa" />
                <text x="300" y="100" fontSize="14" fontWeight="600" fill="black" textAnchor="middle">
                    {isRtl ? 'סורק מסמכים' : 'Document Scanner'}
                </text>

                {/* Bill document on screen - appears and gets scanned */}
                <motion.g
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.5 }}
                >
                    {/* Bill paper */}
                    <rect x="220" y="140" width="160" height="120" rx="4" fill="white" stroke="black" strokeWidth="1.5" />

                    {/* Bill header */}
                    <text x="300" y="158" fontSize="10" fontWeight="600" fill="black" textAnchor="middle">
                        {isRtl ? 'חשבון חשמל' : 'ELECTRICITY BILL'}
                    </text>
                    <line x1="230" y1="163" x2="370" y2="163" stroke="black" strokeWidth="0.5" opacity="0.2" />

                    {/* Bill content lines */}
                    <line x1={isRtl ? "260" : "230"} y1="175" x2={isRtl ? "370" : "340"} y2="175" stroke="black" strokeWidth="0.8" opacity="0.4" />
                    <line x1={isRtl ? "240" : "230"} y1="185" x2={isRtl ? "370" : "360"} y2="185" stroke="black" strokeWidth="0.8" opacity="0.4" />
                    <line x1={isRtl ? "280" : "230"} y1="195" x2={isRtl ? "370" : "320"} y2="195" stroke="black" strokeWidth="0.8" opacity="0.4" />

                    {/* Amount - highlighted */}
                    <motion.rect
                        x={isRtl ? "295" : "225"}
                        y="205"
                        width="80"
                        height="18"
                        rx="2"
                        fill="black"
                        opacity="0.1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.1 }}
                        transition={{ delay: 1.5, duration: 0.3 }}
                    />
                    <text
                        x={isRtl ? "370" : "230"}
                        y="217"
                        fontSize="11"
                        fontWeight="700"
                        fill="black"
                        textAnchor={isRtl ? "end" : "start"}
                        style={{ direction: 'ltr' }}
                    >
                        ₪324.50
                    </text>

                    {/* Date */}
                    <motion.rect
                        x={isRtl ? "305" : "225"}
                        y="228"
                        width="70"
                        height="15"
                        rx="2"
                        fill="black"
                        opacity="0.1"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 0.1 }}
                        transition={{ delay: 1.7, duration: 0.3 }}
                    />
                    <text
                        x={isRtl ? "370" : "230"}
                        y="238"
                        fontSize="9"
                        fill="black"
                        textAnchor={isRtl ? "end" : "start"}
                        style={{ direction: 'ltr' }}
                    >
                        {isRtl ? '15.01.2026' : 'Jan 15, 2026'}
                    </text>
                </motion.g>

                {/* Scanning line */}
                <motion.rect
                    x="220"
                    y="140"
                    width="160"
                    height="20"
                    fill="url(#scan-line)"
                    initial={{ y: 140 }}
                    animate={{ y: [140, 240, 140] }}
                    transition={{
                        duration: 2,
                        delay: 0.8,
                        repeat: 1,
                        ease: "linear"
                    }}
                />

                {/* Folders appearing at bottom */}
                <motion.g
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 2.5, duration: 0.4 }}
                >
                    {/* Folder 1 - Contracts */}
                    <g opacity="0.4">
                        <path d="M 200 280 L 200 300 L 240 300 L 240 280 L 230 280 L 225 275 L 200 275 Z"
                            fill="none" stroke="black" strokeWidth="1.5" />
                        <text x="220" y="310" fontSize="8" fill="black" textAnchor="middle">
                            {isRtl ? 'חוזים' : 'Contracts'}
                        </text>
                    </g>

                    {/* Folder 2 - Bills (highlighted) */}
                    <g>
                        <motion.path
                            d="M 260 280 L 260 300 L 300 300 L 300 280 L 290 280 L 285 275 L 260 275 Z"
                            fill="black"
                            fillOpacity="0.05"
                            stroke="black"
                            strokeWidth="2"
                            initial={{ scale: 1 }}
                            animate={{ scale: [1, 1.1, 1] }}
                            transition={{ delay: 3.2, duration: 0.4 }}
                        />
                        <text x="280" y="310" fontSize="8" fontWeight="600" fill="black" textAnchor="middle">
                            {isRtl ? 'חשבונות' : 'Bills'}
                        </text>
                    </g>

                    {/* Folder 3 - Reports */}
                    <g opacity="0.4">
                        <path d="M 320 280 L 320 300 L 360 300 L 360 280 L 350 280 L 345 275 L 320 275 Z"
                            fill="none" stroke="black" strokeWidth="1.5" />
                        <text x="340" y="310" fontSize="8" fill="black" textAnchor="middle">
                            {isRtl ? 'דוחות' : 'Reports'}
                        </text>
                    </g>
                </motion.g>

                {/* Bill moving to folder animation */}
                <motion.g
                    initial={{ x: 0, y: 0, scale: 1, opacity: 1 }}
                    animate={{
                        x: [-80, -80],
                        y: [0, 120],
                        scale: [1, 0.3],
                        opacity: [1, 0]
                    }}
                    transition={{
                        delay: 3,
                        duration: 0.8,
                        ease: [0.4, 0, 0.2, 1]
                    }}
                >
                    <rect x="300" y="140" width="80" height="60" rx="3" fill="white" stroke="black" strokeWidth="1.5" />
                    <text x="340" y="158" fontSize="8" fontWeight="600" fill="black" textAnchor="middle">
                        {isRtl ? 'חשמל' : 'ELECTRICITY'}
                    </text>
                    <text x="340" y="168" fontSize="7" fill="black" textAnchor="middle">₪324.50</text>
                </motion.g>

                {/* Success checkmark */}
                <motion.g
                    initial={{ opacity: 0, scale: 0 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 3.8, duration: 0.3, type: "spring" }}
                >
                    <circle cx="280" cy="290" r="12" fill="black" />
                    <motion.path
                        d="M 274 290 L 278 294 L 286 286"
                        stroke="white"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        fill="none"
                        initial={{ pathLength: 0 }}
                        animate={{ pathLength: 1 }}
                        transition={{ delay: 4, duration: 0.2 }}
                    />
                </motion.g>
            </g>

            {/* Status indicator */}
            <motion.g
                initial={{ opacity: 0 }}
                animate={{ opacity: [0, 1, 1, 1, 0] }}
                transition={{
                    duration: 4.5,
                    times: [0, 0.1, 0.7, 0.9, 1]
                }}
            >
                <rect x="220" y="360" width="160" height="28" rx="14" fill="black" />
                <motion.text
                    x="300"
                    y="380"
                    fontSize="12"
                    fontWeight="500"
                    fill="white"
                    textAnchor="middle"
                    initial={{ opacity: 1 }}
                    animate={{ opacity: [1, 1, 1, 0] }}
                    transition={{
                        duration: 4.5,
                        times: [0, 0.6, 0.8, 1]
                    }}
                >
                    {/* Text changes based on animation stage */}
                    <motion.tspan
                        initial={{ opacity: 1 }}
                        animate={{ opacity: [1, 1, 0] }}
                        transition={{ duration: 2.5, times: [0, 0.8, 1] }}
                    >
                        {isRtl ? 'סורק...' : 'Scanning...'}
                    </motion.tspan>
                </motion.text>
                <motion.text
                    x="300"
                    y="380"
                    fontSize="12"
                    fontWeight="500"
                    fill="white"
                    textAnchor="middle"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: [0, 0, 1, 1, 0] }}
                    transition={{
                        duration: 4.5,
                        times: [0, 0.55, 0.6, 0.85, 1]
                    }}
                >
                    {isRtl ? 'מעביר לתיקיית חשבונות...' : 'Filing to Bills folder...'}
                </motion.text>
            </motion.g>
        </svg>
    );
};

export default BillScanningAnimation;
