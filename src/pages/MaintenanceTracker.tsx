import { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { propertyDocumentsService } from '../services/property-documents.service';
import { PropertyDocument } from '../types/database';
import { Wrench, Plus, Search, Filter, ArrowUpRight, Building } from 'lucide-react';
import { AddMaintenanceModal } from '../components/modals/AddMaintenanceModal';
import { GlassCard } from '../components/common/GlassCard';
import { format } from 'date-fns';
import { Button } from '../components/ui/Button';

export function MaintenanceTracker() {
    const { t } = useTranslation();
    const [documents, setDocuments] = useState<PropertyDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);

    useEffect(() => {
        loadGlobalMaintenance();
    }, []);

    async function loadGlobalMaintenance() {
        setLoading(true);
        try {
            // Using the new global fetch method
            const docs = await propertyDocumentsService.getAllDocumentsByCategory('maintenance', 50);
            setDocuments(docs);
        } catch (error) {
            console.error('Failed to load maintenance records:', error);
        } finally {
            setLoading(false);
        }
    }

    const totalSpend = documents.reduce((sum, doc) => sum + (doc.amount || 0), 0);
    const recentActivity = documents.slice(0, 5);

    return (
        <div className="pb-40 pt-8 px-4 md:px-8 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-300">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
                <div className="space-y-1">
                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-orange-500/5 dark:bg-orange-500/10 backdrop-blur-md rounded-full border border-orange-500/10 shadow-sm mb-1">
                        <Wrench className="w-3 h-3 text-orange-500" />
                        <span className="text-[9px] font-black uppercase tracking-widest text-orange-600 dark:text-orange-400">
                            {t('maintenanceHub') || 'Maintenance Hub'}
                        </span>
                    </div>
                    <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight lowercase">
                        {t('maintenanceOverview') || 'Portfolio Health'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button
                        onClick={() => setIsAddModalOpen(true)}
                        className="h-14 w-14 rounded-2xl p-0 flex items-center justify-center shadow-jewel shrink-0"
                        title={t('logExpense')}
                    >
                        <Plus className="w-7 h-7" />
                    </Button>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <GlassCard variant="deep" className="p-8 rounded-[3rem] flex flex-col justify-between min-h-[160px] group hover:shadow-jewel transition-all duration-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 lowercase">{t('totalYTD') || 'Total Spend (YTD)'}</span>
                        <div className="w-12 h-12 rounded-xl glass-premium flex items-center justify-center text-orange-500 border-white/5 shadow-minimal group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                            <Wrench className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-4xl font-black text-foreground tracking-tighter lowercase leading-none">
                            ₪{totalSpend.toLocaleString()}
                        </h3>
                    </div>
                </GlassCard>

                <GlassCard variant="deep" className="p-8 rounded-[3rem] flex flex-col justify-between min-h-[160px] group hover:shadow-jewel transition-all duration-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 lowercase">{t('totalTickets') || 'Total Tickets'}</span>
                        <div className="w-12 h-12 rounded-xl glass-premium flex items-center justify-center text-indigo-500 border-white/5 shadow-minimal group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                            <Filter className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-4xl font-black text-foreground tracking-tighter lowercase leading-none">
                            {documents.length}
                        </h3>
                    </div>
                </GlassCard>

                <GlassCard variant="deep" className="p-8 rounded-[3rem] flex flex-col justify-between min-h-[160px] group hover:shadow-jewel transition-all duration-700 relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none" />
                    <div className="flex items-center justify-between relative z-10">
                        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground opacity-40 lowercase">{t('avgCost') || 'Avg. Ticket Cost'}</span>
                        <div className="w-12 h-12 rounded-xl glass-premium flex items-center justify-center text-emerald-500 border-white/5 shadow-minimal group-hover:scale-110 group-hover:rotate-3 transition-all duration-700">
                            <ArrowUpRight className="w-5 h-5" />
                        </div>
                    </div>
                    <div className="relative z-10">
                        <h3 className="text-4xl font-black text-foreground tracking-tighter lowercase leading-none">
                            ₪{documents.length > 0 ? Math.round(totalSpend / documents.length).toLocaleString() : 0}
                        </h3>
                    </div>
                </GlassCard>
            </div>

            {/* Recent Activity List */}
            <div className="space-y-6">
                <div className="">
                    <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-muted-foreground opacity-40 lowercase">{t('recentActivity') || 'Recent Activity'}</h3>
                </div>

                <div className="glass-premium dark:bg-neutral-900/40 border-white/5 rounded-[3rem] shadow-minimal overflow-hidden">
                    {loading ? (
                        <div className="p-20 text-center">
                            <div className="w-10 h-10 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto" />
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="py-24 text-center space-y-8">
                            <div className="w-24 h-24 glass-premium rounded-[2.5rem] flex items-center justify-center mx-auto shadow-minimal border border-white/5">
                                <Wrench className="w-10 h-10 text-muted-foreground opacity-20" />
                            </div>
                            <div>
                                <h3 className="text-2xl font-black tracking-tighter text-foreground lowercase opacity-40">{t('noMaintenanceRecords') || 'No Maintenance Records'}</h3>
                                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-30 mt-2">{t('noMaintenanceDesc') || 'Start logging expenses to track your property health.'}</p>
                            </div>
                        </div>
                    ) : (
                        <div className="divide-y divide-white/5">
                            {documents.map((doc) => (
                                <div key={doc.id} className="p-4 sm:p-6 md:p-8 hover:bg-white/5 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-6 group cursor-pointer relative overflow-hidden">
                                    <div className="absolute inset-0 bg-gradient-to-r from-orange-500/5 to-transparent translate-x-full group-hover:translate-x-0 transition-transform duration-1000 pointer-events-none" />

                                    <div className="flex items-start sm:items-center gap-4 sm:gap-6 flex-1 min-w-0 relative z-10 w-full sm:w-auto">
                                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl glass-premium border-white/10 flex items-center justify-center text-orange-500/80 group-hover:scale-105 transition-all duration-700 shrink-0">
                                            <Wrench className="w-5 h-5 sm:w-6 sm:h-6" />
                                        </div>
                                        <div className="flex-1 min-w-0 space-y-1">
                                            <h4 className="text-base sm:text-lg font-black tracking-tight text-foreground lowercase truncate"><bdi>{doc.title || doc.description || 'Maintenance'}</bdi></h4>
                                            <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 text-[10px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
                                                <span className="flex items-center gap-1.5 shrink-0 truncate max-w-full">
                                                    <Building className="w-3 h-3" />
                                                    <bdi>{(doc as any).properties?.address || 'Unknown Property'}</bdi>
                                                </span>
                                                <span className="hidden sm:inline opacity-20">•</span>
                                                <span className="truncate max-w-full"><bdi>{doc.vendor_name || 'No Vendor'}</bdi></span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-2 relative z-10 w-full sm:w-auto pl-[4rem] sm:pl-0">
                                        <div className="flex items-baseline gap-1.5 font-black text-foreground">
                                            <span className="text-[10px] opacity-40">₪</span>
                                            <span className="text-xl sm:text-2xl tracking-tighter">{(doc.amount || 0).toLocaleString()}</span>
                                        </div>
                                        <span className="text-[8px] font-black uppercase tracking-[2px] px-3 py-1 rounded-full glass-premium border-white/5 text-muted-foreground opacity-60">
                                            {doc.issue_type || 'General'}
                                        </span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            <AddMaintenanceModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onSuccess={() => {
                    loadGlobalMaintenance();
                }}
            />
        </div>
    );
}
