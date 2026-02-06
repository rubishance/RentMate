import { Calculator as CalcIcon, Share2 } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { UrlCompression } from '../lib/url-compression';
import { StandardCalculator } from '../components/calculator/StandardCalculator';
import { ReconciliationCalculator } from '../components/calculator/ReconciliationCalculator';
import { format } from 'date-fns';
import { supabase } from '../lib/supabase';

type TabType = 'standard' | 'reconciliation';

export function Calculator({ embedMode = false }: { embedMode?: boolean }) {
    const location = useLocation();
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState<TabType>('standard');
    const [isSharedCalculation, setIsSharedCalculation] = useState(false);
    const [shouldAutoCalculate, setShouldAutoCalculate] = useState(false);

    // Initial Data State
    const [standardValues, setStandardValues] = useState<any>(undefined);
    const [recValues, setRecValues] = useState<any>(undefined);
    const [key, setKey] = useState(0); // Force re-render when data loads

    // 1. Handle Shared Link decoding
    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const shareParam = params.get('share');

        if (shareParam) {
            const data = UrlCompression.decompress(shareParam);

            if (data) {
                setIsSharedCalculation(true);
                const calcType = data.input.type || 'standard';
                setActiveTab(calcType);

                if (calcType === 'standard') {
                    setStandardValues({ ...data.input });
                    if (!data.result) setShouldAutoCalculate(true);
                } else if (calcType === 'reconciliation') {
                    setRecValues({ ...data.input });
                    if (!data.result) setShouldAutoCalculate(true);
                }
                setKey(prev => prev + 1);
            }
        }
    }, [location.search]);

    // 2. Handle Navigation State (from Contract List etc.)
    useEffect(() => {
        async function verifyAndSet() {
            if (location.state?.contractData) {
                const data = location.state.contractData;

                // STRICT: Verification of ownership if we have user context
                const { data: { user } } = await supabase.auth.getUser();
                if (user && data.user_id && data.user_id !== user.id) {
                    console.error("Ownership mismatch in calculator state");
                    return;
                }

                // Prepare Standard Data
                const sData: any = {};
                if (data.baseRent) sData.baseRent = data.baseRent.toString();
                if (data.linkageType) sData.linkageType = data.linkageType;
                if (data.baseIndexDate) sData.baseDate = data.baseIndexDate;
                if (data.linkageCeiling) sData.linkageCeiling = data.linkageCeiling.toString();
                if (data.linkageFloor !== undefined) sData.isIndexBaseMinimum = data.linkageFloor === 0;

                // Prepare Rec Data
                const rData: any = {};
                if (data.baseRent) rData.baseRent = data.baseRent.toString();
                if (data.linkageType) rData.linkageType = data.linkageType;
                if (data.baseIndexDate) rData.contractStartDate = data.baseIndexDate;
                if (data.startDate) rData.periodStart = data.startDate;
                const now = format(new Date(), 'yyyy-MM-dd');
                rData.periodEnd = now;

                setStandardValues(sData);
                setRecValues(rData);
                setKey(prev => prev + 1);
            }
        }
        verifyAndSet();
    }, [location.state]);

    return (
        <div className="max-w-3xl mx-auto space-y-6 px-4 md:px-0">
            {/* Shared Calculation Banner */}
            {isSharedCalculation && (
                <motion.div
                    initial={{ opacity: 0, y: -20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="bg-primary/5 border border-primary/10 rounded-[1.5rem] p-6 flex items-center gap-4"
                >
                    <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                        <Share2 className="w-6 h-6" />
                    </div>
                    <div className="flex-1">
                        <p className="text-xs font-black uppercase tracking-widest text-primary">
                            {t('viewingSharedCalculation')}
                        </p>
                        <p className="text-sm font-medium text-muted-foreground mt-0.5">
                            {t('sharedCalculationDesc')}
                        </p>
                    </div>
                </motion.div>
            )}

            {/* Header */}
            {!embedMode && (
                <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 mb-4">
                    <div className="space-y-1">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-2">
                            <CalcIcon className="w-3 h-3 text-indigo-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                {t('smartCalculator')}
                            </span>
                        </div>
                        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground leading-tight lowercase">
                            {t('calculator')}
                        </h1>
                    </div>
                    <div className="w-16 h-16 rounded-[2rem] glass-premium border-white/10 flex items-center justify-center shadow-minimal group hover:scale-110 group-hover:rotate-6 transition-all duration-700">
                        <CalcIcon className="w-8 h-8 text-muted-foreground opacity-30 group-hover:opacity-100" />
                    </div>
                </div>
            )}

            {/* Tabs */}
            <div className="flex gap-2 glass-premium dark:bg-neutral-900/40 p-2 rounded-[2rem] border-white/5 shadow-minimal">
                <button
                    onClick={() => setActiveTab('standard')}
                    className={cn(
                        "flex-1 py-4 px-6 rounded-[1.2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                        activeTab === 'standard'
                            ? "button-jewel text-white shadow-jewel"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                >
                    {t('standardCalculation')}
                </button>
                <button
                    onClick={() => setActiveTab('reconciliation')}
                    className={cn(
                        "flex-1 py-4 px-6 rounded-[1.2rem] font-black text-[10px] uppercase tracking-[0.2em] transition-all",
                        activeTab === 'reconciliation'
                            ? "button-jewel text-white shadow-jewel"
                            : "text-muted-foreground hover:text-foreground hover:bg-white/5"
                    )}
                >
                    {t('paymentReconciliation')}
                </button>
            </div>

            {/* SEO Metadata */}
            <SEO
                title={t('calculator_seo_title') || "מחשבון הצמדה למדד | חישוב שכר דירה ומדד המחירים לצרכן"}
                description={t('calculator_seo_desc') || "מחשבון הצמדה למדד המחירים לצרכן מתקדם לחישוב עדכון שכר דירה. כלי חובה לבעלי דירות ודיירים בישראל לחישוב הצמדות, עליות מדד ועדכוני חוזה מדויקים."}
                keywords={["מחשבון מדד", "הצמדה למדד", "שכר דירה", "מדד המחירים לצרכן", "חישוב שכר דירה", "עליית מדד", "מחשבון שכירות", "הלמ\"ס מדד", "מחשבון הצמדה"]}
                schema={{
                    "@context": "https://schema.org",
                    "@type": "SoftwareApplication",
                    "name": "RentMate Index Calculator",
                    "applicationCategory": "FinanceApplication",
                    "operatingSystem": "Web",
                    "offers": {
                        "@type": "Offer",
                        "price": "0",
                        "priceCurrency": "ILS"
                    },
                    "description": "Professional CPI linkage calculator for Israeli rental contracts."
                }}
            />

            <div key={key}>
                {activeTab === 'standard' ? (
                    <StandardCalculator
                        initialValues={standardValues}
                        shouldAutoCalculate={shouldAutoCalculate}
                    />
                ) : (
                    <ReconciliationCalculator
                        initialValues={recValues}
                        shouldAutoCalculate={shouldAutoCalculate}
                    />
                )}
            </div>

            {/* SEO Content Section (Visible to users and crawlers) */}
            {!embedMode && (
                <div className="mt-16 pt-10 border-t border-white/10 text-right space-y-8 pb-12">
                    <section className="space-y-3">
                        <h2 className="text-2xl font-black text-foreground">איך עובד מחשבון מדד ושכר דירה?</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            מחשבון המדד של RentMate מאפשר לבעלי דירות ודיירים לחשב בקלות את הפרשי ההצמדה למדד המחירים לצרכן.
                            רוב חוזי השכירות בישראל מוצמדים למדד כדי לשמור על ערך הכסף הריאלי של דמי השכירות. המחשבון שלנו מתבסס על נתוני הלמ"ס (הלשכה המרכזית לסטטיסטיקה) ומבצע חישוב מדויק של אחוז השינוי בין מדד הבסיס למדד הנוכחי.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-black text-foreground">מתי צריך לבצע הצמדה למדד?</h2>
                        <p className="text-muted-foreground leading-relaxed">
                            חישוב הצמדה למדד נדרש בדרך כלל באחת משתי נקודות זמן בחוזה השכירות:
                            <br />
                            1. <strong>בעת חידוש חוזה (אופציה):</strong> נהוג לעדכן את מחיר השכירות לפי עליית המדד בשנה החולפת.
                            <br />
                            2. <strong>במהלך תקופת השכירות:</strong> בחוזים ארוכי טווח או מסחריים, ייתכן עדכון רבעוני או שנתי של המחיר בהתאם לשינויי המדד.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="text-2xl font-black text-foreground">יתרונות מחשבון RentMate</h2>
                        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1">
                            <li>נתונים רשמיים ומעודכנים ישירות מהלמ"ס.</li>
                            <li>תמיכה בחישוב מדדים שליליים (ריצפת מדד).</li>
                            <li>ממשק פשוט ונוח המותאם לחוזים סטנדרטיים.</li>
                        </ul>
                    </section>
                </div>
            )}
        </div>
    );
}
