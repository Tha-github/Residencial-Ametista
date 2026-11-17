import type { ImageMetadata } from 'astro';
import { galleryGroups, type PropertyContent } from '../../data/property.schema';

type ContentPhoto = PropertyContent['media']['gallery'][number];

/** Foto da galeria; `src` pode ser já resolvida (amostras de desenvolvimento). */
export type GalleryPhoto = Omit<ContentPhoto, 'src'> & { src: string | ImageMetadata };

/**
 * Ordena a galeria para contar uma história: fachada → áreas sociais →
 * quartos → terraço/pátio → detalhes. Ordenação estável: dentro de cada
 * grupo vale a ordem enviada; fotos sem grupo vêm por último, na ordem
 * original. Sem nenhum grupo informado, a ordem enviada é mantida.
 */
export function orderGallery<T extends Pick<GalleryPhoto, 'group'>>(photos: readonly T[]): T[] {
  const rank = (p: T) => (p.group ? galleryGroups.indexOf(p.group) : galleryGroups.length);
  return photos
    .map((photo, index) => ({ photo, index }))
    .sort((a, b) => rank(a.photo) - rank(b.photo) || a.index - b.index)
    .map(({ photo }) => photo);
}

/**
 * Quantas fotos aparecem na grade; as demais ficam acessíveis no modo ampliado.
 * 6 fecha o mosaico sem buracos: desktop = destaque 2×2 + 2 à direita + linha
 * de 3; mobile = destaque + pares + última em largura total.
 */
export const GRID_VISIBLE = 6;
