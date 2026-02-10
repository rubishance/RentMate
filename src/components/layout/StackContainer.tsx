import React, { useEffect } from 'react';
import { useStack } from '../../contexts/StackContext';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import { X as CloseIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

import { PropertyHub } from '../stack/PropertyHub';
import { MaintenanceChat } from '../stack/MaintenanceChat';
import { AddPropertyWizard } from '../stack/AddPropertyWizard';
import { ContractHub } from '../stack/ContractHub';

// Placeholder components for the stack layers
const LayerRegistry: Record<string, (props: any) => React.JSX.Element> = {
    'property_hub': (props) => <PropertyHub {...props} />,
    'maintenance_chat': (props) => <MaintenanceChat {...props} />,
    'wizard': (props) => <AddPropertyWizard {...props} />,
    'contract_viewer': (props) => <ContractHub {...props} />,
    'document_viewer': (props) => <div className="p-4">Document Viewer</div>,
    'single_bill': (props) => <div className="p-4">Bill Details</div>,
};

export function StackContainer() {
    const { stack, pop } = useStack();

    // Lock background scrolling when stack is active (unless top layer is modeless)
    // Lock background scrolling and interaction when stack is active
    useEffect(() => {
        const topLayer = stack[stack.length - 1];
        const mainContent = document.getElementById('main-content');
        const header = document.querySelector('header'); // The stream header
        const bottomDock = document.querySelector('.bottom-dock'); // The bottom dock if it has a class

        if (stack.length > 0 && !topLayer?.modeless) {
            // Lock body scroll
            document.body.style.overflow = 'hidden';

            // Add inert to background elements interaction
            if (mainContent) {
                mainContent.setAttribute('inert', '');
                mainContent.style.filter = 'blur(4px) grayscale(40%)';
                mainContent.style.transition = 'filter 0.3s ease';
            }
            if (header) {
                header.setAttribute('inert', '');
                header.style.filter = 'blur(4px) grayscale(40%)';
                header.style.transition = 'filter 0.3s ease';
            }
        } else {
            // Unlock body scroll
            document.body.style.overflow = 'unset';

            // Remove inert and visual effects
            if (mainContent) {
                mainContent.removeAttribute('inert');
                mainContent.style.filter = 'none';
            }
            if (header) {
                header.removeAttribute('inert');
                header.style.filter = 'none';
            }
        }

        // Cleanup on unmount
        return () => {
            document.body.style.overflow = 'unset';
            if (mainContent) {
                mainContent.removeAttribute('inert');
                mainContent.style.filter = 'none';
            }
            if (header) {
                header.removeAttribute('inert');
                header.style.filter = 'none';
            }
        };
    }, [stack.length, stack[stack.length - 1]?.modeless]);

    // Variants for the animations
    const overlayVariants: Variants = {
        hidden: { opacity: 0 },
        visible: { opacity: 1 }
    };

    const sheetVariants: Variants = {
        hidden: { y: '100%' },
        visible: { y: '0%', transition: { type: 'spring', damping: 25, stiffness: 300 } },
        exit: { y: '100%' }
    };

    return (
        <AnimatePresence>
            {stack.map((layer, index) => {
                const isTop = index === stack.length - 1;
                const Component = LayerRegistry[layer.type];

                if (!Component) return null;

                return (
                    <div key={layer.id} className={cn(
                        "fixed top-16 left-0 right-0 bottom-0 z-[100] flex items-end justify-center",
                        layer.modeless ? "pointer-events-none" : "pointer-events-auto"
                    )}>
                        {/* Backdrop - Skip if modeless */}
                        {!layer.modeless && (
                            <motion.div
                                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                                initial="hidden"
                                animate="visible"
                                exit="hidden"
                                variants={overlayVariants}
                                onClick={() => pop()} // Close on click outside
                            />
                        )}

                        {/* Sheet / Layer */}
                        <motion.div
                            className={cn(
                                "relative w-full bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden pointer-events-auto flex flex-col transition-all duration-300",
                                layer.isExpanded ? "h-full rounded-none" : "h-[90%] rounded-t-[2.5rem]"
                            )}
                            initial="hidden"
                            animate="visible"
                            exit="exit"
                            variants={sheetVariants}
                        >
                            {/* Drag Handle (Visual Only for now) & Header */}
                            <div className="h-14 flex items-center justify-between px-6 border-b border-slate-100 dark:border-neutral-800 shrink-0">
                                <div className="flex-1" />
                                <div className="w-12 h-1.5 bg-slate-200 dark:bg-neutral-800 rounded-full mx-auto" />
                                <div className="flex-1 flex justify-end">
                                    <button
                                        onClick={() => pop()}
                                        className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-full hover:bg-slate-200 transition-colors"
                                    >
                                        <CloseIcon className="w-4 h-4 text-muted-foreground" />
                                    </button>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto min-h-0 pb-20">
                                <Component {...layer.props} />
                            </div>
                        </motion.div>
                    </div>
                );
            })}
        </AnimatePresence>
    );
}
