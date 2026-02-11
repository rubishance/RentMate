import { motion } from 'framer-motion';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

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
    const { effectiveTheme } = useUserPreferences();
    const isDark = effectiveTheme === 'dark';

    // DEBUG: Remove after verification
    // console.log(`[RentyMascot] isDark: ${isDark}, effectiveTheme: ${effectiveTheme}`);

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
                src={isDark ? "/assets/images/renty-mascot-white.png" : "/assets/images/renty-mascot-transparent.png"}
                alt="Renty Mascot"
                style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain'
                }}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`drop-shadow-2xl transition-all duration-300 ${isDark ? 'brightness-0 invert' : ''}`}
            />
        </motion.div>
    );
}
