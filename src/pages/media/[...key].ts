import type { APIRoute } from 'astro';
import { adminEnv, PROPERTY_ID } from '../../lib/admin/runtime';

export const prerender = false;
export const GET: APIRoute = async ({ params, locals }) => {
  const key = params.key;
  const keyPattern =
    /^residencial-ametista\/[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(?:jpg|png|webp|avif)$/;
  if (!key || !keyPattern.test(key) || !key.startsWith(`${PROPERTY_ID}/`)) {
    return new Response('Not found', { status: 404 });
  }
  const object = await adminEnv(locals).PROPERTY_MEDIA?.get(key);
  if (!object || object.customMetadata?.propertyId !== PROPERTY_ID) {
    return new Response('Not found', { status: 404 });
  }
  return new Response(object.body, {
    headers: {
      'Content-Type': object.httpMetadata?.contentType ?? 'application/octet-stream',
      'Cache-Control': 'public, max-age=31536000, immutable',
      'X-Content-Type-Options': 'nosniff',
      'Content-Length': String(object.size),
    },
  });
};
