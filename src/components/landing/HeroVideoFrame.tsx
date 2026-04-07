import { motion } from 'framer-motion';
import { Play } from 'lucide-react';
import { cn } from '../../lib/utils';

interface HeroMediaFrameProps {
    type?: 'desktop' | 'mobile' | 'square';
    className?: string;
    children?: React.ReactNode;
}

export function HeroMediaFrame({ type = 'desktop', className, children }: HeroMediaFrameProps) {
    const isDesktop = type === 'desktop';
    const isMobile = type === 'mobile';

    return (
        <div className={cn("relative group h-full w-full", className)}>
            <div className={cn(
                "w-full h-full bg-card backdrop-blur-3xl border border-border/50 overflow-hidden relative flex flex-col transition-all duration-500",
                isDesktop ? "rounded-t-2xl lg:rounded-2xl" : "rounded-2xl lg:rounded-2xl"
            )}>
                
                {/* Header Strip */}
                {isDesktop && (
                    <div className="h-10 w-full bg-muted/30 border-b border-border flex items-center px-4 gap-2 backdrop-blur-md shrink-0">
                        <div className="w-3 h-3 rounded-full bg-destructive/80" />
                        <div className="w-3 h-3 rounded-full bg-warning/80" />
                        <div className="w-3 h-3 rounded-full bg-success/80" />
                    </div>
                )}
                {isMobile && (
                    <div className="absolute top-0 inset-x-0 h-6 flex justify-center z-50">
                        <div className="w-1/3 h-6 bg-foreground/10 rounded-b-xl backdrop-blur-lg" />
                    </div>
                )}

                {/* Content Area */}
                <div className="flex-1 bg-muted/10 relative overflow-hidden flex items-center justify-center p-4">
                    {children ? children : (
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary/5 to-primary/5 flex items-center justify-center">
                            <motion.div 
                                whileHover={{ scale: 1.1 }}
                                whileTap={{ scale: 0.95 }}
                                className="w-16 h-16 rounded-full bg-background border border-border flex items-center justify-center shadow-lg cursor-pointer text-foreground group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors"
                            >
                                <Play className="w-6 h-6 ml-1" fill="currentColor" />
                            </motion.div>
                        </div>
                    )}
                </div>
            </div>
            
            {/* Soft Ambient Shadow */}
            <div className="absolute -inset-2 bg-primary/5 dark:bg-primary/10 blur-2xl -z-10 rounded-full opacity-0 transition-opacity duration-700 group-hover:opacity-100" />
        </div>
    );
}
