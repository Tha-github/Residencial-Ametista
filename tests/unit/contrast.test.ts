import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

/**
 * Garante o contraste WCAG 2.2 das combinações de cor permitidas no sistema
 * visual, lendo os valores diretamente de src/styles/tokens.css.
 * Texto normal ≥ 4.5 (AA) · texto grande/elementos de interface ≥ 3.
 */
const css = readFileSync(
  fileURLToPath(new URL('../../src/styles/tokens.css', import.meta.url)),
  'utf8',
);
const palette = Object.fromEntries(
  [...css.matchAll(/--((?:sand|sea|terra|graphite)-\d+|white):\s*(#[0-9a-f]{6})/gi)].map((m) => [
    m[1],
    m[2],
  ]),
);

function luminance(hex: string): number {
  const [r, g, b] = (hex.slice(1).match(/../g) ?? []).map((h) => {
    const v = parseInt(h, 16) / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

type Pair = [fg: string, bg: string, min: number, uso: string];

const pairs: Pair[] = [
  ['graphite-900', 'sand-50', 4.5, 'texto sobre fundo'],
  ['graphite-900', 'sand-100', 4.5, 'texto sobre superfície'],
  ['graphite-900', 'white', 4.5, 'texto em card elevado'],
  ['graphite-600', 'sand-50', 4.5, 'texto secundário sobre fundo'],
  ['graphite-600', 'sand-100', 4.5, 'texto secundário sobre superfície'],
  ['sea-950', 'sand-50', 4.5, 'títulos'],
  ['sea-700', 'sand-50', 4.5, 'links / botão secundário'],
  ['sea-700', 'sand-100', 4.5, 'links sobre superfície'],
  ['sea-900', 'sea-100', 4.5, 'hover do botão discreto'],
  ['white', 'sea-700', 4.5, 'texto do botão primário'],
  ['white', 'sea-800', 4.5, 'texto do botão primário (hover)'],
  ['sea-950', 'sand-50', 4.5, 'botão inverso'],
  ['sand-50', 'sea-900', 4.5, 'texto sobre superfície invertida'],
  ['sea-200', 'sea-900', 4.5, 'texto secundário invertido'],
  ['terra-300', 'sea-900', 4.5, 'sobretítulo invertido'],
  ['terra-600', 'sand-50', 4.5, 'sobretítulo'],
  ['terra-600', 'sand-100', 4.5, 'sobretítulo sobre superfície'],
  ['terra-500', 'sand-50', 3, 'anel de foco sobre fundo'],
  ['terra-500', 'sea-900', 3, 'anel de foco sobre invertido'],
  // O anel tem outline-offset: a cor adjacente é o fundo, não o botão.
  // Sobre foto/superfície escura, botões inversos usam anel branco:
  ['white', 'sea-900', 3, 'anel de foco dos botões inversos'],
  ['white', 'sea-950', 3, 'anel de foco sobre véu escuro do hero'],
  ['graphite-400', 'sand-50', 3, 'borda de controles'],
];

describe('contraste da paleta', () => {
  it('lê a paleta completa do tokens.css', () => {
    for (const [fg, bg] of pairs) {
      expect(palette[fg], fg).toMatch(/^#/);
      expect(palette[bg], bg).toMatch(/^#/);
    }
  });

  it.each(pairs)('%s sobre %s ≥ %d (%s)', (fg, bg, min) => {
    expect(contrast(palette[fg], palette[bg])).toBeGreaterThanOrEqual(min);
  });
});
