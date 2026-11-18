import { describe, expect, it } from 'vitest';
import { ContentValidationError, parseContent } from '../../src/lib/content/load';
import { listPending } from '../../src/lib/content/pending';
import data from '../../src/data/ametista.json';

const minimal = {
  name: 'Residencial Ametista',
  location: { city: 'Florianópolis', state: 'Santa Catarina', stateCode: 'SC' },
};

describe('conteúdo do residencial', () => {
  it('o arquivo versionado é válido', () => {
    expect(() => parseContent(data, 'ametista.json')).not.toThrow();
  });

  it('o arquivo versionado contém os dados informados pelo cliente e mantém canais ausentes vazios', () => {
    const c = parseContent(data, 'ametista.json');
    expect(c.description[0]).toContain('90 m²');
    expect(c.amenities).toContain('Vaga privativa gratuita');
    expect(c.facts).toMatchObject({ areaM2: 90, bedrooms: 2, bathrooms: 2, beds: '4 camas' });
    expect(c.booking).toEqual({
      booking: 'https://www.booking.com/hotel/br/condominio-residencial-ametista.pt-br.html',
      airbnb: 'https://www.airbnb.com.br/rooms/13257454',
    });
    expect(c.contact).toEqual({});
    expect(c.media.gallery).toHaveLength(9);
    expect(c.location.streetAddress).toBe('Rua Dante de Patta, 283');
    expect(c.location.mapsUrl).toBe('https://maps.app.goo.gl/qvsUVxg31GUaZbr36');
  });

  it('aplica padrões vazios aos campos opcionais', () => {
    const c = parseContent(minimal, 'teste');
    expect(c.highlights).toEqual([]);
    expect(c.practicalInfo.houseRules).toEqual([]);
  });

  it('rejeita HTML em campos de texto', () => {
    expect(() =>
      parseContent({ ...minimal, tagline: '<script>alert(1)</script>' }, 'teste'),
    ).toThrow(ContentValidationError);
  });

  it('rejeita link de reserva fora do domínio esperado', () => {
    expect(() =>
      parseContent({ ...minimal, booking: { airbnb: 'https://airbnb.example.com/x' } }, 'teste'),
    ).toThrow(/booking\.airbnb/);
  });

  it('rejeita conteúdo sem campos obrigatórios com mensagem por caminho', () => {
    try {
      parseContent({ location: {} }, 'teste');
      expect.unreachable();
    } catch (e) {
      expect(e).toBeInstanceOf(ContentValidationError);
      const paths = (e as ContentValidationError).issues.map((i) => i.path);
      expect(paths).toContain('name');
      expect(paths).toContain('location.city');
    }
  });

  it('lista pendências e remove itens quando os dados chegam', () => {
    const before = listPending(parseContent(minimal, 'teste'));
    expect(before.some((p) => p.field === 'booking.booking')).toBe(true);

    const after = listPending(
      parseContent(
        { ...minimal, booking: { booking: 'https://www.booking.com/hotel/br/x.html' } },
        'teste',
      ),
    );
    expect(after.some((p) => p.field === 'booking.booking')).toBe(false);
    expect(after.length).toBe(before.length - 1);
  });
});
