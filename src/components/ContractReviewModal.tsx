import { useState, useRef } from 'react';
import { Check, X, AlertCircle, ZoomIn, ZoomOut } from 'lucide-react';
import type { ExtractedField } from '../types/database';

const FIELD_TRANSLATIONS: Record<string, string> = {
    city: 'עיר', street: 'רחוב', buildingNum: 'מספר בית', aptNum: 'מספר דירה',
    tenantName: 'שם הדייר', tenantId: 'תעודת זהות', tenantEmail: 'אימייל', tenantPhone: 'טלפון',
    rent: 'שכר דירה', currency: 'מטבע', paymentFrequency: 'תדירות תשלום', paymentDay: 'יום תשלום', paymentMethod: 'שיטת תשלום',
    signingDate: 'תאריך חתימה', startDate: 'תאריך התחלה', endDate: 'תאריך סיום', optionPeriod: 'תקופת אופציה',
    linkageType: 'סוג הצמדה', baseIndexDate: 'תאריך מדד בסיס', baseIndexValue: 'מדד בסיס',
    securityDeposit: 'סכום פיקדון', guarantees: 'ערבויות',
    parking: 'חניה', furniture: 'ריהוט',
    guarantorsInfo: 'פרטי ערבים', specialClauses: 'סעיפים מיוחדים'
};

interface Props {
    extractedFields: ExtractedField[];
    contractFileUrl: string;
    onConfirm: (confirmedFields: ExtractedField[]) => void;
    onCancel: () => void;
}

export function ContractReviewModal({ extractedFields, contractFileUrl, onConfirm, onCancel }: Props) {
    const [fields, setFields] = useState<ExtractedField[]>(extractedFields);
    const [zoom, setZoom] = useState(1);
    const fieldRefs = useRef<(HTMLDivElement | null)[]>([]);

    const handleFieldChange = (index: number, newValue: string | number) => {
        const updated = [...fields];
        updated[index] = {
            ...updated[index],
            extractedValue: newValue,
            manuallyOverridden: true,
            userConfirmed: true
        };
        setFields(updated);
    };

    const handleConfirmField = (index: number) => {
        const updated = [...fields];
        updated[index] = {
            ...updated[index],
            userConfirmed: true
        };
        setFields(updated);

        // Auto-scroll to next field
        if (index < fields.length - 1) {
            setTimeout(() => {
                fieldRefs.current[index + 1]?.scrollIntoView({ behavior: 'smooth', block: 'center' });
            }, 200);
        }
    };

    const handleConfirmAll = () => {
        const confirmed = fields.map(f => ({ ...f, userConfirmed: true }));
        onConfirm(confirmed);
    };

    const getConfidenceColor = (confidence: string) => {
        switch (confidence) {
            case 'high': return 'text-green-600 bg-green-100';
            case 'medium': return 'text-yellow-600 bg-yellow-100';
            case 'low': return 'text-red-600 bg-red-100';
            default: return 'text-muted-foreground bg-muted';
        }
    };

    const allConfirmed = fields.every(f => f.userConfirmed);

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-end lg:items-center justify-center p-0 lg:p-4" dir="rtl">
            <div className="bg-white dark:bg-gray-800 rounded-t-2xl lg:rounded-xl w-full max-w-7xl h-full lg:h-[90vh] overflow-hidden flex flex-col shadow-2xl relative">
                {/* Header */}
                <div className="p-4 border-b border-border dark:border-gray-700 bg-white dark:bg-gray-800 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold">בדיקת נתונים שחולצו</h2>
                        <p className="text-sm text-muted-foreground dark:text-muted-foreground hidden sm:block">
                            אנא אמת את הנתונים מול החוזה (דף ראשון)
                        </p>
                    </div>
                    <button onClick={onCancel} className="p-2 hover:bg-muted rounded-full">
                        <X size={24} />
                    </button>
                </div>

                {/* Content - Responsive Split View */}
                <div className="flex-1 flex flex-col lg:flex-row overflow-hidden relative pb-[80px] lg:pb-0">

                    {/* Right Side (Desktop) / Top (Mobile): Fields Form */}
                    <div className="flex-1 w-full lg:w-1/2 flex flex-col border-b lg:border-b-0 lg:border-l border-border dark:border-gray-700 bg-secondary dark:bg-foreground/50 lg:h-auto min-h-0">
                        <div className="overflow-y-auto p-4 lg:p-6 flex-1">
                            <div className="bg-primary/10 dark:bg-blue-900/20 border-r-4 border-blue-400 p-4 mb-4 lg:mb-6 rounded-r">
                                <div className="flex items-start gap-2">
                                    <AlertCircle className="w-5 h-5 text-primary mt-0.5 flex-shrink-0" />
                                    <div className="text-sm">
                                        <p className="font-semibold mb-1">שים לב!</p>
                                        <p>ה-AI עשוי לטעות. בדוק את השדות מול התמונה.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-4">
                                {fields.map((field, index) => (
                                    <div
                                        key={index}
                                        ref={(el) => { fieldRefs.current[index] = el; }}
                                        className={`border rounded-lg p-3 lg:p-4 transition-all ${field.userConfirmed
                                            ? 'border-green-300 bg-green-50 dark:bg-green-900/10 shadow-sm'
                                            : 'border-gray-300 dark:border-gray-600 bg-white shadow-sm hover:shadow-md'
                                            }`}
                                    >
                                        <div className="flex items-start justify-between gap-4 mb-2">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-1 flex-wrap">
                                                    <span className="font-semibold text-gray-800 dark:text-gray-200">
                                                        {FIELD_TRANSLATIONS[field.fieldName] || field.fieldName}
                                                    </span>
                                                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${getConfidenceColor(field.confidence)}`}>
                                                        {field.confidence === 'high' && 'ביטחון גבוה'}
                                                        {field.confidence === 'medium' && 'ביטחון בינוני'}
                                                        {field.confidence === 'low' && 'ביטחון נמוך'}
                                                    </span>
                                                </div>
                                                {field.sourceText && (
                                                    <p className="text-xs text-muted-foreground italic mb-2 bg-muted p-1 rounded inline-block max-w-full truncate">
                                                        "{field.sourceText}"
                                                    </p>
                                                )}
                                            </div>
                                            {field.userConfirmed && (
                                                <Check className="w-5 h-5 text-green-600 flex-shrink-0" />
                                            )}
                                        </div>

                                        <div className="flex gap-2">
                                            {field.fieldName === 'guarantorsInfo' || field.fieldName === 'specialClauses' ? (
                                                <textarea
                                                    id={`field-${index}`}
                                                    value={field.extractedValue?.toString() || ''}
                                                    onChange={(e) => handleFieldChange(index, e.target.value)}
                                                    rows={4}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-full"
                                                />
                                            ) : (
                                                <input
                                                    id={`field-${index}`}
                                                    type="text"
                                                    value={field.extractedValue?.toString() || ''}
                                                    onChange={(e) => handleFieldChange(index, e.target.value)}
                                                    className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                                                />
                                            )}
                                            {!field.userConfirmed && (
                                                <button
                                                    onClick={() => handleConfirmField(index)}
                                                    className="px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 flex items-center gap-1 text-sm font-medium transition-colors shrink-0"
                                                >
                                                    <Check className="w-4 h-4" />
                                                    <span className="hidden sm:inline">אישור</span>
                                                </button>
                                            )}
                                        </div>
                                    </div>
                                ))}

                                {/* Mobile Actions - In-flow like a field */}
                                <div className="mt-8 space-y-3 lg:hidden pb-4">
                                    <button
                                        onClick={handleConfirmAll}
                                        className="w-full py-4 bg-primary text-white rounded-xl font-bold shadow-lg shadow-blue-900/20 active:scale-[0.98] transition-all flex items-center justify-center gap-2"
                                    >
                                        <Check className="w-5 h-5" />
                                        {allConfirmed ? 'שמור והמשך' : `אשר את הכל (${fields.filter(f => f.userConfirmed).length}/${fields.length})`}
                                    </button>

                                    <button
                                        onClick={onCancel}
                                        className="w-full py-3 text-slate-500 font-medium active:bg-slate-100 rounded-xl transition-colors"
                                    >
                                        ביטול וחזרה
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Left Side (Desktop) / Bottom (Mobile): Contract Preview */}
                    <div className="w-full lg:w-1/2 bg-gray-800 flex flex-col relative overflow-hidden h-[40vh] lg:h-auto shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.3)] z-10 border-t border-gray-700">
                        <div className="absolute top-2 right-2 lg:top-4 lg:right-4 z-10 flex gap-2 bg-black/50 p-1 rounded-lg backdrop-blur-sm">
                            <button onClick={() => setZoom(z => Math.min(z + 0.2, 3))} className="p-1.5 lg:p-2 text-white hover:bg-white/20 rounded">
                                <ZoomIn size={16} className="lg:w-5 lg:h-5" />
                            </button>
                            <button onClick={() => setZoom(z => Math.max(z - 0.2, 0.5))} className="p-1.5 lg:p-2 text-white hover:bg-white/20 rounded">
                                <ZoomOut size={16} className="lg:w-5 lg:h-5" />
                            </button>
                        </div>

                        <div className="flex-1 overflow-auto p-2 lg:p-4 flex items-center justify-center bg-foreground/50">
                            {contractFileUrl ? (
                                <img
                                    src={contractFileUrl}
                                    alt="Contract Preview"
                                    className="max-w-none shadow-2xl transition-transform duration-200 ease-out origin-top-center"
                                    style={{ transform: `scale(${zoom})`, width: '100%', height: 'auto', objectFit: 'contain' }}
                                />
                            ) : (
                                <div className="text-white/50 flex flex-col items-center gap-4">
                                    <AlertCircle size={48} />
                                    <p>תצוגה מקדימה לא זמינה</p>
                                </div>
                            )}
                        </div>
                    </div>

                </div>

                {/* Footer - Desktop Only */}
                <div className="hidden lg:flex p-4 border-t border-border dark:border-gray-700 gap-4 bg-white dark:bg-gray-800 shrink-0 z-50 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)]">
                    <button
                        onClick={onCancel}
                        className="px-4 lg:px-6 py-2 border border-gray-300 rounded-lg hover:bg-secondary flex items-center justify-center gap-2 text-gray-700 font-medium whitespace-nowrap"
                    >
                        <X className="w-4 h-4" />
                        <span className="hidden sm:inline">ביטול</span>
                    </button>
                    <button
                        onClick={handleConfirmAll}
                        disabled={!allConfirmed}
                        className="flex-1 px-4 lg:px-6 py-2 bg-primary text-white rounded-lg hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 font-bold shadow-lg shadow-blue-900/20 transition-all"
                    >
                        <Check className="w-5 h-5" />
                        {allConfirmed ? 'שמור והמשך' : `אשר את כל השדות (${fields.filter(f => f.userConfirmed).length}/${fields.length})`}
                    </button>
                </div>
            </div>
        </div>
    );
}
