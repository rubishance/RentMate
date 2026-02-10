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
            {showBackground && (
                <div
                    className="absolute inset-0 rounded-[40px] bg-slate-900 shadow-inner -z-10"
                    style={{ borderRadius: size * 0.16 }}
                />
            )}

            <motion.img
                src="/assets/images/renty-mascot-new.png"
                alt="Renty Mascot"
                style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="drop-shadow-2xl"
            />
        </motion.div>
    );
}
