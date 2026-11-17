import { describe, expect, it } from 'vitest';
import { parseContent } from '../../src/lib/content/load';
import { bookingLinks, formatAddress, instagramHandle } from '../../src/lib/content/format';
import { navItems, sectionStates } from '../../src/lib/content/sections';
import data from '../../src/data/ametista.json';

const base = {
  name: 'Residencial Ametista',
  location: {
    beach: 'Praia dos Ingleses',
    city: 'Florianópolis',
    state: 'Santa Catarina',
    stateCode: 'SC',
  },
};
const ready = (input: object) =>
  Object.fromEntries(sectionStates(parseContent(input, 't')).map((s) => [s.id, s.ready]));

describe('estrutura de seções', () => {
  it('publica seções preenchidas com conteúdo e mantém reservas e contato sem destino', () => {
    expect(ready(data)).toEqual({
      apresentacao: true,
      galeria: true,
      diferenciais: true,
      comodidades: true,
      informacoes: true,
      localizacao: true,
      reservas: false,
      contato: false,
    });
  });

  it('reservas só existem com ao menos um link de plataforma', () => {
    expect(ready(base).reservas).toBe(false);
    expect(
      ready({ ...base, booking: { airbnb: 'https://www.airbnb.com.br/rooms/1' } }).reservas,
    ).toBe(true);
  });

  it('localização exige link do Maps validado', () => {
    expect(ready(base).localizacao).toBe(false);
    expect(
      ready({ ...base, location: { ...base.location, mapsUrl: 'https://maps.app.goo.gl/x' } })
        .localizacao,
    ).toBe(true);
  });

  it('comodidades aparecem com um único fato confirmado', () => {
    expect(ready({ ...base, facts: { bedrooms: 2 } }).comodidades).toBe(true);
  });

  it('navegação lista apenas seções publicadas', () => {
    const states = sectionStates(
      parseContent({ ...base, contact: { instagram: 'https://www.instagram.com/x' } }, 't'),
    );
    expect(navItems(states)).toEqual([{ href: '#contato', label: 'Contato' }]);
  });
});

describe('formatação', () => {
  it('links de reserva na ordem Booking → Airbnb → Decolar, só os fornecidos', () => {
    const c = parseContent(
      {
        ...base,
        booking: {
          decolar: 'https://www.decolar.com/hoteis/h-1',
          booking: 'https://www.booking.com/hotel/br/x.html',
        },
      },
      't',
    );
    expect(bookingLinks(c).map((l) => l.name)).toEqual(['Booking.com', 'Decolar']);
  });

  it('endereço só aparece se confirmado', () => {
    expect(formatAddress(parseContent(base, 't').location)).toBeUndefined();
    expect(
      formatAddress(
        parseContent(
          { ...base, location: { ...base.location, streetAddress: 'Rua Exemplo, 1' } },
          't',
        ).location,
      ),
    ).toContain('Rua Exemplo, 1');
  });

  it('extrai o @ do Instagram', () => {
    expect(instagramHandle('https://www.instagram.com/residencial/')).toBe('@residencial');
  });
});
