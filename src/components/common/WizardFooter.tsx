import React from 'react';
import { Button } from '../ui/Button';
import { ArrowRight, Loader2 } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { cn } from '../../lib/utils';

interface WizardFooterProps {
    onNext: () => void | Promise<void>;
    onBack: () => void;
    isSaving?: boolean;
    isValid?: boolean;
    isLastStep?: boolean;
    showBack?: boolean;
    isSplitView?: boolean;
    className?: string;
    style?: React.CSSProperties;
    nextLabel?: string;
    backLabel?: string;
    savingLabel?: string;
}

export function WizardFooter({
    onNext,
    onBack,
    isSaving = false,
    isValid = true,
    isLastStep = false,
    showBack = true,
    isSplitView = false,
    className,
    style,
    nextLabel,
    backLabel,
    savingLabel
}: WizardFooterProps) {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';

    return (
        <div
            className={cn(
                "p-8 pb-12 glass-premium dark:bg-neutral-900/80 border-t border-white/5 z-[70] backdrop-blur-3xl transition-all duration-500",
                "flex justify-between items-center px-8 md:px-12",
                isSplitView && "md:justify-end",
                className
            )}
            style={style}
        >
            {showBack && (
                <Button
                    variant="ghost"
                    onClick={onBack}
                    className="h-14 px-8 rounded-2xl font-black uppercase tracking-widest text-muted-foreground hover:text-foreground hover:bg-white/5 shrink-0"
                >
                    {backLabel || t('back')}
                </Button>
            )}

            {!showBack && isSplitView && <div className="hidden md:block" />}

            <div className="flex gap-4 flex-1 md:flex-none">
                <Button
                    onClick={onNext}
                    disabled={!isValid || isSaving}
                    className={cn(
                        "flex-1 md:w-44 h-14 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-minimal group",
                        isLastStep
                            ? "bg-emerald-500 hover:bg-emerald-600 text-white shadow-emerald-500/20"
                            : "button-jewel text-white"
                    )}
                >
                    {isSaving ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {savingLabel && <span>{savingLabel}</span>}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <span className={isLastStep ? "text-[12px]" : ""}>
                                {nextLabel || (isLastStep ? t('finish') : t('next'))}
                            </span>
                            <ArrowRight className={cn(
                                "w-5 h-5 transition-transform group-hover:translate-x-1",
                                isRtl && "rotate-180 group-hover:-translate-x-1"
                            )} />
                        </div>
                    )}
                </Button>
            </div>
        </div>
    );
}
