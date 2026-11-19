import { describe, expect, it } from 'vitest';
import { applyEdits, clone, EditError, imageSources, locate } from '../../src/admin-kit/spec';
import { ametistaSpec } from '../../src/admin-sites/ametista';
import { parseContent } from '../../src/lib/content/load';
import { contrast, defaultTheme, themeCss, themeProblems } from '../../src/lib/theme';
import data from '../fixtures/ametista.sample.json';

/** Painel = CMS fechado: só os campos do descritor passam para o conteúdo. */
type Obj = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const current = (): Obj => clone(data) as Obj;
const apply = (edit: (c: Obj) => void) => {
  const incoming = current();
  edit(incoming);
  return applyEdits(current(), incoming, ametistaSpec) as Obj;
};

describe('lista branca do painel (applyEdits)', () => {
  it('sem alterações, o conteúdo sai idêntico', () => {
    expect(applyEdits(current(), current(), ametistaSpec)).toEqual(current());
  });

  it('aplica edições de campos permitidos', () => {
    const out = apply((c) => {
      c.sections.tour.title = 'Novo *título*';
      c.highlights[0].text = 'Texto novo';
      c.booking.airbnb = 'https://www.airbnb.com.br/rooms/999';
    });
    expect(out.sections.tour.title).toBe('Novo *título*');
    expect(out.highlights[0].text).toBe('Texto novo');
    expect(out.booking.airbnb).toBe('https://www.airbnb.com.br/rooms/999');
  });

  it('ignora campos fora do descritor (não cria seções, não muda estrutura)', () => {
    const out = apply((c) => {
      c.novaSecao = { title: 'invasão' };
      c.rooms = [];
      c.location.stateCode = 'XX';
      c.media.gallery[0].group = 'detalhes';
      c.highlights[0].stat = '999';
      c.$comment = 'trocado';
    });
    expect(out.novaSecao).toBeUndefined();
    expect(out.rooms).toEqual(current().rooms);
    expect(out.location.stateCode).toBe(current().location.stateCode);
    expect(out.media.gallery[0].group).toBe(current().media.gallery[0].group);
    expect(out.highlights[0].stat).toBe(current().highlights[0].stat);
    expect(out.$comment).toBe(current().$comment);
  });

  it('listas fixas não aceitam itens a mais ou a menos', () => {
    expect(() => apply((c) => c.highlights.push({ title: 'Extra', icon: 'sun' }))).toThrow(
      EditError,
    );
    expect(() => apply((c) => c.faq.pop())).toThrow(EditError);
    expect(() => apply((c) => c.experience.moments.pop())).toThrow(/adicionar ou remover/);
    expect(() => apply((c) => c.amenities.push('Piscina'))).toThrow(EditError);
  });

  it('galeria: reordena, remove e adiciona dentro do limite', () => {
    const out = apply((c) => {
      c.media.gallery.reverse();
      c.media.gallery.pop();
      c.media.gallery.push({
        src: 'uploads/20261118-abc123-foto.webp',
        alt: 'Nova',
        room: 'sala-cozinha',
      });
    });
    const before = current().media.gallery;
    expect(out.media.gallery[0].src).toBe(before.at(-1).src);
    expect(out.media.gallery.at(-1)).toEqual({
      src: 'uploads/20261118-abc123-foto.webp',
      alt: 'Nova',
      room: 'sala-cozinha',
    });
    // Campo não editável (group) preservado pela identidade da foto
    expect(out.media.gallery[0].group).toBe(before.at(-1).group);
    expect(() =>
      apply((c) => {
        while (c.media.gallery.length <= 20) c.media.gallery.push({ src: 'sala.png', alt: 'x' });
      }),
    ).toThrow(/Máximo de 20/);
    expect(() => apply((c) => (c.media.gallery = []))).toThrow(/Mínimo de 1/);
  });

  it('ponto focal: mantido na mesma foto, nunca vindo do painel', () => {
    const out = apply((c) => (c.media.hero.focus = '1% 1%'));
    expect(out.media.hero.focus).toBe(current().media.hero.focus);
  });

  it('trocar a foto de um item descarta o ponto focal da foto antiga', () => {
    const base = current();
    base.media.intro[0].focus = '30% 40%';
    const incoming = clone(base);
    incoming.media.intro[0].src = 'uploads/20261118-aaaaaa-nova.webp';
    const out = applyEdits(base, incoming, ametistaSpec) as Obj;
    expect(out.media.intro[0].focus).toBeUndefined();
    const same = applyEdits(base, clone(base), ametistaSpec) as Obj;
    expect(same.media.intro[0].focus).toBe('30% 40%');
  });

  it('campo obrigatório vazio é recusado; opcional vazio é removido', () => {
    expect(() => apply((c) => (c.name = '   '))).toThrow(/obrigatório/);
    const out = apply((c) => (c.contact.email = ''));
    expect(out.contact.email).toBeUndefined();
  });

  it('o resultado continua passando pelo schema do site (HTML, URLs, cores)', () => {
    const bad = [
      (c: Obj) => (c.sections.faq.title = '<script>alert(1)</script>'),
      (c: Obj) => (c.booking.booking = 'https://evil.example/booking'),
      (c: Obj) => (c.contact.whatsapp = 'javascript:alert(1)'),
      (c: Obj) => (c.theme.primary = '#ffffff'),
      (c: Obj) => (c.media.gallery[0].room = 'nao-existe'),
      (c: Obj) => (c.highlights[0].icon = 'skull'),
    ];
    for (const edit of bad) {
      const out = apply(edit);
      const { $comment: _c, ...content } = out;
      expect(() => parseContent(content, 't')).toThrow(/Conteúdo inválido/);
    }
  });

  it('lista todas as fotos usadas e localiza erros por campo', () => {
    const srcs = imageSources(current(), ametistaSpec);
    expect(srcs).toContain('bannerresidencialametista.webp');
    expect(srcs).toContain('regiao/santinho.jpg');
    expect(srcs.filter((s) => s.endsWith('.png')).length).toBeGreaterThanOrEqual(12);
    expect(locate(ametistaSpec, 'faq.2.answer')).toMatchObject({
      module: { id: 'duvidas' },
      label: 'Perguntas › item 3 › Resposta',
    });
  });
});

describe('cores autorizadas', () => {
  it('cores padrão: sem CSS extra (site idêntico) e sem problemas de contraste', () => {
    expect(themeCss(defaultTheme)).toBe('');
    expect(themeProblems(defaultTheme)).toEqual([]);
  });

  it('cor alterada sobrescreve só os tokens daquela cor', () => {
    const css = themeCss({ ...defaultTheme, primary: '#1d4ed8' });
    expect(css).toContain('--sea-700:#1d4ed8');
    expect(css).not.toContain('--terra-600');
    expect(css).toMatch(/^:root\{[^<>]*\}$/);
  });

  it('recusa combinações ilegíveis', () => {
    expect(themeProblems({ ...defaultTheme, primary: '#9ec5ff' }).length).toBeGreaterThan(0);
    expect(themeProblems({ ...defaultTheme, background: '#222222' }).length).toBeGreaterThan(0);
    expect(themeProblems({ ...defaultTheme, secondary: '#d0d0d0' }).length).toBeGreaterThan(0);
    expect(contrast('#000000', '#ffffff')).toBeCloseTo(21, 0);
  });

  it('valor que não é hex nunca vira CSS', () => {
    expect(themeCss({ ...defaultTheme, primary: 'red;}body{display:none' })).toBe('');
  });
});
