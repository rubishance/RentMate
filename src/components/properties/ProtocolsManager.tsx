import React, { useState, useEffect } from 'react';
import { Property, Protocol } from '../../types/database';
import { useTranslation } from '../../hooks/useTranslation';
import { supabase } from '../../lib/supabase';
import { FileSignature, Search, Download, Eye, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { ProtocolView } from './ProtocolView';
import { format } from 'date-fns';
import { he, enUS } from 'date-fns/locale';

interface ProtocolsManagerProps {
  property: Property;
  readOnly?: boolean;
}

export function ProtocolsManager({ property, readOnly }: ProtocolsManagerProps) {
  const { t, lang } = useTranslation();
  const [protocols, setProtocols] = useState<Protocol[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProtocol, setSelectedProtocol] = useState<Protocol | null>(null);

  const dateLocale = lang === 'he' ? he : enUS;

  useEffect(() => {
    fetchProtocols();
  }, [property.id]);

  const fetchProtocols = async () => {
    try {
      setIsLoading(true);
      
      let query = supabase
        .from('protocols')
        .select('*, properties(address)')
        .order('created_at', { ascending: false });

      if (property.id !== 'all') {
        query = query.eq('property_id', property.id);
      }

      const { data, error } = await query;

      if (error) throw error;
      setProtocols(data || []);
    } catch (err) {
      console.error('Error fetching protocols:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const filteredProtocols = protocols.filter(p => {
    const term = searchTerm.toLowerCase();
    const str = `${p.status} ${p.id}`.toLowerCase();
    
    // Check if tenant name matches
    const tenants = p.tenants_details as any[] || [];
    const tenantMatch = tenants.some(t => t.name?.toLowerCase().includes(term) || t.id?.includes(term));
    
    return str.includes(term) || tenantMatch;
  });

  return (
    <div className="h-full flex flex-col pt-2" dir={lang === 'he' ? 'rtl' : 'ltr'}>
      {/* Search Header */}
      <div className="px-4 pb-4">
        <div className="relative">
          <Search className={`absolute ${lang === 'he' ? 'right-3' : 'left-3'} top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground`} />
          <Input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder={(lang === 'he' ? 'חפש לפי שם שוכר או סטטוס...' : 'Search by tenant or status...')}
            className={`w-full bg-white dark:bg-neutral-900 border-none shadow-sm rounded-xl ${lang === 'he' ? 'pr-10' : 'pl-10'}`}
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-6 no-scrollbar space-y-3">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center p-8 text-muted-foreground">
            <Loader2 className="w-8 h-8 animate-spin mb-4" />
            <p>{(lang === 'he' ? 'טוען פרוטוקולים...' : 'Loading protocols...')}</p>
          </div>
        ) : protocols.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-8 text-center bg-white/50 dark:bg-neutral-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-neutral-800">
            <div className="w-16 h-16 bg-primary/10 dark:bg-primary/20 rounded-2xl flex items-center justify-center mb-4">
              <FileSignature className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-1">
              {(lang === 'he' ? 'לא נמצאו פרוטוקולים' : 'No Protocols Found')}
            </h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {(lang === 'he' ? 'הפק פרוטוקול מסירה חדש מתפריט הנכס כדי לתעד את מצב הנכס בכניסה או עזיבה.' : 'Generate a new handover protocol from the property menu to document the property state during check-in or check-out.')}
            </p>
          </div>
        ) : filteredProtocols.length === 0 ? (
          <div className="text-center p-8 text-muted-foreground bg-white/50 dark:bg-neutral-900/50 rounded-2xl border border-dashed border-slate-200 dark:border-neutral-800">
            <AlertCircle className="w-8 h-8 mx-auto mb-2 sm:mb-4 opacity-50" />
            <p>{(lang === 'he' ? 'לא נמצאו פרוטוקולים התואמים לחיפוש.' : 'No protocols match your search.')}</p>
          </div>
        ) : (
          filteredProtocols.map(protocol => {
            const tenants = protocol.tenants_details as any[] || [];
            const isSigned = protocol.status === 'signed';

            return (
              <div 
                key={protocol.id}
                className="bg-white dark:bg-neutral-900 border border-slate-100 dark:border-neutral-800 p-4 rounded-2xl hover:shadow-md transition-all duration-200"
              >
                <div className="flex justify-between items-start mb-2 sm:mb-4">
                  <div className="flex items-center gap-2 sm:gap-4">
                    <div className={`p-2 rounded-xl ${isSigned ? 'bg-emerald-100 text-emerald-600' : 'bg-amber-100 text-amber-600'}`}>
                      <FileSignature className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-foreground leading-none">
                        {(lang === 'he' ? 'פרוטוקול מסירה' : 'Handover Protocol')}
                      </h4>
                      <p className="text-xs text-muted-foreground mt-1">
                        {protocol.handover_date ? format(new Date(protocol.handover_date), 'PPP', { locale: dateLocale }) : (lang === 'he' ? 'ללא תאריך' : 'No Date')}
                        {property.id === 'all' && (protocol as any).properties?.address && (
                          <span className="block mt-0.5 text-primary opacity-80">
                            {(protocol as any).properties.address}
                          </span>
                        )}
                      </p>
                    </div>
                  </div>
                  <div className={`text-xs font-bold px-2 py-1 rounded-md uppercase ${isSigned ? 'bg-emerald-50 text-emerald-600 border border-emerald-200' : 'bg-amber-50 text-amber-600 border border-amber-200'}`}>
                    {protocol.status === 'signed' ? (lang === 'he' ? 'חתום' : 'Signed') : (lang === 'he' ? 'טיוטה' : 'Draft')}
                  </div>
                </div>

                <div className="bg-slate-50 dark:bg-neutral-800/50 rounded-xl p-2 sm:p-4 mb-4">
                  <p className="text-xs text-slate-500 font-semibold mb-1">{(lang === 'he' ? 'שוכרים מעורבים:' : 'Tenants involved:')}</p>
                  <div className="text-sm font-medium text-foreground truncate">
                    {tenants.map(tn => tn.name).join(', ') || (lang === 'he' ? 'לא צוינו שוכרים' : 'No tenants listed')}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button 
                    variant="primary" 
                    size="sm"
                    className="flex-1 rounded-xl bg-primary hover:bg-primary/90 text-white"
                    onClick={() => setSelectedProtocol(protocol)}
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    {(lang === 'he' ? 'צפה בפרוטוקול' : 'View Protocol')}
                  </Button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {selectedProtocol && (
        <ProtocolView 
          protocol={selectedProtocol} 
          onClose={() => setSelectedProtocol(null)}
          onDelete={(id) => setProtocols(prev => prev.filter(p => p.id !== id))}
        />
      )}
    </div>
  );
}
