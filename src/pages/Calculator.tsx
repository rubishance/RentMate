import { Calculator as CalcIcon, Share2 } from 'lucide-react';
import { SEO } from '../components/common/SEO';
import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { useTranslation } from '../hooks/useTranslation';
import { cn } from '../lib/utils';
import { motion } from 'framer-motion';
import { SegmentedControl } from '../components/ui/SegmentedControl';
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
            // Support direct tab navigation (e.g. from Quick Actions)
            if (location.state?.activeTab) {
                setActiveTab(location.state.activeTab as TabType);
            }

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

    const wrapperClass = embedMode 
        ? "w-full" 
        : "pt-0 md:pt-2 px-4 sm:px-6 animate-in fade-in slide-in-from-bottom-6 duration-300 w-full max-w-[100vw] overflow-x-hidden relative z-0";

    return (
        <div className={wrapperClass}>
            {/* Ambient Background Glow (Standalone Only) */}
            {!embedMode && (
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-primary/10 dark:bg-primary/5 blur-[100px] rounded-full pointer-events-none -z-10" />
            )}

            <div className={embedMode ? "space-y-4" : "space-y-6"}>
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

                <div className="w-full max-w-2xl mx-auto space-y-4">
                {/* Tabs */}
                <div className="flex justify-center">
                    <div className="p-1.5 bg-slate-100/80 dark:bg-neutral-800/80 backdrop-blur-xl rounded-2xl border border-white/20 dark:border-neutral-700/50 shadow-sm w-full">
                        <SegmentedControl
                            value={activeTab}
                            onChange={(val) => setActiveTab(val as TabType)}
                            options={[
                                { value: 'standard', label: t('standardCalculation') },
                                { value: 'reconciliation', label: t('paymentReconciliation') }
                            ]}
                        />
                    </div>
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
            </div>
            </div>

            {/* SEO Content Section (Visible to users and crawlers) */}
            {!embedMode && (
                <div className="mt-16 pt-10 border-t border-white/10 text-right space-y-8 pb-12">
                    <section className="space-y-3">
                        <h2 className="h2-bionic">איך עובד מחשבון מדד ושכר דירה?</h2>
                        <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                            מחשבון המדד של RentMate מאפשר לבעלי דירות ודיירים לחשב בקלות את הפרשי ההצמדה למדד המחירים לצרכן.
                            רוב חוזי השכירות בישראל מוצמדים למדד כדי לשמור על ערך הכסף הריאלי של דמי השכירות. המחשבון שלנו מתבסס על נתוני הלמ"ס (הלשכה המרכזית לסטטיסטיקה) ומבצע חישוב מדויק של אחוז השינוי בין מדד הבסיס למדד הנוכחי.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="h2-bionic">מתי צריך לבצע הצמדה למדד?</h2>
                        <p className="text-muted-foreground leading-relaxed text-sm md:text-base">
                            חישוב הצמדה למדד נדרש בדרך כלל באחת משתי נקודות זמן בחוזה השכירות:
                            <br />
                            1. <strong>בעת חידוש חוזה (אופציה):</strong> נהוג לעדכן את מחיר השכירות לפי עליית המדד בשנה החולפת.
                            <br />
                            2. <strong>במהלך תקופת השכירות:</strong> בחוזים ארוכי טווח או מסחריים, ייתכן עדכון רבעוני או שנתי של המחיר בהתאם לשינויי המדד.
                        </p>
                    </section>

                    <section className="space-y-3">
                        <h2 className="h2-bionic">יתרונות מחשבון RentMate</h2>
                        <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-2 text-sm md:text-base">
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
