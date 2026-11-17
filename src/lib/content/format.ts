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

export type PlatformKey = keyof PropertyContent['booking'];

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

/** "@perfil" a partir de uma URL do Instagram, para o texto do link. */
export function instagramHandle(url: string): string {
  const handle = new URL(url).pathname.split('/').filter(Boolean)[0];
  return handle ? `@${handle}` : 'Instagram';
}
