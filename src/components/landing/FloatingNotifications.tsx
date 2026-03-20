import { motion } from 'framer-motion';
import { cn } from '../../lib/utils';
import { Bell, TrendingUp, AlertTriangle } from 'lucide-react';

interface FloatingNotificationsProps {
    isRtl: boolean;
}

export function FloatingNotifications({ isRtl }: FloatingNotificationsProps) {
    // Array of fake notification cards representing app value features
    const notifications = [
        {
            icon: <Bell className="w-5 h-5 text-secondary" />,
            title: isRtl ? "חידוש חוזה מתקרב" : "Contract Renewal near",
            subtitle: isRtl ? "נשלחה תזכורת אוטומטית לדייר" : "Auto-reminder sent to tenant",
            theme: "bg-secondary/10 dark:bg-secondary/20 border-secondary/20",
            delay: 0,
            yOffset: [0, -20, 0],
            position: isRtl ? "top-[-20%] left-[-10%]" : "top-[-20%] right-[-10%]",
            rotate: -4
        },
        {
            icon: <TrendingUp className="w-5 h-5 text-success" />,
            title: isRtl ? "עדכון מדד המחירים" : "CPI Updated",
            subtitle: isRtl ? "שכר הדירה עודכן בהתאמה ל-₪5,420" : "Rent adjusted automatically to ₪5,420",
            theme: "bg-success/10 dark:bg-success/20 border-success/20",
            delay: 1.5,
            yOffset: [0, 15, 0],
            position: isRtl ? "bottom-[10%] left-[-15%]" : "bottom-[10%] right-[-15%]",
            rotate: 6
        },
        {
            icon: <AlertTriangle className="w-5 h-5 text-warning" />,
            title: isRtl ? "הוצאה חריגה" : "Unusual Expense",
            subtitle: isRtl ? "מזגן בסלון קפץ ב-200%" : "A/C in living room spiked by 200%",
            theme: "bg-warning/10 dark:bg-warning/20 border-warning/20",
            delay: 3,
            yOffset: [0, -10, 0],
            position: isRtl ? "bottom-[-15%] right-[10%]" : "bottom-[-15%] left-[10%]",
            rotate: -2
        }
    ];

    return (
        <div className="absolute inset-0 pointer-events-none w-full h-full">
            {notifications.map((notif, index) => (
                <motion.div
                    key={index}
                    initial={{ opacity: 0, scale: 0.8, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{
                        duration: 0.8,
                        delay: 0.8 + (index * 0.4),
                        type: "spring",
                        bounce: 0.4
                    }}
                    className={cn(
                        "absolute z-30 shadow-glass backdrop-blur-md rounded-2xl border p-4 w-64",
                        notif.theme,
                        notif.position
                    )}
                    style={{
                        transform: `rotate(${notif.rotate}deg)`,
                    }}
                >
                    <motion.div
                        animate={{ y: notif.yOffset }}
                        transition={{
                            repeat: Infinity,
                            repeatType: "reverse",
                            duration: 4,
                            delay: notif.delay,
                            ease: "easeInOut"
                        }}
                        className="flex items-start gap-4"
                    >
                         <div className="p-2 rounded-xl bg-background border border-border shadow-sm">
                            {notif.icon}
                        </div>
                        <div className="flex flex-col gap-1">
                            <span className="text-sm font-bold text-foreground">
                                {notif.title}
                            </span>
                            <span className="text-xs font-medium text-muted-foreground leading-tight">
                                {notif.subtitle}
                            </span>
                        </div>
                    </motion.div>
                </motion.div>
            ))}
        </div>
    );
}
