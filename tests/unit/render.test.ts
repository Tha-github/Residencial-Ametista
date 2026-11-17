import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import { beforeAll, describe, expect, it } from 'vitest';
import Booking from '../../src/components/sections/Booking.astro';
import Contact from '../../src/components/sections/Contact.astro';
import Hero from '../../src/components/sections/Hero.astro';
import Location from '../../src/components/sections/Location.astro';
import PublicationStatus from '../../src/components/states/PublicationStatus.astro';
import { parseContent } from '../../src/lib/content/load';
import data from '../../src/data/ametista.json';

/**
 * Renderiza os componentes reais e verifica o HTML: links externos seguros,
 * aviso de reserva externa, nenhuma simulação de preço/calendário, e CTAs
 * que nunca apontam para seções inexistentes.
 */
let container: AstroContainer;
beforeAll(async () => {
  container = await AstroContainer.create();
});

const base = {
  name: 'Residencial Ametista',
  location: {
    beach: 'Praia dos Ingleses',
    city: 'Florianópolis',
    state: 'Santa Catarina',
    stateCode: 'SC',
    mapsUrl: 'https://maps.app.goo.gl/abc',
  },
  booking: {
    booking: 'https://www.booking.com/hotel/br/x.html',
    airbnb: 'https://www.airbnb.com.br/rooms/1',
  },
  contact: { instagram: 'https://www.instagram.com/residencial', email: 'contato@example.com' },
};
const content = parseContent(base, 'teste');

const externalAnchors = (html: string) =>
  [...html.matchAll(/<a\b[^>]*href="https:[^"]*"[^>]*>/g)].map((m) => m[0]);

describe('Reservas', () => {
  it('um link por plataforma fornecida, em nova aba e com rel seguro', async () => {
    const html = await container.renderToString(Booking, { props: { content } });
    const anchors = externalAnchors(html);
    expect(anchors).toHaveLength(2);
    for (const a of anchors) {
      expect(a).toContain('target="_blank"');
      expect(a).toContain('rel="noopener noreferrer"');
    }
    expect(html).toContain('Reservar no Booking.com');
    expect(html).toContain('Reservar no Airbnb');
    expect(html).not.toContain('Decolar');
  });

  it('deixa claro que a reserva é concluída na plataforma externa', async () => {
    const html = await container.renderToString(Booking, { props: { content } });
    expect(html).toContain('acontecem na plataforma escolhida');
    expect(html).toContain('Este site não processa reservas');
  });

  it('não simula preço, disponibilidade nem calendário', async () => {
    const html = await container.renderToString(Booking, { props: { content } });
    expect(html).not.toMatch(/R\$|<form|type="date"|disponível agora|<input/i);
  });
});

describe('Hero', () => {
  it('com o conteúdo atual: sem CTA (não há links nem descrição)', async () => {
    const html = await container.renderToString(Hero, {
      props: { content: parseContent(data, 'ametista.json') },
    });
    expect(html).toContain('Ametista');
    expect(html).toContain('Praia dos Ingleses');
    expect(html).not.toContain('href="#reservas"');
    expect(html).not.toContain('href="#apresentacao"');
  });

  it('com links de reserva: CTA leva à seção de reservas', async () => {
    const html = await container.renderToString(Hero, { props: { content } });
    expect(html).toContain('href="#reservas"');
    expect(html).not.toContain('href="#apresentacao"');
  });
});

describe('Estado público do conteúdo', () => {
  it('explica que os dados essenciais ainda estão em atualização', async () => {
    const html = await container.renderToString(PublicationStatus);
    expect(html).toContain('Estamos preparando a página completa.');
    expect(html).toContain('Fotos oficiais');
    expect(html).toContain('links para reserva');
  });
});

describe('Localização e contato', () => {
  it('Maps abre em nova aba; sem iframe de mapa', async () => {
    const html = await container.renderToString(Location, { props: { content } });
    expect(html).toContain('href="https://maps.app.goo.gl/abc"');
    expect(html).not.toContain('<iframe');
    // Sem streetAddress confirmado, nenhuma linha de endereço é exibida.
    expect(html).not.toContain('location__address');
  });

  it('contato mostra apenas canais fornecidos', async () => {
    const html = await container.renderToString(Contact, { props: { content } });
    expect(html).toContain('@residencial');
    expect(html).toContain('mailto:contato@example.com');
    expect(html).not.toContain('WhatsApp');
  });
});
