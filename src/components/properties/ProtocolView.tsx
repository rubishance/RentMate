import React from 'react';
import { Protocol } from '../../types/database';
import { useTranslation } from '../../hooks/useTranslation';
import { Button } from '../ui/Button';
import { Printer, X, Zap, Droplets, Flame, Key, Camera } from 'lucide-react';
import { format } from 'date-fns';
import { SecureImage } from '../common/SecureImage';
import { he, enUS } from 'date-fns/locale';

interface ProtocolViewProps {
  protocol: Protocol;
  onClose: () => void;
}

export function ProtocolView({ protocol, onClose }: ProtocolViewProps) {
  const { t, lang } = useTranslation();
  const dateLocale = lang === 'he' ? he : enUS;

  const handlePrint = () => {
    window.print();
  };

  const content = protocol.content as any || {};
  const tenants = protocol.tenants_details as any[] || [];

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-0 md:p-8 print:p-0 print:bg-white print:block overflow-y-auto">
      <div 
        className="bg-white w-full max-w-4xl mx-auto rounded-[2rem] print:rounded-none shadow-2xl print:shadow-none p-8 md:p-12 text-slate-900 overflow-y-auto h-full print:h-auto"
        dir={lang === 'he' ? 'rtl' : 'ltr'}
      >
        {/* Actions (Hidden on Print) */}
        <div className="flex justify-between items-center mb-8 print:hidden">
          <Button variant="outline" onClick={handlePrint} className="rounded-2xl">
            <Printer className="w-4 h-4 mr-2" />
            {(lang === 'he' ? 'הדפס / שמור כ-PDF' : 'Print / Save PDF')}
          </Button>
          <Button variant="ghost" size="icon" onClick={onClose} className="rounded-full bg-slate-100 hover:bg-slate-200">
            <X className="w-5 h-5 text-slate-600" />
          </Button>
        </div>

        {/* Header Document Region */}
        <div className="text-center border-b-2 border-slate-900 pb-6 mb-8">
          <h1 className="text-3xl font-black uppercase tracking-tight">{(lang === 'he' ? 'פרוטוקול מסירת נכס' : 'Property Handover Protocol')}</h1>
          <p className="text-muted-foreground mt-2">{(lang === 'he' ? 'מזהה אסמכתא:' : 'Reference ID:')} {protocol.id.split('-')[0].toUpperCase()}</p>
        </div>

        {/* Section: Details */}
        <div className="mb-8 p-6 bg-slate-50 border border-slate-200 rounded-2xl print:border-none print:p-0 print:bg-transparent">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">{(lang === 'he' ? '1. פרטי המסירה' : '1. Delivery Details')}</h2>
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-slate-500 font-semibold">{(lang === 'he' ? 'תאריך:' : 'Date:')} </span>
              <span className="font-bold">
                {protocol.handover_date ? format(new Date(protocol.handover_date), 'PPP', { locale: dateLocale }) : 'N/A'}
              </span>
            </div>
            <div>
              <span className="text-slate-500 font-semibold">{(lang === 'he' ? 'סטטוס:' : 'Status:')} </span>
              <span className="font-bold uppercase text-emerald-600">{protocol.status}</span>
            </div>
            <div className="col-span-2">
              <span className="text-slate-500 font-semibold">{(lang === 'he' ? 'שוכרים (כולל ת.ז):' : 'Tenants:')} </span>
              <span className="font-bold">
                {tenants.map(t => `${t.name} (${t.id})`).join(' , ')}
              </span>
            </div>
          </div>
        </div>

        {/* Section: Utilities */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">{(lang === 'he' ? '2. מונים וצריכה' : '2. Utility Meters')}</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(content.utilities || []).map((u: any, idx: number) => (
              <div key={idx} className="p-4 border border-slate-200 rounded-2xl flex flex-col print:break-inside-avoid">
                <div className="flex items-center gap-2 font-bold mb-2 text-indigo-900 border-b pb-2">
                  {u.type === 'electricity' && <Zap className="w-4 h-4 text-amber-500" />}
                  {u.type === 'water' && <Droplets className="w-4 h-4 text-blue-500" />}
                  {u.type === 'gas' && <Flame className="w-4 h-4 text-orange-500" />}
                  {u.type === 'electricity' ? (lang === 'he' ? 'חשמל' : 'Electricity') : u.type === 'water' ? (lang === 'he' ? 'מים' : 'Water') : u.type === 'gas' ? (lang === 'he' ? 'גז' : 'Gas') : u.customName}
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-slate-500">{(lang === 'he' ? 'מספר מונה:' : 'Meter Number:')}</span>
                  <span className="font-bold">{u.meterNumber || '-'}</span>
                </div>
                <div className="flex justify-between text-sm py-1">
                  <span className="text-slate-500">{(lang === 'he' ? 'קריאה:' : 'Reading:')}</span>
                  <span className="font-bold">{u.reading || '-'}</span>
                </div>
                {u.images?.length > 0 && (
                  <div className="mt-4 flex gap-4 overflow-x-auto pb-2">
                    {u.images.map((img: string, i: number) => (
                      <SecureImage key={i} bucket="property-images" path={img} className="h-[160px] w-auto max-w-[250px] min-w-[100px] rounded-xl object-contain border shadow-sm print:h-[120px]" alt="meter proof" />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Section: Inventory */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">{(lang === 'he' ? '3. תכולת הנכס' : '3. Inventory')}</h2>
          {content.inventory?.global_images?.length > 0 && (
            <div className="mb-4 flex flex-wrap gap-4">
              <span className="text-sm font-semibold text-slate-500 w-full mb-1"><Camera className="w-3 h-3 inline mr-1" />{(lang === 'he' ? 'צילומים כלליים:' : 'General Photos:')}</span>
              {content.inventory.global_images.map((img: string, i: number) => (
                <SecureImage key={i} bucket="property-images" path={img} className="h-[160px] w-auto max-w-[250px] min-w-[100px] rounded-xl object-contain border shadow-sm print:h-[120px]" alt="inventory general" />
              ))}
            </div>
          )}
          
          {content.inventory?.items?.length > 0 ? (
            <table className="w-full text-sm text-left rtl:text-right border-collapse rounded-lg overflow-hidden border">
              <thead className="bg-slate-100 uppercase text-xs font-black text-slate-500">
                <tr>
                  <th className="px-4 py-3 border-b">{(lang === 'he' ? 'פריט' : 'Item')}</th>
                  <th className="px-4 py-3 border-b">{(lang === 'he' ? 'מצב הפריט' : 'Condition')}</th>
                </tr>
              </thead>
              <tbody>
                {content.inventory.items.map((item: any, idx: number) => (
                  <tr key={idx} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="px-4 py-3 font-semibold">{item.name}</td>
                    <td className="px-4 py-3">{item.condition}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-slate-500 italic">{(lang === 'he' ? 'לא נרשמו פריטי תכולה.' : 'No inventory details recorded.')}</p>
          )}
        </div>

        {/* Section: Fixes */}
        <div className="mb-8">
          <h2 className="text-lg font-bold mb-4 border-b pb-2">{(lang === 'he' ? '4. ליקויים שתועדו' : '4. Recorded Defects & Fixes')}</h2>
          {content.fixes?.length > 0 ? (
            <div className="space-y-3">
               {content.fixes.map((fix: any, idx: number) => (
                 <div key={idx} className="p-3 bg-red-50/50 border border-red-100 rounded-xl print:break-inside-avoid">
                   <p className="font-semibold text-red-900">{fix.description}</p>
                   {fix.images?.length > 0 && (
                     <div className="mt-3 flex gap-4 overflow-x-auto pb-2">
                       {fix.images.map((img: string, i: number) => (
                         <SecureImage key={i} bucket="property-images" path={img} className="h-[160px] w-auto max-w-[250px] min-w-[100px] rounded-xl object-contain border border-red-200 shadow-sm print:h-[120px]" alt="defect evidence" />
                       ))}
                     </div>
                   )}
                 </div>
               ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500 italic">{(lang === 'he' ? 'לא נמצאו ליקויים הדורשים תיעוד מיוחד.' : 'No defects recorded.')}</p>
          )}
        </div>

        {/* Section: Keys */}
        <div className="mb-8 print:break-inside-avoid">
          <h2 className="text-lg font-bold mb-4 border-b pb-2 flex items-center"><Key className="inline w-5 h-5 ml-2 rtl:ml-2 ltr:mr-2" /> {(lang === 'he' ? '5. מסירת מפתחות ושלטים' : '5. Keys & Access Controls')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
            <div className="p-3 border rounded-xl bg-slate-50">
              <div className="text-xs text-slate-500 font-bold mb-1">{(lang === 'he' ? 'מפתח דלת' : 'Front Door')}</div>
              <div className="text-2xl font-black">{content.keys?.frontDoor ?? 0}</div>
            </div>
            <div className="p-3 border rounded-xl bg-slate-50">
              <div className="text-xs text-slate-500 font-bold mb-1">{(lang === 'he' ? 'צ\'יפ כניסה' : 'Building Fob')}</div>
              <div className="text-2xl font-black">{content.keys?.buildingFob ?? 0}</div>
            </div>
            <div className="p-3 border rounded-xl bg-slate-50">
              <div className="text-xs text-slate-500 font-bold mb-1">{(lang === 'he' ? 'שלט חניה' : 'Parking Remote')}</div>
              <div className="text-2xl font-black">{content.keys?.parkingRemote ?? 0}</div>
            </div>
            <div className="p-3 border rounded-xl bg-slate-50">
              <div className="text-xs text-slate-500 font-bold mb-1">{(lang === 'he' ? 'תיבת דואר' : 'Mailbox')}</div>
              <div className="text-2xl font-black">{content.keys?.mailBox ?? 0}</div>
            </div>
          </div>
        </div>

        {/* Section: Signatures */}
        <div className="mt-16 pt-8 border-t-2 border-slate-900 print:break-inside-avoid">
          <p className="text-xs text-slate-500 mb-8 max-w-2xl text-center mx-auto">
            {(lang === 'he' ? 'בחתימתו מטה, השוכר מאשר כי מצא את המושכר מתאים למטרותיו ולשביעות רצונו, וכי הוא מוותר על כל טענת פגם בנוגע למצב הפיזי שניתן לראותו, פרט לאמור בפרוטוקול זה.' : 'By signing below, the tenant confirms they have inspected the property, it is fit for their needs, and they waive claims of hidden defects that could have reasonably been discovered. This document constitutes a binding handover protocol.')}
          </p>
          <div className="grid grid-cols-2 gap-12">
            <div className="text-center">
              <div className="h-24 flex items-end justify-center mb-2">
                {protocol.landlord_signature ? (
                  <img src={protocol.landlord_signature} alt="Landlord Signature" className="max-h-24 object-contain" />
                ) : <span className="text-slate-300 italic">No signature</span>}
              </div>
              <div className="border-t border-slate-400 pt-2 font-bold">{(lang === 'he' ? 'חתימת בעל הנכס' : 'Landlord Signature')}</div>
            </div>
            <div className="text-center">
              <div className="h-24 flex items-end justify-center mb-2">
                {protocol.tenant_signature ? (
                  <img src={protocol.tenant_signature} alt="Tenant Signature" className="max-h-24 object-contain" />
                ) : <span className="text-slate-300 italic">No signature</span>}
              </div>
              <div className="border-t border-slate-400 pt-2 font-bold">{(lang === 'he' ? 'חתימת השוכר' : 'Tenant Signature')}</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
