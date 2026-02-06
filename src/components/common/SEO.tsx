import { Helmet } from 'react-helmet-async';
import { useLocation } from 'react-router-dom';

interface SEOProps {
    title?: string;
    description?: string;
    keywords?: string[];
    canonical?: string;
    ogImage?: string;
    noindex?: boolean;
    schema?: Record<string, any>;
}

export function SEO({
    title,
    description,
    keywords,
    canonical,
    ogImage,
    noindex = false,
    schema
}: SEOProps) {
    let location;
    try {
        location = useLocation();
    } catch (e) {
        // Fallback for non-router context
        location = { pathname: '/' };
    }
    const baseUrl = 'https://rentmate.co.il'; // Hardcoded production URL for consistency
    const currentUrl = canonical || `${baseUrl}${location.pathname}`;

    // Hebrew Defaults
    const defaultTitle = 'RentMate - ניהול נכסים, דיירים וחוזים | פתרון מקיף לבעלי דירות';
    const defaultDescription = 'רנטמייט היא הפלטפורמה המובילה בישראל לניהול נכסים. ניהול חוזים, גביית שכר דירה, חישוב מדד, וניהול דיירים - הכל במקום אחד, בטוח וקל לשימוש.';
    const defaultKeywords = ['ניהול נכסים', 'ניהול נכס', 'ניהול דירה', 'חוזה שכירות', 'שכר דירה', 'השכרת דירה', 'מחשבון שכר דירה', 'ניהול ועד בית', 'גביית שכר דירה', 'RentMate', 'נדל"ן להשקעה'];
    const defaultImage = `${baseUrl}/og-image-default.png`;

    const fullTitle = title ? `${title} | RentMate` : defaultTitle;
    const finalDescription = description || defaultDescription;
    const finalKeywords = keywords ? [...defaultKeywords, ...keywords] : defaultKeywords;
    const finalImage = ogImage ? (ogImage.startsWith('http') ? ogImage : `${baseUrl}${ogImage}`) : defaultImage;

    return (
        <Helmet>
            {/* Standard Meta Tags */}
            <title>{fullTitle}</title>
            <meta name="description" content={finalDescription} />
            <meta name="keywords" content={finalKeywords.join(', ')} />
            <link rel="canonical" href={currentUrl} />
            {noindex && <meta name="robots" content="noindex, nofollow" />}

            {/* Open Graph / Facebook */}
            <meta property="og:type" content="website" />
            <meta property="og:url" content={currentUrl} />
            <meta property="og:title" content={fullTitle} />
            <meta property="og:description" content={finalDescription} />
            <meta property="og:image" content={finalImage} />
            <meta property="og:site_name" content="RentMate" />
            <meta property="og:locale" content="he_IL" />

            {/* Twitter */}
            <meta name="twitter:card" content="summary_large_image" />
            <meta name="twitter:title" content={fullTitle} />
            <meta name="twitter:description" content={finalDescription} />
            <meta name="twitter:image" content={finalImage} />

            {/* Structured Data (JSON-LD) */}
            {schema && (
                <script type="application/ld+json">
                    {JSON.stringify(schema)}
                </script>
            )}
        </Helmet>
    );
}
