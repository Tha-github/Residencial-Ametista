export interface AdminEnv {
  CF_ACCESS_TEAM_DOMAIN?: string;
  CF_ACCESS_AUD?: string;
  ADMIN_ALLOWED_EMAIL?: string;
  CONTENT_DB?: D1Database;
  PROPERTY_MEDIA?: R2Bucket;
}

export function adminEnv(_locals: App.Locals): AdminEnv {
  return workerEnv as unknown as AdminEnv;
}

export async function readLimitedBody(request: Request, limit: number): Promise<Uint8Array | null> {
  if (!request.body) return new Uint8Array();
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const body = new Uint8Array(size);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

export async function consumeRateLimit(
  database: D1Database,
  key: 'owner:content-write' | 'owner:upload',
  maximum: number,
  windowMs: number,
): Promise<{ allowed: boolean; retryAfter: number }> {
  const now = Date.now();
  const windowStart = Math.floor(now / windowMs) * windowMs;
  const row = await database
    .prepare(
      'INSERT INTO admin_rate_limits (bucket_key, window_start, request_count) VALUES (?, ?, 1) ON CONFLICT(bucket_key) DO UPDATE SET request_count = CASE WHEN window_start = excluded.window_start THEN request_count + 1 ELSE 1 END, window_start = excluded.window_start RETURNING request_count',
    )
    .bind(key, windowStart)
    .first<{ request_count: number }>();
  return {
    allowed: Boolean(row && row.request_count <= maximum),
    retryAfter: Math.max(1, Math.ceil((windowStart + windowMs - now) / 1000)),
  };
}

export const PROPERTY_ID = 'residencial-ametista';

export function jsonResponse(
  body: unknown,
  status = 200,
  extraHeaders: HeadersInit = {},
): Response {
  return Response.json(body, {
    status,
    headers: new Headers({
      'Cache-Control': 'no-store',
      'X-Content-Type-Options': 'nosniff',
      'Referrer-Policy': 'no-referrer',
      ...Object.fromEntries(new Headers(extraHeaders).entries()),
    }),
  });
}
import { env as workerEnv } from 'cloudflare:workers';
