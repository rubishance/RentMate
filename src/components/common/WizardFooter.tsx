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
    supportAction?: React.ReactNode;
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
    savingLabel,
    supportAction
}: WizardFooterProps) {
    const { t, lang } = useTranslation();
    const isRtl = lang === 'he';

    return (
        <div
            className={cn(
                "p-6 bg-white border-t border-[#CFD8DC] z-[70] transition-all duration-500 shadow-[0_-4px_20px_rgba(0,0,0,0.02)]",
                "flex justify-between items-center px-8 md:px-12",
                isSplitView ? "md:justify-end" : "",
                className
            )}
            style={style}
        >
            <div className="flex items-center gap-4">
                {supportAction}
                
                {showBack && (
                    <Button
                        variant="ghost"
                        onClick={onBack}
                        className="h-12 px-6 rounded-2xl font-bold text-[#37474F] hover:text-[#0D47A1] hover:bg-[#E3F2FD] shrink-0"
                    >
                        {backLabel || t('back')}
                    </Button>
                )}
            </div>

            {!showBack && isSplitView && <div className="hidden md:block" />}

            <div className="flex gap-4 flex-1 md:flex-none justify-end">
                <Button
                    onClick={onNext}
                    disabled={!isValid || isSaving}
                    className={cn(
                        "flex-1 md:w-44 h-12 rounded-2xl text-xs font-black uppercase tracking-widest shadow-minimal group",
                        "bg-primary hover:bg-primary/90 text-primary-foreground"
                    )}
                >
                    {isSaving ? (
                        <div className="flex items-center justify-center gap-2">
                            <Loader2 className="w-5 h-5 animate-spin" />
                            {savingLabel && <span>{savingLabel}</span>}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center gap-2">
                            <span className={isLastStep ? "text-sm" : ""}>
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
