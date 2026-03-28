import { useState, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { propertyDocumentsService } from '../services/property-documents.service';
import { PropertyDocument } from '../types/database';
import { FileStack, Building2, Search, Filter, Loader2, Image as ImageIcon, FileText, Banknote, Receipt, ArrowDown, ArrowUp } from 'lucide-react';
import { DocumentDetailsModal } from '../components/modals/DocumentDetailsModal';
import { DatePicker } from '../components/ui/DatePicker';
import { cn } from '../lib/utils';
import { GlassCard } from '../components/common/GlassCard';
import { useDataCache } from '../contexts/DataCacheContext';
import { Property } from '../types/database';
import { GlobalDocumentUploadModal } from '../components/modals/GlobalDocumentUploadModal';
import { Button } from '../components/ui/Button';
import { Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { StorageUsageWidget } from '../components/properties/StorageUsageWidget';
import { DocumentTimeline } from '../components/properties/DocumentTimeline';

type TabType = 'all' | 'utilities' | 'media' | 'documents' | 'checks' | 'receipt';

interface GlobalDocument extends PropertyDocument {
    properties?: {
        id: string;
        address: string;
        city: string;
    }
}

export default function GlobalDocuments() {
    const { t, lang } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('all');
    const [documents, setDocuments] = useState<GlobalDocument[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc');
    const [showFilters, setShowFilters] = useState(false);
    
    // Using simple states for modals
    const [selectedDocument, setSelectedDocument] = useState<GlobalDocument | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    useEffect(() => {
        if (location.state?.action === 'upload') {
            setIsUploadModalOpen(true);
            // Clear state so it doesn't reopen on subsequent re-renders
            navigate(location.pathname, { replace: true, state: {} });
        }
    }, [location.state?.action, navigate, location.pathname]);

    const { get } = useDataCache();
    const [allProperties, setAllProperties] = useState<Property[]>(get<Property[]>('properties_list') || []);

    const loadProperties = async () => {
        if (allProperties.length > 0) return;
        try {
            const { data: { session } } = await supabase.auth.getSession();
            if (!session?.user) return;
            const { data } = await supabase
                .from('properties')
                .select('*')
                .eq('user_id', session.user.id);
            if (data) {
                setAllProperties(data);
            }
        } catch (error) {
            console.error('Error fetching properties:', error);
        }
    };

    useEffect(() => {
        loadProperties();
    }, []);

    const loadData = async () => {
        setLoading(true);
        try {
            const filters: any = {};
            if (activeTab !== 'all') {
                filters.category = activeTab;
            }
            if (selectedPropertyId !== 'all') {
                filters.propertyId = selectedPropertyId;
            }

            const data = await propertyDocumentsService.getGlobalDocuments(filters);
            setDocuments(data);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [activeTab, selectedPropertyId]);

    const tabs = [
        { id: 'all' as TabType, label: lang === 'he' ? 'הכל' : 'All', icon: FileStack },
        { id: 'receipt' as TabType, label: lang === 'he' ? 'אסמכתאות' : 'Receipts', icon: Receipt },
        { id: 'utilities' as TabType, label: t('utilitiesStorage'), icon: FileText },
        { id: 'media' as TabType, label: t('mediaStorage'), icon: ImageIcon },
        { id: 'documents' as TabType, label: t('documentsStorage'), icon: FileStack },
        { id: 'checks' as TabType, label: t('checksStorage'), icon: Banknote },
    ];

    return (
        <div className="pt-2 pb-24 md:pb-8 md:pt-4 px-5 gap-2 md:gap-4 animate-in fade-in slide-in-from-bottom-6 duration-300 w-full max-w-full overflow-x-hidden min-h-[calc(100vh-100px)] flex flex-col">
            {/* Floating Action Button - FIXED so it never moves */}
            <div className={cn(
                "fixed z-[60]",
                lang === 'he' ? 'left-5' : 'right-5',
                "top-[88px] md:top-[144px]"
            )}>
                <Button
                    onClick={() => setIsUploadModalOpen(true)}
                    className="h-14 w-14 rounded-2xl p-0 shrink-0 bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center"
                    title={lang === 'he' ? 'העלאת מסמך' : 'Upload Document'}
                >
                    <Plus className="w-7 h-7" />
                </Button>
            </div>
            
            {/* Header placeholder */}
            <div className="flex flex-col gap-3 md:gap-4 w-full">
                <div className="flex items-center justify-end gap-4">
                    <div className="h-14 w-14 shrink-0 opacity-0 pointer-events-none" />
                </div>

                {/* Storage Usage Widget */}
                <div className="animate-in fade-in duration-500 delay-100 w-full">
                    <StorageUsageWidget />
                </div>
                
                {/* Toggle Filters Button */}
                <div className="flex justify-center w-full">
                    <button
                        onClick={() => setShowFilters(!showFilters)}
                        className={`text-sm font-bold flex items-center gap-2 px-4 py-1.5 rounded-xl transition-all ${
                            showFilters 
                                ? 'bg-primary text-primary-foreground shadow-md' 
                                : 'text-muted-foreground hover:text-primary bg-background0/5 dark:bg-white/5 border border-border/10 hover:border-primary/20'
                        }`}
                    >
                        <Filter className="w-4 h-4" />
                        {lang === 'he' ? 'מסננים' : 'Filters'}
                    </button>
                </div>

                {/* Filters Area */}
                {showFilters && (
                    <div className={`grid gap-3 sm:gap-4 w-full animate-in fade-in slide-in-from-top-2 duration-300 ${allProperties.length > 0 ? 'grid-cols-2 md:grid-cols-3' : 'grid-cols-1 sm:grid-cols-2'}`}>
                    {allProperties.length > 0 && (
                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-muted-foreground ml-1">
                                {lang === 'he' ? 'סינון נכסים' : 'Filter Properties'}
                            </label>
                            <div className="flex items-center gap-2 bg-background0/5 dark:bg-white/5 backdrop-blur-md p-1 rounded-2xl border border-border/10 w-full px-3 sm:px-4 py-2">
                                <Building2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                                <select
                                    value={selectedPropertyId}
                                    onChange={(e) => setSelectedPropertyId(e.target.value)}
                                    className="bg-transparent border-none text-sm sm:text-base font-medium focus:ring-0 cursor-pointer flex-1 outline-none w-full"
                                >
                                    <option value="all">{lang === 'he' ? 'כל הנכסים' : 'All Properties'}</option>
                                    {allProperties.map(p => (
                                        <option key={p.id} value={p.id}>{p.address}</option>
                                    ))}
                                </select>
                            </div>
                        </div>
                    )}
                    
                    <div className="space-y-1.5">
                        <label className="text-xs font-bold text-muted-foreground ml-1">
                            {lang === 'he' ? 'סוג מסמך' : 'Document Type'}
                        </label>
                        <div className="flex items-center gap-2 bg-background0/5 dark:bg-white/5 backdrop-blur-md p-1 rounded-2xl border border-border/10 w-full px-3 sm:px-4 py-2">
                            <Filter className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                            <select
                                value={activeTab}
                                onChange={(e) => setActiveTab(e.target.value as TabType)}
                                className="bg-transparent border-none text-sm sm:text-base font-medium focus:ring-0 cursor-pointer flex-1 outline-none w-full"
                            >
                                {tabs.map(tab => (
                                    <option key={tab.id} value={tab.id}>{tab.label}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="space-y-1.5 md:col-start-3 max-w-[200px] sm:max-w-none">
                        <label className="text-xs font-bold text-muted-foreground ml-1">
                            {lang === 'he' ? 'סדר מסמכים' : 'Document Order'}
                        </label>
                        <button
                            onClick={() => setSortOrder(prev => prev === 'desc' ? 'asc' : 'desc')}
                            className="flex items-center gap-2 bg-background0/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 backdrop-blur-md p-1 rounded-2xl border border-border/10 w-full px-3 sm:px-4 py-2 transition-colors cursor-pointer justify-center md:justify-start"
                        >
                            {sortOrder === 'desc' ? (
                                <ArrowDown className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                            ) : (
                                <ArrowUp className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-muted-foreground shrink-0" />
                            )}
                            <span className="text-sm sm:text-base font-medium text-foreground">
                                {sortOrder === 'desc' 
                                    ? (lang === 'he' ? 'מהחדש לישן' : 'Latest First')
                                    : (lang === 'he' ? 'מהישן לחדש' : 'Earliest First')
                                }
                            </span>
                        </button>
                    </div>
                </div>
                )}
            </div>



            {/* Content Area */}
            {loading || documents.length === 0 ? (
                <GlassCard className="min-h-[400px] p-6">
                    {loading ? (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p>{t('loading', { defaultValue: 'Loading documents...' })}</p>
                        </div>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-3">
                            <FileStack className="w-12 h-12 text-muted-foreground/50 dark:text-neutral-600 mb-2" />
                            <h3 className="text-lg font-bold text-foreground">{lang === 'he' ? 'לא נמצאו מסמכים' : 'No documents found'}</h3>
                            <p className="text-sm">{lang === 'he' ? 'אין מסמכים לקטגוריה או לנכס שנבחרו.' : 'No documents match your selected filters.'}</p>
                        </div>
                    )}
                </GlassCard>
            ) : (
                <div className="w-full relative z-10 pt-2 pb-8">
                    <DocumentTimeline
                        documents={documents as any[]}
                        loading={loading}
                        sortOrder={sortOrder}
                        onDocumentClick={(doc) => {
                            setSelectedDocument(doc as any);
                            setIsDetailsModalOpen(true);
                        }}
                    />
                </div>
            )}


            <DocumentDetailsModal
                isOpen={isDetailsModalOpen}
                onClose={() => {
                    setIsDetailsModalOpen(false);
                    setSelectedDocument(null);
                }}
                document={selectedDocument as any}
                onDelete={() => {
                    setIsDetailsModalOpen(false);
                    loadData();
                }}
                onUpdate={(updatedDoc) => {
                    setSelectedDocument(updatedDoc as any);
                    loadData();
                }}
            />

            <GlobalDocumentUploadModal
                isOpen={isUploadModalOpen}
                onClose={() => setIsUploadModalOpen(false)}
                properties={allProperties}
                onSuccess={() => {
                    setIsUploadModalOpen(false);
                    loadData();
                }}
            />
        </div>
    );
}
