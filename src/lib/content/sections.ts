import type { PropertyContent } from '../../data/property.schema';

/**
 * Fonte única da estrutura da página: ordem das seções, quando cada uma
 * pode ser publicada (somente com dados confirmados) e o que entra na
 * navegação. Header, footer, página e testes usam este mesmo mapa.
 */
export type SectionId =
  | 'apresentacao'
  | 'galeria'
  | 'diferenciais'
  | 'comodidades'
  | 'informacoes'
  | 'localizacao'
  | 'reservas'
  | 'contato';

export interface SectionState {
  id: SectionId;
  title: string;
  /** Rótulo curto para navegação; ausente = não entra no menu. */
  navLabel?: string;
  ready: boolean;
}

export const hasBookingLinks = (c: PropertyContent) =>
  Boolean(c.booking.booking || c.booking.airbnb || c.booking.decolar);

export const hasContact = (c: PropertyContent) =>
  Boolean(c.contact.instagram || c.contact.whatsapp || c.contact.email);

export const hasFacts = (c: PropertyContent) =>
  Object.values(c.facts).some((v) => v !== undefined && v !== '');

export function sectionStates(c: PropertyContent): SectionState[] {
  const p = c.practicalInfo;
  return [
    {
      id: 'apresentacao',
      title: 'Apresentação',
      navLabel: 'O residencial',
      ready: c.description.length > 0,
    },
    { id: 'galeria', title: 'Galeria', navLabel: 'Fotos', ready: c.media.gallery.length > 0 },
    { id: 'diferenciais', title: 'Diferenciais', ready: c.highlights.length > 0 },
    {
      id: 'comodidades',
      title: 'Comodidades e capacidade',
      ready: c.amenities.length > 0 || hasFacts(c),
    },
    {
      id: 'informacoes',
      title: 'Informações práticas',
      ready: Boolean(p.checkIn || p.checkOut || p.houseRules.length > 0),
    },
    {
      id: 'localizacao',
      title: 'Localização',
      navLabel: 'Localização',
      ready: Boolean(c.location.mapsUrl),
    },
    { id: 'reservas', title: 'Reservas', ready: hasBookingLinks(c) },
    { id: 'contato', title: 'Contato', navLabel: 'Contato', ready: hasContact(c) },
  ];
}

/** Itens de navegação: apenas seções publicadas e com rótulo. */
export const navItems = (states: SectionState[]) =>
  states
    .filter((s) => s.ready && s.navLabel)
    .map((s) => ({ href: `#${s.id}`, label: s.navLabel as string }));
