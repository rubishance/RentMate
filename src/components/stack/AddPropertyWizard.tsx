import { useState } from 'react';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../ui/Button';
import { CheckIcon, ArrowRightIcon } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

// Mock Wizard Steps
const STEPS = [
    { id: 'type', title: 'Asset Type', question: 'What kind of property is this?' },
    { id: 'address', title: 'Location', question: 'Where is it located?' },
    { id: 'details', title: 'Details', question: 'Tell us about the property.' },
];

import { useStack } from '../../contexts/StackContext';

export function AddPropertyWizard() {
    const { t } = useTranslation();
    const { pop } = useStack();
    const [currentStep, setCurrentStep] = useState(0);

    const next = () => {
        if (currentStep === STEPS.length - 1) {
            pop(); // Close wizard (In real app: save data first)
        } else {
            setCurrentStep(prev => prev + 1);
        }
    };
    const back = () => setCurrentStep(prev => Math.max(prev - 1, 0));

    return (
        <div className="flex flex-col h-full bg-slate-50 dark:bg-black">
            {/* Progress Header */}
            <div className="h-20 flex items-center justify-between px-8 bg-white dark:bg-black border-b border-border">
                <div className="flex items-center gap-4">
                    <span className="text-xs font-black uppercase tracking-widest text-muted-foreground">
                        Step {currentStep + 1} of {STEPS.length}
                    </span>
                </div>
                {/* Progress Bar */}
                <div className="flex gap-2">
                    {STEPS.map((_, idx) => (
                        <div key={idx} className={`h-1.5 w-8 rounded-full transition-all duration-300 ${idx <= currentStep ? 'bg-primary' : 'bg-slate-200 dark:bg-neutral-800'}`} />
                    ))}
                </div>
            </div>

            {/* Step Content */}
            <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-2xl mx-auto w-full text-center space-y-12">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={currentStep}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="space-y-6 w-full"
                    >
                        <h2 className="text-4xl font-black tracking-tighter text-foreground">
                            {STEPS[currentStep].question}
                        </h2>

                        {/* Dynamic Step Inputs would go here */}
                        <div className="p-10 bg-white dark:bg-neutral-900 rounded-[2.5rem] border border-slate-100 dark:border-neutral-800 shadow-minimal min-h-[300px] flex items-center justify-center">
                            <span className="text-muted-foreground font-mono">[Input Form for {STEPS[currentStep].title}]</span>
                        </div>

                    </motion.div>
                </AnimatePresence>
            </div>

            {/* Footer Navigation */}
            <div className="p-8 pb-12 bg-white dark:bg-neutral-900 border-t border-border flex justify-between items-center px-10">
                <Button variant="ghost" onClick={back} disabled={currentStep === 0}>
                    Back
                </Button>
                <Button onClick={next} size="lg" className="rounded-full px-8">
                    {currentStep === STEPS.length - 1 ? 'Finish' : 'Next'}
                    <ArrowRightIcon className="w-4 h-4 ml-2" />
                </Button>
            </div>
        </div>
    );
}
