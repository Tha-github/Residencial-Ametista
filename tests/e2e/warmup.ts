/**
 * Aquecimento antes da suíte E2E: em desenvolvimento o Astro gera cada
 * variante de imagem sob demanda na primeira requisição. Sem isto, os
 * primeiros testes medem o tempo de compilação, não o site.
 */
export default async function warmup() {
  const base = `http://localhost:${process.env.E2E_PORT ?? 4400}`;
  for (const path of ['/', '/estilo/secoes']) {
    const html = await (await fetch(base + path)).text();
    const urls = new Set<string>();
    for (const m of html.matchAll(/(?:src|href|srcset|data-srcset)="([^"]+)"/g)) {
      for (const part of m[1].split(',')) {
        const url = part.trim().split(/\s+/)[0].replaceAll('&amp;', '&');
        if (url.startsWith('/_image') || url.startsWith('/@fs')) urls.add(url);
      }
    }
    // Poucas por vez: a geração de imagens é pesada em CPU.
    const list = [...urls];
    for (let i = 0; i < list.length; i += 6) {
      await Promise.all(
        list.slice(i, i + 6).map((u) => fetch(base + u).then((r) => r.arrayBuffer())),
      );
    }
  }
}
