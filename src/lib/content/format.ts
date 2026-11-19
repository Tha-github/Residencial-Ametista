import type { PropertyContent } from '../../data/property.schema';

type Location = PropertyContent['location'];

/** "Praia dos Ingleses · Florianópolis, SC" — só com campos existentes. */
export const formatPlace = (l: Location) =>
  [l.beach, `${l.city}, ${l.stateCode}`].filter(Boolean).join(' · ');

/** Endereço completo, somente se confirmado (streetAddress presente). */
export function formatAddress(l: Location): string | undefined {
  if (!l.streetAddress) return undefined;
  const cep = l.postalCode ? ` · CEP ${l.postalCode}` : '';
  const bairro = l.neighborhood ? `, ${l.neighborhood}` : '';
  return `${l.streetAddress}${bairro} — ${l.city}, ${l.stateCode}${cep}`;
}

export type PlatformKey = Exclude<keyof PropertyContent['booking'], 'buttonPrefix'>;

/** Plataformas de reserva, na ordem de exibição. Nomes em texto (sem logos). */
export const platforms: { key: PlatformKey; name: string }[] = [
  { key: 'booking', name: 'Booking.com' },
  { key: 'airbnb', name: 'Airbnb' },
  { key: 'decolar', name: 'Decolar' },
];

export const bookingLinks = (c: PropertyContent) =>
  platforms.flatMap(({ key, name }) => {
    const url = c.booking[key];
    return url ? [{ key, name, url }] : [];
  });

/**
 * Número legível a partir de um link do WhatsApp (wa.me/55DDDNÚMERO):
 * "(48) 99947-1321". Formato desconhecido → undefined (o link continua).
 */
export function whatsappNumber(url: string): string | undefined {
  const u = new URL(url);
  const digits = (u.hostname.endsWith('wa.me') ? u.pathname : (u.searchParams.get('phone') ?? ''))
    .replace(/\D/g, '')
    .replace(/^55(?=\d{10,11}$)/, '');
  const m = digits.match(/^(\d{2})(\d{4,5})(\d{4})$/);
  return m ? `(${m[1]}) ${m[2]}-${m[3]}` : undefined;
}

/** "@perfil" a partir de uma URL do Instagram, para o texto do link. */
export function instagramHandle(url: string): string {
  const handle = new URL(url).pathname.split('/').filter(Boolean)[0];
  return handle ? `@${handle}` : 'Instagram';
}
