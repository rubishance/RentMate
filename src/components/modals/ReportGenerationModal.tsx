import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../ui/Modal';
import { DatePicker } from '../ui/DatePicker';
import { format, parseISO } from 'date-fns';
import { ReportService } from '../../services/reporting.service';
import { supabase } from '../../lib/supabase';
import { Switch } from '../ui/Switch';
import { useTranslation } from '../../hooks/useTranslation';
import type { Property, PropertyDocument } from '../../types/database';
import { UTILITY_TYPES } from '../../constants/utilityTypes';

interface ReportGenerationModalProps {
    isOpen: boolean;
    onClose: () => void;
    propertyId?: string;
}

export function ReportGenerationModal({ isOpen, onClose, propertyId }: ReportGenerationModalProps) {
    const { t, lang } = useTranslation();
    const [properties, setProperties] = useState<Property[]>([]);
    const [selectedPropertyId, setSelectedPropertyId] = useState(propertyId || '');
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().getFullYear(), new Date().getMonth() - 1, 1).toISOString().split('T')[0],
        end: new Date(new Date().getFullYear(), new Date().getMonth(), 0).toISOString().split('T')[0]
    });
    const [generating, setGenerating] = useState(false);
    const [success, setSuccess] = useState(false);

    // New configuration state
    const [includeAssetDetails, setIncludeAssetDetails] = useState(true);
    const [includeExpenses, setIncludeExpenses] = useState(false);
    const [expensesList, setExpensesList] = useState<PropertyDocument[]>([]);
    const [selectedExpenseIds, setSelectedExpenseIds] = useState<string[]>([]);
    const [loadingExpenses, setLoadingExpenses] = useState(false);

    useEffect(() => {
        if (isOpen && !propertyId) {
            fetchProperties();
        }
    }, [isOpen, propertyId]);

    useEffect(() => {
        if (includeExpenses && selectedPropertyId) {
            fetchExpenses();
        }
    }, [includeExpenses, selectedPropertyId]);

    const fetchProperties = async () => {
        const { data } = await supabase.from('properties').select('*').order('address');
        if (data) setProperties(data);
    };

    const fetchExpenses = async () => {
        setLoadingExpenses(true);
        const { data } = await supabase
            .from('property_documents')
            .select('*')
            .eq('property_id', selectedPropertyId)
            .in('category', [
                'utility_water', 'utility_electric', 'utility_gas', 'utility_cable', 'utility_internet', 
                'utility_municipality', 'utility_management', 'utility_other', 
                'maintenance', 'invoice', 'insurance', 'warranty', 'legal'
            ])
            .order('document_date', { ascending: false });
        
        if (data) setExpensesList(data);
        setLoadingExpenses(false);
    };

    const toggleExpense = (id: string) => {
        setSelectedExpenseIds(prev => 
            prev.includes(id) ? prev.filter(eId => eId !== id) : [...prev, id]
        );
    };


    const handleGenerate = async () => {
        if (!selectedPropertyId) return;
        setGenerating(true);
        try {
            await ReportService.generatePDF(
                selectedPropertyId, 
                dateRange.start, 
                dateRange.end, 
                lang,
                includeAssetDetails,
                includeExpenses,
                selectedExpenseIds
            );
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2500); // Slightly more time for the bionic success animation
        } catch (err: any) {
            console.error('Report Error:', err);
            alert(`Failed to generate report: ${err.message || 'Unknown error'}`);
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Modal
            isOpen={isOpen}
            onClose={onClose}
            title={lang === 'he' ? 'הפקת דוח ביצועים' : 'Generate Performance Report'}
        >
            <div className="space-y-6 sm:space-y-8">
                <div className="flex items-center gap-4 p-6 bg-primary/10 rounded-[1.5rem] border border-primary/20">
                    <FileText className="w-8 h-8 text-primary" />
                    <div>
                        <h4 className="text-sm font-black text-foreground">{lang === 'he' ? 'דוח פיננסי מקצועי' : 'Professional Reporting'}</h4>
                        <p className="text-xs font-medium text-muted-foreground">{lang === 'he' ? 'סיכום פיננסי מקיף לבעלי נכסים' : 'Comprehensive financial summary for property owners'}</p>
                    </div>
                </div>

                {!propertyId && (
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">{lang === 'he' ? 'בחירת נכס' : 'Select Property'}</label>
                        <select
                            value={selectedPropertyId}
                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                            className="w-full h-14 px-6 bg-background dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-2xl font-bold focus:ring-2 focus:ring-primary outline-none transition-all"
                        >
                            <option value="">{lang === 'he' ? 'בחירת נכס...' : 'Choose a property...'}</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">{lang === 'he' ? 'תאריך התחלה' : 'Start Date'}</label>
                        <DatePicker
                            hideIcon
                            value={dateRange.start ? parseISO(dateRange.start) : undefined}
                            onChange={(date) => setDateRange(prev => ({ ...prev, start: date ? format(date, 'yyyy-MM-dd') : '' }))}
                            className="w-full"
                        />
                    </div>
                    <div className="space-y-4">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">{lang === 'he' ? 'תאריך סיום' : 'End Date'}</label>
                        <DatePicker
                            hideIcon
                            value={dateRange.end ? parseISO(dateRange.end) : undefined}
                            onChange={(date) => setDateRange(prev => ({ ...prev, end: date ? format(date, 'yyyy-MM-dd') : '' }))}
                            className="w-full"
                        />
                    </div>
                </div>

                <div className="space-y-4 pt-6 border-t border-border/50">
                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-bold cursor-pointer" onClick={() => setIncludeAssetDetails(!includeAssetDetails)}>
                                {lang === 'he' ? 'הצג פרטי נכס' : 'Include Asset Details'}
                            </label>
                            <p className="text-xs text-muted-foreground">{lang === 'he' ? 'כולל מספר חדרים ומ"ר' : 'Includes rooms and sqm'}</p>
                        </div>
                        <Switch checked={includeAssetDetails} onChange={setIncludeAssetDetails} />
                    </div>

                    <div className="flex items-center justify-between">
                        <div className="space-y-0.5">
                            <label className="text-sm font-bold cursor-pointer" onClick={() => setIncludeExpenses(!includeExpenses)}>
                                {lang === 'he' ? 'צרף הוצאות מגובות בקבלה' : 'Include Receipt-Backed Expenses'}
                            </label>
                            <p className="text-xs text-muted-foreground">{lang === 'he' ? 'המסמכים יוצגו בעמוד נפרד כנספח' : 'Documents will be shown in a separate annex page'}</p>
                        </div>
                        <Switch checked={includeExpenses} onChange={setIncludeExpenses} />
                    </div>
                </div>

                {includeExpenses && (
                    <div className="space-y-4 bg-muted/30 p-6 rounded-2xl border border-border">
                        <label className="text-xs font-black uppercase tracking-widest text-muted-foreground ml-2">
                            {lang === 'he' ? 'בחר הוצאות לצירוף' : 'Select Expenses to Include'}
                        </label>
                        {loadingExpenses ? (
                            <div className="flex items-center justify-center p-6"><Loader2 className="w-5 h-5 animate-spin text-primary" /></div>
                        ) : expensesList.length === 0 ? (
                            <div className="p-6 text-center text-sm font-medium text-muted-foreground bg-background rounded-xl border border-border/50">
                                {lang === 'he' ? 'לא נמצאו הוצאות לנכס זה' : 'No expenses found for this property'}
                            </div>
                        ) : (
                            <div className="max-h-48 overflow-y-auto space-y-4 pr-2 custom-scrollbar focus-ring p-1">
                                {expensesList.map(expense => (
                                    <div 
                                        key={expense.id} 
                                        onClick={() => toggleExpense(expense.id)}
                                        className={`flex items-center justify-between p-2 sm:p-6 rounded-xl border transition-all cursor-pointer select-none ${
                                            selectedExpenseIds.includes(expense.id) 
                                                ? 'bg-primary/5 border-primary/30 shadow-sm' 
                                                : 'bg-background border-border/50 hover:border-border'
                                        }`}
                                    >
                                        <div className="flex items-center gap-2 sm:gap-4">
                                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center transition-colors ${
                                                selectedExpenseIds.includes(expense.id) 
                                                    ? 'bg-primary border-primary text-primary-foreground' 
                                                    : 'border-slate-300 dark:border-neutral-600'
                                            }`}>
                                                {selectedExpenseIds.includes(expense.id) && <CheckCircle2 className="w-3.5 h-3.5" strokeWidth={3} />}
                                            </div>
                                            <div className="flex flex-col">
                                                <span className="text-sm font-bold text-foreground line-clamp-1">
                                                    {expense.title || (() => {
                                                        const cat = expense.category || '';
                                                        if (cat.startsWith('utility_')) {
                                                            const utilityType = cat.replace('utility_', '');
                                                            const config = UTILITY_TYPES.find(u => u.id === utilityType);
                                                            if (config) return t(config.labelKey) || (lang === 'he' ? config.fallbackHe : config.fallbackEn);
                                                            return lang === 'he' ? 'חשבון' : 'Utility';
                                                        }
                                                        switch (cat) {
                                                            case 'insurance': return lang === 'he' ? 'ביטוח' : 'Insurance';
                                                            case 'maintenance': return lang === 'he' ? 'תחזוקה' : 'Maintenance';
                                                            case 'invoice': return lang === 'he' ? 'חשבונית' : 'Invoice';
                                                            case 'warranty': return lang === 'he' ? 'אחריות' : 'Warranty';
                                                            case 'legal': return lang === 'he' ? 'מסמך משפטי' : 'Legal Document';
                                                            case 'receipt': return lang === 'he' ? 'אסמכתא' : 'Receipt';
                                                            default: return cat;
                                                        }
                                                    })()}
                                                </span>
                                                <span className="text-xs font-medium text-muted-foreground">
                                                    {expense.document_date ? format(new Date(expense.document_date), 'dd/MM/yyyy') : ''}
                                                </span>
                                            </div>
                                        </div>
                                        <div className="text-sm font-bold text-foreground">
                                            ₪{expense.amount?.toLocaleString('he-IL') || 0}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}
                        {expensesList.length > 15 && (
                            <p className="text-[10px] text-amber-500 font-bold px-2 mt-2 sm:mt-4 flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse"></span>
                                {lang === 'he' ? 'מומלץ לסמן עד 15 קבלות בדוח אחד למניעת גודל חריג.' : 'Recommended to select up to 15 receipts per report to prevent oversized files.'}
                            </p>
                        )}
                    </div>
                )}

                <button
                    onClick={handleGenerate}
                    disabled={generating || !selectedPropertyId}
                    className="w-full h-16 bg-foreground text-background rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-premium-dark hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-2 sm:gap-4 disabled:opacity-80"
                >
                    {generating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                        <Download className="w-5 h-5" />
                    )}
                    {generating ? (lang === 'he' ? 'מפיק...' : 'Generating...') : success ? (lang === 'he' ? 'בוצע!' : 'Done!') : (lang === 'he' ? 'הפקת דוח PDF' : 'Generate PDF Report')}
                </button>
            </div>
        </Modal>
    );
}
