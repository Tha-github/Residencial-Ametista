import type { PropertyContent } from '../../data/property.schema';

/**
 * Lista de pendências derivada do próprio conteúdo: tudo que uma seção
 * precisa para ser exibida e ainda não foi fornecido/confirmado.
 * Exibida apenas fora de produção (aviso de desenvolvimento) e útil para
 * gerar a lista de solicitações ao cliente.
 */
export interface PendingItem {
  section: string;
  field: string;
  label: string;
}

export function listPending(c: PropertyContent): PendingItem[] {
  const items: PendingItem[] = [];
  const add = (section: string, field: string, label: string) =>
    items.push({ section, field, label });

  if (!c.media.hero) add('hero', 'media.hero', 'Foto principal (hero)');
  if (c.description.length === 0) add('apresentacao', 'description', 'Descrição do residencial');
  if (c.media.gallery.length === 0) add('galeria', 'media.gallery', 'Fotos reais do imóvel');
  if (c.highlights.length === 0) add('diferenciais', 'highlights', 'Diferenciais confirmados');

  const f = c.facts;
  if (f.maxGuests === undefined) add('comodidades', 'facts.maxGuests', 'Capacidade máxima');
  if (f.bedrooms === undefined) add('comodidades', 'facts.bedrooms', 'Número de quartos');
  if (f.bathrooms === undefined) add('comodidades', 'facts.bathrooms', 'Número de banheiros');
  if (!f.beds) add('comodidades', 'facts.beds', 'Composição das camas');
  if (c.amenities.length === 0) add('comodidades', 'amenities', 'Comodidades confirmadas');

  const p = c.practicalInfo;
  if (!p.checkIn) add('informacoes', 'practicalInfo.checkIn', 'Horário de check-in');
  if (!p.checkOut) add('informacoes', 'practicalInfo.checkOut', 'Horário de check-out');
  if (p.houseRules.length === 0) add('informacoes', 'practicalInfo.houseRules', 'Regras da casa');

  if (!c.location.mapsUrl) add('localizacao', 'location.mapsUrl', 'Link validado do Google Maps');

  if (!c.booking.booking) add('reservas', 'booking.booking', 'URL do anúncio no Booking.com');
  if (!c.booking.airbnb) add('reservas', 'booking.airbnb', 'URL do anúncio no Airbnb');
  if (!c.booking.decolar) add('reservas', 'booking.decolar', 'URL do anúncio na Decolar');

  const ct = c.contact;
  if (!ct.instagram && !ct.whatsapp && !ct.email)
    add('contato', 'contact', 'Contato e/ou Instagram');

  return items;
}

export const pendingFor = (items: PendingItem[], section: string) =>
  items.filter((i) => i.section === section);
