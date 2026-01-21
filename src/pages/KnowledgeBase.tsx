import { useState, useMemo, useEffect } from 'react';
import { useTranslation } from '../hooks/useTranslation';
import { Book, Clock, Search, Tag } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { articles, ArticleMetadata } from '../content/articleIndex';

export function KnowledgeBase() {
    const { lang, t } = useTranslation();
    const navigate = useNavigate();
    const [searchQuery, setSearchQuery] = useState('');
    const [selectedCategory, setSelectedCategory] = useState<string>('all');

    useEffect(() => {
        document.title = lang === 'he' ? 'מרכז ידע | RentMate' : 'Knowledge Base | RentMate';
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
        <div className="min-h-screen bg-gray-50">
            {/* Header */}
            <div className="bg-white border-b border-gray-200">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                    <div className="text-center">
                        <div className="flex items-center justify-center gap-3 mb-4">
                            <Book className="w-10 h-10 text-primary" />
                            <h1 className="text-4xl font-bold text-gray-900">
                                {lang === 'he' ? 'מרכז הידע' : 'Knowledge Base'}
                            </h1>
                        </div>
                        <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                            {lang === 'he'
                                ? 'מדריכים מקיפים על ניהול נכסים, חוקי שכירות ומיסוי בישראל'
                                : 'Comprehensive guides on property management, rental laws, and taxation in Israel'}
                        </p>
                    </div>

                    {/* Search and Filter */}
                    <div className="mt-8 flex flex-col sm:flex-row gap-4">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                            <input
                                type="text"
                                placeholder={lang === 'he' ? 'חפש מאמרים...' : 'Search articles...'}
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent"
                            />
                        </div>
                        <select
                            value={selectedCategory}
                            onChange={(e) => setSelectedCategory(e.target.value)}
                            className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent bg-white"
                        >
                            <option value="all">{lang === 'he' ? 'כל הקטגוריות' : 'All Categories'}</option>
                            {categories.slice(1).map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>

            {/* Articles Grid */}
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
                {filteredArticles.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500 text-lg">
                            {lang === 'he' ? 'לא נמצאו מאמרים' : 'No articles found'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {filteredArticles.map((article) => (
                            <article
                                key={article.slug}
                                onClick={() => navigate(`/knowledge-base/${article.slug}`)}
                                className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-lg transition-shadow cursor-pointer group"
                            >
                                <div className="flex items-start justify-between mb-3">
                                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-primary/10 text-primary rounded-full text-sm font-medium">
                                        <Tag className="w-3.5 h-3.5" />
                                        {lang === 'he' ? article.category_he : article.category}
                                    </span>
                                    <span className="flex items-center gap-1 text-sm text-gray-500">
                                        <Clock className="w-4 h-4" />
                                        {article.readTime} {lang === 'he' ? 'דק׳' : 'min'}
                                    </span>
                                </div>

                                <h2 className="text-xl font-bold text-gray-900 mb-2 group-hover:text-primary transition-colors line-clamp-2">
                                    {lang === 'he' ? article.title_he : article.title_en}
                                </h2>

                                <p className="text-gray-600 text-sm line-clamp-3 mb-4">
                                    {lang === 'he' ? article.description_he : article.description_en}
                                </p>

                                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                                    <span className="text-sm text-gray-500">
                                        {new Date(article.date).toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}
                                    </span>
                                    <span className="text-primary font-medium text-sm group-hover:underline">
                                        {lang === 'he' ? 'קרא עוד ←' : 'Read more →'}
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
