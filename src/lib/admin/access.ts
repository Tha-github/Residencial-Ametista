import type { AdminEnv } from './runtime';

type AccessClaims = {
  aud?: string[] | string;
  exp?: number;
  nbf?: number;
  iss?: string;
  email?: string;
};
const encoder = new TextEncoder();
let jwksCache: { team: string; expiresAt: number; keys: JsonWebKey[] } | undefined;

function decodePart(value: string): ArrayBuffer {
  const binary = atob(value.replace(/-/g, '+').replace(/_/g, '/'));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0)).buffer as ArrayBuffer;
}

function decodeJson<T>(value: string): T {
  return JSON.parse(new TextDecoder().decode(decodePart(value))) as T;
}

/** Verify Cloudflare Access RS256 assertion and exact app audience on every request. */
export async function verifyAccess(request: Request, env: AdminEnv): Promise<string | null> {
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim().toLowerCase();
  const audience = env.CF_ACCESS_AUD?.trim();
  const token = request.headers.get('Cf-Access-Jwt-Assertion');
  if (
    !team ||
    !/^[a-z0-9-]+\.cloudflareaccess\.com$/.test(team) ||
    !audience ||
    !token ||
    token.length > 8192
  )
    return null;

  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [encodedHeader, encodedClaims, encodedSignature] = parts;
    if (!encodedHeader || !encodedClaims || !encodedSignature) return null;
    const header = decodeJson<{ alg?: string; kid?: string }>(encodedHeader);
    if (header.alg !== 'RS256' || !header.kid) return null;
    const claims = decodeJson<AccessClaims>(encodedClaims);
    const now = Math.floor(Date.now() / 1000);
    const aud = Array.isArray(claims.aud) ? claims.aud : [claims.aud];
    if (!aud.includes(audience) || !claims.email || !claims.exp || claims.exp <= now) return null;
    if (claims.nbf && claims.nbf > now + 60) return null;
    if (claims.iss !== `https://${team}`) return null;

    let keys = await loadAccessKeys(team);
    let jwk = keys?.find((key) => (key as JsonWebKey & { kid?: string }).kid === header.kid);
    if (!jwk) {
      keys = await loadAccessKeys(team, true);
      jwk = keys?.find((key) => (key as JsonWebKey & { kid?: string }).kid === header.kid);
    }
    if (!jwk) return null;
    const key = await crypto.subtle.importKey(
      'jwk',
      jwk,
      { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
      false,
      ['verify'],
    );
    const valid = await crypto.subtle.verify(
      'RSASSA-PKCS1-v1_5',
      key,
      decodePart(encodedSignature),
      encoder.encode(`${encodedHeader}.${encodedClaims}`),
    );
    const allowedEmail = env.ADMIN_ALLOWED_EMAIL?.trim().toLowerCase();
    if (!allowedEmail || claims.email.toLowerCase() !== allowedEmail) return null;
    return valid ? 'owner' : null;
  } catch {
    return null;
  }
}

async function loadAccessKeys(team: string, refresh = false): Promise<JsonWebKey[] | null> {
  if (!refresh && jwksCache?.team === team && jwksCache.expiresAt > Date.now())
    return jwksCache.keys;
  const response = await fetch(`https://${team}/cdn-cgi/access/certs`, {
    headers: { Accept: 'application/json' },
    signal: AbortSignal.timeout(4000),
  });
  if (!response.ok) return null;
  const jwks = (await response.json()) as { keys?: JsonWebKey[] };
  if (!Array.isArray(jwks.keys) || jwks.keys.length > 20) return null;
  jwksCache = { team, keys: jwks.keys, expiresAt: Date.now() + 5 * 60 * 1000 };
  return jwks.keys;
}
