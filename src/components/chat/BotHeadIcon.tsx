import { motion } from 'framer-motion';
import { RentyMascot } from '../common/RentyMascot';

export function BotHeadIcon({ className = "w-20 h-20" }: { className?: string }) {
    return (
        <motion.div
            className={`relative ${className} flex items-center justify-center`}
            animate={{ y: [0, -2, 0] }}
            transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
            <RentyMascot size={80} showBackground={false} />
        </motion.div>
    );
}
