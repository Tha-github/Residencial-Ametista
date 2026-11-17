// Gera imagens SINTÉTICAS de teste (não são fotos) para validar galeria,
// recortes, lightbox e CLS antes das fotos reais chegarem.
// Uso: node scripts/generate-test-images.mjs
// Saída: src/dev/fixtures/*.jpg — usadas SOMENTE pela rota de desenvolvimento
// /estilo/secoes; nunca referenciadas pelo conteúdo nem pelo build de produção.
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const outDir = fileURLToPath(new URL('../src/dev/fixtures/', import.meta.url));
mkdirSync(outDir, { recursive: true });

const specs = [
  { name: 'teste-hero', w: 2400, h: 1350, label: 'HERO 16:9', focus: [62, 40], tone: 0 },
  { name: 'teste-01', w: 2400, h: 1600, label: '1 · paisagem 3:2', focus: [50, 50], tone: 1 },
  { name: 'teste-02', w: 1600, h: 2133, label: '2 · retrato 3:4', focus: [50, 30], tone: 2 },
  { name: 'teste-03', w: 1800, h: 1800, label: '3 · quadrada', focus: [50, 50], tone: 3 },
  { name: 'teste-04', w: 2400, h: 1600, label: '4 · paisagem 3:2', focus: [30, 60], tone: 4 },
  { name: 'teste-05', w: 1600, h: 2133, label: '5 · retrato 3:4', focus: [50, 70], tone: 1 },
  { name: 'teste-06', w: 2400, h: 1350, label: '6 · panorâmica 16:9', focus: [50, 50], tone: 2 },
  {
    name: 'teste-07',
    w: 2400,
    h: 1600,
    label: '7 · extra (fora da grade)',
    focus: [50, 50],
    tone: 3,
  },
  { name: 'teste-08', w: 1200, h: 800, label: '8 · pequena 1200px', focus: [50, 50], tone: 4 },
];

const tones = [
  ['#0b3346', '#1a6488'],
  ['#cbb89c', '#f2ebe0'],
  ['#0f4f6d', '#bcd5e1'],
  ['#a24f28', '#e3a27c'],
  ['#3a4044', '#858c91'],
];

for (const s of specs) {
  const [a, b] = tones[s.tone];
  const fx = (s.focus[0] / 100) * s.w;
  const fy = (s.focus[1] / 100) * s.h;
  const fs = Math.round(Math.min(s.w, s.h) / 11);
  const edge = Math.round(fs * 0.45);
  const svg = `
<svg xmlns="http://www.w3.org/2000/svg" width="${s.w}" height="${s.h}">
  <defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
    <stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs>
  <rect width="100%" height="100%" fill="url(#g)"/>
  <g stroke="rgba(255,255,255,.35)" stroke-width="2">
    ${Array.from({ length: 9 }, (_, i) => `<line x1="${((i + 1) * s.w) / 10}" y1="0" x2="${((i + 1) * s.w) / 10}" y2="${s.h}"/>`).join('')}
    ${Array.from({ length: 9 }, (_, i) => `<line x1="0" y1="${((i + 1) * s.h) / 10}" x2="${s.w}" y2="${((i + 1) * s.h) / 10}"/>`).join('')}
  </g>
  <rect x="6" y="6" width="${s.w - 12}" height="${s.h - 12}" fill="none" stroke="#fff" stroke-width="12" stroke-dasharray="40 24"/>
  <g font-family="Arial, sans-serif" font-weight="700" fill="#fff" text-anchor="middle">
    <text x="${s.w / 2}" y="${edge * 1.6}" font-size="${edge}">BORDA SUPERIOR</text>
    <text x="${s.w / 2}" y="${s.h - edge * 0.8}" font-size="${edge}">BORDA INFERIOR</text>
    <text x="${edge * 1.4}" y="${s.h / 2}" font-size="${edge}" transform="rotate(-90 ${edge * 1.4} ${s.h / 2})">ESQUERDA</text>
    <text x="${s.w - edge * 1.4}" y="${s.h / 2}" font-size="${edge}" transform="rotate(90 ${s.w - edge * 1.4} ${s.h / 2})">DIREITA</text>
    <text x="${s.w / 2}" y="${s.h / 2 - fs * 0.2}" font-size="${fs}">FOTO DE TESTE</text>
    <text x="${s.w / 2}" y="${s.h / 2 + fs * 0.9}" font-size="${fs * 0.55}" font-weight="400">${s.label} · ${s.w}×${s.h}</text>
  </g>
  <g stroke="#ff2d55" stroke-width="10" fill="none">
    <circle cx="${fx}" cy="${fy}" r="${fs * 0.9}"/>
    <line x1="${fx - fs * 1.3}" y1="${fy}" x2="${fx + fs * 1.3}" y2="${fy}"/>
    <line x1="${fx}" y1="${fy - fs * 1.3}" x2="${fx}" y2="${fy + fs * 1.3}"/>
  </g>
  <text x="${fx}" y="${fy + fs * 1.9}" fill="#ff2d55" font-family="Arial" font-weight="700" font-size="${edge}" text-anchor="middle">FOCO ${s.focus[0]}% ${s.focus[1]}%</text>
</svg>`;
  await sharp(Buffer.from(svg))
    .jpeg({ quality: 70, mozjpeg: true })
    .toFile(`${outDir}${s.name}.jpg`);
  console.log(`✓ ${s.name}.jpg (${s.w}×${s.h})`);
}
