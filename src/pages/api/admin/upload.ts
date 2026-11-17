import type { APIRoute } from 'astro';
import { verifyAccess } from '../../../lib/admin/access';
import {
  adminEnv,
  consumeRateLimit,
  jsonResponse,
  PROPERTY_ID,
  readLimitedBody,
} from '../../../lib/admin/runtime';

export const prerender = false;
const readU32le = (bytes: Uint8Array, offset: number) =>
  bytes[offset] +
  (bytes[offset + 1] << 8) +
  (bytes[offset + 2] << 16) +
  bytes[offset + 3] * 0x1000000;

const formats = {
  'image/jpeg': {
    extensions: ['jpg', 'jpeg'],
    signature: (b: Uint8Array) =>
      b.length >= 4 &&
      b[0] === 0xff &&
      b[1] === 0xd8 &&
      b[2] === 0xff &&
      b.at(-2) === 0xff &&
      b.at(-1) === 0xd9,
  },
  'image/png': {
    extensions: ['png'],
    signature: (b: Uint8Array) =>
      b.length >= 45 &&
      b[0] === 0x89 &&
      b[1] === 0x50 &&
      b[2] === 0x4e &&
      b[3] === 0x47 &&
      b[4] === 0x0d &&
      b[5] === 0x0a &&
      b[6] === 0x1a &&
      b[7] === 0x0a &&
      b.at(-8) === 0x49 &&
      b.at(-7) === 0x45 &&
      b.at(-6) === 0x4e &&
      b.at(-5) === 0x44,
  },
  'image/webp': {
    extensions: ['webp'],
    signature: (b: Uint8Array) =>
      b.length >= 30 &&
      new TextDecoder().decode(b.slice(0, 4)) === 'RIFF' &&
      readU32le(b, 4) + 8 === b.length &&
      new TextDecoder().decode(b.slice(8, 12)) === 'WEBP',
  },
  'image/avif': {
    extensions: ['avif'],
    signature: (b: Uint8Array) =>
      new TextDecoder().decode(b.slice(4, 8)) === 'ftyp' &&
      /avif|avis/.test(new TextDecoder().decode(b.slice(8, 16))),
  },
} as const;

const readU32be = (bytes: Uint8Array, offset: number) =>
  bytes[offset] * 0x1000000 +
  (bytes[offset + 1] << 16) +
  (bytes[offset + 2] << 8) +
  bytes[offset + 3];

function imageDimensions(
  type: keyof typeof formats,
  bytes: Uint8Array,
): { width: number; height: number } | null {
  if (type === 'image/png') return { width: readU32be(bytes, 16), height: readU32be(bytes, 20) };
  if (type === 'image/jpeg') {
    let offset = 2;
    while (offset + 4 < bytes.length) {
      if (bytes[offset] !== 0xff) return null;
      while (bytes[offset] === 0xff) offset++;
      const marker = bytes[offset++];
      if (
        marker === 0xd8 ||
        marker === 0xd9 ||
        marker === 0x01 ||
        (marker >= 0xd0 && marker <= 0xd7)
      )
        continue;
      if (marker === 0xda) return null;
      const length = (bytes[offset] << 8) | bytes[offset + 1];
      if (length < 2 || offset + length > bytes.length) return null;
      if (
        [0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(
          marker,
        )
      ) {
        return {
          height: (bytes[offset + 3] << 8) | bytes[offset + 4],
          width: (bytes[offset + 5] << 8) | bytes[offset + 6],
        };
      }
      offset += length;
    }
    return null;
  }
  if (type === 'image/webp') {
    const chunk = new TextDecoder().decode(bytes.slice(12, 16));
    if (chunk === 'VP8X' && bytes.length >= 30) {
      const read24 = (o: number) => bytes[o] | (bytes[o + 1] << 8) | (bytes[o + 2] << 16);
      return { width: read24(24) + 1, height: read24(27) + 1 };
    }
    if (
      chunk === 'VP8 ' &&
      bytes.length >= 30 &&
      bytes[23] === 0x9d &&
      bytes[24] === 0x01 &&
      bytes[25] === 0x2a
    ) {
      return {
        width: ((bytes[27] << 8) | bytes[26]) & 0x3fff,
        height: ((bytes[29] << 8) | bytes[28]) & 0x3fff,
      };
    }
    if (chunk === 'VP8L' && bytes.length >= 25 && bytes[20] === 0x2f) {
      return {
        width: 1 + bytes[21] + ((bytes[22] & 0x3f) << 8),
        height: 1 + ((bytes[22] >> 6) | (bytes[23] << 2) | ((bytes[24] & 0x0f) << 10)),
      };
    }
    return null;
  }
  const sizes: { width: number; height: number }[] = [];
  for (let offset = 4; offset + 16 <= bytes.length; offset++) {
    if (
      bytes[offset] === 0x69 &&
      bytes[offset + 1] === 0x73 &&
      bytes[offset + 2] === 0x70 &&
      bytes[offset + 3] === 0x65
    ) {
      sizes.push({ width: readU32be(bytes, offset + 8), height: readU32be(bytes, offset + 12) });
    }
  }
  return sizes.sort((a, b) => b.width * b.height - a.width * a.height)[0] ?? null;
}

export const POST: APIRoute = async ({ request, locals }) => {
  const env = adminEnv(locals);
  const actor = await verifyAccess(request, env);
  if (!actor) return jsonResponse({ error: 'Sessão ausente ou expirada.' }, 401);
  if (!env.PROPERTY_MEDIA || !env.CONTENT_DB)
    return jsonResponse({ error: 'Armazenamento de mídia não configurado.' }, 503);
  if (request.headers.get('origin') !== new URL(request.url).origin)
    return jsonResponse({ error: 'Origem inválida.' }, 403);
  const limit = await consumeRateLimit(env.CONTENT_DB, 'owner:upload', 8, 60 * 1000);
  if (!limit.allowed)
    return jsonResponse(
      { error: 'Limite de envios atingido. Tente novamente em um minuto.' },
      429,
      { 'Retry-After': String(limit.retryAfter) },
    );
  const requestBytes = await readLimitedBody(request, 12 * 1024 * 1024 + 128_000);
  if (!requestBytes) return jsonResponse({ error: 'Arquivo deve ter até 12 MB.' }, 413);
  let form: FormData;
  try {
    form = await new Response(requestBytes.buffer as ArrayBuffer, {
      headers: { 'Content-Type': request.headers.get('content-type') ?? '' },
    }).formData();
  } catch {
    return jsonResponse({ error: 'Envio inválido.' }, 400);
  }
  const file = form.get('file');
  if (!(file instanceof File)) return jsonResponse({ error: 'Selecione uma imagem.' }, 400);
  if (file.size < 16 || file.size > 12 * 1024 * 1024)
    return jsonResponse({ error: 'Arquivo deve ter entre 16 bytes e 12 MB.' }, 413);
  const descriptor = formats[file.type as keyof typeof formats];
  if (
    !descriptor ||
    !descriptor.extensions.some((ext) => file.name.toLowerCase().endsWith(`.${ext}`))
  )
    return jsonResponse(
      { error: 'Formato permitido: JPEG, PNG, WebP ou AVIF com extensão correspondente.' },
      415,
    );
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (!descriptor.signature(bytes))
    return jsonResponse(
      { error: 'O conteúdo do arquivo não corresponde à imagem declarada.' },
      415,
    );
  const dimensions = imageDimensions(file.type as keyof typeof formats, bytes);
  if (
    !dimensions ||
    dimensions.width < 1 ||
    dimensions.height < 1 ||
    dimensions.width > 12_000 ||
    dimensions.height > 12_000 ||
    dimensions.width * dimensions.height > 40_000_000
  ) {
    return jsonResponse(
      { error: 'A imagem está inválida ou excede o limite de 40 megapixels.' },
      415,
    );
  }
  const extension = file.type === 'image/jpeg' ? 'jpg' : descriptor.extensions[0];
  const key = `${PROPERTY_ID}/${crypto.randomUUID()}.${extension}`;
  const now = new Date().toISOString();
  await env.PROPERTY_MEDIA.put(key, bytes, {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000, immutable' },
    customMetadata: { propertyId: PROPERTY_ID },
  });
  await env.CONTENT_DB.batch([
    env.CONTENT_DB.prepare(
      'INSERT INTO admin_audit (id, property_id, actor, action, created_at) VALUES (?, ?, ?, ?, ?)',
    ).bind(crypto.randomUUID(), PROPERTY_ID, actor, 'media.upload', now),
    env.CONTENT_DB.prepare(
      "DELETE FROM admin_audit WHERE julianday(created_at) < julianday('now', '-90 days')",
    ),
  ]);
  return jsonResponse({ ok: true, src: `/media/${key}`, key });
};
