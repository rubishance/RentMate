import React, { useState, useEffect } from 'react';
import { Users, Info, CheckCircle2, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { supabase } from '../../../lib/supabase';
import { useTranslation } from '../../../hooks/useTranslation';
import { useAuth } from '../../../contexts/AuthContext';
import { cn } from '../../../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';

interface ProspectiveTenantsWidgetProps {
    isExpanded?: boolean;
    onToggleExpand?: () => void;
}

export function ProspectiveTenantsWidget({ isExpanded: externalIsExpanded, onToggleExpand }: ProspectiveTenantsWidgetProps) {
    const { t, lang } = useTranslation();
    const { user } = useAuth();
    const isRtl = lang === 'he';
    
    const [property, setProperty] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
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
                // Find properties for the user with their contracts
                const { data: properties } = await supabase
                    .from('properties')
                    .select('id, address, city, contracts(id, status, end_date)')
                    .eq('user_id', user.id);
                
                if (properties) {
                    const today = new Date();
                    const sixtyDaysFromNow = new Date();
                    sixtyDaysFromNow.setDate(today.getDate() + 60);

                    const targetProp = properties.find((p: any) => {
                        const activeContracts = p.contracts?.filter((c: any) => c.status === 'active') || [];
                        // No active contracts
                        if (activeContracts.length === 0) return true;
                        
                        // Or an active contract ending in < 60 days
                        return activeContracts.some((c: any) => new Date(c.end_date) < sixtyDaysFromNow);
                    });

                    if (targetProp) {
                        setProperty(targetProp);
                    }
                }
            } catch (err) {
                console.error('Error fetching properties for widget:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchOpportunity();
    }, [user]);

    if (loading || !property) return null;

    const handleCopyLink = () => {
        const url = `${window.location.origin}/apply/${property.id}`;
        navigator.clipboard.writeText(url);
        setCopied(true);
        setTimeout(() => setCopied(false), 3000);
    };

    return (
        <div className="bg-card rounded-[2.5rem] p-0 shadow-sm border border-border relative overflow-hidden group h-full flex flex-col justify-start">
            <div 
                className="flex items-center justify-between p-5 md:p-6 pb-2 cursor-pointer select-none group/header relative z-10"
                onClick={toggleExpand}
            >
                <div className="flex items-center gap-3">
                    <div className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-xl shrink-0">
                        <Users className="w-5 h-5 text-cyan-500" />
                    </div>
                    <h3 className="text-xl font-black font-heading text-primary">
                        {isRtl ? 'שוכרים פוטנציאליים' : 'Prospective Tenants'}
                    </h3>
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
                                <h3 className="text-xl font-black text-foreground flex items-center gap-2 tracking-tight">
                                    {isRtl ? 'היערכות לדיירים חדשים' : 'Preparation for New Tenants'}
                                </h3>
                                {/* Info icon can stay here if desired, or remove if too cluttered */}
                            </div>

                            <p className="text-base text-muted-foreground leading-relaxed mb-6 font-medium">
                                {isRtl ? (
                                    <>זיהינו שלנכס "{property.address}{property.city ? `, ${property.city}` : ''}" אין חוזה פעיל. שלח קישור לשוכרים פוטנציאלים למלא את פרטיהם ולצרף מסמכים תומכים.</>
                                ) : (
                                    <>We noticed property "{property.address}{property.city ? `, ${property.city}` : ''}" has no active contract. Send a link to prospective tenants to fill out their details and attach supporting documents.</>
                                )}
                            </p>

                            <div className="mt-auto">
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCopyLink(); }}
                                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary/90 py-4 rounded-xl text-primary-foreground text-base font-bold transition-all active:scale-95 shadow-lg shadow-primary/20"
                                >
                                    {copied ? (
                                        <>
                                            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                                            {isRtl ? 'קישור הועתק בהצלחה!' : 'Link Copied Successfully!'}
                                        </>
                                    ) : (
                                        <>
                                            {isRtl ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                                            <Users className="w-5 h-5 ml-1" />
                                            {isRtl ? 'העתק קישור לטופס דיגיטלי' : 'Copy Digital Form Link'}
                                        </>
                                    )}
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}

export default ProspectiveTenantsWidget;
