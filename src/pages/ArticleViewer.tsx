import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useTranslation } from '../hooks/useTranslation';
import { ArrowLeft, Clock, Calendar, Tag, ChevronRight, ChevronLeft } from 'lucide-react';
import { articles, ArticleMetadata } from '../content/articleIndex';

// Use Vite's import.meta.glob to get all markdown files as raw text
const articleModules = import.meta.glob('../content/articles/*.md', {
    query: '?raw',
    import: 'default',
    eager: true
}) as Record<string, string>;

// Find slug from filename
const getSlugFromPath = (path: string) => {
    const parts = path.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/^\d+-/, '').replace('.md', '');
};

const articlesMap = Object.entries(articleModules).reduce((acc, [path, content]) => {
    const slug = getSlugFromPath(path);
    acc[slug] = content;
    return acc;
}, {} as Record<string, string>);

// Smart CTA Logic
const getSmartCTATitle = (category: string, t: (key: string) => string) => {
    if (category.includes('Legal') || category.includes('חוקים')) return t('hero_title_legal');
    if (category.includes('Tax') || category.includes('Finance') || category.includes('מיסים')) return t('hero_title_tax');
    return t('hero_title_generic');
};

const getSmartCTADesc = (category: string, t: (key: string) => string) => {
    if (category.includes('Legal') || category.includes('חוקים')) return t('hero_desc_legal');
    if (category.includes('Tax') || category.includes('Finance') || category.includes('מיסים')) return t('hero_desc_tax');
    return t('hero_desc_generic');
};

const getSmartCTAButton = (category: string, t: (key: string) => string) => {
    if (category.includes('Legal') || category.includes('חוקים')) return t('cta_button_legal');
    if (category.includes('Tax') || category.includes('Finance') || category.includes('מיסים')) return t('cta_button_tax');
    return t('cta_button_generic');
};

const getSmartCTALink = (category: string) => {
    if (category.includes('Legal') || category.includes('חוקים')) return '/contracts/new';
    if (category.includes('Tax') || category.includes('Finance') || category.includes('מיסים')) return '/calculator';
    return '/properties';
};

export function ArticleViewer() {
    const { slug } = useParams<{ slug: string }>();
    const navigate = useNavigate();
    const { lang, t } = useTranslation();
    const [content, setContent] = useState<string | null>(null);
    const [metadata, setMetadata] = useState<ArticleMetadata | null>(null);

    useEffect(() => {
        const foundMetadata = articles.find(a => a.slug === slug);
        setMetadata(foundMetadata || null);

        if (slug && articlesMap[slug]) {
            // Set dynamic title
            if (foundMetadata) {
                document.title = `${lang === 'he' ? foundMetadata.title_he : foundMetadata.title_en} | RentMate`;
            }

            // Split by --- to remove frontmatter if present
            const parts = articlesMap[slug].split('---');
            if (parts.length >= 3) {
                // parts[0] is empty, parts[1] is frontmatter, parts[2] is content
                setContent(parts.slice(2).join('---').trim());
            } else {
                setContent(articlesMap[slug]);
            }
        } else {
            setContent(null);
        }

        // Scroll to top
        window.scrollTo(0, 0);
    }, [slug, lang]);

    if (!content) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="text-center">
                    <h1 className="text-2xl font-bold text-gray-900 mb-4">
                        {t('article_not_found')}
                    </h1>
                    <button
                        onClick={() => navigate('/knowledge-base')}
                        className="text-primary hover:underline font-medium"
                    >
                        {t('back_to_knowledge_base')}
                    </button>
                </div>
            </div>
        );
    }

    // Split Hebrew and English content
    // We used "## English" and "## עברית" as headers in the articles
    const sections = content.split(/## English|## עברית/i);
    let displayContent = content;

    if (sections.length >= 3) {
        // sections[0] is intro/both titles
        // sections[1] is English
        // sections[2] is Hebrew
        displayContent = lang === 'he' ? sections[2] : sections[1];

        // Prepend the common intro (titles)
        displayContent = sections[0] + '\n' + displayContent;
    }

    return (
        <div className="min-h-screen bg-white">
            {/* Navigation Bar */}
            <div className="sticky top-0 z-40 bg-white/80 backdrop-blur-md border-b border-gray-100">
                <div className="max-w-4xl mx-auto px-4 h-14 flex items-center justify-between">
                    <button
                        onClick={() => navigate('/knowledge-base')}
                        className="flex items-center gap-2 text-gray-600 hover:text-primary transition-colors text-sm font-medium"
                    >
                        {lang === 'he' ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
                        {t('back_to_knowledge_base')}
                    </button>

                    <div className="flex items-center gap-4">
                        {/* Article progress bar could go here */}
                    </div>
                </div>
            </div>

            {/* Article Content */}
            <article className={`max-w-3xl mx-auto px-4 py-8 ${lang === 'he' ? 'text-right' : 'text-left'}`} dir={lang === 'he' ? 'rtl' : 'ltr'}>
                <div className="prose prose-lg prose-indigo max-w-none">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {displayContent}
                    </ReactMarkdown>
                </div>

                {/* Footer info */}
                <div className="mt-16 pt-8 border-t border-gray-100">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
                        <div>
                            <p className="text-sm text-gray-500 mb-1">
                                {t('last_updated')}
                            </p>
                            <p className="font-medium text-gray-900">
                                {new Date('2026-01-19').toLocaleDateString(lang === 'he' ? 'he-IL' : 'en-US')}
                            </p>
                        </div>

                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => navigate('/login?mode=signup')}
                                className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-lg shadow-blue-500/20 hover:scale-[1.02] transition-all"
                            >
                                {t('try_rentmate_free')}
                            </button>
                        </div>
                    </div>
                </div>
                {/* Smart Context CTA Card */}
                <div className="mt-12 p-8 rounded-2xl bg-gradient-to-br from-primary/5 via-primary/10 to-transparent border border-primary/20 relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-64 h-64 bg-primary/10 rounded-full blur-3xl -mr-32 -mt-32 pointer-events-none" />

                    <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-start">
                        <div className="space-y-2">
                            <h3 className="text-xl font-bold text-gray-900">
                                {getSmartCTATitle(metadata?.category || '', t)}
                            </h3>
                            <p className="text-gray-600 max-w-lg">
                                {getSmartCTADesc(metadata?.category || '', t)}
                            </p>
                        </div>

                        <button
                            onClick={() => navigate(getSmartCTALink(metadata?.category || ''))}
                            className="px-8 py-4 bg-primary text-white text-lg font-bold rounded-xl shadow-xl shadow-primary/25 hover:scale-105 hover:shadow-2xl transition-all flex items-center gap-2"
                        >
                            {getSmartCTAButton(metadata?.category || '', t)}
                            {lang === 'he' ? <ChevronLeft className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                        </button>
                    </div>
                </div>
            </article>

            {/* Tailwind Typography styles (simplified inline) */}
            <style>{`
        .prose h1 { font-size: 2.25rem; font-weight: 800; color: #111827; margin-bottom: 2rem; line-height: 1.2; }
        .prose h2 { font-size: 1.5rem; font-weight: 700; color: #111827; margin-top: 2.5rem; margin-bottom: 1.25rem; padding-bottom: 0.5rem; border-bottom: 2px solid #f3f4f6; }
        .prose h3 { font-size: 1.25rem; font-weight: 600; color: #1f2937; margin-top: 2rem; margin-bottom: 1rem; }
        .prose p { margin-bottom: 1.25rem; color: #374151; line-height: 1.7; }
        .prose ul { margin-bottom: 1.5rem; list-style-type: none; padding-right: 0; }
        .prose li { position: relative; padding-right: 1.5rem; margin-bottom: 0.5rem; }
        .prose li::before { content: "•"; position: absolute; right: 0; color: #3b82f6; font-weight: bold; }
        .prose strong { color: #111827; font-weight: 600; }
        .prose blockquote { border-right: 4px solid #3b82f6; padding-right: 1.5rem; font-style: italic; color: #4b5563; margin: 2rem 0; }
        .prose table { width: 100%; border-collapse: collapse; margin: 2rem 0; border: 1px solid #e5e7eb; border-radius: 0.5rem; overflow: hidden; }
        .prose th { background-color: #f9fafb; padding: 0.75rem 1rem; text-align: right; font-weight: 600; border: 1px solid #e5e7eb; }
        .prose td { padding: 0.75rem 1rem; border: 1px solid #e5e7eb; }
        [dir="ltr"] .prose li { padding-right: 0; padding-left: 1.5rem; }
        [dir="ltr"] .prose li::before { right: auto; left: 0; }
        [dir="ltr"] .prose th { text-align: left; }
        [dir="ltr"] .prose blockquote { border-right: 0; border-left: 4px solid #3b82f6; padding-right: 0; padding-left: 1.5rem; }
      `}</style>
        </div>
    );
}
