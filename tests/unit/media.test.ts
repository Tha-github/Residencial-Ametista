import { describe, expect, it } from 'vitest';
import { parseContent } from '../../src/lib/content/load';
import { orderGallery } from '../../src/lib/media/gallery';
import type { galleryGroups } from '../../src/data/property.schema';
import { responsiveWidths } from '../../src/styles/breakpoints';

type P<T> = { id: T; group?: (typeof galleryGroups)[number] };

const base = {
  name: 'R',
  location: { city: 'Florianópolis', state: 'Santa Catarina', stateCode: 'SC' },
};

describe('orderGallery — ordem narrativa', () => {
  it('fachada → social → quartos → terraço → detalhes; sem grupo por último', () => {
    const photos: P<string>[] = [
      { id: 'a', group: 'terraco' },
      { id: 'b' },
      { id: 'c', group: 'fachada' },
      { id: 'd', group: 'detalhes' },
      { id: 'e', group: 'social' },
      { id: 'f', group: 'quartos' },
      { id: 'g' },
    ];
    expect(orderGallery(photos).map((p) => p.id)).toEqual(['c', 'e', 'f', 'a', 'd', 'b', 'g']);
  });

  it('é estável: dentro do grupo mantém a ordem enviada', () => {
    const photos: P<number>[] = [
      { id: 1, group: 'social' },
      { id: 2, group: 'fachada' },
      { id: 3, group: 'social' },
      { id: 4, group: 'social' },
    ];
    expect(orderGallery(photos).map((p) => p.id)).toEqual([2, 1, 3, 4]);
  });

  it('sem grupos, mantém exatamente a ordem enviada', () => {
    const photos: P<number>[] = [{ id: 3 }, { id: 1 }, { id: 2 }];
    expect(orderGallery(photos).map((p) => p.id)).toEqual([3, 1, 2]);
  });
});

describe('responsiveWidths', () => {
  it('nunca amplia além do original', () => {
    expect(responsiveWidths(1200)).toEqual([360, 480, 768, 1024, 1200]);
  });
  it('limita originais gigantes a 2400px', () => {
    expect(responsiveWidths(6000).at(-1)).toBe(2400);
    expect(Math.max(...responsiveWidths(6000))).toBe(2400);
  });
  it('original exatamente numa largura da lista não duplica', () => {
    expect(responsiveWidths(1920)).toEqual([360, 480, 768, 1024, 1280, 1600, 1920]);
  });
});

describe('schema de fotos', () => {
  const withGallery = (photo: object) =>
    parseContent({ ...base, media: { gallery: [{ src: 'x.jpg', alt: 'x', ...photo }] } }, 't');

  it('aceita ponto focal, grupo e legenda válidos', () => {
    const c = withGallery({ focus: '40% 70%', group: 'quartos', caption: 'Legenda' });
    expect(c.media.gallery[0]).toMatchObject({ focus: '40% 70%', group: 'quartos' });
  });

  it.each(['50%', '50 50', '120% 10%', 'center', '50% 50%; background:red'])(
    'rejeita ponto focal inválido: %s',
    (focus) => {
      expect(() => withGallery({ focus })).toThrow(/Conteúdo inválido/);
    },
  );

  it('rejeita grupo desconhecido e HTML na legenda', () => {
    expect(() => withGallery({ group: 'piscina' })).toThrow();
    expect(() => withGallery({ caption: '<b>x</b>' })).toThrow();
  });

  it.each([
    '/outside.jpg',
    '../outside.jpg',
    'https://evil.example/image.jpg',
    'javascript:alert(1)',
    'folder\\image.jpg',
  ])('rejeita fonte de imagem fora do armazenamento previsto: %s', (src) => {
    expect(() => withGallery({ src })).toThrow(/Conteúdo inválido/);
  });

  it('aceita somente o formato de chave R2 gerada para este residencial', () => {
    const c = withGallery({
      src: '/media/residencial-ametista/00000000-0000-4000-8000-000000000000.jpg',
    });
    expect(c.media.gallery[0].src).toContain('/media/residencial-ametista/');
    expect(() =>
      withGallery({ src: '/media/outro-residencial/00000000-0000-4000-8000-000000000000.jpg' }),
    ).toThrow(/Conteúdo inválido/);
  });
});
