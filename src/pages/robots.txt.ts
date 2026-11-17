import type { APIRoute } from 'astro';
import { isProduction } from '../lib/env';

export const prerender = true;

export const GET: APIRoute = ({ site }) => {
  if (!isProduction || !site || ['localhost', '127.0.0.1'].includes(site.hostname)) {
    return new Response('User-agent: *\nDisallow: /\n', {
      headers: { 'Content-Type': 'text/plain; charset=utf-8', 'X-Robots-Tag': 'noindex, nofollow' },
    });
  }

  const body = [
    'User-agent: *',
    'Allow: /',
    'Disallow: /admin',
    'Disallow: /api/',
    `Sitemap: ${new URL('/sitemap.xml', site).toString()}`,
    '',
  ].join('\n');
  return new Response(body, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
};
