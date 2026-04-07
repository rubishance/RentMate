import { motion, Variants } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { articles } from '../../content/articleIndex';
import { useTranslation } from '../../hooks/useTranslation';
import { ArrowLeft, ArrowRight, BookOpen, Clock } from 'lucide-react';
import { cn } from '../../lib/utils';

export function LandingArticles() {
    const navigate = useNavigate();
    const { lang } = useTranslation();
    const isRtl = lang === 'he';

    // The preferred featured articles slugs
    const featuredSlugs = [
        'digital-organization-tips',
        'tenant-screening-guide',
        'cpi-linkage-guide',
        'tenant-rights-landlord-responsibilities'
    ];

    const featuredArticles = articles.filter(article => featuredSlugs.includes(article.slug));

    const revealVariant: Variants = {
        hidden: { opacity: 0, y: 30 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.6, type: "spring" as const, bounce: 0.4 } }
    };

    return (
        <section className="py-24 px-6 relative z-10">
            <div className="max-w-7xl mx-auto">
                <div className="mb-12 md:text-right text-center">
                    <motion.h2 
                        initial="hidden" 
                        whileInView="visible" 
                        variants={revealVariant} 
                        className="text-4xl md:text-5xl font-black mb-4 tracking-tight text-white"
                    >
                        {isRtl ? 'מרכז ידע למעלים' : 'Knowledge Center'}
                    </motion.h2>
                    <motion.p 
                        initial="hidden" 
                        whileInView="visible" 
                        variants={revealVariant} 
                        className="text-lg text-slate-400 font-light max-w-2xl mx-auto md:mx-0 md:mr-auto"
                    >
                        {isRtl 
                            ? 'כל מה שצריך לדעת כדי לנהל את הנכסים שלך כמו מקצוען ולמקסם רווחים.' 
                            : 'Everything you need to know to manage your properties like a pro and maximize profits.'}
                    </motion.p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {featuredArticles.map((article, idx) => (
                        <motion.div
                            key={article.slug}
                            initial="hidden"
                            whileInView="visible"
                            variants={revealVariant}
                            viewport={{ once: true }}
                            transition={{ delay: idx * 0.1 }}
                            onClick={() => navigate(`/knowledge-base/${article.slug}`)}
                            className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-6 flex flex-col justify-between hover:bg-white/10 transition-colors cursor-pointer group shadow-glass"
                        >
                            <div>
                                <div className="flex items-center gap-2 mb-4 text-xs font-semibold text-secondary px-3 py-1 bg-secondary/10 w-fit rounded-full">
                                    <BookOpen className="w-3.5 h-3.5" />
                                    {isRtl ? article.category_he : article.category}
                                </div>
                                <h3 className="text-xl font-bold text-white mb-3 group-hover:text-secondary transition-colors line-clamp-2 leading-tight">
                                    {isRtl ? article.title_he : article.title_en}
                                </h3>
                                <p className="text-slate-400 text-sm line-clamp-3 leading-relaxed">
                                    {isRtl ? article.description_he : article.description_en}
                                </p>
                            </div>

                            <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between text-sm text-slate-300">
                                <span className="flex items-center gap-1.5 opacity-70">
                                    <Clock className="w-4 h-4" />
                                    {article.readTime} {isRtl ? 'דק\' קריאה' : 'min read'}
                                </span>
                                <span className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-secondary group-hover:text-secondary-foreground transition-all">
                                    {isRtl ? <ArrowLeft className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </div>
            </div>
        </section>
    );
}
