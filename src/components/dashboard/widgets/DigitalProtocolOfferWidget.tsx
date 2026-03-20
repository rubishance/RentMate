import React, { useState, useEffect } from 'react';
import { FileSignature, Info, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../contexts/AuthContext';
import { useStack } from '../../../contexts/StackContext';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface DigitalProtocolOfferWidgetProps {
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export function DigitalProtocolOfferWidget({ isExpanded: externalIsExpanded, onToggleExpand }: DigitalProtocolOfferWidgetProps) {
    const { t, lang } = useTranslation();
    const { user } = useAuth();
    const { push } = useStack();
    const isRtl = lang === 'he';
    
    const [contract, setContract] = useState<any>(null);
    const [type, setType] = useState<'entry' | 'exit'>('entry');
    const [loading, setLoading] = useState(true);
    const [localIsExpanded, setLocalIsExpanded] = useState(true);
    const isExpanded = externalIsExpanded !== undefined ? externalIsExpanded : localIsExpanded;

    const toggleExpand = () => {
        if (onToggleExpand) {
            onToggleExpand();
        } else {
            setLocalIsExpanded(!localIsExpanded);
        }
    };

    useEffect(() => {
        const fetchOpportunity = async () => {
            if (!user) return;
            try {
                const { data: contracts } = await supabase
                    .from('contracts')
                    .select('id, property_id, start_date, end_date, properties(address, city)')
                    .eq('user_id', user.id)
                    .eq('status', 'active');
                
                if (contracts) {
                    const today = new Date();
                    const next7Days = new Date();
                    next7Days.setDate(today.getDate() + 7);
                    
                    const next30Days = new Date();
                    next30Days.setDate(today.getDate() + 30);

                    // Find contract for exit: < 7 days until end
                    const exitContract = contracts.find((c: any) => {
                        const endDate = new Date(c.end_date);
                        return endDate > today && endDate <= next7Days;
                    });

                    if (exitContract) {
                        setContract(exitContract);
                        setType('exit');
                        return;
                    }

                    // Find contract for entry: < 30 days since start or < 7 days before start?
                    // "when theres a new contract the widget offered to do a protocol"
                    const entryContract = contracts.find((c: any) => {
                        const startDate = new Date(c.start_date);
                        // Starts within 30 days, or started in the last 14 days
                        const past14Days = new Date();
                        past14Days.setDate(today.getDate() - 14);
                        if (startDate >= past14Days && startDate <= next30Days) {
                            return true;
                        }
                        return false;
                    });

                    if (entryContract) {
                        setContract(entryContract);
                        setType('entry');
                    }
                }
            } catch (err) {
                console.error('Error fetching contracts for protocol widget:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOpportunity();
    }, [user]);

    if (loading || !contract) return null;

    const property = Array.isArray(contract.properties) ? contract.properties[0] : contract.properties;
    const propertyName = property ? `${property.address}${property.city ? `, ${property.city}` : ''}` : t('unknownProperty');

    const handleOpenProtocol = () => {
        push('protocol_wizard', { propertyId: contract.property_id, type }, { isExpanded: true, title: isRtl ? 'פרוטוקול דיגיטלי' : 'Digital Protocol' });
    };

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-0 shadow-sm border border-border dark:border-neutral-800 relative overflow-hidden group h-full flex flex-col justify-start">
            {/* Background design element */}
            <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-bl-[100px] pointer-events-none z-0"></div>

            <div 
                className="flex items-center justify-between p-5 md:p-6 pb-2 cursor-pointer select-none group/header relative z-10"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-xl shrink-0">
                        <FileSignature className="w-5 h-5 text-purple-500" />
                    </div>
                    <div>
                        <h3 className="text-xl font-black font-heading text-primary">
                            {isRtl ? 'פרוטוקול מסירה דיגיטלי' : 'Digital Protocol'}
                        </h3>
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {isRtl ? 'ניהול תיעוד הכניסה והיציאה' : 'Manage entry and exit documentation'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-muted-foreground/50 group-hover/header:text-foreground transition-colors p-1">
                        <ChevronDown className={cn("w-5 h-5 transition-transform duration-300", isExpanded ? "rotate-180" : "rotate-0")} />
                    </div>
                </div>
            </div>

            <AnimatePresence initial={false}>
                {isExpanded && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden relative z-10 flex-1 flex flex-col"
                    >
                        <div className="p-6 pt-2 flex flex-col flex-1">
                            <div className="flex items-center justify-between mb-4 mt-0">
                                <h3 className="text-xl font-black text-primary flex items-center gap-2">
                                    {isRtl ? 'פרוטוקול מסירה דיגיטלי' : 'Digital Protocol'}
                                </h3>
                            </div>

                            <p className="text-[15px] text-slate-600 dark:text-slate-400 leading-relaxed mb-6 font-medium">
                                {type === 'entry' ? (
                                    isRtl 
                                    ? `החוזה בנכס "${propertyName}" מתחיל בקרוב. מומלץ לבצע פרוטוקול כניסה מסודר עם צילומים כדי לחסוך עוגמת נפש בהמשך.`
                                    : `The contract at "${propertyName}" is starting soon. It is highly recommended to perform an entry protocol with photos to save headaches later.`
                                ) : (
                                    isRtl
                                    ? `החוזה בנכס "${propertyName}" מסתיים בעוד פחות מ-7 ימים. מומלץ לבצע פרוטוקול יציאה כדי לוודא שאין פגיעה בנכס.`
                                    : `The contract at "${propertyName}" is ending in less than 7 days. It is recommended to perform an exit protocol to verify the property condition.`
                                )}
                            </p>

                            <div className="mt-auto">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleOpenProtocol(); }}
                                    className="w-full flex items-center justify-center gap-2 bg-amber-50 mx-auto hover:bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:hover:bg-amber-900/50 dark:text-amber-300 py-4 rounded-xl text-[15px] font-bold transition-all active:scale-95 shadow-sm border border-amber-200 dark:border-amber-800/50"
                                >
                                    {isRtl ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                    <FileSignature className="w-4 h-4 ml-1" />
                                    {isRtl ? 'התחל פרוטוקול עכשיו' : 'Start Protocol Now'}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default DigitalProtocolOfferWidget;
