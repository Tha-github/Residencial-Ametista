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

  it('o arquivo versionado não contém dados não confirmados', () => {
    const c = parseContent(data, 'ametista.json');
    expect(c.description).toEqual([]);
    expect(c.amenities).toEqual([]);
    expect(c.facts).toEqual({});
    expect(c.booking).toEqual({});
    expect(c.contact).toEqual({});
    expect(c.media.gallery).toEqual([]);
    expect(c.location.streetAddress).toBeUndefined();
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
