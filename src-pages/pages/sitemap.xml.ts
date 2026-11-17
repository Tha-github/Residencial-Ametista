import type { APIRoute } from 'astro';
import { isProduction } from '../../src/lib/env';

export const GET: APIRoute = ({ site }) => {
  if (!isProduction || !site || ['localhost', '127.0.0.1'].includes(site.hostname)) {
    return new Response('Sitemap is published only for the configured production domain.', {
      status: 404,
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  const basePath = import.meta.env.BASE_URL.endsWith('/')
    ? import.meta.env.BASE_URL
    : `${import.meta.env.BASE_URL}/`;
  const home = new URL(basePath, site).toString().replace(/&/g, '&amp;');
  const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url><loc>${home}</loc></url>\n</urlset>\n`;
  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'X-Content-Type-Options': 'nosniff',
    },
  });
};
