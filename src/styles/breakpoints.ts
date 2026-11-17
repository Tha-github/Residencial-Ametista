/** Breakpoints mobile-first (min-width, px). Espelham o comentário em tokens.css. */
export const breakpoints = {
  sm: 480,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

export type Breakpoint = keyof typeof breakpoints;

/** Larguras candidatas para `srcset` (2400 cobre hero em tela retina ~1440px). */
export const imageWidths = [360, 480, 768, 1024, 1280, 1600, 1920, 2400] as const;

/** Teto de largura gerada: originais maiores não viram variantes gigantes. */
export const MAX_IMAGE_WIDTH = 2400;

/**
 * Larguras de `srcset` para uma imagem: nunca maiores que o original (sem
 * upscale) nem que MAX_IMAGE_WIDTH. Se o original for menor que o teto e não
 * coincidir com uma largura da lista, ele entra como maior variante.
 */
export function responsiveWidths(originalWidth: number): number[] {
  const max = Math.min(originalWidth, MAX_IMAGE_WIDTH);
  const widths: number[] = imageWidths.filter((w) => w <= max);
  if (widths.at(-1) !== max) widths.push(max);
  return widths;
}
