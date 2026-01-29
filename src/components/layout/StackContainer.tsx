import React from 'react';
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
    'property_hub': (props) => <PropertyHub property={props.property} propertyId={props.propertyId} />,
    'maintenance_chat': (props) => <MaintenanceChat ticketId={props.ticketId} />,
    'wizard': (props) => <AddPropertyWizard {...props} />,
    'contract_viewer': (props) => <ContractHub contractId={props.contractId} />,
    'document_viewer': (props) => <div className="p-4">Document Viewer</div>,
    'single_bill': (props) => <div className="p-4">Bill Details</div>,
};

export function StackContainer() {
    const { stack, pop } = useStack();

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
                    <div key={layer.id} className="fixed inset-0 z-[100] flex items-end justify-center pointer-events-none">
                        {/* Backdrop - Only show for the top layer or if we want stacking dimming */}
                        <motion.div
                            className="absolute inset-0 bg-black/40 backdrop-blur-sm pointer-events-auto"
                            initial="hidden"
                            animate="visible"
                            exit="hidden"
                            variants={overlayVariants}
                            onClick={() => pop()} // Close on click outside
                        />

                        {/* Sheet / Layer */}
                        <motion.div
                            className={cn(
                                "relative w-full bg-white dark:bg-neutral-900 shadow-2xl overflow-hidden pointer-events-auto flex flex-col",
                                layer.isExpanded ? "h-[100dvh] rounded-none" : "h-[90dvh] rounded-t-[2.5rem]"
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
