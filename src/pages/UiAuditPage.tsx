import { EmptyState } from '../components/common/EmptyState';
import { Users, FileTextIcon, Receipt as ReceiptIcon } from 'lucide-react';

export default function UiAuditPage() {
    return (
        <div className="w-full min-h-screen bg-slate-50 dark:bg-slate-900 flex flex-col p-4 gap-8 items-center justify-start overflow-auto" dir="rtl">
            <h1 className="text-2xl font-black mt-8 text-slate-800 dark:text-slate-100">סקירת מצבים ריקים (Empty States)</h1>
            <div className="w-full max-w-sm flex flex-col gap-8 pb-12">
                
                {/* דיירים */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h2 className="text-sm font-bold text-slate-400 mb-4 px-2">עמוד דיירים (Tenants)</h2>
                    <EmptyState
                        icon={Users}
                        title="אין חוזים פעילים"
                        description="אין שוכרים משויכים לנכס זה."
                        actionLabel="הוסף חוזה"
                        onAction={() => {}}
                    />
                </div>

                {/* חוזים */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h2 className="text-sm font-bold text-slate-400 mb-4 px-2">עמוד חוזים (Contracts)</h2>
                    <EmptyState
                        icon={FileTextIcon}
                        title="אין חוזים פעילים"
                        description="הוסף חוזה כדי להתחיל למעקב אחר הנכס."
                        actionLabel="הוסף חוזה"
                        onAction={() => {}}
                    />
                </div>

                {/* תשלומים */}
                <div className="p-4 bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700">
                    <h2 className="text-sm font-bold text-slate-400 mb-4 px-2">עמוד תשלומים (Payments)</h2>
                    <EmptyState
                        icon={ReceiptIcon}
                        title="לא נמצאו תשלומים"
                        description="הוסף את התשלום הראשון שלך כדי להתחיל במעקב ובבקרה."
                        actionLabel="הוסף תשלום ראשון"
                        onAction={() => {}}
                    />
                </div>

            </div>
        </div>
    );
}
