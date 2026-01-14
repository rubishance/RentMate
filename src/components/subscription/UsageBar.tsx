import type { FC } from 'react';
import { motion } from 'framer-motion';

interface UsageBarProps {
    label: string;
    current: number;
    max: number;
    colorClass?: string;
}

export const UsageBar: FC<UsageBarProps> = ({ label, current, max, colorClass = "bg-blue-600" }) => {
    const isUnlimited = max === -1;
    const percentage = isUnlimited ? 0 : Math.min((current / max) * 100, 100);

    // Determine color based on usage
    let barColor = colorClass;
    if (!isUnlimited) {
        if (percentage >= 100) barColor = "bg-red-500";
        else if (percentage >= 80) barColor = "bg-orange-500";
    }

    return (
        <div className="space-y-2">
            <div className="flex justify-between text-sm">
                <span className="font-medium text-gray-700 dark:text-gray-300">{label}</span>
                <span className="text-gray-500 text-xs">
                    {current} / {isUnlimited ? '∞' : max}
                </span>
            </div>
            <div className="h-2 w-full bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${isUnlimited ? 5 : percentage}%` }}
                    transition={{ duration: 1, ease: "easeOut" }}
                    className={`h-full rounded-full ${barColor} ${isUnlimited ? 'opacity-50' : ''}`}
                />
            </div>
        </div>
    );
};
