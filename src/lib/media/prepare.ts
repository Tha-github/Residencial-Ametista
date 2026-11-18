import type { ImageMetadata } from 'astro';
import { getImage } from 'astro:assets';
import { responsiveWidths } from '../../styles/breakpoints';
import type { GalleryPhoto } from './gallery';
import { resolvePhoto } from './photos';

export interface LightboxItem {
  photo: GalleryPhoto;
  /** Posição no modo ampliado (0-based). */
  index: number;
  image: ImageMetadata | string;
  width: number;
  height: number;
  large: { src: string; srcSet: { attribute: string } };
  label: string;
}

/**
 * Prepara as fotos para o modo ampliado: resolve o arquivo e gera, no build,
 * a versão grande em WebP responsivo. A ordem recebida é a ordem de navegação.
 */
export function prepareLightboxItems(photos: readonly GalleryPhoto[]): Promise<LightboxItem[]> {
  const total = photos.length;
  return Promise.all(
    photos.map(async (photo, index) => {
      const remote = typeof photo.src === 'string' && photo.src.startsWith('/media/');
      const image = typeof photo.src === 'string' && !remote ? resolvePhoto(photo.src) : photo.src;
      const width = typeof image === 'string' ? 1600 : image.width;
      const height = typeof image === 'string' ? 1200 : image.height;
      const large =
        typeof image === 'string'
          ? { src: image, srcSet: { attribute: `${image} 1600w` } }
          : await getImage({
              src: image,
              widths: responsiveWidths(width).filter((w) => w >= 768),
              format: 'webp',
              quality: 82,
            });
      const label = `Ampliar foto ${index + 1} de ${total}${photo.alt ? `: ${photo.alt}` : ''}`;
      return { photo, index, image, width, height, large, label };
    }),
  );
}

/** Atributos de dados que o script do modo ampliado lê de cada gatilho. */
export const lightboxData = (item: LightboxItem) => ({
  href: item.large.src,
  'data-gallery-item': String(item.index),
  'data-srcset': item.large.srcSet.attribute,
  'data-alt': item.photo.alt,
  'data-caption': item.photo.caption,
  'data-width': String(item.width),
  'data-height': String(item.height),
  'aria-label': item.label,
});
