import { useState, useEffect } from 'react';
import { FileText, Download, Calendar, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { GlassCard } from '../common/GlassCard';
import { Modal } from '../ui/Modal';
import { ReportService } from '../../services/reporting.service';
import { supabase } from '../../lib/supabase';
import type { Property } from '../../types/database';
import { useTranslation } from '../../hooks/useTranslation';

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

    useEffect(() => {
        if (isOpen && !propertyId) {
            fetchProperties();
        }
    }, [isOpen, propertyId]);

    const fetchProperties = async () => {
        const { data } = await supabase.from('properties').select('*').order('address');
        if (data) setProperties(data);
    };

    const handleGenerate = async () => {
        if (!selectedPropertyId) return;
        setGenerating(true);
        try {
            const data = await ReportService.fetchReportData(selectedPropertyId, dateRange.start, dateRange.end);
            ReportService.generatePDF(data, lang);
            setSuccess(true);
            setTimeout(() => {
                setSuccess(false);
                onClose();
            }, 2000);
        } catch (err) {
            console.error('Report Error:', err);
            alert('Failed to generate report');
        } finally {
            setGenerating(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={lang === 'he' ? 'הפקת דוח ביצועים' : 'Generate Performance Report'}>
            <div className="p-8 space-y-8">
                <div className="flex items-center gap-4 p-4 bg-indigo-500/10 rounded-[1.5rem] border border-indigo-500/20">
                    <FileText className="w-8 h-8 text-indigo-500" />
                    <div>
                        <h4 className="text-sm font-black text-foreground">Professional Reporting</h4>
                        <p className="text-[10px] font-medium text-muted-foreground">Comprehensive financial summary for property owners</p>
                    </div>
                </div>

                {!propertyId && (
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Select Property</label>
                        <select
                            value={selectedPropertyId}
                            onChange={(e) => setSelectedPropertyId(e.target.value)}
                            className="w-full h-14 px-6 bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-2xl font-bold focus:ring-2 focus:ring-indigo-500 outline-none transition-all"
                        >
                            <option value="">Choose a property...</option>
                            {properties.map(p => (
                                <option key={p.id} value={p.id}>{p.address}, {p.city}</option>
                            ))}
                        </select>
                    </div>
                )}

                <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">Start Date</label>
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="w-full h-14 px-6 bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-2xl font-bold"
                        />
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-black uppercase tracking-widest text-muted-foreground ml-2">End Date</label>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="w-full h-14 px-6 bg-slate-50 dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 rounded-2xl font-bold"
                        />
                    </div>
                </div>

                <button
                    onClick={handleGenerate}
                    disabled={generating || !selectedPropertyId}
                    className="w-full h-16 bg-foreground text-background rounded-[1.5rem] font-black uppercase text-xs tracking-[0.2em] shadow-premium-dark hover:scale-[1.02] active:scale-[0.98] transition-all flex items-center justify-center gap-3 disabled:opacity-50"
                >
                    {generating ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                    ) : success ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                    ) : (
                        <Download className="w-5 h-5" />
                    )}
                    {generating ? 'Generating...' : success ? 'Done!' : 'Generate PDF Report'}
                </button>
            </div>
        </Modal>
    );
}
