import { useEffect } from 'react';

interface SeoHeadProps {
  title: string;
  description: string;
  path: string;
  keywords?: string[];
  isAi?: boolean;
}

/**
 * Dynamically synchronizes document title, OpenGraph tags, Twitter cards,
 * canonical link, and Schema.org JSON-LD structured data for SEO & social sharing.
 */
export const SeoHead: React.FC<SeoHeadProps> = ({
  title,
  description,
  path,
  keywords,
  isAi = false,
}) => {
  useEffect(() => {
    // 1. Update Document Title
    document.title = title;

    // 2. Canonical URL resolution
    const origin =
      typeof window !== 'undefined' && window.location.origin
        ? window.location.origin
        : '';
    const fullUrl = `${origin}${path}`;

    // Helper to set or create meta tag
    const setMetaTag = (attributeName: 'name' | 'property', attrValue: string, content: string) => {
      let element = document.querySelector(`meta[${attributeName}="${attrValue}"]`) as HTMLMetaElement | null;
      if (!element) {
        element = document.createElement('meta');
        element.setAttribute(attributeName, attrValue);
        document.head.appendChild(element);
      }
      element.setAttribute('content', content);
    };

    // Standard Meta Description & Keywords
    setMetaTag('name', 'description', description);
    if (keywords && keywords.length > 0) {
      setMetaTag('name', 'keywords', keywords.join(', '));
    }

    // OpenGraph Tags
    setMetaTag('property', 'og:title', title);
    setMetaTag('property', 'og:description', description);
    setMetaTag('property', 'og:url', fullUrl);
    setMetaTag('property', 'og:type', 'website');
    setMetaTag('property', 'og:site_name', 'OmniPDF Studio');

    // Twitter Cards
    setMetaTag('name', 'twitter:card', 'summary_large_image');
    setMetaTag('name', 'twitter:title', title);
    setMetaTag('name', 'twitter:description', description);

    // Canonical link
    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.setAttribute('rel', 'canonical');
      document.head.appendChild(canonical);
    }
    canonical.setAttribute('href', fullUrl);

    // Schema.org Structured Data (JSON-LD)
    const schemaId = 'seo-schema-jsonld';
    let scriptTag = document.getElementById(schemaId) as HTMLScriptElement | null;
    if (!scriptTag) {
      scriptTag = document.createElement('script');
      scriptTag.id = schemaId;
      scriptTag.type = 'application/ld+json';
      document.head.appendChild(scriptTag);
    }

    const schemaData = {
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: title,
      url: fullUrl,
      description: description,
      applicationCategory: isAi ? 'AIApplication' : 'UtilitiesApplication',
      operatingSystem: 'All',
      browserRequirements: 'Requires HTML5 and WebAssembly compatible browser',
      offers: {
        '@type': 'Offer',
        price: '0',
        priceCurrency: 'USD',
      },
      featureList: [
        '100% Client-Side Privacy',
        'Zero Watermarks',
        'Direct Instant Downloads',
        'Unlimited File Sizes',
        ...(isAi ? ['Powered by Omni AI'] : []),
      ],
      creator: {
        '@type': 'Organization',
        name: 'OmniPDF Studio',
      },
    };

    scriptTag.textContent = JSON.stringify(schemaData);
  }, [title, description, path, keywords, isAi]);

  return null;
};
