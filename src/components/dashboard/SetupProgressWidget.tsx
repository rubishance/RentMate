import { motion } from 'framer-motion';
import { CheckCircle2, Circle, Trophy, ArrowRight, Home, Users } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';

interface SetupProgressWidgetProps {
    hasProperty: boolean;
    hasTenant: boolean;
}

export function SetupProgressWidget({ hasProperty, hasTenant }: SetupProgressWidgetProps) {
    const { t } = useTranslation();

    // Calculate progress
    const steps = [
        { id: 'signup', label: t('setupSignup'), isCompleted: true, icon: Trophy },
        { id: 'property', label: t('setupProperty'), isCompleted: hasProperty, icon: Home },
        { id: 'tenant', label: t('setupTenant'), isCompleted: hasTenant, icon: Users },
    ];

    const completedCount = steps.filter(s => s.isCompleted).length;
    const progress = (completedCount / steps.length) * 100;

    return (
        <div className="relative overflow-hidden rounded-[2rem] bg-gradient-to-br from-indigo-600 to-violet-700 dark:from-indigo-900 dark:to-violet-950 p-8 shadow-premium text-white">
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-white/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2" />
            <div className="absolute bottom-0 left-0 w-48 h-48 bg-black/10 rounded-full blur-2xl translate-y-1/2 -translate-x-1/2" />

            <div className="relative z-10 grid md:grid-cols-2 gap-8 items-center">
                {/* Left: Text & CTA */}
                <div className="space-y-6">
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <span className="px-3 py-1 rounded-full bg-white/20 text-xs font-black uppercase tracking-widest backdrop-blur-sm border border-white/10">
                                {Math.round(progress)}% {t('complete') || 'Complete'}
                            </span>
                        </div>
                        <h2 className="text-3xl font-black tracking-tight mb-2">
                            {t('setupProfile') || 'Complete Your Profile'}
                        </h2>
                        <p className="text-white/70 text-lg font-medium leading-relaxed max-w-md">
                            {t('setupDesc') || 'Add your first property to unlock the full power of RentMate and reach Bronze level.'}
                        </p>
                    </div>

                    {!hasProperty && (
                        <Link
                            to="/add-property"
                            className="inline-flex items-center gap-3 px-8 py-4 bg-white text-indigo-700 rounded-2xl font-black shadow-lg hover:scale-105 active:scale-95 transition-all group"
                        >
                            {t('addProperty') || 'Add Property'}
                            <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    )}
                </div>

                {/* Right: Progress Steps */}
                <div className="bg-black/20 backdrop-blur-md rounded-3xl p-6 border border-white/10">
                    <div className="space-y-6 relative">
                        {/* Connecting Line */}
                        <div className="absolute left-6 top-6 bottom-6 w-0.5 bg-white/20" />

                        {steps.map((step, index) => {
                            const Icon = step.icon;
                            return (
                                <motion.div
                                    key={step.id}
                                    initial={{ opacity: 0, x: 20 }}
                                    animate={{ opacity: 1, x: 0 }}
                                    transition={{ delay: index * 0.1 }}
                                    className={cn(
                                        "relative flex items-center gap-4 p-3 rounded-2xl transition-all",
                                        step.isCompleted ? "bg-white/10 border border-white/10" : "opacity-60"
                                    )}
                                >
                                    <div className={cn(
                                        "w-12 h-12 rounded-xl flex items-center justify-center shrink-0 z-10 border-2",
                                        step.isCompleted
                                            ? "bg-green-500 border-green-400 text-white shadow-lg"
                                            : "bg-slate-800 border-white/20 text-white/40"
                                    )}>
                                        {step.isCompleted ? <CheckCircle2 className="w-6 h-6" /> : <Icon className="w-5 h-5" />}
                                    </div>
                                    <div>
                                        <div className="text-sm font-black uppercase tracking-wider opacity-70">
                                            {t('step')} {index + 1}
                                        </div>
                                        <div className="font-bold text-lg">
                                            {step.label}
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </div>
                </div>
            </div>
        </div>
    );
}
