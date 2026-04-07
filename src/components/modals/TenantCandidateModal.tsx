import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, User, Phone, Mail, IdCard, Briefcase, DollarSign, FileText, Download, CheckCircle2, Copy } from 'lucide-react';
import { useTranslation } from '../../hooks/useTranslation';
import { format } from 'date-fns';
import { createPortal } from 'react-dom';

interface TenantCandidateModalProps {
    isOpen: boolean;
    onClose: () => void;
    candidate: any | null;
}

export const TenantCandidateModal: React.FC<TenantCandidateModalProps> = ({ isOpen, onClose, candidate }) => {
    const { lang } = useTranslation();

    if (typeof window === 'undefined') return null;

    if (!isOpen || !candidate) return null;

    const handleCopy = (text: string) => {
        if (!text) return;
        navigator.clipboard.writeText(text);
    };

    const hasDocuments = candidate.documents?.idCopy || (candidate.documents?.payslips && candidate.documents.payslips.length > 0);

    return createPortal(
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                        className="fixed inset-0 bg-black/40 backdrop-blur-sm z-[100]"
                    />
                    <div className="fixed inset-0 flex items-end sm:items-center justify-center z-[101] p-0 sm:p-6 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="bg-window shadow-2xl w-full max-w-lg pointer-events-auto overflow-hidden flex flex-col relative h-auto max-h-[90dvh] rounded-t-3xl border-0 mt-auto sm:max-h-[85vh] sm:rounded-2xl sm:border sm:border-border/50 sm:mt-0"
                        >
                            {/* Header */}
                            <div className="relative shrink-0 px-6 pt-6 pb-6 bg-primary text-white shadow-lg flex flex-col w-full z-10 border-b border-white/10">
                                <div className="flex items-start justify-between w-full mb-4">
                                    <div className="inline-flex items-center gap-2 px-2 sm:px-6 py-1 bg-white/10 backdrop-blur-3xl rounded-full border border-white/20 text-xs font-black uppercase tracking-widest shadow-lg">
                                        <FileText className="w-3.5 h-3.5 text-white" />
                                        <span className="text-white">
                                            {lang === 'he' ? 'טופס מועמדות' : 'Tenant Application'}
                                        </span>
                                    </div>
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 flex items-center justify-center bg-white/10 hover:bg-white/20 text-white rounded-full transition-colors backdrop-blur-sm border border-white/10 shadow-sm"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                                <div className="flex flex-col gap-1 min-w-0 flex-1">
                                    <h2 className="text-2xl sm:text-3xl font-black tracking-tighter text-white leading-tight break-words">
                                        {candidate.full_name || (lang === 'he' ? 'מועמד ללא שם' : 'Unnamed Candidate')}
                                    </h2>
                                    <div className="flex items-center gap-2 sm:gap-4 text-white/80 font-medium text-sm mt-1">
                                        <span>{format(new Date(candidate.created_at), 'dd/MM/yyyy')}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Content */}
                            <div className="p-6 overflow-y-auto space-y-6 bg-background0 dark:bg-black w-full flex-1">
                                
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                        {lang === 'he' ? 'פרטי התקשרות וזיהוי' : 'Contact & ID'}
                                    </h3>
                                    
                                    <div className="bg-card dark:bg-neutral-900 border border-border/50 rounded-xl divide-y divide-border/50 overflow-hidden">
                                        {candidate.id_number && (
                                            <div className="flex items-center justify-between p-2 sm:p-6 sm:p-6 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-2 sm:gap-4">
                                                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                                        <IdCard className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-medium">{lang === 'he' ? 'תעודת זהות' : 'ID Number'}</p>
                                                        <p className="text-sm sm:text-base font-bold text-foreground" dir="ltr">{candidate.id_number}</p>
                                                    </div>
                                                </div>
                                                <button onClick={() => handleCopy(candidate.id_number)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                                                    <Copy className="w-4 h-4" />
                                                </button>
                                            </div>
                                        )}
                                        {candidate.phone && (
                                            <div className="flex items-center justify-between p-2 sm:p-6 sm:p-6 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-2 sm:gap-4">
                                                    <div className="p-2 bg-emerald-500/10 text-emerald-500 rounded-lg">
                                                        <Phone className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-medium">{lang === 'he' ? 'טלפון נייד' : 'Mobile Phone'}</p>
                                                        <p className="text-sm sm:text-base font-bold text-foreground" dir="ltr">{candidate.phone}</p>
                                                    </div>
                                                </div>
                                                <div className="flex gap-1">
                                                    <a href={`https://wa.me/${candidate.phone.replace(/\D/g, '')}`} target="_blank" rel="noreferrer" className="px-2 sm:px-6 py-2 text-xs font-bold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/20 rounded-lg transition-colors">
                                                        WhatsApp
                                                    </a>
                                                    <button onClick={() => handleCopy(candidate.phone)} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                                                        <Copy className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        )}
                                        {candidate.email && (
                                            <div className="flex items-center justify-between p-2 sm:p-6 sm:p-6 hover:bg-muted/30 transition-colors">
                                                <div className="flex items-center gap-2 sm:gap-4">
                                                    <div className="p-2 bg-blue-500/10 text-blue-500 rounded-lg">
                                                        <Mail className="w-4 h-4" />
                                                    </div>
                                                    <div>
                                                        <p className="text-xs text-muted-foreground font-medium">{lang === 'he' ? 'אימייל' : 'Email Address'}</p>
                                                        <p className="text-sm sm:text-base font-bold text-foreground">{candidate.email}</p>
                                                    </div>
                                                </div>
                                                <a href={`mailto:${candidate.email}`} className="p-2 text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg transition-colors">
                                                    <Download className="w-4 h-4 rotate-[-90deg]" />
                                                </a>
                                            </div>
                                        )}
                                    </div>
                                </div>
                                
                                <div className="space-y-4">
                                    <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                        {lang === 'he' ? 'תעסוקה והכנסות' : 'Employment & Income'}
                                    </h3>
                                    
                                    <div className="bg-card dark:bg-neutral-900 border border-border/50 rounded-xl divide-y divide-border/50 overflow-hidden">
                                        {candidate.monthly_income != null && (
                                            <div className="flex items-center gap-2 sm:gap-4 p-2 sm:p-6 sm:p-6">
                                                <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                                                    <DollarSign className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-medium">{lang === 'he' ? 'הכנסה חודשית נטו' : 'Monthly Net Income'}</p>
                                                    <p className="text-sm sm:text-base font-bold text-foreground">
                                                        {new Intl.NumberFormat('he-IL', { style: 'currency', currency: 'ILS' }).format(candidate.monthly_income)}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {candidate.employment_details && (
                                            <div className="flex items-start gap-2 sm:gap-4 p-2 sm:p-6 sm:p-6">
                                                <div className="p-2 bg-orange-500/10 text-orange-500 rounded-lg shrink-0 mt-0.5">
                                                    <Briefcase className="w-4 h-4" />
                                                </div>
                                                <div>
                                                    <p className="text-xs text-muted-foreground font-medium">{lang === 'he' ? 'פרטי תעסוקה / מקצוע' : 'Employment Details'}</p>
                                                    <p className="text-sm sm:text-base font-bold text-foreground leading-relaxed whitespace-pre-wrap mt-1">
                                                        {candidate.employment_details}
                                                    </p>
                                                </div>
                                            </div>
                                        )}
                                        {candidate.monthly_income == null && !candidate.employment_details && (
                                            <div className="p-6 text-center text-muted-foreground text-sm font-medium">
                                                {lang === 'he' ? 'לא סופק מידע תעסוקתי' : 'No employment information provided'}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {hasDocuments && (
                                    <div className="space-y-4 pt-2">
                                        <h3 className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                                            {lang === 'he' ? 'מסמכים מצורפים' : 'Attached Documents'}
                                        </h3>
                                        <div className="grid gap-4">
                                            {candidate.documents?.idCopy && (
                                                <a 
                                                    href={`https://qfvrekvugdjnwhnaucmz.supabase.co/storage/v1/object/public/property_documents/${candidate.documents.idCopy}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-2 sm:gap-4 p-2 sm:p-6 bg-primary/5 hover:bg-primary/10 border border-primary/20 rounded-xl transition-colors group"
                                                >
                                                    <div className="p-2 bg-primary/10 text-primary rounded-lg">
                                                        <IdCard className="w-4 h-4" />
                                                    </div>
                                                    <span className="flex-1 font-bold text-sm text-foreground group-hover:text-primary dark:group-hover:text-primary transition-colors">
                                                        {lang === 'he' ? 'צילום תעודת זהות' : 'ID Copy'}
                                                    </span>
                                                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-primary" />
                                                </a>
                                            )}
                                            {candidate.documents?.payslips?.map((slip: string, i: number) => (
                                                <a 
                                                    key={i}
                                                    href={`https://qfvrekvugdjnwhnaucmz.supabase.co/storage/v1/object/public/property_documents/${slip}`}
                                                    target="_blank" rel="noreferrer"
                                                    className="flex items-center gap-2 sm:gap-4 p-2 sm:p-6 bg-indigo-500/5 hover:bg-indigo-500/10 border border-indigo-500/20 rounded-xl transition-colors group"
                                                >
                                                    <div className="p-2 bg-indigo-500/10 text-indigo-500 rounded-lg">
                                                        <FileText className="w-4 h-4" />
                                                    </div>
                                                    <span className="flex-1 font-bold text-sm text-foreground group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                                                        {lang === 'he' ? `תלוש משכורת ${i + 1}` : `Payslip ${i + 1}`}
                                                    </span>
                                                    <Download className="w-4 h-4 text-muted-foreground group-hover:text-indigo-500" />
                                                </a>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>,
        document.body
    );
};
