import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/pricing', '/privacy', '/terms', '/support'],
        disallow: ['/dashboard', '/api/', '/invite/'],
      },
    ],
    sitemap: 'https://opsmem.com/sitemap.xml',
    host: 'https://opsmem.com',
  };
}
