import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, ChevronRight, ChevronLeft, Calendar, FileType, Zap, 
  Droplets, Flame, Plus, Camera, CheckCircle2, Lock, Loader2
} from 'lucide-react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { useTranslation } from '../../hooks/useTranslation';import { supabase } from '../../lib/supabase';
import { SignaturePad } from './SignaturePad';
import imageCompression from 'browser-image-compression';
import { SecureImage } from '../common/SecureImage';

interface Utility {
  id: string;
  type: 'electricity' | 'water' | 'gas' | 'custom';
  customName?: string;
  meterNumber: string;
  reading: string;
  images: string[];
}

interface InventoryItem {
  id: string;
  name: string;
  condition: string;
}

interface FixItem {
  id: string;
  description: string;
  images: string[];
}

export function ProtocolWizard({ isOpen, onClose, propertyId, isStacked }: { isOpen: boolean, onClose: () => void, propertyId: string, isStacked?: boolean }) {
  const { lang, t: globalT } = useTranslation();  const [step, setStep] = useState(1);
  const [isSaving, setIsSaving] = useState(false);

  // Form State
  const [handoverDate, setHandoverDate] = useState(new Date().toISOString().slice(0, 10));
  const [tenantName, setTenantName] = useState('');
  const [tenantId, setTenantId] = useState('');

  // Upload States
  const [uploadingUtilityId, setUploadingUtilityId] = useState<string | null>(null);
  const [isUploadingInventory, setIsUploadingInventory] = useState(false);
  const [uploadingFixId, setUploadingFixId] = useState<string | null>(null);
  
  const [utilities, setUtilities] = useState<Utility[]>([
    { id: '1', type: 'electricity', meterNumber: '', reading: '', images: [] },
    { id: '2', type: 'water', meterNumber: '', reading: '', images: [] },
    { id: '3', type: 'gas', meterNumber: '', reading: '', images: [] },
  ]);

  const [inventory, setInventory] = useState<InventoryItem[]>([
    { id: '1', name: '', condition: '' }
  ]);
  const [inventoryImages, setInventoryImages] = useState<string[]>([]);

  const [fixes, setFixes] = useState<FixItem[]>([]);
  
  const [keys, setKeys] = useState({
    frontDoor: 2,
    buildingFob: 1,
    parkingRemote: 0,
    mailBox: 1
  });

  const [landlordSignature, setLandlordSignature] = useState('');
  const [tenantSignature, setTenantSignature] = useState('');

  if (!isOpen) return null;

  const t = (en: string, he: string) => lang === 'he' ? he : en;

  const uploadEvidence = async (file: File): Promise<string | null> => {
    try {
      const compressedFile = await imageCompression(file, {
        maxSizeMB: 1,
        maxWidthOrHeight: 1920,
        useWebWorker: false // Web workers can sometimes fail to load in dev environments
      });
      const fileName = `protocols/${propertyId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, '')}`;
      
      const { data, error } = await supabase.storage
        .from('property-images')
        .upload(fileName, compressedFile, { upsert: false });
        
      if (error) throw error;
              
      return data.path;
    } catch (e: any) {
      console.error('Error uploading evidence', e);
      alert(`Upload failed: ${e?.message || 'Unknown error'}`);
      return null;
    }
  };

  const handleUtilityImage = async (utilityId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadingUtilityId(utilityId);
    const url = await uploadEvidence(e.target.files[0]);
    if (url) {
      setUtilities(prev => prev.map(u => u.id === utilityId ? { ...u, images: [...u.images, url] } : u));
    }
    setUploadingUtilityId(null);
  };

  const handleInventoryImage = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setIsUploadingInventory(true);
    for(let i=0; i < e.target.files.length; i++) {
        const url = await uploadEvidence(e.target.files[i]);
        if (url) setInventoryImages(prev => [...prev, url]);
    }
    setIsUploadingInventory(false);
  };

  const handleFixImage = async (fixId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploadingFixId(fixId);
    const url = await uploadEvidence(e.target.files[0]);
    if (url) {
      setFixes(prev => prev.map(f => f.id === fixId ? { ...f, images: [...f.images, url] } : f));
    }
    setUploadingFixId(null);
  };

  const finalizeAndLock = async () => {
    if (!landlordSignature || !tenantSignature) {
      alert(t('Both signatures are required.', 'נדרשות חתימות של שני הצדדים.'));
      return;
    }

    setIsSaving(true);
    try {
      const content = {
        utilities,
        inventory: { items: inventory, global_images: inventoryImages },
        fixes,
        keys
      };

      const { data, error } = await supabase.from('protocols').insert({
        property_id: propertyId,
        status: 'signed',
        handover_date: new Date(handoverDate).toISOString(),
        tenants_details: [{ name: tenantName, id: tenantId }],
        content: content,
        evidence_urls: null, // URLs are in the content JSON
        landlord_signature: landlordSignature,
        tenant_signature: tenantSignature
      });

      if (error) throw error;
      onClose();
      // Optionally show a success toast here
    } catch (e) {
      console.error("Error saving protocol", e);
      alert(t("Failed to save protocol.", "שגיאה בשמירת הפרוטוקול."));
    } finally {
      setIsSaving(false);
    }
  };

  const renderStepContent = () => {
    switch(step) {
      case 1:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-black">{t('Handover Details', 'פרטי המסירה')}</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-bold text-muted-foreground">{t('Date', 'תאריך')} <span className="text-red-500">*</span></label>
                <Input type="date" value={handoverDate} onChange={e => setHandoverDate(e.target.value)} />
              </div>
              <div>
                <label className="text-sm font-bold text-muted-foreground">{t('Tenant Full Name', 'שם מלא של השוכר')} <span className="text-red-500">*</span></label>
                <Input value={tenantName} onChange={e => setTenantName(e.target.value)} placeholder={t('Enter name', 'הזן שם')} />
              </div>
              <div>
                <label className="text-sm font-bold text-muted-foreground">{t('Tenant ID / Passport', 'תעודת זהות / דרכון של השוכר')} <span className="text-red-500">*</span></label>
                <Input value={tenantId} onChange={e => setTenantId(e.target.value)} placeholder={t('Enter ID', 'הזן ת.ז.')} />
              </div>
            </div>
          </div>
        );
      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-2xl font-black text-slate-900 dark:text-white mb-2">{t('Utility Meters', 'מוני צריכה')}</h3>
            {utilities.map(u => (
              <div key={u.id} className="p-5 flex flex-col rounded-[2rem] bg-slate-50 dark:bg-neutral-800/50 border space-y-4">
                <div className="flex justify-between items-center">
                  <span className="text-lg font-black flex items-center gap-2">
                    {u.type === 'electricity' && <><Zap className="w-5 h-5 text-amber-500" />{t('Electricity', 'חשמל')}</>}
                    {u.type === 'water' && <><Droplets className="w-5 h-5 text-blue-500" />{t('Water', 'מים')}</>}
                    {u.type === 'gas' && <><Flame className="w-5 h-5 text-orange-500" />{t('Gas', 'גז')}</>}
                    {u.type === 'custom' && (
                       <Input value={u.customName || ''} onChange={e => setUtilities(prev => prev.map(p => p.id === u.id ? {...p, customName: e.target.value} : p))} placeholder={t('Utility Name', 'שם מד הצריכה')} className="h-10 text-base font-bold" />
                    )}
                  </span>
                  <div>
                    <input type="file" id={`util-photo-${u.id}`} className="hidden" accept="image/*" onChange={e => handleUtilityImage(u.id, e)} />
                    <label htmlFor={`util-photo-${u.id}`}>
                      <div className="h-12 w-12 bg-white dark:bg-neutral-700 hover:bg-slate-100 dark:hover:bg-neutral-600 rounded-xl flex items-center justify-center cursor-pointer shadow-sm border transition-colors">
                        <Camera className="w-5 h-5 text-slate-600 dark:text-slate-300" />
                      </div>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-600 dark:text-neutral-400 block">{t('Meter Number', 'מספר מונה')}</label>
                    <Input value={u.meterNumber} onChange={e => setUtilities(prev => prev.map(p => p.id === u.id ? {...p, meterNumber: e.target.value} : p))} className="h-12 bg-white dark:bg-neutral-900 border-slate-200 text-base font-bold" />
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-sm font-semibold text-slate-600 dark:text-neutral-400 block">{t('Current Reading', 'קריאה נוכחית')}</label>
                    <Input value={u.reading} onChange={e => setUtilities(prev => prev.map(p => p.id === u.id ? {...p, reading: e.target.value} : p))} className="h-12 bg-white dark:bg-neutral-900 border-slate-200 text-base font-bold" />
                  </div>
                </div>
                {(u.images.length > 0 || uploadingUtilityId === u.id) && (
                  <div className="flex gap-4 overflow-x-auto pb-2 items-center mt-4">
                    {u.images.map((img, i) => (
                      <div key={i} className="relative group shrink-0">
                        <SecureImage bucket="property-images" path={img} className="h-[160px] w-[160px] rounded-xl object-contain bg-white dark:bg-neutral-950 border shadow-sm" alt="Meter evidence" />
                        <button
                          onClick={() => setUtilities(prev => prev.map(p => p.id === u.id ? {...p, images: p.images.filter((_, idx) => idx !== i)} : p))}
                          className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md z-10"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                    {uploadingUtilityId === u.id && (
                      <div className="h-[160px] w-[160px] rounded-xl border-2 border-dashed flex items-center justify-center bg-slate-50 dark:bg-neutral-800 shrink-0">
                        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
            <Button variant="outline" className="w-full border-dashed rounded-2xl" onClick={() => setUtilities(prev => [...prev, { id: Math.random().toString(), type: 'custom', meterNumber: '', reading: '', images: [] }])}>
              <Plus className="w-4 h-4 mr-2" />
              {t('Add another meter', 'הוסף מונה נוסף')}
            </Button>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-black">{t('Inventory', 'רשימת תכולה')}</h3>
            <p className="text-sm text-muted-foreground">{t('List all items remaining in the property and their condition.', 'פרט את כל הפריטים הנשארים בנכס ומצבם.')}</p>
            
            <div className="flex gap-2 mb-4">
              <input type="file" id="inventory-photo" className="hidden" accept="image/*" multiple onChange={handleInventoryImage} />
              <label htmlFor="inventory-photo" className="cursor-pointer w-full bg-slate-100 hover:bg-slate-200 text-slate-800 dark:bg-neutral-800 dark:text-neutral-100 flex items-center justify-center p-3 rounded-2xl font-bold transition-colors">
                <Camera className="w-4 h-4 mr-2" />
                {t('Add General Inventory Photos', 'הוסף תמונות תכולה כלליות')}
              </label>
            </div>
            
            {(inventoryImages.length > 0 || isUploadingInventory) && (
              <div className="flex gap-4 overflow-x-auto pb-4 items-center mt-4">
                {inventoryImages.map((img, i) => (
                  <div key={i} className="relative group shrink-0">
                    <SecureImage bucket="property-images" path={img} className="h-[160px] w-[160px] rounded-xl object-contain border bg-white dark:bg-neutral-950 shadow-sm" alt="Inventory evidence" />
                    <button
                      onClick={() => setInventoryImages(prev => prev.filter((_, idx) => idx !== i))}
                      className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md z-10"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
                {isUploadingInventory && (
                  <div className="h-[160px] w-[160px] rounded-xl border-2 border-dashed flex items-center justify-center bg-slate-50 dark:bg-neutral-800 shrink-0">
                    <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                  </div>
                )}
              </div>
            )}

            <div className="space-y-3">
              {inventory.map(item => (
                <div key={item.id} className="flex gap-2">
                  <Input value={item.name} onChange={e => setInventory(prev => prev.map(i => i.id === item.id ? {...i, name: e.target.value} : i))} placeholder={t('Item Name', 'שם הפריט')} className="flex-1" />
                  <Input value={item.condition} onChange={e => setInventory(prev => prev.map(i => i.id === item.id ? {...i, condition: e.target.value} : i))} placeholder={t('Condition', 'מצב הפריט')} className="flex-1" />
                  <Button variant="ghost" size="icon" onClick={() => setInventory(prev => prev.filter(i => i.id !== item.id))} className="shrink-0 text-red-500">
                    <X className="w-4 h-4" />
                  </Button>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full border-dashed rounded-2xl mt-4" onClick={() => setInventory(prev => [...prev, { id: Math.random().toString(), name: '', condition: '' }])}>
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Item', 'הוסף פריט')}
            </Button>
          </div>
        );
      case 4:
         return (
          <div className="space-y-6">
            <h3 className="text-xl font-black">{t('Fixes Required', 'ליקויים לתיקון')}</h3>
            <p className="text-sm text-muted-foreground">{t('Items that need repair, or defects accepted as-is.', 'פריטים הדורשים תיקון, או ליקויים שהתקבלו במצבם (As-Is).')}</p>
            
            <div className="space-y-4">
              {fixes.length === 0 && (
                <div className="text-center py-6 border border-dashed rounded-[1.5rem] bg-slate-50/50 dark:bg-neutral-800/20 text-muted-foreground">
                  <CheckCircle2 className="w-8 h-8 opacity-20 mx-auto mb-2" />
                  {t('No issues recorded.', 'לא נרשמו ליקויים.')}
                </div>
              )}
              {fixes.map(fix => (
                <div key={fix.id} className="p-3 bg-white dark:bg-neutral-800 border rounded-[1.5rem] shadow-sm relative pr-10">
                  <Input 
                    placeholder={t('Describe the issue', 'תאר את הליקוי')} 
                    value={fix.description} 
                    onChange={e => setFixes(prev => prev.map(f => f.id === fix.id ? {...f, description: e.target.value} : f))}
                    className="border-none shadow-none bg-transparent px-1 font-semibold h-12 text-base"
                  />
                  <Button variant="ghost" size="icon" onClick={() => setFixes(prev => prev.filter(f => f.id !== fix.id))} className="absolute top-2 right-2 text-red-500 hover:bg-red-50">
                    <X className="w-4 h-4" />
                  </Button>
                  <div className="flex flex-col gap-3 mt-4 px-1 w-full">
                    <div className="flex items-center">
                      <input type="file" id={`fix-photo-${fix.id}`} className="hidden" accept="image/*" onChange={e => handleFixImage(fix.id, e)} />
                      <label htmlFor={`fix-photo-${fix.id}`}>
                        <div className="h-10 px-4 text-sm font-bold bg-slate-100 text-slate-700 hover:bg-slate-200 dark:bg-neutral-700 dark:text-neutral-300 rounded-lg inline-flex items-center cursor-pointer transition-colors shadow-sm">
                          <Camera className="w-4 h-4 mr-2" /> {t('Photo', 'צילום')}
                        </div>
                      </label>
                    </div>
                    {(fix.images.length > 0 || uploadingFixId === fix.id) && (
                      <div className="flex gap-4 overflow-x-auto pb-2 items-center w-full mt-2">
                         {fix.images.map((img, i) => (
                           <div key={i} className="relative group shrink-0">
                             <SecureImage bucket="property-images" path={img} className="h-[160px] w-[160px] rounded-xl object-contain bg-white dark:bg-neutral-950 border shadow-sm" alt="Fix evidence" />
                             <button
                               onClick={() => setFixes(prev => prev.map(p => p.id === fix.id ? {...p, images: p.images.filter((_, idx) => idx !== i)} : p))}
                               className="absolute -top-3 -right-3 bg-red-500 hover:bg-red-600 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity drop-shadow-md z-10"
                             >
                               <X className="w-4 h-4" />
                             </button>
                           </div>
                         ))}
                         {uploadingFixId === fix.id && (
                           <div className="h-[160px] w-[160px] rounded-xl border-2 border-dashed flex items-center justify-center bg-slate-50 dark:bg-neutral-800 shrink-0">
                             <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
                           </div>
                         )}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            <Button variant="outline" className="w-full border-dashed rounded-2xl" onClick={() => setFixes(prev => [...prev, { id: Math.random().toString(), description: '', images: [] }])}>
              <Plus className="w-4 h-4 mr-2" />
              {t('Add Defect / Fix', 'הוסף ליקוי / פגם')}
            </Button>
          </div>
        );
      case 5:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-black">{t('Keys & Access', 'מפתחות ושלטים')}</h3>
            <div className="grid grid-cols-2 gap-4">
               {[
                 { key: 'frontDoor', label: t('Front Door Keys', 'מפתחות דלת כניסה') },
                 { key: 'buildingFob', label: t('Building Fobs', 'צ\'יפים לבניין') },
                 { key: 'parkingRemote', label: t('Parking Remotes', 'שלטי חניה') },
                 { key: 'mailBox', label: t('Mailbox Keys', 'מפתחות תיבת דואר') },
               ].map(k => (
                 <div key={k.key} className="p-4 bg-slate-50 dark:bg-neutral-800/50 rounded-[1.5rem] border text-center">
                   <label className="text-xs font-bold text-muted-foreground block mb-2">{k.label}</label>
                   <div className="flex items-center justify-center gap-3">
                     <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setKeys(prev => ({...prev, [k.key]: Math.max(0, (prev as any)[k.key] - 1)}))}>-</Button>
                     <span className="text-lg font-black w-4">{(keys as any)[k.key]}</span>
                     <Button variant="outline" size="icon" className="h-8 w-8 rounded-full" onClick={() => setKeys(prev => ({...prev, [k.key]: (prev as any)[k.key] + 1}))}>+</Button>
                   </div>
                 </div>
               ))}
            </div>
          </div>
        );
      case 6:
        return (
          <div className="space-y-6">
            <h3 className="text-xl font-black">{t('Review & Sign', 'סקירה וחתימה')}</h3>
            
            <div className="bg-slate-50 dark:bg-neutral-800/30 p-4 rounded-[1.5rem] border text-sm space-y-2">
               <p><strong>{t('Handover:', 'מסירה:')}</strong> {new Date(handoverDate).toLocaleDateString()}</p>
               <p><strong>{t('Tenant:', 'השוכר:')}</strong> {tenantName} ({tenantId})</p>
               <div className="text-xs text-muted-foreground mt-4">
                 {t(
                   "By signing below, the tenant confirms they have inspected the property, it is fit for their needs, and they waive claims of hidden defects that could have reasonably been discovered.", 
                   "בחתימתו מטה, השוכר מאשר כי בדק את הנכס, הוא מתאים לצרכיו, והוא מוותר על כל טענה לפגם נסתר שניתן היה לגלותו באופן סביר."
                 )}
               </div>
            </div>

            <div className="space-y-4">
              <SignaturePad 
                onSign={setLandlordSignature} 
                label={t('Landlord Signature', 'חתימת המשכיר')} 
                clearLabel={t('Clear', 'נקה')}
              />
              <SignaturePad 
                onSign={setTenantSignature} 
                label={t('Tenant Signature', 'חתימת השוכר')} 
                clearLabel={t('Clear', 'נקה')}
              />
            </div>
          </div>
        );
    }
  };

  const content = (
      <motion.div 
        initial={isStacked ? undefined : { opacity: 0, y: 20 }}
        animate={isStacked ? undefined : { opacity: 1, y: 0 }}
        exit={isStacked ? undefined : { opacity: 0, y: 20 }}
        className={isStacked 
            ? "bg-background flex-1 h-full w-full flex flex-col overflow-hidden" 
            : "bg-background w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl md:rounded-[2rem] shadow-2xl overflow-hidden flex flex-col"
        }
        dir={lang === 'he' ? 'rtl' : 'ltr'}
      >
        {/* Header */}
        <div className="p-4 border-b flex justify-between items-center bg-slate-50 dark:bg-neutral-900">
           <div className="flex items-center gap-2">
             <FileType className="w-5 h-5 text-indigo-600" />
             <h2 className="font-black text-lg">{t('Delivery Protocol', 'פרוטוקול מסירה')}</h2>
           </div>
           <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full">
             <X className="w-5 h-5" />
           </Button>
        </div>

        {/* Progress Bar */}
        <div className="h-1 bg-slate-100 dark:bg-neutral-800 w-full">
           <div className="h-full bg-indigo-600 transition-all duration-300" style={{ width: `${(step / 6) * 100}%` }} />
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-5 md:p-6 no-scrollbar">
           <AnimatePresence mode="wait">
             <motion.div
               key={step}
               initial={{ opacity: 0, x: lang === 'he' ? -20 : 20 }}
               animate={{ opacity: 1, x: 0 }}
               exit={{ opacity: 0, x: lang === 'he' ? 20 : -20 }}
               transition={{ duration: 0.2 }}
             >
               {renderStepContent()}
             </motion.div>
           </AnimatePresence>
        </div>

        {/* Footer */}
        <div className="p-4 border-t bg-slate-50 dark:bg-neutral-900 flex justify-between gap-3">
           <Button 
             variant="outline" 
             className="rounded-2xl flex-1 max-w-[120px]" 
             onClick={() => setStep(prev => prev - 1)}
             disabled={step === 1 || isSaving}
           >
             {lang === 'he' ? <ChevronRight className="w-4 h-4 mr-2" /> : <ChevronLeft className="w-4 h-4 ml-2" />}
             {t('Back', 'חזור')}
           </Button>
           
           {step < 6 ? (
             <Button 
               className="rounded-2xl flex-1 bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:cursor-not-allowed" 
               onClick={() => setStep(prev => prev + 1)}
               disabled={step === 1 && (!tenantName.trim() || !tenantId.trim() || !handoverDate)}
             >
               {t('Next', 'המשך')}
               {lang === 'he' ? <ChevronLeft className="w-4 h-4 ml-2" /> : <ChevronRight className="w-4 h-4 mr-2" />}
             </Button>
           ) : (
             <Button 
               className="rounded-2xl flex-1 bg-emerald-600 hover:bg-emerald-700 text-white" 
               onClick={finalizeAndLock}
               disabled={isSaving}
             >
               {isSaving ? (
                 <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1 }} className="mr-2">
                   <Zap className="w-4 h-4" />
                 </motion.div>
               ) : <Lock className="w-4 h-4 mr-2" />}
               {isSaving ? t('Saving...', 'שומר...') : t('Lock & Finalize', 'נעל וסיים')}
             </Button>
           )}
        </div>
      </motion.div>
  );

  if (isStacked) {
      return content;
  }

  return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-0 md:p-4">
          {content}
      </div>
  );
}
