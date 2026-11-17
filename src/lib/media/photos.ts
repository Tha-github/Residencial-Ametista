import type { ImageMetadata } from 'astro';

/**
 * Resolve as referências de foto do conteúdo (`media.hero.src`,
 * `media.gallery[].src`) para os arquivos em src/assets/photos, permitindo
 * otimização no build. Referência inexistente interrompe o build.
 */
const files = import.meta.glob<ImageMetadata>(
  '../../assets/photos/**/*.{jpg,jpeg,png,webp,avif,JPG,JPEG,PNG}',
  { eager: true, import: 'default' },
);

const PREFIX = '../../assets/photos/';

export class MissingPhotoError extends Error {
  constructor(src: string) {
    super(
      `Foto "${src}" referenciada no conteúdo não existe em src/assets/photos/. ` +
        `Disponíveis: ${listPhotos().join(', ') || '(nenhuma)'}`,
    );
    this.name = 'MissingPhotoError';
  }
}

export function listPhotos(): string[] {
  return Object.keys(files).map((k) => k.slice(PREFIX.length));
}

export function resolvePhoto(src: string): ImageMetadata {
  const normalized = src.replace(/^\/+/, '').replace(/^src\/assets\/photos\//, '');
  const image = files[PREFIX + normalized];
  if (!image) throw new MissingPhotoError(src);
  return image;
}
