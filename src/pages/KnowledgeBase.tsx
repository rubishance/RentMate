import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Book, Clock, Search, Tag, ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { articles, ArticleMetadata } from '../content/articleIndex';

export function KnowledgeBase() {
    const { lang, t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        document.title = `${t('knowledgeBaseTitle')} | RentMate`;
    }, [lang]);

    // Get unique categories
    const categories = useMemo(() => {
        const cats = new Set(articles.map(a => lang === 'he' ? a.category_he : a.category));
        return ['all', ...Array.from(cats)];
    }, [lang]);

    // Filter articles
    const filteredArticles = useMemo(() => {
        return articles.filter(article => {
            const title = lang === 'he' ? article.title_he : article.title_en;
            const description = lang === 'he' ? article.description_he : article.description_en;
            const category = lang === 'he' ? article.category_he : article.category;
            const keywords = lang === 'he' ? article.keywords_he : article.keywords_en;

            const matchesSearch = searchQuery === '' ||
                title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                description.toLowerCase().includes(searchQuery.toLowerCase()) ||
                keywords.some(k => k.toLowerCase().includes(searchQuery.toLowerCase()));

            const matchesCategory = selectedCategory === 'all' || category === selectedCategory;

            return matchesSearch && matchesCategory;
        });
    }, [searchQuery, selectedCategory, lang]);

    return (
        <div className="pb-40 animate-in fade-in duration-500">
            {/* Header */}
            <div className="pt-16 pb-12">
                <div className="max-w-7xl mx-auto px-4 md:px-8">
                    <button
                        onClick={() => navigate('/dashboard')}
                        className="mb-12 flex items-center gap-2 text-muted-foreground hover:text-foreground transition-all group px-4 py-2 glass-premium dark:bg-neutral-900/60 rounded-full border-white/5 shadow-minimal w-fit lowercase font-black text-[10px] uppercase tracking-widest"
                        dir={lang === 'he' ? 'rtl' : 'ltr'}
                    >
                        <ArrowLeft className={`w-3 h-3 transition-transform ${lang === 'he' ? 'rotate-180 group-hover:translate-x-1' : 'group-hover:-translate-x-1'}`} />
                        <span>{t('backToDashboard')}</span>
                    </button>

                    <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/5 dark:bg-indigo-500/10 backdrop-blur-md rounded-full border border-indigo-500/10 shadow-sm mb-2">
                            <Book className="w-3 h-3 text-indigo-500" />
                            <span className="text-[9px] font-black uppercase tracking-widest text-indigo-600 dark:text-indigo-400">
                                {t('knowledgeBaseTitle')}
                            </span>
                        </div>
                        <h1 className="h1-bionic">
                            {t('learnAndExplore')}
                        </h1>
                        <p className="text-muted-foreground text-lg font-medium leading-relaxed max-w-2xl opacity-60">
                            {t('knowledgeBaseDesc')}
                        </p>
                    </div>

                    {/* Search and Filter */}
                    <div className="mt-12 flex flex-col md:flex-row gap-6 relative z-10">
                        <div className="flex-1 relative group">
                            <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground opacity-30 group-focus-within:opacity-100 group-focus-within:text-indigo-500 transition-all" />
                            <input
                                type="text"
                                placeholder={t('search_articles')}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-14 pr-6 py-5 glass-premium dark:bg-neutral-900/60 border-white/10 rounded-[2rem] text-foreground placeholder:text-muted-foreground/30 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-minimal transition-all"
                            />
                        </div>
                        <div className="relative group">
                            <select
                                value={selectedCategory}
                                onChange={(e) => setSelectedCategory(e.target.value)}
                                className="w-full md:w-64 px-8 py-5 glass-premium dark:bg-neutral-900/60 border-white/10 rounded-[2rem] text-foreground focus:outline-none focus:ring-2 focus:ring-indigo-500/20 shadow-minimal transition-all appearance-none cursor-pointer font-black text-[10px] uppercase tracking-widest lowercase"
                            >
                                <option value="all">{t('all_categories')}</option>
                                {categories.slice(1).map(cat => (
                                    <option key={cat} value={cat}>{cat}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            {/* Articles Grid */}
            <div className="max-w-7xl mx-auto px-4 md:px-8 pb-32">
                {filteredArticles.length === 0 ? (
                    <div className="text-center py-24 glass-premium dark:bg-neutral-900/40 border-white/5 rounded-[3rem] shadow-minimal">
                        <p className="text-muted-foreground text-lg italic opacity-40 font-black tracking-tight">
                            {t('no_articles_found')}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                        {filteredArticles.map((article) => (
                            <article
                                key={article.slug}
                                onClick={() => navigate(`/knowledge-base/${article.slug}`)}
                                className="glass-premium dark:bg-neutral-900/60 border-white/10 rounded-[3rem] p-8 md:p-10 shadow-minimal hover:shadow-jewel transition-all duration-700 cursor-pointer group relative overflow-hidden flex flex-col h-full"
                            >
                                <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[60px] rounded-full -translate-y-1/2 translate-x-1/2 group-hover:scale-150 transition-transform duration-1000" />

                                <div className="flex items-start justify-between mb-8 relative z-10">
                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-indigo-500/10 text-indigo-500 rounded-full text-[9px] font-black uppercase tracking-widest border border-indigo-500/20">
                                        <Tag className="w-3 h-3" />
                                        {lang === 'he' ? article.category_he : article.category}
                                    </span>
                                    <span className="flex items-center gap-2 text-[9px] font-black uppercase tracking-widest text-muted-foreground opacity-40">
                                        <Clock className="w-3 h-3" />
                                        {t('read_min', { min: article.readTime })}
                                    </span>
                                </div>

                                <div className="flex-1 space-y-4 relative z-10 mb-8">
                                    <h2 className="text-xl md:text-2xl font-black text-foreground tracking-tighter leading-tight group-hover:text-indigo-500 transition-colors lowercase">
                                        {lang === 'he' ? article.title_he : article.title_en}
                                    </h2>
                                    <p className="text-muted-foreground text-sm font-medium leading-relaxed opacity-60 line-clamp-3">
                                        {lang === 'he' ? article.description_he : article.description_en}
                                    </p>
                                </div>

                                <div className="flex items-center justify-between pt-6 border-t border-white/5 relative z-10">
                                    <span className="text-[10px] font-black text-muted-foreground opacity-30 uppercase tracking-widest">
                                        {new Date(article.date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}
                                    </span>
                                    <span className="button-jewel px-4 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest text-white shadow-sm group-hover:scale-105 transition-all">
                                        {t('read_more')}
                                    </span>
                                </div>
                            </article>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
