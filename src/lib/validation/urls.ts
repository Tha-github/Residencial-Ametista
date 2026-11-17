/**
 * Validação de URLs externas com allowlist por finalidade.
 *
 * Usada tanto no schema de conteúdo (build) quanto, na Etapa 6, na API do painel
 * (servidor). Regras: somente HTTPS, sem credenciais embutidas, sem porta
 * explícita e host dentro da lista esperada para aquela finalidade.
 */

export type ExternalLinkKind = 'booking' | 'airbnb' | 'decolar' | 'maps' | 'instagram' | 'whatsapp';

const ALLOWED_HOSTS: Record<ExternalLinkKind, readonly string[]> = {
  booking: ['booking.com'],
  airbnb: ['airbnb.com', 'airbnb.com.br'],
  decolar: ['decolar.com'],
  maps: ['google.com', 'google.com.br', 'maps.google.com', 'maps.app.goo.gl', 'goo.gl'],
  instagram: ['instagram.com'],
  whatsapp: ['wa.me', 'api.whatsapp.com'],
};

/** Para Google genérico, só caminhos de mapa são aceitos. */
const PATH_RULES: Partial<Record<ExternalLinkKind, (url: URL) => boolean>> = {
  maps: (url) => {
    const host = stripWww(url.hostname);
    if (host === 'google.com' || host === 'google.com.br') return url.pathname.startsWith('/maps');
    if (host === 'goo.gl') return url.pathname.startsWith('/maps');
    return true;
  },
};

function stripWww(hostname: string): string {
  return hostname.toLowerCase().replace(/^www\./, '');
}

function hostMatches(hostname: string, allowed: readonly string[]): boolean {
  const host = stripWww(hostname);
  // Aceita o domínio exato ou subdomínios dele (ex.: m.booking.com),
  // nunca sufixos arbitrários (ex.: evilbooking.com).
  return allowed.some((domain) => host === domain || host.endsWith(`.${domain}`));
}

export type UrlCheck = { ok: true; url: string } | { ok: false; reason: string };

export function validateExternalUrl(input: string, kind: ExternalLinkKind): UrlCheck {
  let url: URL;
  try {
    url = new URL(input.trim());
  } catch {
    return { ok: false, reason: 'URL inválida' };
  }

  if (url.protocol !== 'https:') return { ok: false, reason: 'Somente HTTPS é permitido' };
  if (url.username || url.password) return { ok: false, reason: 'URL não pode conter credenciais' };
  if (url.port) return { ok: false, reason: 'URL não pode conter porta' };
  if (!hostMatches(url.hostname, ALLOWED_HOSTS[kind])) {
    return { ok: false, reason: `Domínio não permitido para ${kind}` };
  }
  const pathRule = PATH_RULES[kind];
  if (pathRule && !pathRule(url)) return { ok: false, reason: 'Caminho não permitido' };

  return { ok: true, url: url.toString() };
}

export const allowedHostsFor = (kind: ExternalLinkKind): readonly string[] => ALLOWED_HOSTS[kind];
