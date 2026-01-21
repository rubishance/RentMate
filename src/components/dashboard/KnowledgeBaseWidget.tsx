import { useTranslation } from '../../hooks/useTranslation';
import { BookOpen, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function KnowledgeBaseWidget() {
    const { t, lang } = useTranslation();
    const navigate = useNavigate();

    // Mock featured article based on season/context (could be dynamic later)
    const featuredArticle = {
        title: lang === 'he' ? 'מדריך חידוש חוזה: כל מה שצריך לדעת' : 'Contract Renewal Guide: Everything You Need to Know',
        desc: lang === 'he' ? 'למדו כיצד לנהל את תהליך חידוש החוזה, חישוב הצמדות, וטיפול בערבויות.' : 'Learn how to manage the renewal process, calculate indexations, and handle guarantees.',
        slug: 'contract-renewal-vs-new-contract' // Valid slug from KB
    };

    return (
        <div className="bg-white dark:bg-neutral-900 rounded-[2.5rem] p-8 shadow-sm border border-gray-100 dark:border-neutral-800 text-black dark:text-white relative overflow-hidden flex flex-col justify-between h-full group">
            {/* Background Icon */}
            <div className="absolute -bottom-8 -right-8 text-black/5 dark:text-white/5 transform rotate-[-15deg] group-hover:scale-110 transition-transform">
                <BookOpen className="w-48 h-48" />
            </div>

            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-6 text-gray-400 dark:text-gray-500 text-[10px] font-black uppercase tracking-widest leading-none">
                    <BookOpen className="w-4 h-4" />
                    {t('knowledgeBase')}
                </div>

                <h3 className="text-xl font-black mb-3 leading-tight tracking-tight">
                    {featuredArticle.title}
                </h3>
                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-3 font-medium leading-relaxed">
                    {featuredArticle.desc}
                </p>
            </div>

            <button
                onClick={() => navigate(`/knowledge-base/${featuredArticle.slug}`)}
                className="relative z-10 mt-8 w-full py-4 bg-gray-50 dark:bg-neutral-800 hover:bg-gray-100 dark:hover:bg-neutral-700 rounded-2xl text-sm font-black uppercase tracking-widest transition-all active:scale-95 flex items-center justify-center gap-2 border border-gray-100 dark:border-neutral-700 shadow-sm"
            >
                {t('readArticle')} <ExternalLink className="w-4 h-4" />
            </button>
        </div>
    );
}
