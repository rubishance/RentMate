import { Popover, Transition } from '@headlessui/react';
import { Fragment, useEffect, useRef, useState } from 'react';
import { Info } from 'lucide-react';
import { cn } from '../../lib/utils';
import { useTranslation } from '../../hooks/useTranslation';

export interface InfoTooltipProps {
    titleKey?: Parameters<ReturnType<typeof useTranslation>['t']>[0] | string;
    textKey: Parameters<ReturnType<typeof useTranslation>['t']>[0] | string;
    exampleKey?: Parameters<ReturnType<typeof useTranslation>['t']>[0] | string;
    className?: string;
    titleOverride?: string;
}

const PanelContent = ({ title, text, example, t }: { title: string, text: string, example?: string, t: any }) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const [offset, setOffset] = useState(0);

    useEffect(() => {
        // Adjust the tooltip position to keep it within the screen bounds
        const updateOffset = () => {
            if (!containerRef.current) return;
            
            // Re-calculate based on original position
            const originalTransform = containerRef.current.style.transform;
            containerRef.current.style.transform = 'none';
            const rect = containerRef.current.getBoundingClientRect();
            
            let newOffset = 0;
            // Add padding of 16px from edges
            if (rect.left < 16) {
                newOffset = 16 - rect.left;
            } else if (rect.right > window.innerWidth - 16) {
                newOffset = window.innerWidth - 16 - rect.right;
            }
            
            containerRef.current.style.transform = originalTransform;
            setOffset(newOffset);
        };
        
        // Timeout to allow the panel to fully mount and measure accurately
        const timer = setTimeout(updateOffset, 10);
        window.addEventListener('resize', updateOffset);
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', updateOffset);
        };
    }, []);

    return (
        <div 
            ref={containerRef}
            className="overflow-hidden rounded-3xl shadow-premium-dark bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl border border-white/40 dark:border-white/10 ring-1 ring-black/5 transition-transform duration-300 ease-out"
            style={offset !== 0 ? { transform: `translateX(${offset}px)` } : undefined}
        >
            <div className="p-6 flex flex-col gap-3">
                {title && (
                    <h4 className="font-extrabold text-sm text-foreground tracking-tight">{title}</h4>
                )}
                <p className="text-sm text-muted-foreground leading-relaxed font-medium">{text}</p>
                
                {example && (
                    <div className="mt-2 bg-primary/5 dark:bg-primary/10 border-s-4 border-primary p-4 rounded-2xl rounded-s-md shadow-inner">
                        <span className="block text-[10px] font-black uppercase tracking-widest text-primary mb-1.5 opacity-80">
                            {t('exampleLabel' as any) || 'דוגמה:'}
                        </span>
                        <p className="text-sm text-foreground/90 leading-relaxed font-semibold">
                            {example}
                        </p>
                    </div>
                )}
            </div>
        </div>
    );
};

export function InfoTooltip({ titleKey, textKey, exampleKey, className, titleOverride }: InfoTooltipProps) {
    const { t } = useTranslation();

    const title = titleOverride || (titleKey ? t(titleKey as any) : '');
    const text = t(textKey as any);
    const example = exampleKey ? t(exampleKey as any) : undefined;

    return (
        <Popover className={cn("relative flex items-center z-[100]", className)}>
            {({ open }) => (
                <>
                    <Popover.Button
                        className={cn(
                            "group rounded-full p-[2px] border transition-colors outline-none",
                            open 
                                ? "bg-primary/10 text-primary border-primary/20 shadow-sm" 
                                : "bg-transparent text-muted-foreground border-transparent hover:text-foreground hover:bg-muted/50 hover:border-border"
                        )}
                        aria-label="More information"
                    >
                        <Info className="w-[18px] h-[18px]" strokeWidth={2.5} />
                    </Popover.Button>

                    <Transition
                        as={Fragment}
                        enter="transition ease-out duration-300"
                        enterFrom="opacity-0 translate-y-2 md:translate-y-0 md:scale-95 origin-bottom md:origin-top"
                        enterTo="opacity-100 translate-y-0 md:scale-100 origin-bottom md:origin-top"
                        leave="transition ease-in duration-200"
                        leaveFrom="opacity-100 translate-y-0 md:scale-100 origin-bottom md:origin-top"
                        leaveTo="opacity-0 translate-y-2 md:translate-y-0 md:scale-95 origin-bottom md:origin-top"
                    >
                        <Popover.Panel className="fixed inset-x-4 bottom-[120px] z-[999] md:absolute md:inset-auto md:w-80 md:top-full md:mt-3 md:right-0 lg:right-auto lg:left-0 origin-bottom md:origin-top">
                            <PanelContent 
                                title={title}
                                text={text}
                                example={example}
                                t={t}
                            />
                        </Popover.Panel>
                    </Transition>
                </>
            )}
        </Popover>
    );
}
