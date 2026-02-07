import { IndexCalculator } from '../../components/IndexCalculator';
import { Button } from '../../components/ui/Button';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { SEO } from '../../components/common/SEO';
import { useUserPreferences } from '../../contexts/UserPreferencesContext';

export function CPICalculatorPage() {
    const { effectiveTheme } = useUserPreferences();

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 pb-20">
            <SEO
                title="מחשבון שכר דירה | חישוב הצמדה למדד בקליק (חינם) - RentMate"
                description="מחשבון הצמדה למדד (CPI) לשכר דירה. חישוב מהיר ומדויק של עליית המדד והשפעתה על חוזה השכירות. מבוסס על נתוני הלמ&quot;ס המעודכנים."
                keywords={["מחשבון מדד", "הצמדה למדד", "שכר דירה", "חישוב העלאת שכר דירה", "מדד המחירים לצרכן", "RentMate"]}
            />

            {/* Header */}
            <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Link to="/" className="flex items-center gap-2">
                            <img
                                src={effectiveTheme === 'dark' ? "/assets/images/renty-head-white.png" : "/assets/images/renty-head-clean.png"}
                                alt="RentMate"
                                className="w-8 h-8"
                            />
                            <span className="font-black text-xl tracking-tight hidden sm:block text-gray-900 dark:text-white">RentMate</span>
                        </Link>
                    </div>
                    <div className="flex items-center gap-4">
                        <span className="text-sm text-muted-foreground hidden sm:block">Already have an account?</span>
                        <Link to="/login">
                            <Button variant="ghost" size="sm">Login</Button>
                        </Link>
                        <Link to="/signup">
                            <Button variant="primary" size="sm">Sign Up Free</Button>
                        </Link>
                    </div>
                </div>
            </header>

            <main className="max-w-4xl mx-auto px-4 py-12 sm:px-6">

                {/* Hero Section */}
                <div className="text-center mb-12 space-y-4">
                    <h1 className="text-4xl font-black tracking-tight text-gray-900 dark:text-white sm:text-5xl">
                        מחשבון הצמדה למדד
                    </h1>
                    <p className="text-xl text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
                        בדקו בחינם ובקלות כמה עלה המדד ואיך זה משפיע על שכר הדירה שלכם.
                    </p>
                </div>

                {/* Calculator Card */}
                <div className="bg-white dark:bg-gray-800 rounded-3xl shadow-xl border border-gray-200 dark:border-gray-700 p-1 sm:p-2 mb-16">
                    <IndexCalculator />
                </div>

                {/* Value Props / SEO Content */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-5 h-5 text-brand-600" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">נתונים רשמיים</h3>
                        <p className="text-gray-500 text-sm">המחשבון מתעדכן אוטומטית מול נתוני הלמ"ס (הלשכה המרכזית לסטטיסטיקה) ומבטיח דיוק מרבי.</p>
                    </div>
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-5 h-5 text-brand-600" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">כל המדדים</h3>
                        <p className="text-gray-500 text-sm">תמיכה במדד המחירים לצרכן, תשומות הבנייה, מחירי דיור, וגם שערי מט"ח (דולר/יורו).</p>
                    </div>
                    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm">
                        <div className="w-10 h-10 bg-brand-100 dark:bg-brand-900/30 rounded-full flex items-center justify-center mb-4">
                            <CheckCircle2 className="w-5 h-5 text-brand-600" />
                        </div>
                        <h3 className="font-bold text-lg mb-2">חינם לתמיד</h3>
                        <p className="text-gray-500 text-sm">השימוש במחשבון הוא חינמי לחלוטין. רוצים לשמור את החישובים? הירשמו ל-RentMate בקליק.</p>
                    </div>
                </div>

                {/* Recommended Guides Section */}
                <div className="mb-16">
                    <h2 className="text-2xl font-black mb-8 text-center text-gray-900 dark:text-white">מדריכים מומלצים</h2>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {[
                            {
                                title: "מדריך להבנת הצמדה למדד",
                                desc: "הבנת הסעיפים בחוזה והמשמעות הכלכלית שלהם.",
                                slug: "cpi-linkage-guide"
                            },
                            {
                                title: "איך לחשב עדכוני שכירות",
                                desc: "הנוסחאות והשיטות לחישוב מדויק של שכר הדירה.",
                                slug: "rent-calculation-methods"
                            },
                            {
                                title: "חידוש חוזה לעומת חוזה חדש",
                                desc: "מה ההבדל ואיך זה משפיע על הצמדה למדד?",
                                slug: "contract-renewal-vs-new-contract"
                            }
                        ].map((guide, i) => (
                            <Link
                                key={i}
                                to={`/blog/${guide.slug}`}
                                className="group p-6 bg-white dark:bg-gray-800 rounded-2xl border border-gray-100 dark:border-gray-700 shadow-sm hover:shadow-md hover:border-brand-500 transition-all duration-300"
                            >
                                <h4 className="font-bold text-gray-900 dark:text-white group-hover:text-brand-600 transition-colors mb-2">
                                    {guide.title}
                                </h4>
                                <p className="text-gray-500 text-xs leading-relaxed">
                                    {guide.desc}
                                </p>
                            </Link>
                        ))}
                    </div>
                </div>

                {/* Final CTA */}
                <div className="bg-brand-600 rounded-3xl p-8 sm:p-12 text-center text-white relative overflow-hidden">
                    <div className="absolute top-0 left-0 w-full h-full bg-indigo-500/10 opacity-20"></div>
                    <div className="relative z-10 space-y-6">
                        <h2 className="text-3xl font-black">רוצים לנהל את הנכסים שלכם בראש שקט?</h2>
                        <p className="text-brand-100 text-lg max-w-xl mx-auto">
                            קבלו התראות אוטומטיות על עליית המדד, חידוש חוזה, וסיום תקופת אופציה.
                        </p>
                        <Link to="/signup" className="inline-block">
                            <Button size="lg" className="bg-white text-brand-600 hover:bg-gray-100 border-none font-black px-8 h-12 text-lg">
                                התחילו בחינם
                            </Button>
                        </Link>
                    </div>
                </div>

            </main>

            <footer className="max-w-7xl mx-auto px-4 py-8 text-center text-gray-400 text-sm">
                © {new Date().getFullYear()} RentMate. All rights reserved.
            </footer>
        </div>
    );
}
