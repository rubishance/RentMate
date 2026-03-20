import { useState, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { propertyDocumentsService } from '../services/property-documents.service';
import { PropertyDocument } from '../types/database';
import { FileStack, Building2, Search, Filter, Loader2, Image as ImageIcon, FileText, Banknote } from 'lucide-react';
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

type TabType = 'all' | 'utilities' | 'media' | 'documents' | 'checks';

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
    
    // Using simple states for modals
    const [selectedDocument, setSelectedDocument] = useState<GlobalDocument | null>(null);
    const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);
    const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);

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
        { id: 'utilities' as TabType, label: t('utilitiesStorage'), icon: FileText },
        { id: 'media' as TabType, label: t('mediaStorage'), icon: ImageIcon },
        { id: 'documents' as TabType, label: t('documentsStorage'), icon: FileStack },
        { id: 'checks' as TabType, label: t('checksStorage'), icon: Banknote },
    ];

    return (
        <div className="pt-2 md:pt-8 px-5 space-y-12 animate-in fade-in slide-in-from-bottom-6 duration-300 w-full max-w-full overflow-x-hidden min-h-[calc(100vh-100px)] flex flex-col">
            {/* Header */}
            <div className="flex flex-col gap-6">
                <div className="flex items-center justify-between gap-4">
                    <div className="space-y-1 overflow-hidden">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/5 dark:bg-primary/10 backdrop-blur-md rounded-full border border-primary/10 shadow-sm mb-1">
                            <FileText className="w-3 h-3 text-primary" />
                            <span className="text-sm font-black uppercase tracking-widest text-primary dark:text-primary">
                                {lang === 'he' ? 'סקירת מסמכים' : 'Documents Overview'}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight truncate lowercase">
                            {lang === 'he' ? 'ניהול מסמכים' : 'Document Hub'}
                        </h1>
                    </div>
                    
                    <Button
                        onClick={() => setIsUploadModalOpen(true)}
                        className="h-14 w-14 rounded-2xl p-0 shrink-0 bg-primary text-primary-foreground shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all duration-300 flex items-center justify-center"
                        title={lang === 'he' ? 'העלאת מסמך' : 'Upload Document'}
                    >
                        <Plus className="w-7 h-7" />
                    </Button>
                </div>

                {/* Filters Area */}
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                    {allProperties.length > 0 && (
                        <div className="flex items-center gap-2 bg-background0/5 dark:bg-white/5 backdrop-blur-md p-1 rounded-2xl border border-border/10 w-full sm:w-auto px-4 py-2">
                            <Building2 className="w-4 h-4 text-muted-foreground shrink-0" />
                            <select
                                value={selectedPropertyId}
                                onChange={(e) => setSelectedPropertyId(e.target.value)}
                                className="bg-transparent border-none text-base font-medium focus:ring-0 cursor-pointer flex-1 outline-none min-w-[150px]"
                            >
                                <option value="all">{lang === 'he' ? 'כל הנכסים' : 'All Properties'}</option>
                                {allProperties.map(p => (
                                    <option key={p.id} value={p.id}>{p.address}</option>
                                ))}
                            </select>
                        </div>
                    )}
                </div>
            </div>

            {/* Scrollable Pill Filters */}
            <div className="flex items-center justify-start gap-2 pb-4 overflow-x-auto scrollbar-hide px-5">
                {tabs.map(tab => {
                    const Icon = tab.icon;
                    const isActive = activeTab === tab.id;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={cn(
                                "flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-bold transition-all duration-300 select-none whitespace-nowrap shrink-0",
                                isActive 
                                    ? "bg-primary text-primary-foreground shadow-sm scale-100" 
                                    : "bg-white/40 dark:bg-neutral-800/40 backdrop-blur-sm text-muted-foreground hover:bg-white/80 dark:hover:bg-neutral-800/80 hover:text-foreground border border-border/30 hover:border-border/60"
                            )}
                        >
                            {tab.label}
                        </button>
                    );
                })}
            </div>

            {/* Content Area */}
            <GlassCard className="min-h-[400px] p-6">
                {loading ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-primary" />
                        <p>{t('loading', { defaultValue: 'Loading documents...' })}</p>
                    </div>
                ) : documents.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-[300px] text-muted-foreground gap-3">
                        <FileStack className="w-12 h-12 text-muted-foreground/50 dark:text-neutral-600 mb-2" />
                        <h3 className="text-lg font-bold text-foreground">{lang === 'he' ? 'לא נמצאו מסמכים' : 'No documents found'}</h3>
                        <p className="text-sm">{lang === 'he' ? 'אין מסמכים לקטגוריה או לנכס שנבחרו.' : 'No documents match your selected filters.'}</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 animate-in fade-in duration-500">
                        {documents.map((doc) => (
                            <button
                                key={doc.id}
                                onClick={() => {
                                    setSelectedDocument(doc);
                                    setIsDetailsModalOpen(true);
                                }}
                                className="text-start group bg-white dark:bg-neutral-800 rounded-2xl p-4 border border-border dark:border-neutral-700 shadow-sm hover:shadow-md hover:border-primary/30 transition-all flex flex-col gap-3"
                            >
                                <div className="flex items-start justify-between">
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary group-hover:scale-110 transition-transform">
                                        <FileText className="w-5 h-5" />
                                    </div>
                                    {doc.amount && (
                                        <div className="px-2 py-1 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-600 dark:text-green-400 text-sm font-bold font-mono">
                                            ₪{doc.amount.toLocaleString()}
                                        </div>
                                    )}
                                </div>
                                
                                <div>
                                    <p className="font-bold text-base text-foreground line-clamp-1">{doc.title || doc.file_name}</p>
                                    {doc.properties && (
                                        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1 line-clamp-1">
                                            <Building2 className="w-3 h-3" />
                                            {doc.properties.address}
                                        </p>
                                    )}
                                </div>
                                
                                <div className="mt-auto pt-3 border-t border-border dark:border-neutral-700 flex items-center justify-between text-sm text-muted-foreground">
                                    <span>{doc.document_date ? new Date(doc.document_date).toLocaleDateString() : new Date(doc.created_at).toLocaleDateString()}</span>
                                    <span>{(doc.file_size ? doc.file_size / 1024 / 1024 : 0).toFixed(1)} MB</span>
                                </div>
                            </button>
                        ))}
                    </div>
                )}
            </GlassCard>

            {/* Storage Usage Widget */}
            <div className="mt-4 animate-in fade-in duration-500 delay-100 mb-8">
                <StorageUsageWidget isExpanded={true} />
            </div>

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
