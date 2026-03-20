import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent, CardTitle } from '../ui/Card';
import { FileSignature, Link, FileText, CheckCircle2, Zap, ChevronDown } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { useAuth } from '../../contexts/AuthContext';
import { useStack } from '../../contexts/StackContext';
import { supabase } from '../../lib/supabase';
import type { Property } from '../../types/database';
import { SelectPropertyModal } from '../modals/SelectPropertyModal';
import { ReportGenerationModal } from '../modals/ReportGenerationModal';
import { motion, AnimatePresence } from 'framer-motion';

interface QuickActionsWidgetProps {
    isExpanded: boolean;
    onToggleExpand: () => void;
}

export function QuickActionsWidget({ isExpanded, onToggleExpand }: QuickActionsWidgetProps) {
    const { lang } = useTranslation();
    const { user } = useAuth();
    const { push } = useStack();
    const isRtl = lang === 'he';

    const [properties, setProperties] = useState<Property[]>([]);
    
    // Modals state
    const [actionType, setActionType] = useState<'protocol' | 'lead' | null>(null);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [copiedLink, setCopiedLink] = useState(false);

    useEffect(() => {
        if (user) {
            supabase
                .from('properties')
                .select('*')
                .eq('user_id', user.id)
                .then(({ data }) => {
                    if (data) setProperties(data);
                });
        }
    }, [user]);

    const handleSelectProperty = (propertyId: string) => {
        if (actionType === 'protocol') {
            push('protocol_wizard', { propertyId, type: 'entry' }, { isExpanded: true, title: isRtl ? 'פרוטוקול מסירה דיגיטלי' : 'Digital Protocol' });
        } else if (actionType === 'lead') {
            const url = `${window.location.origin}/apply/${propertyId}`;
            navigator.clipboard.writeText(url);
            setCopiedLink(true);
            setTimeout(() => setCopiedLink(false), 3000);
        }
        setActionType(null);
    };

    const tools = [
        {
            id: 'protocol',
            icon: <FileSignature className="w-4 h-4 text-amber-500" />,
            title: isRtl ? 'פרוטוקול מסירה דיגיטלי' : 'Digital Protocol',
            subtitle: isRtl ? 'יצירת פרוטוקול מסירה לדירה' : 'Create a digital handover protocol',
            action: () => setActionType('protocol'),
            bg: 'bg-amber-500/10'
        },
        {
            id: 'lead',
            icon: copiedLink ? <CheckCircle2 className="w-4 h-4 text-emerald-500" /> : <Link className="w-4 h-4 text-blue-500" />,
            title: copiedLink ? (isRtl ? 'הקישור הועתק!' : 'Link Copied!') : (isRtl ? 'קישור להשארת פרטים ומסמכים' : 'Leads Link Generator'),
            subtitle: isRtl ? 'שליחת דף נחיתה לשוכרים' : 'Send a landing page to candidates',
            action: () => setActionType('lead'),
            bg: copiedLink ? 'bg-emerald-500/10' : 'bg-blue-500/10'
        },
        {
            id: 'report',
            icon: <FileText className="w-4 h-4 text-indigo-500" />,
            title: isRtl ? 'הפקת דוח ביצועים' : 'Generate Report',
            subtitle: isRtl ? 'הפקת דוח מסודר לבעלי הנכס' : 'Generate an organized property report',
            action: () => setIsReportOpen(true),
            bg: 'bg-indigo-500/10'
        }
    ];

    return (
        <>
            <Card className="glass-premium dark:bg-neutral-900/40 border-white/5 shadow-minimal w-full overflow-hidden flex flex-col rounded-[2.5rem]">
                <CardHeader 
                    className="flex flex-row items-center justify-between pb-2 cursor-pointer group/header"
                    onClick={onToggleExpand}
                >
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-slate-100 dark:bg-neutral-800 rounded-xl shrink-0">
                            <Zap className="w-5 h-5 text-amber-500" />
                        </div>
                        <CardTitle className="text-xl font-black font-heading text-primary">
                            {isRtl ? 'קיצורי דרך' : 'Quick Actions'}
                        </CardTitle>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="text-muted-foreground/50 group-hover/header:text-foreground transition-colors p-1">
                            <ChevronDown className={`w-5 h-5 transition-transform duration-300 ${isExpanded ? 'rotate-180' : ''}`} />
                        </div>
                    </div>
                </CardHeader>

                <AnimatePresence initial={false}>
                    {isExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden"
                        >
                            <CardContent className="p-6">
                                <div className="grid grid-cols-1 gap-3">
                                    {tools.map((tool) => (
                                        <button
                                            key={tool.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                tool.action();
                                            }}
                                            className="group cursor-pointer flex items-center justify-between p-2 rounded-xl hover:bg-background dark:hover:bg-white/5 transition-colors border border-transparent hover:border-border/50 w-full text-start"
                                        >
                                            <div className="flex items-center gap-3">
                                                <div className={`p-2 rounded-xl transition-all group-hover:scale-105 shrink-0 flex items-center justify-center ${tool.bg}`}>
                                                    {tool.icon}
                                                </div>
                                                <span className="text-sm font-medium text-foreground transition-colors">
                                                    {tool.title}
                                                </span>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </CardContent>
                        </motion.div>
                    )}
                </AnimatePresence>
            </Card>

            {/* Modals outside Card for true z-index rendering without interference */}
            <SelectPropertyModal
                isOpen={actionType !== null}
                onClose={() => setActionType(null)}
                properties={properties}
                onSelect={handleSelectProperty}
            />

            <ReportGenerationModal
                isOpen={isReportOpen}
                onClose={() => setIsReportOpen(false)}
            />
        </>
    );
}
